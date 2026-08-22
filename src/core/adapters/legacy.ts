import type { DocumentApiAdapter, KindyDocumentState, SaveResult } from '../types'
import { createMemoryDocumentAdapter, MemoryDocumentAdapter } from './memory'

export interface LegacyCallbackOptions {
  onSave?: (payload: { json: KindyDocumentState['content']; state: KindyDocumentState }, page: KindyDocumentState['page']) => Promise<unknown>
  onFileUpload?: (file: File | Blob) => Promise<unknown>
}

export function createLegacyCallbackAdapter(options: LegacyCallbackOptions = {}): DocumentApiAdapter {
  const memory = createMemoryDocumentAdapter()
  return new Proxy(memory, {
    get(target, property, receiver) {
      if (property === 'saveState') {
        return async (documentId: string, input: Parameters<MemoryDocumentAdapter['saveState']>[1]) => {
          const result = await target.saveState(documentId, input)
          await options.onSave?.({ json: input.state.content, state: input.state }, input.state.page)
          return result as SaveResult
        }
      }
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as DocumentApiAdapter
}
