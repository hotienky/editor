/**
 * Editing Engine — Unified Undo/Redo Manager
 *
 * Replaces the custom history-record.js + index.vue undo/redo layer.
 * Handles both editor-level (ProseMirror) and page-level (margin, size, etc.)
 * undo/redo in a single, clean abstraction.
 */

export class UndoManager {
  constructor() {
    this._done = []
    this._undone = []
    this._isUndoRedo = false
    this._editorCount = 0
    this._listeners = new Set()
  }

  // ─── Recording ──────────────────────────────────────────────────────────

  /**
   * Record an editor-level change (from ProseMirror history)
   */
  recordEditor(historyState) {
    if (this._isUndoRedo) return
    if (!historyState) return

    const undoneCount = historyState?.undone?.eventCount || 0
    if (undoneCount > 0) return

    const eventCount = historyState?.done?.eventCount || 0
    if (eventCount === 0) return

    if (this._editorCount < eventCount) {
      for (let i = this._editorCount; i < eventCount; i++) {
        this._done.push({ type: 'editor' })
      }
      this._editorCount = eventCount
    }

    this._undone = []
    this._notify()
  }

  /**
   * Record a page-level change (margin, size, orientation, etc.)
   */
  recordPage(proType, newData, oldData) {
    if (this._isUndoRedo) return
    if (!proType || newData === undefined || oldData === undefined) return
    if (this._isEqual(newData, oldData)) return

    this._done.push({ type: 'page', proType, newData, oldData })
    this._undone = []
    this._notify()
  }

  // ─── Undo / Redo ────────────────────────────────────────────────────────

  /**
   * Undo the last change
   * @param {(record: object) => void} handler - Called with the record to undo
   * @returns {boolean} Whether an undo was performed
   */
  undo(handler) {
    if (this._done.length === 0) return false

    this._isUndoRedo = true
    try {
      const record = this._done.pop()
      handler(record)
      this._undone.unshift(record)

      if (record.type === 'editor') {
        this._editorCount = Math.max(0, this._editorCount - 1)
      }
    } finally {
      this._isUndoRedo = false
    }

    this._notify()
    return true
  }

  /**
   * Redo the last undone change
   * @param {(record: object) => void} handler - Called with the record to redo
   * @returns {boolean} Whether a redo was performed
   */
  redo(handler) {
    if (this._undone.length === 0) return false

    this._isUndoRedo = true
    try {
      const record = this._undone.shift()
      handler(record)
      this._done.push(record)

      if (record.type === 'editor') {
        this._editorCount++
      }
    } finally {
      this._isUndoRedo = false
    }

    this._notify()
    return true
  }

  // ─── State ──────────────────────────────────────────────────────────────

  get canUndo() {
    return this._done.length > 0
  }

  get canRedo() {
    return this._undone.length > 0
  }

  get isUndoRedo() {
    return this._isUndoRedo
  }

  get doneCount() {
    return this._done.length
  }

  get undoneCount() {
    return this._undone.length
  }

  // ─── Clear ──────────────────────────────────────────────────────────────

  clear() {
    this._done = []
    this._undone = []
    this._editorCount = 0
    this._notify()
  }

  // ─── Listeners ──────────────────────────────────────────────────────────

  onChange(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    for (const listener of this._listeners) {
      listener({
        canUndo: this.canUndo,
        canRedo: this.canRedo,
        doneCount: this.doneCount,
        undoneCount: this.undoneCount,
      })
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  _isEqual(a, b) {
    if (a === b) return true
    if (a === null || b === null) return a === b
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false
        return a.every((item, i) => this._isEqual(item, b[i]))
      }

      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      return keysA.every((key) => keysB.includes(key) && this._isEqual(a[key], b[key]))
    }

    return false
  }
}

let _instance = null

/**
 * Get or create the singleton UndoManager
 */
export function getUndoManager() {
  if (!_instance) {
    _instance = new UndoManager()
  }
  return _instance
}

/**
 * Create a fresh UndoManager instance
 */
export function createUndoManager() {
  _instance = new UndoManager()
  return _instance
}
