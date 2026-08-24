import CanvasEditor, { EditorMode, PaperDirection } from './canvas/core'
import type { IEditorOption } from './canvas/core'
import { createEmptyDocumentState } from '../core/state'
import type { EditorEngineAdapter, EditorEngineHandle, KindyDocumentState, KindyPageState } from '../core/types'
import {
  canvasDataToProseMirror,
  canvasElementsToProseMirror,
  proseMirrorToCanvasData,
} from './canvas/bridge'
import { CanvasDocumentController } from './canvas/prosemirror-controller'

const CSS_PIXELS_PER_CENTIMETER = 96 / 2.54

const pageDimensionToPixels = (value: number) => (
  value > 100 ? value : Math.round(value * CSS_PIXELS_PER_CENTIMETER)
)

const pageStateToEditorOptions = (
  page: KindyPageState,
  options: Record<string, unknown>,
): IEditorOption => {
  const portraitWidth = pageDimensionToPixels(page.size.width)
  const portraitHeight = pageDimensionToPixels(page.size.height)
  const landscape = page.orientation === 'landscape'
  return {
    defaultFont: 'Times New Roman',
    defaultSize: 12,
    sizeUnit: 'pt',
    defaultRowMargin: 1.25,
    marginIndicatorSize: 0,
    locale: String(options.locale || 'vi'),
    width: Math.min(portraitWidth, portraitHeight),
    height: Math.max(portraitWidth, portraitHeight),
    margins: [
      pageDimensionToPixels(page.margin.top),
      pageDimensionToPixels(page.margin.right),
      pageDimensionToPixels(page.margin.bottom),
      pageDimensionToPixels(page.margin.left),
    ],
    paperDirection: landscape ? PaperDirection.HORIZONTAL : PaperDirection.VERTICAL,
    mode: options.readOnly ? EditorMode.READONLY : EditorMode.EDIT,
    header: {
      disabled: !page.header?.enabled,
      editable: !options.readOnly,
      top: pageDimensionToPixels(page.headerDistance ?? 1.27),
    },
    footer: {
      disabled: !page.footer?.enabled,
      editable: !options.readOnly,
      bottom: pageDimensionToPixels(page.footerDistance ?? 1.27),
    },
    ...(options.editorOptions as IEditorOption || {}),
  }
}

export interface CanvasEngineHandle extends EditorEngineHandle {
  readonly editor: CanvasEditor
  readonly documentController: CanvasDocumentController
  getCanvasEditor(): CanvasEditor
  getDocumentController(): CanvasDocumentController
}

export class CanvasEngineAdapter implements EditorEngineAdapter {
  readonly id = 'canvas'

  mount(container: HTMLElement, options: Record<string, unknown> = {}): CanvasEngineHandle {
    const listeners = new Set<(state: KindyDocumentState) => void>()
    let current = createEmptyDocumentState(options.document as Partial<KindyDocumentState> | undefined)
    const documentController = new CanvasDocumentController(current.content)
    let isApplyingState = false

    const editorWrapper = document.createElement('div')
    editorWrapper.className = 'kindy-canvas-engine-surface'
    container.replaceChildren(editorWrapper)

    const editor = new CanvasEditor(
      editorWrapper,
      proseMirrorToCanvasData(current.content, current.page),
      pageStateToEditorOptions(current.page, options),
    )
    editor.command.executeFocus()

    const notify = () => {
      const snapshot = createEmptyDocumentState(current)
      listeners.forEach((listener) => listener(snapshot))
    }

    documentController.onTransaction((content) => {
      current = createEmptyDocumentState({ ...current, content })
      if (!isApplyingState) notify()
    })

    let syncTimer: ReturnType<typeof setTimeout> | null = null
    let hasPendingSync = false

    const flushSync = () => {
      if (syncTimer) {
        clearTimeout(syncTimer)
        syncTimer = null
      }
      if (!hasPendingSync || isApplyingState) return
      hasPendingSync = false
      const { data } = editor.command.getValue()
      const editorOptions = editor.command.getOptions()
      const headerEnabled = !editorOptions.header.disabled || Boolean(data.header?.length)
      const footerEnabled = !editorOptions.footer.disabled || Boolean(data.footer?.length)
      current = createEmptyDocumentState({
        ...current,
        page: {
          ...current.page,
          header: headerEnabled
            ? { ...current.page.header, enabled: true, content: canvasElementsToProseMirror(data.header || []) }
            : { ...current.page.header, enabled: false },
          footer: footerEnabled
            ? { ...current.page.footer, enabled: true, content: canvasElementsToProseMirror(data.footer || []) }
            : { ...current.page.footer, enabled: false },
        },
      })
      documentController.replaceDocument(canvasDataToProseMirror(data), 'canvas')
    }

    editor.listener.contentChange = () => {
      if (isApplyingState) return
      hasPendingSync = true
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => {
        flushSync()
      }, 150)
    }

    const applyState = (state: KindyDocumentState) => {
      if (syncTimer) {
        clearTimeout(syncTimer)
        syncTimer = null
      }
      hasPendingSync = false
      isApplyingState = true
      try {
        current = createEmptyDocumentState(state)
        documentController.replaceDocument(current.content, 'load')
        const editorOptions = pageStateToEditorOptions(current.page, options)
        editor.command.executePaperSize(editorOptions.width!, editorOptions.height!)
        editor.command.executeSetPaperMargin(editorOptions.margins!)
        editor.command.executePaperDirection(editorOptions.paperDirection!)
        editor.command.executeUpdateOptions({
          locale: editorOptions.locale,
          header: editorOptions.header,
          footer: editorOptions.footer,
        })
        editor.command.executeSetValue(proseMirrorToCanvasData(current.content, current.page), {
          isSetCursor: !options.readOnly,
        })
      } finally {
        isApplyingState = false
      }
    }

    const handle: CanvasEngineHandle = {
      editor,
      documentController,
      getCanvasEditor: () => editor,
      getDocumentController: () => documentController,
      load: applyState,
      getState: () => {
        flushSync()
        const editorOptions = editor.command.getOptions()
        const margins = editorOptions.margins
        const centimeters = (pixels: number) => Math.round((pixels / CSS_PIXELS_PER_CENTIMETER) * 1000) / 1000
        current = createEmptyDocumentState({
          ...current,
          content: documentController.getJSON(),
          page: {
            ...current.page,
            size: {
              width: centimeters(Math.min(editorOptions.width, editorOptions.height)),
              height: centimeters(Math.max(editorOptions.width, editorOptions.height)),
            },
            orientation: editorOptions.paperDirection === PaperDirection.HORIZONTAL ? 'landscape' : 'portrait',
            margin: {
              top: centimeters(margins[0]),
              right: centimeters(margins[1]),
              bottom: centimeters(margins[2]),
              left: centimeters(margins[3]),
            },
          },
        })
        return createEmptyDocumentState(current)
      },
      setReadOnly(readOnly: boolean) {
        flushSync()
        documentController.setEditable(!readOnly)
        editor.command.executeMode(readOnly ? EditorMode.READONLY : EditorMode.EDIT)
      },
      focus: () => editor.command.executeFocus(),
      destroy() {
        if (syncTimer) {
          clearTimeout(syncTimer)
          syncTimer = null
        }
        listeners.clear()
        documentController.destroy()
        editor.destroy()
        editorWrapper.remove()
      },
      onChange(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
    return handle
  }
}

export const createCanvasEngineAdapter = () => new CanvasEngineAdapter()

export { default as CanvasEditorCore } from './canvas/core'
export * from './canvas/bridge'
export * from './canvas/prosemirror-controller'
