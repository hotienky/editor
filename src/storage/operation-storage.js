/**
 * Operation Storage
 *
 * Manages document operations - individual changes to the document.
 * Operations are append-only and never deleted.
 *
 * Architecture: Layer 7 — Storage Engine
 */

// ─── Operation Types ───────────────────────────────────────────────────────

export const OperationType = {
  INSERT: 'insert',
  DELETE: 'delete',
  MOVE: 'move',
  REPLACE: 'replace',
  FORMAT: 'format',
}

// ─── Operation Storage Class ───────────────────────────────────────────────

export class OperationStorage {
  constructor(adapter) {
    this._adapter = adapter
    this._pendingOps = new Map()
  }

  /**
   * Add a new operation
   * @param {string} documentId - Document identifier
   * @param {Object} operation - Operation data
   * @returns {Object} Created operation
   */
  add(documentId, operation) {
    const op = {
      id: this._generateId(),
      documentId,
      type: operation.type || OperationType.INSERT,
      position: operation.position || 0,
      data: operation.data || {},
      version: operation.version || Date.now(),
      createdAt: new Date().toISOString(),
      author: operation.author || 'Anonymous',
    }

    this._adapter.saveOperation(op)
    this._addToPending(documentId, op)

    return op
  }

  /**
   * Get an operation by ID
   * @param {string} id - Operation ID
   * @returns {Object|null}
   */
  get(id) {
    return this._adapter.getOperation(id)
  }

  /**
   * Get all operations for a document
   * @param {string} documentId - Document identifier
   * @param {number} [fromVersion] - Get operations after this version
   * @returns {Array<Object>}
   */
  getAll(documentId, fromVersion) {
    let ops = this._adapter.getOperationsByDocument(documentId)

    if (fromVersion !== undefined) {
      ops = ops.filter(op => op.version > fromVersion)
    }

    return ops.sort((a, b) => a.version - b.version)
  }

  /**
   * Get operations in a version range
   * @param {string} documentId - Document identifier
   * @param {number} fromVersion - Start version (inclusive)
   * @param {number} toVersion - End version (inclusive)
   * @returns {Array<Object>}
   */
  getRange(documentId, fromVersion, toVersion) {
    const ops = this.getAll(documentId)
    return ops.filter(op => op.version >= fromVersion && op.version <= toVersion)
  }

  /**
   * Get the latest version number for a document
   * @param {string} documentId - Document identifier
   * @returns {number}
   */
  getLatestVersion(documentId) {
    const ops = this.getAll(documentId)
    if (ops.length === 0) return 0
    return Math.max(...ops.map(op => op.version))
  }

  /**
   * Delete an operation (soft delete - marks as deleted)
   * @param {string} id - Operation ID
   * @returns {boolean}
   */
  delete(id) {
    return this._adapter.deleteOperation(id)
  }

  /**
   * Get pending operations (not yet synced)
   * @param {string} documentId - Document identifier
   * @returns {Array<Object>}
   */
  getPending(documentId) {
    return this._pendingOps.get(documentId) || []
  }

  /**
   * Mark operations as synced
   * @param {string} documentId - Document identifier
   * @param {Array<string>} operationIds - Operation IDs to mark as synced
   */
  markSynced(documentId, operationIds) {
    const pending = this._pendingOps.get(documentId) || []
    this._pendingOps.set(
      documentId,
      pending.filter(op => !operationIds.includes(op.id)),
    )
  }

  /**
   * Clear pending operations
   * @param {string} documentId
   */
  clearPending(documentId) {
    this._pendingOps.delete(documentId)
  }

  /**
   * Compress operations (merge consecutive similar operations)
   * @param {Array<Object>} operations - Operations to compress
   * @returns {Array<Object>}
   */
  compress(operations) {
    if (operations.length === 0) return []

    const compressed = []
    let current = { ...operations[0] }

    for (let i = 1; i < operations.length; i++) {
      const next = operations[i]

      // Try to merge consecutive insert operations at adjacent positions
      if (
        current.type === OperationType.INSERT &&
        next.type === OperationType.INSERT &&
        current.position + this._getDataLength(current.data) === next.position
      ) {
        current.data = this._mergeInsertData(current.data, next.data)
        continue
      }

      // Try to merge consecutive delete operations at the same position
      if (
        current.type === OperationType.DELETE &&
        next.type === OperationType.DELETE &&
        current.position === next.position
      ) {
        current.data = this._mergeDeleteData(current.data, next.data)
        continue
      }

      // Can't merge, push current and start new
      compressed.push(current)
      current = { ...next }
    }

    compressed.push(current)
    return compressed
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  _addToPending(documentId, op) {
    const pending = this._pendingOps.get(documentId) || []
    pending.push(op)
    this._pendingOps.set(documentId, pending)
  }

  _generateId() {
    return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  _getDataLength(data) {
    if (typeof data === 'string') return data.length
    if (data.text) return data.text.length
    return 0
  }

  _mergeInsertData(data1, data2) {
    const text1 = typeof data1 === 'string' ? data1 : data1.text || ''
    const text2 = typeof data2 === 'string' ? data2 : data2.text || ''
    return text1 + text2
  }

  _mergeDeleteData(data1, data2) {
    return {
      length: (data1.length || 0) + (data2.length || 0),
    }
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global operation storage
 * @param {Object} [adapter] - Storage adapter
 * @returns {OperationStorage}
 */
export function getOperationStorage(adapter) {
  if (!_instance) {
    _instance = new OperationStorage(adapter || createDefaultAdapter())
  }
  return _instance
}

/**
 * Create a new operation storage instance
 * @param {Object} adapter - Storage adapter
 * @returns {OperationStorage}
 */
export function createOperationStorage(adapter) {
  return new OperationStorage(adapter)
}

function createDefaultAdapter() {
  return {
    saveOperation: () => {},
    getOperation: () => null,
    getOperationsByDocument: () => [],
    deleteOperation: () => false,
  }
}

export default {
  OperationStorage,
  OperationType,
  getOperationStorage,
  createOperationStorage,
}
