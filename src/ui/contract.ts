export interface KindyContractToolbarOptions {
  showSaveLabel: boolean
  defaultMode: 'classic' | 'ribbon'
  allowModeSwitch: boolean
  menus: Array<'base' | 'insert' | 'table' | 'tools' | 'page' | 'view' | 'export'>
}

export interface KindyContractStatusbarOptions {
  showOutline: boolean
  showSpellcheck: boolean
  showShortcuts: boolean
  showReset: boolean
  showLayout: boolean
  showPageStatus: boolean
  showWordCount: boolean
  showBranding: boolean
  showFullscreen: boolean
  showPreview: boolean
  showZoom: boolean
  showLocale: boolean
}

export interface KindyContractEditorOptions {
  editorKey: string
  toolbar: KindyContractToolbarOptions
  statusbar: KindyContractStatusbarOptions
  page: { layouts: ['page']; showRuler: boolean }
  disableExtensions: string[]
}

/**
 * Opinionated editor preset used by Document Library: one compact toolbar,
 * page layout only, and DOCX-contract features only.
 */
const CONTRACT_EDITOR_OPTIONS_VALUE: KindyContractEditorOptions = {
  editorKey: 'kindy-document-library-contract',
  toolbar: {
    showSaveLabel: false,
    defaultMode: 'classic',
    allowModeSwitch: false,
    menus: ['base', 'insert', 'table', 'page', 'export'],
  },
  statusbar: {
    showOutline: false,
    showSpellcheck: false,
    showShortcuts: false,
    showReset: false,
    showLayout: false,
    showPageStatus: true,
    showWordCount: true,
    showBranding: false,
    showFullscreen: false,
    showPreview: false,
    showZoom: true,
    showLocale: true,
  },
  page: {
    layouts: ['page'],
    showRuler: true,
  },
  disableExtensions: [
    'task-list',
    'markdown',
    'code',
    'video',
    'audio',
    'file',
    'details',
    'code-block',
    'building-blocks',
    'chinese-date',
    'emoji',
    'tag',
    'columns',
    'callout',
    'mention',
    'option-box',
    'template',
    'web-page',
    'math',
    'diagrams',
    'echarts',
    'mermaid',
    'chinese-case',
    'layout-web',
    'preview',
    'skin',
    'theme',
    'reset',
    'export-image',
    'export-text',
    'share',
    'embed',
  ],
}

export const CONTRACT_EDITOR_OPTIONS: Readonly<KindyContractEditorOptions> = Object.freeze(
  CONTRACT_EDITOR_OPTIONS_VALUE,
)

export function createContractEditorOptions(overrides: Record<string, unknown> = {}) {
  const toolbar = (overrides.toolbar || {}) as Partial<KindyContractToolbarOptions>
  const statusbar = (overrides.statusbar || {}) as Partial<KindyContractStatusbarOptions>
  const page = (overrides.page || {}) as Record<string, unknown>

  return {
    ...CONTRACT_EDITOR_OPTIONS,
    ...overrides,
    toolbar: { ...CONTRACT_EDITOR_OPTIONS.toolbar, ...toolbar },
    statusbar: { ...CONTRACT_EDITOR_OPTIONS.statusbar, ...statusbar },
    page: { ...CONTRACT_EDITOR_OPTIONS.page, ...page },
    disableExtensions: Array.isArray(overrides.disableExtensions)
      ? overrides.disableExtensions
      : [...CONTRACT_EDITOR_OPTIONS.disableExtensions],
  }
}
