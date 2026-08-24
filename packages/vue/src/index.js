/**
 * Vue Adapter — Public API
 *
 * Vue composables and components for the Open Document Platform.
 *
 * Architecture: Framework Adapter — Vue
 */

// ─── Composables ───────────────────────────────────────────────────────────

import { useEditor } from './composables/useEditor'
import { useDocument } from './composables/useDocument'
import { useLayout } from './composables/useLayout'
import { useSelection } from './composables/useSelection'
import { useCollaboration } from './composables/useCollaboration'
import { usePlugin } from './composables/usePlugin'

export {
  useEditor,
  useDocument,
  useLayout,
  useSelection,
  useCollaboration,
  usePlugin,
}

// ─── Components ────────────────────────────────────────────────────────────

import { KindyEditor } from './components/KindyEditor.vue'
import { Toolbar } from './components/Toolbar.vue'
import { PageView } from './components/PageView.vue'

export {
  KindyEditor,
  Toolbar,
  PageView,
}

// ─── Plugin Installation ───────────────────────────────────────────────────

export function install(app) {
  // Register global components
  app.component('KindyEditor', KindyEditor)
  app.component('UMOToolbar', Toolbar)
  app.component('UMOPageView', PageView)

  return app
}

export default {
  // Composables
  useEditor,
  useDocument,
  useLayout,
  useSelection,
  useCollaboration,
  usePlugin,

  // Components
  KindyEditor,
  Toolbar,
  PageView,

  // Plugin
  install,
}
