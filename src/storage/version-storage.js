/**
 * Version Storage
 *
 * Manages document versions - named checkpoints with metadata.
 * Versions reference snapshots for quick restoration.
 *
 * Architecture: Layer 7 — Storage Engine
 */

// ─── Version Storage Class ─────────────────────────────────────────────────

export class VersionStorage {
  constructor(adapter, snapshotStorage) {
    this._adapter = adapter
    this._snapshotStorage = snapshotStorage
  }

  /**
   * Create a new version
   * @param {string} documentId - Document identifier
   * @param {string} name - Version name
   * @param {string} [description] - Version description
   * @param {Object} [meta] - Additional metadata
   * @returns {Object} Created version
   */
  create(documentId, name, description = '', meta = {}) {
    // Get or create snapshot for this version
    let snapshot = this._snapshotStorage.getLatest(documentId)
    if (!snapshot) {
      // Create a snapshot if none exists
      snapshot = this._snapshotStorage.create(documentId, meta.content || {}, {
        author: meta.author,
        description: name,
      })
    }

    const version = {
      id: this._generateId(),
      documentId,
      name,
      description,
      snapshotId: snapshot.id,
      createdAt: new Date().toISOString(),
      author: meta.author || 'Anonymous',
    }

    this._adapter.saveVersion(version)
    return version
  }

  /**
   * Get a version by ID
   * @param {string} id - Version ID
   * @returns {Object|null}
   */
  get(id) {
    return this._adapter.getVersion(id)
  }

  /**
   * Get all versions for a document
   * @param {string} documentId - Document identifier
   * @returns {Array<Object>}
   */
  getAll(documentId) {
    const versions = this._adapter.getVersionsByDocument(documentId)
    return versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get the latest version
   * @param {string} documentId - Document identifier
   * @returns {Object|null}
   */
  getLatest(documentId) {
    const versions = this.getAll(documentId)
    return versions[0] || null
  }

  /**
   * Update a version's metadata
   * @param {string} id - Version ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null}
   */
  update(id, updates) {
    const version = this.get(id)
    if (!version) return null

    const updated = {
      ...version,
      ...updates,
      id: version.id, // Prevent ID change
      documentId: version.documentId, // Prevent document change
    }

    this._adapter.saveVersion(updated)
    return updated
  }

  /**
   * Delete a version
   * @param {string} id - Version ID
   * @returns {boolean}
   */
  delete(id) {
    return this._adapter.deleteVersion(id)
  }

  /**
   * Restore a document to a specific version
   * @param {string} versionId - Version ID to restore
   * @returns {Object|null} Document content
   */
  restore(versionId) {
    const version = this.get(versionId)
    if (!version) return null

    const snapshot = this._snapshotStorage.get(version.snapshotId)
    if (!snapshot) return null

    return structuredClone(snapshot.content)
  }

  /**
   * Compare two versions
   * @param {string} idA - Version A ID
   * @param {string} idB - Version B ID
   * @returns {Object|null}
   */
  compare(idA, idB) {
    const versionA = this.get(idA)
    const versionB = this.get(idB)

    if (!versionA || !versionB) return null

    const snapshotA = this._snapshotStorage.get(versionA.snapshotId)
    const snapshotB = this._snapshotStorage.get(versionB.snapshotId)

    if (!snapshotA || !snapshotB) return null

    return {
      versionA: { id: versionA.id, name: versionA.name, createdAt: versionA.createdAt },
      versionB: { id: versionB.id, name: versionB.name, createdAt: versionB.createdAt },
      contentChanged: JSON.stringify(snapshotA.content) !== JSON.stringify(snapshotB.content),
    }
  }

  /**
   * Get version statistics
   * @param {string} documentId - Document identifier
   * @returns {Object}
   */
  getStats(documentId) {
    const versions = this.getAll(documentId)
    return {
      total: versions.length,
      firstVersion: versions[versions.length - 1] || null,
      lastVersion: versions[0] || null,
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  _generateId() {
    return `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global version storage
 * @param {Object} [adapter] - Storage adapter
 * @param {Object} [snapshotStorage] - Snapshot storage instance
 * @returns {VersionStorage}
 */
export function getVersionStorage(adapter, snapshotStorage) {
  if (!_instance) {
    const snapStorage = snapshotStorage || createDefaultSnapshotStorage()
    _instance = new VersionStorage(adapter || createDefaultAdapter(), snapStorage)
  }
  return _instance
}

/**
 * Create a new version storage instance
 * @param {Object} adapter - Storage adapter
 * @param {Object} snapshotStorage - Snapshot storage instance
 * @returns {VersionStorage}
 */
export function createVersionStorage(adapter, snapshotStorage) {
  return new VersionStorage(adapter, snapshotStorage)
}

function createDefaultAdapter() {
  return {
    saveVersion: () => {},
    getVersion: () => null,
    getVersionsByDocument: () => [],
    deleteVersion: () => false,
  }
}

function createDefaultSnapshotStorage() {
  return {
    getLatest: () => null,
    get: () => null,
    create: () => ({ id: 'snap-default' }),
  }
}

export default {
  VersionStorage,
  getVersionStorage,
  createVersionStorage,
}
