import { createApp, type App, type ComponentPublicInstance } from 'vue'

import { createEmptyDocumentState } from '../core/state'
import type { EditorEngineAdapter, EditorEngineHandle, KindyDocumentState } from '../core/types'
import KindyEditor from '../components/index.vue'

type KindyComponentHandle = ComponentPublicInstance & {
  setContent(content: unknown, options?: unknown): void
  getJSON(): KindyDocumentState['content']
  getPage(): Record<string, any>
  setPage(page: Record<string, unknown>): void
  setReadOnly(readOnly: boolean): void
  focus(): void
  destroy(): void
}

export class TiptapEngineAdapter implements EditorEngineAdapter {
  readonly id = 'tiptap'

  mount(container: HTMLElement, options: Record<string, unknown> = {}): EditorEngineHandle {
    const listeners = new Set<(state: KindyDocumentState) => void>()
    let current = createEmptyDocumentState()
    let instance: KindyComponentHandle
    const app: App = createApp(KindyEditor, {
      ...options,
      onChanged: () => {
        if (!instance) return
        current = stateFromInstance(instance, current)
        listeners.forEach((listener) => listener(current))
      },
    })
    instance = app.mount(container) as KindyComponentHandle

    return {
      load(state) {
        current = createEmptyDocumentState(state)
        instance.setContent(current.content, { emitUpdate: false, focusPosition: null })
        instance.setPage({ orientation: current.page.orientation, margin: current.page.margin, background: current.page.background })
      },
      getState: () => stateFromInstance(instance, current),
      setReadOnly: (readOnly) => instance.setReadOnly(readOnly),
      focus: () => instance.focus(),
      destroy() { listeners.clear(); instance.destroy(); app.unmount() },
      onChange(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    }
  }
}

function stateFromInstance(instance: KindyComponentHandle, previous: KindyDocumentState) {
  const page = instance.getPage()
  return createEmptyDocumentState({
    content: instance.getJSON(), assets: previous.assets,
    page: {
      ...previous.page,
      size: page.size ? { width: page.size.width, height: page.size.height } : previous.page.size,
      orientation: page.orientation || previous.page.orientation,
      margin: page.margin || previous.page.margin,
      background: page.background || previous.page.background,
    },
  })
}

export const createTiptapEngineAdapter = () => new TiptapEngineAdapter()

