/**
 * Collaboration Engine — Version History
 *
 * Snapshot-based version history with persistence.
 * Stores document snapshots with metadata for browsing and restoring.
 */

/**
 * Version history manager
 */
export class VersionHistory {
  constructor(options = {}) {
    this._versions = []
    this._maxVersions = options.maxVersions || 100
    this._storageKey = options.storageKey || 'kindy-version-history'
    this._listeners = new Set()

    this._loadFromStorage()
  }

  // ─── Snapshot Management ────────────────────────────────────────────────

  /**
   * Create a snapshot of the current document
   * @param {Object} doc - Document JSON (from editor.getJSON())
   * @param {Object} [meta] - { author, description, tags }
   * @returns {Object} The created version
   */
  createSnapshot(doc, meta = {}) {
    const version = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      author: meta.author || 'Anonymous',
      description: meta.description || '',
      tags: meta.tags || [],
      doc: JSON.parse(JSON.stringify(doc)),
      isCurrent: false,
    }

    this._versions.unshift(version)
    this._trimToMax()
    this._saveToStorage()
    this._notify()

    return version
  }

  /**
   * Mark a version as current
   * @param {string} versionId
   */
  markCurrent(versionId) {
    for (const v of this._versions) {
      v.isCurrent = v.id === versionId
    }
    this._saveToStorage()
    this._notify()
  }

  /**
   * Restore a version by ID
   * @param {string} versionId
   * @returns {Object|null} The document JSON to restore
   */
  restore(versionId) {
    const version = this._versions.find((v) => v.id === versionId)
    if (!version) return null

    this.markCurrent(versionId)
    return JSON.parse(JSON.stringify(version.doc))
  }

  /**
   * Delete a version
   * @param {string} versionId
   */
  delete(versionId) {
    this._versions = this._versions.filter((v) => v.id !== versionId)
    this._saveToStorage()
    this._notify()
  }

  // ─── Query ──────────────────────────────────────────────────────────────

  /**
   * Get all versions
   * @returns {Array<Object>}
   */
  getVersions() {
    return this._versions.map((v) => ({
      id: v.id,
      timestamp: v.timestamp,
      author: v.author,
      description: v.description,
      tags: v.tags,
      isCurrent: v.isCurrent,
      formattedTime: this._formatTime(v.timestamp),
    }))
  }

  /**
   * Get a specific version
   * @param {string} versionId
   * @returns {Object|null}
   */
  getVersion(versionId) {
    const v = this._versions.find((v) => v.id === versionId)
    if (!v) return null
    return {
      ...v,
      doc: JSON.parse(JSON.stringify(v.doc)),
    }
  }

  /**
   * Get the current version
   * @returns {Object|null}
   */
  getCurrentVersion() {
    return this._versions.find((v) => v.isCurrent) || null
  }

  /**
   * Get the number of versions
   * @returns {number}
   */
  get count() {
    return this._versions.length
  }

  // ─── Comparison ─────────────────────────────────────────────────────────

  /**
   * Compare two versions and return differences
   * @param {string} versionIdA
   * @param {string} versionIdB
   * @returns {Object|null} Diff result
   */
  compare(versionIdA, versionIdB) {
    const vA = this._versions.find((v) => v.id === versionIdA)
    const vB = this._versions.find((v) => v.id === versionIdB)
    if (!vA || !vB) return null

    return {
      versionA: { id: vA.id, timestamp: vA.timestamp },
      versionB: { id: vB.id, timestamp: vB.timestamp },
      contentChanged: JSON.stringify(vA.doc) !== JSON.stringify(vB.doc),
    }
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  /**
   * Clear all versions
   */
  clear() {
    this._versions = []
    this._saveToStorage()
    this._notify()
  }

  /**
   * Export versions as JSON
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(this._versions, null, 2)
  }

  /**
   * Import versions from JSON
   * @param {string} json
   */
  importJSON(json) {
    try {
      const imported = JSON.parse(json)
      if (Array.isArray(imported)) {
        this._versions = imported
        this._trimToMax()
        this._saveToStorage()
        this._notify()
      }
    } catch (e) {
      console.warn('[VersionHistory] Failed to import:', e)
    }
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to version changes
   * @param {(versions: Array) => void} listener
   * @returns {Function} Unsubscribe
   */
  onChange(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    const versions = this.getVersions()
    for (const listener of this._listeners) {
      listener(versions)
    }
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(this._storageKey)
      if (stored) {
        this._versions = JSON.parse(stored)
      }
    } catch (e) {
      this._versions = []
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._versions))
    } catch (e) {
      // Storage full or unavailable
    }
  }

  _trimToMax() {
    if (this._versions.length > this._maxVersions) {
      this._versions = this._versions.slice(0, this._maxVersions)
    }
  }

  _formatTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`

    const date = new Date(timestamp)
    const today = new Date()

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

let _instance = null

/**
 * Get or create the singleton VersionHistory
 */
export function getVersionHistory(options) {
  if (!_instance) {
    _instance = new VersionHistory(options)
  }
  return _instance
}

/**
 * Create a fresh VersionHistory instance
 */
export function createVersionHistory(options) {
  _instance = new VersionHistory(options)
  return _instance
}
