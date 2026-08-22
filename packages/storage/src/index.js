/**
 * Storage Engine — Public API
 *
 * Single entry point for the Storage Engine layer.
 * Handles document persistence, snapshots, operations, and version history.
 *
 * Architecture: Layer 7 — Storage Engine
 */

// ─── Snapshot Storage ──────────────────────────────────────────────────────

export {
  SnapshotStorage,
  getSnapshotStorage,
  createSnapshotStorage,
} from './snapshot-storage'

// ─── Operation Storage ─────────────────────────────────────────────────────

export {
  OperationStorage,
  getOperationStorage,
  createOperationStorage,
} from './operation-storage'

// ─── Version History ───────────────────────────────────────────────────────

export {
  VersionStorage,
  getVersionStorage,
  createVersionStorage,
} from './version-storage'

// ─── Local Storage Adapter ─────────────────────────────────────────────────

export {
  LocalStorageAdapter,
  createLocalStorageAdapter,
} from './adapters/local-storage'

// ─── Convenience Functions ─────────────────────────────────────────────────

import { SnapshotStorage, getSnapshotStorage, createSnapshotStorage } from './snapshot-storage'
import { OperationStorage, getOperationStorage, createOperationStorage } from './operation-storage'
import { VersionStorage, getVersionStorage, createVersionStorage } from './version-storage'
import { LocalStorageAdapter, createLocalStorageAdapter } from './adapters/local-storage'

/**
 * Initialize storage for a document
 * @param {string} documentId - Document identifier
 */
export function initStorage(documentId) {
  const snapshots = getSnapshotStorage()
  const operations = getOperationStorage()
  const versions = getVersionStorage()

  return {
    snapshots,
    operations,
    versions,

    // Convenience methods
    save: (doc, meta) => {
      const snapshot = snapshots.create(documentId, doc, meta)
      return snapshot
    },

    load: () => {
      const snapshot = snapshots.getLatest(documentId)
      return snapshot?.content || null
    },

    addOperation: (op) => {
      return operations.add(documentId, op)
    },

    getOperations: (fromVersion) => {
      return operations.getAll(documentId, fromVersion)
    },

    createVersion: (name, description) => {
      return versions.create(documentId, name, description)
    },

    getVersions: () => {
      return versions.getAll(documentId)
    },

    restoreVersion: (versionId) => {
      return versions.restore(versionId)
    },
  }
}

export default {
  // Snapshot Storage
  getSnapshotStorage,
  createSnapshotStorage,

  // Operation Storage
  getOperationStorage,
  createOperationStorage,

  // Version Storage
  getVersionStorage,
  createVersionStorage,

  // Adapters
  createLocalStorageAdapter,

  // Convenience
  initStorage,
}
