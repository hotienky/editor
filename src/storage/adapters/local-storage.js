/**
 * Local Storage Adapter
 *
 * Browser localStorage adapter for document storage.
 * Stores documents, snapshots, operations, and versions in localStorage.
 *
 * Architecture: Layer 7 — Storage Engine
 */

// ─── Local Storage Adapter Class ───────────────────────────────────────────

export class LocalStorageAdapter {
  constructor(options = {}) {
    this._prefix = options.prefix || 'kindy:'
    this._storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  }

  // ─── Document Operations ─────────────────────────────────────────────

  /**
   * Save a document
   * @param {Object} doc - Document to save
   */
  saveDocument(doc) {
    this._set(`doc:${doc.id}`, doc)
  }

  /**
   * Get a document by ID
   * @param {string} id - Document ID
   * @returns {Object|null}
   */
  getDocument(id) {
    return this._get(`doc:${id}`)
  }

  /**
   * Get all documents
   * @returns {Array<Object>}
   */
  getAllDocuments() {
    const docs = []
    for (let i = 0; i < this._storage.length; i++) {
      const key = this._storage.key(i)
      if (key?.startsWith(`${this._prefix}doc:`)) {
        const doc = this._get(key.slice(this._prefix.length))
        if (doc) docs.push(doc)
      }
    }
    return docs
  }

  /**
   * Delete a document
   * @param {string} id - Document ID
   * @returns {boolean}
   */
  deleteDocument(id) {
    return this._remove(`doc:${id}`)
  }

  // ─── Snapshot Operations ─────────────────────────────────────────────

  /**
   * Save a snapshot
   * @param {Object} snapshot - Snapshot to save
   */
  saveSnapshot(snapshot) {
    this._set(`snap:${snapshot.id}`, snapshot)

    // Update latest snapshot index
    const index = this._get(`snap-index:${snapshot.documentId}`) || []
    index.push(snapshot.id)
    this._set(`snap-index:${snapshot.documentId}`, index)
  }

  /**
   * Get a snapshot by ID
   * @param {string} id - Snapshot ID
   * @returns {Object|null}
   */
  getSnapshot(id) {
    return this._get(`snap:${id}`)
  }

  /**
   * Get the latest snapshot for a document
   * @param {string} documentId - Document ID
   * @returns {Object|null}
   */
  getLatestSnapshot(documentId) {
    const index = this._get(`snap-index:${documentId}`) || []
    if (index.length === 0) return null

    const latestId = index[index.length - 1]
    return this.getSnapshot(latestId)
  }

  /**
   * Get all snapshots for a document
   * @param {string} documentId - Document ID
   * @returns {Array<Object>}
   */
  getSnapshotsByDocument(documentId) {
    const index = this._get(`snap-index:${documentId}`) || []
    return index
      .map(id => this.getSnapshot(id))
      .filter(Boolean)
  }

  /**
   * Delete a snapshot
   * @param {string} id - Snapshot ID
   * @returns {boolean}
   */
  deleteSnapshot(id) {
    return this._remove(`snap:${id}`)
  }

  // ─── Operation Operations ────────────────────────────────────────────

  /**
   * Save an operation
   * @param {Object} operation - Operation to save
   */
  saveOperation(operation) {
    this._set(`op:${operation.id}`, operation)

    // Update operations index
    const index = this._get(`op-index:${operation.documentId}`) || []
    index.push(operation.id)
    this._set(`op-index:${operation.documentId}`, index)
  }

  /**
   * Get an operation by ID
   * @param {string} id - Operation ID
   * @returns {Object|null}
   */
  getOperation(id) {
    return this._get(`op:${id}`)
  }

  /**
   * Get all operations for a document
   * @param {string} documentId - Document ID
   * @returns {Array<Object>}
   */
  getOperationsByDocument(documentId) {
    const index = this._get(`op-index:${documentId}`) || []
    return index
      .map(id => this.getOperation(id))
      .filter(Boolean)
  }

  /**
   * Delete an operation
   * @param {string} id - Operation ID
   * @returns {boolean}
   */
  deleteOperation(id) {
    return this._remove(`op:${id}`)
  }

  // ─── Version Operations ──────────────────────────────────────────────

  /**
   * Save a version
   * @param {Object} version - Version to save
   */
  saveVersion(version) {
    this._set(`ver:${version.id}`, version)

    // Update versions index
    const index = this._get(`ver-index:${version.documentId}`) || []
    index.push(version.id)
    this._set(`ver-index:${version.documentId}`, index)
  }

  /**
   * Get a version by ID
   * @param {string} id - Version ID
   * @returns {Object|null}
   */
  getVersion(id) {
    return this._get(`ver:${id}`)
  }

  /**
   * Get all versions for a document
   * @param {string} documentId - Document ID
   * @returns {Array<Object>}
   */
  getVersionsByDocument(documentId) {
    const index = this._get(`ver-index:${documentId}`) || []
    return index
      .map(id => this.getVersion(id))
      .filter(Boolean)
  }

  /**
   * Delete a version
   * @param {string} id - Version ID
   * @returns {boolean}
   */
  deleteVersion(id) {
    return this._remove(`ver:${id}`)
  }

  // ─── Utility Methods ─────────────────────────────────────────────────

  /**
   * Clear all storage
   */
  clear() {
    const keys = []
    for (let i = 0; i < this._storage.length; i++) {
      const key = this._storage.key(i)
      if (key?.startsWith(this._prefix)) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      this._storage.removeItem(key)
    }
  }

  /**
   * Get storage usage in bytes
   * @returns {number}
   */
  getUsage() {
    let total = 0
    for (let i = 0; i < this._storage.length; i++) {
      const key = this._storage.key(i)
      if (key?.startsWith(this._prefix)) {
        const value = this._storage.getItem(key)
        total += key.length + (value?.length || 0)
      }
    }
    return total * 2 // UTF-16 encoding
  }

  // ─── Internal Methods ────────────────────────────────────────────────

  _get(key) {
    try {
      const value = this._storage.getItem(`${this._prefix}${key}`)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  _set(key, value) {
    try {
      this._storage.setItem(`${this._prefix}${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn('[LocalStorageAdapter] Failed to save:', e)
    }
  }

  _remove(key) {
    try {
      this._storage.removeItem(`${this._prefix}${key}`)
      return true
    } catch {
      return false
    }
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a LocalStorageAdapter instance
 * @param {Object} [options] - Configuration options
 * @returns {LocalStorageAdapter}
 */
export function createLocalStorageAdapter(options) {
  return new LocalStorageAdapter(options)
}

export default {
  LocalStorageAdapter,
  createLocalStorageAdapter,
}
