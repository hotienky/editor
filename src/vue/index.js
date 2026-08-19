/**
 * Vue Adapter — Public API
 *
 * Vue composables and components for the Open Document Platform.
 *
 * Architecture: Framework Adapter — Vue
 */

// ─── Composables ───────────────────────────────────────────────────────────

export { useEditor } from './composables/useEditor'
export { useDocument } from './composables/useDocument'
export { useLayout } from './composables/useLayout'
export { useSelection } from './composables/useSelection'
export { useCollaboration } from './composables/useCollaboration'
export { usePlugin } from './composables/usePlugin'

// ─── Components ────────────────────────────────────────────────────────────

export { UMOEditor } from './components/UMOEditor.vue'
export { Toolbar } from './components/Toolbar.vue'
export { PageView } from './components/PageView.vue'

// ─── Plugin Installation ───────────────────────────────────────────────────

export function install(app) {
  // Register global components
  app.component('UMOEditor', UMOEditor)
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
  UMOEditor,
  Toolbar,
  PageView,

  // Plugin
  install,
}
