/**
 * UMO Editor Client — Public API
 *
 * A Google Docs-like editor built on Open Document Platform.
 *
 * Architecture: Product Layer — Editor Client
 */

// ─── Main Editor Component ─────────────────────────────────────────────────

import { UmoEditor } from './components/UmoEditor.vue'

export { UmoEditor }

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

import { useUmoEditor } from './composables/useUmoEditor'
import { useDocumentManager } from './composables/useDocumentManager'
import { useFileOperations } from './composables/useFileOperations'

export { useUmoEditor, useDocumentManager, useFileOperations }

// ─── Plugin Installation ───────────────────────────────────────────────────

export function install(app) {
  app.component('UmoEditor', UmoEditor)
  app.component('EditorHeader', EditorHeader)
  app.component('EditorToolbar', EditorToolbar)
  app.component('EditorContent', EditorContent)
  app.component('EditorFooter', EditorFooter)
  app.component('DocumentTabs', DocumentTabs)
  app.component('StatusBar', StatusBar)

  return app
}

export default {
  UmoEditor,
  EditorHeader,
  EditorToolbar,
  EditorContent,
  EditorFooter,
  DocumentTabs,
  StatusBar,
  useUmoEditor,
  useDocumentManager,
  useFileOperations,
  install,
}
