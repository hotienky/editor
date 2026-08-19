/**
 * Layout Worker Manager
 *
 * Manages communication with the layout web worker.
 * Provides a Promise-based API for offloading layout computation.
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Worker Manager ────────────────────────────────────────────────────────

export class LayoutWorkerManager {
  constructor() {
    this.worker = null
    this.pendingMessages = new Map()
    this.messageCounter = 0
    this.initialized = false
  }

  /**
   * Initialize the worker
   * @param {Object} config - Layout configuration
   * @returns {Promise<void>}
   */
  async init(config) {
    if (this.worker) {
      this.terminate()
    }

    // Create worker
    const workerUrl = new URL('./layout-worker.js', import.meta.url)
    this.worker = new Worker(workerUrl)

    // Set up message handler
    this.worker.onmessage = (e) => {
      this.handleMessage(e.data)
    }

    // Set up error handler
    this.worker.onerror = (error) => {
      console.error('Layout worker error:', error)
    }

    // Send init message
    return this.postMessage('INIT', { config })
  }

  /**
   * Compute layout using the worker
   * @param {Object} doc - Document to layout
   * @param {Object} options - Layout options
   * @returns {Promise<Object>} Layout result
   */
  async computeLayout(doc, options = {}) {
    return this.postMessage('LAYOUT', { doc, options })
  }

  /**
   * Measure nodes using the worker
   * @param {Array} nodes - Nodes to measure
   * @param {number} width - Available width
   * @param {Object} defaults - Default styles
   * @returns {Promise<Array>} Measurement results
   */
  async measureNodes(nodes, width, defaults = {}) {
    return this.postMessage('MEASURE', { nodes, width, defaults })
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   * @returns {Promise<void>}
   */
  async updateConfig(newConfig) {
    return this.postMessage('RESIZE', { newConfig })
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.initialized = false
      this.pendingMessages.clear()
    }
  }

  /**
   * Check if worker is available
   * @returns {boolean}
   */
  isAvailable() {
    return typeof Worker !== 'undefined'
  }

  /**
   * Post a message to the worker and wait for response
   * @private
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   * @returns {Promise<Object>}
   */
  postMessage(type, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageCounter

      // Store pending message
      this.pendingMessages.set(id, { resolve, reject })

      // Send message to worker
      this.worker.postMessage({ type, payload, id })

      // Set timeout for response
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id)
          reject(new Error(`Worker message timeout: ${type}`))
        }
      }, 30000) // 30 second timeout
    })
  }

  /**
   * Handle message from worker
   * @private
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    const { type, id, result, error } = data

    // Handle completion messages
    if (type.endsWith('_COMPLETE') || type === 'ERROR') {
      const pending = this.pendingMessages.get(id)
      if (pending) {
        this.pendingMessages.delete(id)

        if (type === 'ERROR') {
          pending.reject(new Error(error))
        } else {
          pending.resolve(result)
        }
      }
    }
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────

let workerManager = null

/**
 * Get or create the worker manager singleton
 * @param {Object} config - Configuration (only used on first init)
 * @returns {LayoutWorkerManager}
 */
export function getWorkerManager(config) {
  if (!workerManager) {
    workerManager = new LayoutWorkerManager()
  }
  return workerManager
}

/**
 * Check if Web Workers are available
 * @returns {boolean}
 */
export function isWorkerAvailable() {
  return typeof Worker !== 'undefined'
}

export default {
  LayoutWorkerManager,
  getWorkerManager,
  isWorkerAvailable,
}
