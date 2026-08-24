/**
 * React Adapter — Public API
 *
 * React components and hooks for the Open Document Platform.
 *
 * Architecture: Framework Adapter — React
 */

// ─── Editor Provider ───────────────────────────────────────────────────────

import { EditorProvider, useEditor } from './components/EditorProvider'

export { EditorProvider, useEditor }

// ─── Editor Component ──────────────────────────────────────────────────────

import { KindyEditor } from './components/KindyEditor'

export { KindyEditor }

// ─── Toolbar Components ────────────────────────────────────────────────────

import { Toolbar } from './components/Toolbar'

export { Toolbar }

// ─── Menu Components ───────────────────────────────────────────────────────

import { Menu } from './components/Menu'

export { Menu }

// ─── Viewport Components ───────────────────────────────────────────────────

import { ViewportContainer } from './components/ViewportContainer'

export { ViewportContainer }

// ─── Hook Components ───────────────────────────────────────────────────────

import { useDocument } from './hooks/useDocument'
import { useLayout } from './hooks/useLayout'
import { useSelection } from './hooks/useSelection'
import { useCollaboration } from './hooks/useCollaboration'
import { usePlugin } from './hooks/usePlugin'

export { useDocument, useLayout, useSelection, useCollaboration, usePlugin }

export default {
  // Provider
  EditorProvider,
  useEditor,

  // Editor
  KindyEditor,

  // Toolbar
  Toolbar,

  // Menu
  Menu,

  // Viewport
  ViewportContainer,

  // Hooks
  useDocument,
  useLayout,
  useSelection,
  useCollaboration,
  usePlugin,
}
