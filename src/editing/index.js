/**
 * Editing Engine — Public API
 *
 * Single entry point for the Editing Engine layer.
 * All external code should import from here.
 *
 * Architecture: Layer 5 — Editing Engine (wraps ProseMirror/Tiptap)
 */

// ─── Undo Manager ──────────────────────────────────────────────────────────

export {
  UndoManager,
  getUndoManager,
  createUndoManager,
} from './undo-manager'

// ─── Commands ──────────────────────────────────────────────────────────────

export {
  execute,
  executeBatch,
  executeSilent,
  canExecute,
  isActive,
  getEditorState,
} from './commands'

// ─── Transactions ──────────────────────────────────────────────────────────

export {
  dispatch,
  insertText,
  replaceSelectionWithNode,
  setNodeMarkup,
  unsetAllMarks,
  setTextSelection,
  setNodeSelection,
  scrollIntoView,
  deleteSelection,
  pluginDispatch,
} from './transactions'

// ─── State ─────────────────────────────────────────────────────────────────

export {
  getSelection,
  getSelectedText,
  getNodeAtCursor,
  getDepthAtCursor,
  getNodeAttrsAtCursor,
  isEmpty,
  getDocSize,
  getWordCount,
  getCharCount,
  hasMark,
  getActiveMarks,
  getLineHeight,
  getFontFamily,
  getFontSize,
  getJSON,
} from './state'

// ─── Convenience ───────────────────────────────────────────────────────────

import { UndoManager, getUndoManager, createUndoManager } from './undo-manager'
import {
  execute as execCmd,
  executeBatch,
  executeSilent,
  canExecute,
  isActive,
  getEditorState,
} from './commands'
import {
  dispatch,
  insertText,
  replaceSelectionWithNode,
  setNodeMarkup,
  unsetAllMarks,
  setTextSelection,
  setNodeSelection,
  scrollIntoView,
  deleteSelection,
  pluginDispatch,
} from './transactions'
import {
  getSelection,
  getSelectedText,
  getNodeAtCursor,
  getDepthAtCursor,
  getNodeAttrsAtCursor,
  isEmpty,
  getDocSize,
  getWordCount,
  getCharCount,
  hasMark,
  getActiveMarks,
  getLineHeight,
  getFontFamily,
  getFontSize,
  getJSON,
} from './state'

/**
 * Initialize the editing engine with an editor instance
 * @param {Editor} editor - Tiptap editor instance
 * @returns {Object} Editing context
 */
export function initEditing(editor) {
  const undoManager = getUndoManager()

  return {
    editor,
    undoManager,

    // Command shortcuts
    execute: (command, params) => execCmd(editor, command, params),

    // Undo/Redo shortcuts
    undo: () => undoManager.undo((record) => {
      if (record.type === 'editor') {
        editor.chain().focus().undo().run()
      }
    }),
    redo: () => undoManager.redo((record) => {
      if (record.type === 'editor') {
        editor.chain().focus().redo().run()
      }
    }),
    canUndo: () => undoManager.canUndo,
    canRedo: () => undoManager.canRedo,

    // Cleanup
    destroy: () => undoManager.clear(),
  }
}

export default {
  // Undo Manager
  getUndoManager,
  createUndoManager,

  // Commands
  execute: execCmd,
  executeBatch,
  executeSilent,
  canExecute,
  isActive,
  getEditorState,

  // Transactions
  dispatch,
  insertText,
  replaceSelectionWithNode,
  setNodeMarkup,
  unsetAllMarks,
  setTextSelection,
  setNodeSelection,
  scrollIntoView,
  deleteSelection,
  pluginDispatch,

  // State
  getSelection,
  getSelectedText,
  getNodeAtCursor,
  getDepthAtCursor,
  getNodeAttrsAtCursor,
  isEmpty,
  getDocSize,
  getWordCount,
  getCharCount,
  hasMark,
  getActiveMarks,
  getLineHeight,
  getFontFamily,
  getFontSize,
  getJSON,

  // Convenience
  initEditing,
}
