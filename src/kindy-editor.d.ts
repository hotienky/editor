import type { App, Component, DefineComponent } from 'vue'

// ─────────────────────────────────────────────────
// Option Types
// ─────────────────────────────────────────────────

export interface KindyToolbarOptions {
  /** 'classic' | 'ribbon' */
  mode?: 'classic' | 'ribbon'
  show?: boolean
  menus?: string[]
  defaultMode?: 'classic' | 'ribbon'
}

export interface KindyPageMargin {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

export interface KindyPageSize {
  label: string
  width: number
  height: number
  default?: boolean
}

export interface KindyWatermark {
  text?: string
  alpha?: number
  type?: 'compact' | 'spacious'
  fontColor?: string
  fontSize?: number
  fontFamily?: string | null
  fontWeight?: 'normal' | 'bold' | 'bolder'
}

export interface KindyAutoSave {
  enabled: boolean
  interval?: number
}

export interface KindyDocumentOptions {
  title?: string
  content?: string
  readOnly?: boolean
  enableMarkdown?: boolean
  autoSave?: KindyAutoSave
}

export interface KindyPageOptions {
  layouts?: string[]
  defaultBackground?: string
  defaultMargin?: KindyPageMargin
  defaultOrientation?: 'portrait' | 'landscape'
  watermark?: KindyWatermark
  showBreakMarks?: boolean
  showBookmark?: boolean
  showLineNumber?: boolean
  showToc?: boolean
  size?: KindyPageSize
  pageSizes?: KindyPageSize[]
}

export interface KindyEditorOptions {
  editorKey?: string
  locale?: string
  theme?: 'light' | 'dark' | 'auto'
  skin?: 'default' | 'modern'
  height?: string
  toolbar?: KindyToolbarOptions
  page?: KindyPageOptions
  document?: KindyDocumentOptions
  translations?: Record<string, Record<string, string>>
  fullscreenZIndex?: number
  dicts?: {
    pageSizes?: KindyPageSize[]
    [key: string]: unknown
  }
}

// ─────────────────────────────────────────────────
// Comment Types
// ─────────────────────────────────────────────────

export interface KindyCommentReply {
  id: string
  user: string
  text: string
  createdAt: number
}

export interface KindyComment {
  id: string
  user: string
  color?: string
  text?: string
  resolved?: boolean
  createdAt: number
  replies?: KindyCommentReply[]
}

// ─────────────────────────────────────────────────
// Editor Instance Methods (exposed via ref)
// ─────────────────────────────────────────────────

export interface KindyEditorInstance {
  setContent(content: string | object, options?: object): void
  insertContent(content: string | object, options?: object): void
  getContent(type?: 'html' | 'json' | 'text'): string | object
  exportPdf(filename?: string): Promise<void>
  exportImage(type?: 'png' | 'jpeg', filename?: string): Promise<void>
  print(): void
  setOptions(options: Partial<KindyEditorOptions>): void
  setToolbar(params: { mode?: 'classic' | 'ribbon'; show?: boolean }): void
  setLayout(layout: string): void
  setPage(params: Partial<KindyPageOptions>): void
  setWatermark(params: KindyWatermark): void
  setDocument(params: Partial<KindyDocumentOptions>): void
  setTheme(theme: 'light' | 'dark' | 'auto'): void
  setSkin(skin: 'default' | 'modern'): void
  saveContent(): Promise<void>
  focus(): void
  destroy(): void
  startTypewriter(content: object, options?: object): void
  stopTypewriter(): void
}

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────

export declare const KindyEditor: DefineComponent<
  KindyEditorOptions,
  KindyEditorInstance,
  object
>

// ─────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────

export declare const KindyMenuButton: Component
export declare const KindyDialog: Component
export declare const KindyTooltip: Component

// ─────────────────────────────────────────────────
// Mount Helper (Pure JS / React / Next.js / Angular / Svelte)
// ─────────────────────────────────────────────────

export declare const mountKindyEditor: (
  container: HTMLElement | string,
  props?: Partial<KindyEditorOptions>
) => {
  unmount: () => void
  app: App
}

// ─────────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────────

export declare const useKindyEditor: {
  install(app: App, options?: Partial<KindyEditorOptions>): void
}

// ─────────────────────────────────────────────────
// Default export
// ─────────────────────────────────────────────────

export default KindyEditor

// ─────────────────────────────────────────────────
// Vue Global Component Types
// ─────────────────────────────────────────────────

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    KindyEditor: typeof KindyEditor
    KindyMenuButton: typeof KindyMenuButton
    KindyDialog: typeof KindyDialog
    KindyTooltip: typeof KindyTooltip
  }
}
