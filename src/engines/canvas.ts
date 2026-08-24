import CanvasEditor, { EditorMode } from './canvas/core'
import type { IEditorData, IEditorOption, IElement } from './canvas/core'
import { createEmptyDocumentState } from '../core/state'
import type { EditorEngineAdapter, EditorEngineHandle, KindyDocumentState } from '../core/types'

export interface CanvasEngineHandle extends EditorEngineHandle {
  readonly editor: CanvasEditor
  getCanvasEditor(): CanvasEditor
}

export class CanvasEngineAdapter implements EditorEngineAdapter {
  readonly id = 'canvas'

  mount(container: HTMLElement, options: Record<string, unknown> = {}): CanvasEngineHandle {
    const listeners = new Set<(state: KindyDocumentState) => void>()
    let current = createEmptyDocumentState()
    
    // Create inner wrapper container for canvas-editor
    const editorWrapper = document.createElement('div')
    editorWrapper.className = 'kindy-canvas-editor-container'
    editorWrapper.style.width = '100%'
    editorWrapper.style.height = '100%'
    container.innerHTML = ''
    container.appendChild(editorWrapper)

    const editorOptions: IEditorOption = {
      defaultFont: 'Times New Roman',
      defaultSize: 16,
      defaultRowMargin: 1.25,
      ...(options.editorOptions as IEditorOption || {})
    }

    const editor = new CanvasEditor(
      editorWrapper,
      {
        header: [],
        main: [],
        footer: []
      },
      editorOptions
    )

    // Listen to content change
    editor.listener.contentChange = () => {
      current = stateFromCanvasEditor(editor, current)
      listeners.forEach((listener) => listener(current))
    }

    return {
      editor,
      getCanvasEditor: () => editor,
      load(state: KindyDocumentState) {
        current = createEmptyDocumentState(state)
        // Check if content has canvas data format or convert
        if (Array.isArray(state.content)) {
          editor.command.executeSetValue({
            main: state.content as unknown as IElement[]
          })
        } else if (state.content && typeof state.content === 'object') {
          const raw = state.content as Record<string, any>
          if (raw.main || raw.header || raw.footer) {
            editor.command.executeSetValue(raw as IEditorData)
          }
        }
      },
      getState: () => stateFromCanvasEditor(editor, current),
      setReadOnly: (readOnly: boolean) => {
        editor.command.executeMode(readOnly ? EditorMode.READONLY : EditorMode.EDIT)
      },
      focus: () => {
        editor.command.executeFocus()
      },
      destroy() {
        listeners.clear()
        editor.destroy()
        editorWrapper.remove()
      },
      onChange(listener: (state: KindyDocumentState) => void) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    }
  }
}

function stateFromCanvasEditor(editor: CanvasEditor, previous: KindyDocumentState): KindyDocumentState {
  const value = editor.command.getValue()
  const options = editor.command.getOptions()
  return createEmptyDocumentState({
    content: value as unknown as KindyDocumentState['content'],
    assets: previous.assets,
    page: {
      ...previous.page,
      size: { width: options.width || 794, height: options.height || 1123 },
      margin: previous.page.margin
    }
  })
}

export const createCanvasEngineAdapter = () => new CanvasEngineAdapter()
