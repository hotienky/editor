import {
  KINDY_DOCUMENT_SCHEMA_VERSION,
  type JSONContent,
  type KindyDocumentState,
  type KindyPageState,
} from './types'

export const DEFAULT_PAGE_STATE: KindyPageState = Object.freeze({
  size: { width: 21, height: 29.7 },
  orientation: 'portrait',
  margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
  background: '#ffffff',
  header: { enabled: false, text: '' },
  footer: { enabled: false, text: '' },
  sections: [],
})

const emptyDocument: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

export function cloneDocumentState<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Vue turns component props into reactive proxies. KindyDocumentState is
      // JSON by contract, so serialization safely removes those wrappers.
    }
  }
  return JSON.parse(JSON.stringify(value))
}

export function createEmptyDocumentState(overrides: Partial<KindyDocumentState> = {}): KindyDocumentState {
  const page = overrides.page || {} as KindyPageState
  return {
    schemaVersion: KINDY_DOCUMENT_SCHEMA_VERSION,
    content: cloneDocumentState(overrides.content || emptyDocument),
    page: {
      ...cloneDocumentState(DEFAULT_PAGE_STATE),
      ...page,
      size: page.size || cloneDocumentState(DEFAULT_PAGE_STATE.size),
      orientation: page.orientation || DEFAULT_PAGE_STATE.orientation,
      margin: {
        ...DEFAULT_PAGE_STATE.margin,
        ...(page.margin || {}),
      },
    },
    assets: cloneDocumentState(overrides.assets || []),
  }
}

export function migrateDocumentState(input: unknown): KindyDocumentState {
  if (!input || typeof input !== 'object') return createEmptyDocumentState()
  const value = input as Record<string, unknown>

  if (value.schemaVersion === KINDY_DOCUMENT_SCHEMA_VERSION && value.content) {
    return createEmptyDocumentState(value as unknown as KindyDocumentState)
  }

  // V1 accepted raw ProseMirror JSON as the document value.
  if (value.type === 'doc') {
    return createEmptyDocumentState({ content: value as JSONContent })
  }

  // V1 application snapshots generally used { document/content, page }.
  const legacyDocument = value.document as Record<string, unknown> | undefined
  const legacyContent = value.content || legacyDocument?.content
  const content = legacyContent && typeof legacyContent === 'object'
    ? legacyContent as JSONContent
    : emptyDocument

  return createEmptyDocumentState({
    content,
    page: (value.page || {}) as KindyPageState,
    assets: Array.isArray(value.assets) ? value.assets as KindyDocumentState['assets'] : [],
  })
}

export function stateFromEditor(editor: { getJSON(): JSONContent }, page?: Partial<KindyPageState>): KindyDocumentState {
  return createEmptyDocumentState({ content: editor.getJSON(), page: page as KindyPageState })
}
