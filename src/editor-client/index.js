/**
 * Kindy Editor Client — Public API
 *
 * A Google Docs-like editor built on Open Document Platform.
 *
 * Architecture: Product Layer — Editor Client
 */

// ─── Main Editor Component ─────────────────────────────────────────────────

export { KindyEditor } from './components/KindyEditor.vue'

// ─── Sub-components ────────────────────────────────────────────────────────

export { EditorHeader } from './components/EditorHeader.vue'
export { EditorToolbar } from './components/EditorToolbar.vue'
export { EditorContent } from './components/EditorContent.vue'
export { EditorFooter } from './components/EditorFooter.vue'
export { DocumentTabs } from './components/DocumentTabs.vue'
export { StatusBar } from './components/StatusBar.vue'

// ─── Composables ───────────────────────────────────────────────────────────

export { useKindyEditor } from './composables/useKindyEditor'
export { useDocumentManager } from './composables/useDocumentManager'
export { useFileOperations } from './composables/useFileOperations'

// ─── Plugin Installation ───────────────────────────────────────────────────

export function install(app) {
  app.component('KindyEditor', KindyEditor)
  app.component('EditorHeader', EditorHeader)
  app.component('EditorToolbar', EditorToolbar)
  app.component('EditorContent', EditorContent)
  app.component('EditorFooter', EditorFooter)
  app.component('DocumentTabs', DocumentTabs)
  app.component('StatusBar', StatusBar)

  return app
}

export default {
  KindyEditor,
  EditorHeader,
  EditorToolbar,
  EditorContent,
  EditorFooter,
  DocumentTabs,
  StatusBar,
  useKindyEditor,
  useDocumentManager,
  useFileOperations,
  install,
}
