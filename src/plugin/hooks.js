/**
 * Plugin Hooks
 *
 * Hook system for plugin events.
 * Allows plugins to hook into editor lifecycle.
 *
 * Architecture: Layer 9 — Plugin System
 */

import { HookType } from './plugin-types'

// ─── Hook System ───────────────────────────────────────────────────────────

/**
 * Create a hook definition
 * @param {string} name - Hook name
 * @param {Object} options - Hook options
 * @returns {Object} Hook definition
 */
export function createHook(name, options = {}) {
  return {
    name,
    description: options.description || '',
    returnType: options.returnType || 'void',
    cancelable: options.cancelable || false,
    defaultPriority: options.defaultPriority || 0,
  }
}

// ─── Built-in Hooks ────────────────────────────────────────────────────────

export const hooks = {
  // ─── Lifecycle ────────────────────────────────────────────────────────
  onInit: createHook(HookType.ON_INIT, {
    description: 'Called when plugin is initialized',
  }),

  onDestroy: createHook(HookType.ON_DESTROY, {
    description: 'Called when plugin is destroyed',
  }),

  onReady: createHook(HookType.ON_READY, {
    description: 'Called when plugin is ready',
  }),

  // ─── Editor ───────────────────────────────────────────────────────────
  onCreate: createHook(HookType.ON_CREATE, {
    description: 'Called when editor is created',
  }),

  onUpdate: createHook(HookType.ON_UPDATE, {
    description: 'Called when editor content updates',
  }),

  onSelectionUpdate: createHook(HookType.ON_SELECTION_UPDATE, {
    description: 'Called when selection changes',
  }),

  onTransaction: createHook(HookType.ON_TRANSACTION, {
    description: 'Called on editor transaction',
  }),

  // ─── Document ─────────────────────────────────────────────────────────
  onDocumentChange: createHook(HookType.ON_DOCUMENT_CHANGE, {
    description: 'Called when document changes',
  }),

  onDocumentSave: createHook(HookType.ON_DOCUMENT_SAVE, {
    description: 'Called when document is saved',
    cancelable: true,
  }),

  onDocumentLoad: createHook(HookType.ON_DOCUMENT_LOAD, {
    description: 'Called when document is loaded',
  }),

  // ─── Commands ─────────────────────────────────────────────────────────
  beforeCommand: createHook(HookType.BEFORE_COMMAND, {
    description: 'Called before a command executes',
    cancelable: true,
  }),

  afterCommand: createHook(HookType.AFTER_COMMAND, {
    description: 'Called after a command executes',
  }),

  // ─── Input ────────────────────────────────────────────────────────────
  beforeInput: createHook(HookType.BEFORE_INPUT, {
    description: 'Called before input is processed',
    cancelable: true,
  }),

  afterInput: createHook(HookType.AFTER_INPUT, {
    description: 'Called after input is processed',
  }),

  // ─── Paste ────────────────────────────────────────────────────────────
  beforePaste: createHook(BEFORE_PASTE, {
    description: 'Called before paste is processed',
    cancelable: true,
  }),

  afterPaste: createHook(AFTER_PASTE, {
    description: 'Called after paste is processed',
  }),

  // ─── Export ───────────────────────────────────────────────────────────
  beforeExport: createHook(HookType.BEFORE_EXPORT, {
    description: 'Called before document export',
    cancelable: true,
  }),

  afterExport: createHook(HookType.AFTER_EXPORT, {
    description: 'Called after document export',
  }),

  // ─── Import ───────────────────────────────────────────────────────────
  beforeImport: createHook(HookType.BEFORE_IMPORT, {
    description: 'Called before document import',
    cancelable: true,
  }),

  afterImport: createHook(HookType.AFTER_IMPORT, {
    description: 'Called after document import',
  }),

  // ─── UI ───────────────────────────────────────────────────────────────
  beforeRender: createHook(HookType.BEFORE_RENDER, {
    description: 'Called before UI render',
  }),

  afterRender: createHook(HookType.AFTER_RENDER, {
    description: 'Called after UI render',
  }),
}

// ─── Hook Context ──────────────────────────────────────────────────────────

/**
 * Create a hook context
 * @param {Object} data - Initial context data
 * @returns {Object} Hook context
 */
export function createHookContext(data = {}) {
  return {
    ...data,
    _cancelled: false,
    _preventDefault: false,

    /**
     * Cancel hook execution
     */
    cancel() {
      this._cancelled = true
    },

    /**
     * Prevent default behavior
     */
    preventDefault() {
      this._preventDefault = true
    },

    /**
     * Check if hook was cancelled
     * @returns {boolean}
     */
    isCancelled() {
      return this._cancelled
    },

    /**
     * Check if default was prevented
     * @returns {boolean}
     */
    isDefaultPrevented() {
      return this._preventDefault
    },
  }
}

export default {
  HookType,
  hooks,
  createHook,
  createHookContext,
}
