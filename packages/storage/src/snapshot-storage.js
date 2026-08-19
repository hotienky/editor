/**
 * Snapshot Storage
 *
 * Manages document snapshots - complete document states at points in time.
 * Snapshots are immutable and never modified after creation.
 *
 * Architecture: Layer 7 — Storage Engine
 */

// ─── Snapshot Storage Class ────────────────────────────────────────────────

export class SnapshotStorage {
  constructor(adapter) {
    this._adapter = adapter
    this._cache = new Map()
  }

  /**
   * Create a new snapshot
   * @param {string} documentId - Document identifier
   * @param {Object} content - Document content (AST)
   * @param {Object} [meta] - Metadata { author, description }
   * @returns {Object} Created snapshot
   */
  create(documentId, content, meta = {}) {
    const snapshot = {
      id: this._generateId(),
      documentId,
      content: JSON.parse(JSON.stringify(content)), // Deep clone
      version: Date.now(),
      createdAt: new Date().toISOString(),
      metadata: {
        author: meta.author || 'Anonymous',
        description: meta.description || '',
      },
    }

    this._adapter.saveSnapshot(snapshot)
    this._cache.set(`${documentId}:latest`, snapshot)

    return snapshot
  }

  /**
   * Get a snapshot by ID
   * @param {string} id - Snapshot ID
   * @returns {Object|null}
   */
  get(id) {
    return this._adapter.getSnapshot(id)
  }

  /**
   * Get the latest snapshot for a document
   * @param {string} documentId - Document identifier
   * @returns {Object|null}
   */
  getLatest(documentId) {
    const cacheKey = `${documentId}:latest`
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)
    }

    const snapshot = this._adapter.getLatestSnapshot(documentId)
    if (snapshot) {
      this._cache.set(cacheKey, snapshot)
    }
    return snapshot
  }

  /**
   * Get all snapshots for a document
   * @param {string} documentId - Document identifier
   * @returns {Array<Object>}
   */
  getAll(documentId) {
    return this._adapter.getSnapshotsByDocument(documentId)
  }

  /**
   * Get snapshots created after a specific version
   * @param {string} documentId - Document identifier
   * @param {number} afterVersion - Version number
   * @returns {Array<Object>}
   */
  getAfterVersion(documentId, afterVersion) {
    const snapshots = this.getAll(documentId)
    return snapshots.filter(s => s.version > afterVersion)
  }

  /**
   * Delete a snapshot
   * @param {string} id - Snapshot ID
   * @returns {boolean}
   */
  delete(id) {
    return this._adapter.deleteSnapshot(id)
  }

  /**
   * Delete old snapshots, keeping only the latest N
   * @param {string} documentId - Document identifier
   * @param {number} keepCount - Number of snapshots to keep
   * @returns {number} Number of deleted snapshots
   */
  prune(documentId, keepCount = 10) {
    const snapshots = this.getAll(documentId)
    if (snapshots.length <= keepCount) return 0

    // Sort by version (newest first)
    snapshots.sort((a, b) => b.version - a.version)

    // Delete old snapshots
    const toDelete = snapshots.slice(keepCount)
    for (const snapshot of toDelete) {
      this.delete(snapshot.id)
    }

    return toDelete.length
  }

  /**
   * Compare two snapshots
   * @param {string} idA - Snapshot A ID
   * @param {string} idB - Snapshot B ID
   * @returns {Object} Comparison result
   */
  compare(idA, idB) {
    const snapA = this.get(idA)
    const snapB = this.get(idB)

    if (!snapA || !snapB) return null

    const contentA = JSON.stringify(snapA.content)
    const contentB = JSON.stringify(snapB.content)

    return {
      snapshotA: { id: snapA.id, version: snapA.version, createdAt: snapA.createdAt },
      snapshotB: { id: snapB.id, version: snapB.version, createdAt: snapB.createdAt },
      contentChanged: contentA !== contentB,
      sizeDiff: contentB.length - contentA.length,
    }
  }

  /**
   * Clear cache for a document
   * @param {string} documentId
   */
  clearCache(documentId) {
    this._cache.delete(`${documentId}:latest`)
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this._cache.clear()
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  _generateId() {
    return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global snapshot storage
 * @param {Object} [adapter] - Storage adapter
 * @returns {SnapshotStorage}
 */
export function getSnapshotStorage(adapter) {
  if (!_instance) {
    _instance = new SnapshotStorage(adapter || createDefaultAdapter())
  }
  return _instance
}

/**
 * Create a new snapshot storage instance
 * @param {Object} adapter - Storage adapter
 * @returns {SnapshotStorage}
 */
export function createSnapshotStorage(adapter) {
  return new SnapshotStorage(adapter)
}

function createDefaultAdapter() {
  // Will be imported from adapters
  return {
    saveSnapshot: () => {},
    getSnapshot: () => null,
    getLatestSnapshot: () => null,
    getSnapshotsByDocument: () => [],
    deleteSnapshot: () => false,
  }
}

export default {
  SnapshotStorage,
  getSnapshotStorage,
  createSnapshotStorage,
}
