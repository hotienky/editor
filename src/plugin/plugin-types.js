/**
 * Plugin Types
 *
 * Defines plugin types, priorities, and statuses.
 *
 * Architecture: Layer 9 — Plugin System
 */

// ─── Plugin Types ──────────────────────────────────────────────────────────

export const PluginType = {
  EDITOR: 'editor',
  TOOLBAR: 'toolbar',
  MENU: 'menu',
  KEYBOARD: 'keyboard',
  FORMAT: 'format',
  BLOCK: 'block',
  INLINE: 'inline',
  STORAGE: 'storage',
  COLLABORATION: 'collaboration',
  EXPORT: 'export',
  AI: 'ai',
}

// ─── Plugin Priority ───────────────────────────────────────────────────────

export const PluginPriority = {
  LOW: 0,
  NORMAL: 50,
  HIGH: 100,
  CRITICAL: 200,
}

// ─── Plugin Status ─────────────────────────────────────────────────────────

export const PluginStatus = {
  REGISTERED: 'registered',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ERROR: 'error',
}

// ─── Hook Types ────────────────────────────────────────────────────────────

export const HookType = {
  // Lifecycle hooks
  ON_INIT: 'onInit',
  ON_DESTROY: 'onDestroy',
  ON_READY: 'onReady',

  // Editor hooks
  ON_CREATE: 'onCreate',
  ON_UPDATE: 'onUpdate',
  ON_SELECTION_UPDATE: 'onSelectionUpdate',
  ON_TRANSACTION: 'onTransaction',

  // Document hooks
  ON_DOCUMENT_CHANGE: 'onDocumentChange',
  ON_DOCUMENT_SAVE: 'onDocumentSave',
  ON_DOCUMENT_LOAD: 'onDocumentLoad',

  // Command hooks
  BEFORE_COMMAND: 'beforeCommand',
  AFTER_COMMAND: 'afterCommand',

  // Input hooks
  BEFORE_INPUT: 'beforeInput',
  AFTER_INPUT: 'afterInput',

  // Paste hooks
  BEFORE_PASTE: 'beforePaste',
  AFTER_PASTE: 'afterPaste',

  // Export hooks
  BEFORE_EXPORT: 'beforeExport',
  AFTER_EXPORT: 'afterExport',

  // Import hooks
  BEFORE_IMPORT: 'beforeImport',
  AFTER_IMPORT: 'afterImport',

  // UI hooks
  BEFORE_RENDER: 'beforeRender',
  AFTER_RENDER: 'afterRender',
}

export default {
  PluginType,
  PluginPriority,
  PluginStatus,
  HookType,
}
