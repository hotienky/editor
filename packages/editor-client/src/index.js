/**
 * Kindy Editor Client — Public API
 *
 * A Google Docs-like editor built on Open Document Platform.
 *
 * Architecture: Product Layer — Editor Client
 */

// ─── Main Editor Component ─────────────────────────────────────────────────

import { KindyEditor } from './components/KindyEditor.vue'

export { KindyEditor }

// ─── Sub-components ────────────────────────────────────────────────────────

import { EditorHeader } from './components/EditorHeader.vue'
import { EditorToolbar } from './components/EditorToolbar.vue'
import { EditorContent } from './components/EditorContent.vue'
import { EditorFooter } from './components/EditorFooter.vue'
import { DocumentTabs } from './components/DocumentTabs.vue'
import { StatusBar } from './components/StatusBar.vue'

export {
  EditorHeader,
  EditorToolbar,
  EditorContent,
  EditorFooter,
  DocumentTabs,
  StatusBar,
}

// ─── Composables ───────────────────────────────────────────────────────────

import { useKindyEditor } from './composables/useKindyEditor'
import { useDocumentManager } from './composables/useDocumentManager'
import { useFileOperations } from './composables/useFileOperations'

export { useKindyEditor, useDocumentManager, useFileOperations }

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
