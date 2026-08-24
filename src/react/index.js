/**
 * React Adapter — Public API
 *
 * React components and hooks for the Open Document Platform.
 *
 * Architecture: Framework Adapter — React
 */

// ─── Editor Provider ───────────────────────────────────────────────────────

export { EditorProvider, useEditor } from './components/EditorProvider'

// ─── Editor Component ──────────────────────────────────────────────────────

export { KindyEditor } from './components/KindyEditor'

// ─── Toolbar Components ────────────────────────────────────────────────────

export { Toolbar } from './components/Toolbar'
export { ToolbarButton } from './components/ToolbarButton'
export { ToolbarGroup } from './components/ToolbarGroup'

// ─── Menu Components ───────────────────────────────────────────────────────

export { Menu } from './components/Menu'
export { MenuItem } from './components/MenuItem'

// ─── Viewport Components ───────────────────────────────────────────────────

export { PageView } from './components/PageView'
export { ViewportContainer } from './components/ViewportContainer'

// ─── Hook Components ───────────────────────────────────────────────────────

export { useDocument } from './hooks/useDocument'
export { useLayout } from './hooks/useLayout'
export { useSelection } from './hooks/useSelection'
export { useCollaboration } from './hooks/useCollaboration'
export { usePlugin } from './hooks/usePlugin'

export default {
  // Provider
  EditorProvider,
  useEditor,

  // Editor
  KindyEditor,

  // Toolbar
  Toolbar,
  ToolbarButton,
  ToolbarGroup,

  // Menu
  Menu,
  MenuItem,

  // Viewport
  PageView,
  ViewportContainer,

  // Hooks
  useDocument,
  useLayout,
  useSelection,
  useCollaboration,
  usePlugin,
}
