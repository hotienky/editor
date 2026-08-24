/**
 * Parallel Layout Workers
 *
 * Distributes layout computation across multiple Web Workers
 * for large documents (500+ pages). Splits document into chunks
 * and processes them in parallel.
 *
 * Architecture: Layer 3 — Layout Engine (parallel)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LayoutChunk
 * @property {number} chunkId - Unique chunk identifier
 * @property {number} startIndex - Start block index (inclusive)
 * @property {number} endIndex - End block index (inclusive)
 * @property {Array} nodes - AST nodes for this chunk
 * @property {Object} pageConfig - Page configuration
 */

/**
 * @typedef {Object} ChunkLayoutResult
 * @property {number} chunkId
 * @property {Array} pages - Page assignments for this chunk
 * @property {number} totalHeight
 * @property {number} totalPages
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 100 // Blocks per chunk
const DEFAULT_MAX_WORKERS = 4
const LAYOUT_TIMEOUT_MS = 30000

// ─── Parallel Layout Manager ────────────────────────────────────────────────

export class ParallelLayoutManager {
  constructor(options = {}) {
    this._chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE
    this._maxWorkers = options.maxWorkers || Math.min(
      DEFAULT_MAX_WORKERS,
      typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
    )
    this._workerScript = options.workerScript || null
    this._workers = []
    this._taskQueue = []
    this._workerStates = new Map()
    this._initialized = false
  }

  /**
   * Initialize worker pool
   */
  async init() {
    if (this._initialized) return

    if (typeof Worker === 'undefined') {
      console.warn('[ParallelLayout] Workers not available, will use main thread')
      this._initialized = true
      return
    }

    for (let i = 0; i < this._maxWorkers; i++) {
      const worker = this._createWorker(i)
      this._workers.push(worker)
      this._workerStates.set(i, { busy: false, task: null })
    }

    this._initialized = true
  }

  /**
   * Compute layout in parallel
   * @param {Array} nodes - All document nodes
   * @param {Object} pageConfig - Page configuration
   * @param {Object} options - Additional options
   * @returns {Promise<ParallelLayoutResult>}
   */
  async computeParallel(nodes, pageConfig, options = {}) {
    const startTime = performance.now()

    if (!this._initialized || this._workers.length === 0) {
      return this._computeSequential(nodes, pageConfig)
    }

    // Split nodes into chunks
    const chunks = this._splitIntoChunks(nodes, pageConfig)

    if (chunks.length <= 1) {
      return this._computeSequential(nodes, pageConfig)
    }

    // Process chunks in parallel
    const chunkResults = await this._processChunks(chunks, options)

    // Merge results
    const merged = this._mergeChunkResults(chunkResults, pageConfig)

    return {
      ...merged,
      elapsedMs: performance.now() - startTime,
      chunkCount: chunks.length,
      workerCount: this._workers.length,
    }
  }

  /**
   * Split nodes into chunks for parallel processing
   */
  _splitIntoChunks(nodes, pageConfig) {
    const chunks = []
    const chunkSize = this._chunkSize

    for (let i = 0; i < nodes.length; i += chunkSize) {
      const end = Math.min(i + chunkSize - 1, nodes.length - 1)
      chunks.push({
        chunkId: chunks.length,
        startIndex: i,
        endIndex: end,
        nodes: nodes.slice(i, end + 1),
        pageConfig,
      })
    }

    return chunks
  }

  /**
   * Process chunks across available workers
   */
  async _processChunks(chunks, options) {
    const results = []
    const queue = [...chunks]

    const processNext = async () => {
      if (queue.length === 0) return

      const workerId = this._getAvailableWorker()
      if (workerId === -1) {
        // Wait for a worker to become available
        await new Promise((resolve) => setTimeout(resolve, 10))
        return processNext()
      }

      const chunk = queue.shift()
      if (!chunk) return

      try {
        const result = await this._executeOnWorker(workerId, chunk)
        results.push(result)
      } catch (error) {
        console.warn(`[ParallelLayout] Chunk ${chunk.chunkId} failed:`, error)
        // Fallback to sequential for this chunk
        const fallbackResult = this._computeChunkSequential(chunk)
        results.push(fallbackResult)
      }

      // Process next chunk
      if (queue.length > 0) {
        return processNext()
      }
    }

    // Start processing with limited concurrency
    const concurrent = Math.min(this._workers.length, chunks.length)
    const promises = []
    for (let i = 0; i < concurrent; i++) {
      promises.push(processNext())
    }

    await Promise.all(promises)
    return results
  }

  /**
   * Execute a chunk on a specific worker
   */
  _executeOnWorker(workerId, chunk) {
    return new Promise((resolve, reject) => {
      const worker = this._workers[workerId]
      if (!worker) {
        reject(new Error('No worker available'))
        return
      }

      const timeout = setTimeout(() => {
        this._workerStates.set(workerId, { busy: false, task: null })
        reject(new Error('Worker timeout'))
      }, LAYOUT_TIMEOUT_MS)

      this._workerStates.set(workerId, { busy: true, task: chunk.chunkId })

      const handler = (event) => {
        if (event.data.chunkId !== chunk.chunkId) return

        clearTimeout(timeout)
        worker.removeEventListener('message', handler)

        this._workerStates.set(workerId, { busy: false, task: null })

        if (event.data.error) {
          reject(new Error(event.data.error))
        } else {
          resolve(event.data.result)
        }
      }

      worker.addEventListener('message', handler)
      worker.postMessage({
        type: 'LAYOUT_CHUNK',
        chunk: {
          chunkId: chunk.chunkId,
          nodes: chunk.nodes,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          pageConfig: chunk.pageConfig,
        },
      })
    })
  }

  /**
   * Get available worker ID
   */
  _getAvailableWorker() {
    for (let i = 0; i < this._maxWorkers; i++) {
      const state = this._workerStates.get(i)
      if (state && !state.busy) return i
    }
    return -1
  }

  /**
   * Merge chunk results into a single layout
   */
  _mergeChunkResults(chunkResults, pageConfig) {
    // Sort by chunk ID
    chunkResults.sort((a, b) => a.chunkId - b.chunkId)

    const allPages = []
    let pageNumber = 1
    let totalHeight = 0
    let contentOffsetY = 0

    for (const result of chunkResults) {
      for (const page of result.pages) {
        allPages.push({
          ...page,
          pageNumber,
          contentStartY: contentOffsetY,
          blockStart: page.blockStart,
          blockEnd: page.blockEnd,
        })
        contentOffsetY += page.height || 0
        totalHeight += page.height || 0
        pageNumber++
      }
    }

    return {
      totalPages: allPages.length,
      pages: allPages,
      totalHeight,
    }
  }

  /**
   * Sequential fallback for a single chunk
   */
  _computeChunkSequential(chunk) {
    // Simplified sequential computation
    return {
      chunkId: chunk.chunkId,
      pages: [{
        pageNumber: 1,
        blockStart: chunk.startIndex,
        blockEnd: chunk.endIndex,
        height: chunk.nodes.length * 24, // Estimated
      }],
      totalHeight: chunk.nodes.length * 24,
      totalPages: 1,
    }
  }

  /**
   * Sequential fallback for entire document
   */
  _computeSequential(nodes, pageConfig) {
    const startTime = performance.now()
    const estimatedHeight = nodes.length * 24
    const pageHeight = pageConfig?.contentHeight || 1000
    const totalPages = Math.ceil(estimatedHeight / pageHeight)

    const pages = []
    let contentOffsetY = 0

    for (let i = 0; i < totalPages; i++) {
      const height = Math.min(pageHeight, estimatedHeight - i * pageHeight)
      pages.push({
        pageNumber: i + 1,
        blockStart: Math.floor((i * pageHeight) / 24),
        blockEnd: Math.floor(((i + 1) * pageHeight) / 24) - 1,
        height,
        contentStartY: contentOffsetY,
      })
      contentOffsetY += height
    }

    return {
      totalPages,
      pages,
      totalHeight: estimatedHeight,
      elapsedMs: performance.now() - startTime,
      chunkCount: 1,
      workerCount: 0,
    }
  }

  /**
   * Create a layout worker
   */
  _createWorker(id) {
    if (this._workerScript) {
      return new Worker(this._workerScript, { type: 'module' })
    }

    // Inline worker code
    const code = `
      self.onmessage = function(event) {
        const { type, chunk } = event.data;

        if (type === 'LAYOUT_CHUNK') {
          try {
            const result = computeChunkLayout(chunk);
            self.postMessage({ chunkId: chunk.chunkId, result, error: null });
          } catch (error) {
            self.postMessage({ chunkId: chunk.chunkId, result: null, error: error.message });
          }
        }
      };

      function computeChunkLayout(chunk) {
        const { nodes, startIndex, endIndex, pageConfig } = chunk;
        const pageHeight = pageConfig?.contentHeight || 1000;
        const lineHeight = 24;

        let currentHeight = 0;
        let pageNumber = 1;
        const pages = [];
        let blockStart = startIndex;

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const blockHeight = estimateHeight(node, lineHeight);

          if (currentHeight + blockHeight > pageHeight && blockStart < startIndex + i) {
            pages.push({
              pageNumber,
              blockStart,
              blockEnd: startIndex + i - 1,
              height: currentHeight,
            });
            pageNumber++;
            currentHeight = 0;
            blockStart = startIndex + i;
          }

          currentHeight += blockHeight;
        }

        // Final page
        pages.push({
          pageNumber,
          blockStart,
          blockEnd: endIndex,
          height: currentHeight,
        });

        return {
          chunkId: chunk.chunkId,
          pages,
          totalHeight: pages.reduce((sum, p) => sum + p.height, 0),
          totalPages: pages.length,
        };
      }

      function estimateHeight(node, lineHeight) {
        if (!node) return lineHeight;
        switch (node.type) {
          case 'heading': return lineHeight * 2;
          case 'paragraph': return lineHeight * 1.5;
          case 'table': return lineHeight * (node.content?.length || 1) * 1.5;
          case 'image': return node.height || 200;
          default: return lineHeight * 2;
        }
      }
    `

    const blob = new Blob([code], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    const worker = new Worker(url)

    // Clean up URL after worker is created
    worker.addEventListener('error', () => {
      URL.revokeObjectURL(url)
    })

    return worker
  }

  /**
   * Terminate all workers
   */
  terminate() {
    for (const worker of this._workers) {
      worker.terminate()
    }
    this._workers = []
    this._workerStates.clear()
    this._initialized = false
  }

  /**
   * Get stats
   */
  getStats() {
    let busyCount = 0
    for (const state of this._workerStates.values()) {
      if (state.busy) busyCount++
    }

    return {
      totalWorkers: this._maxWorkers,
      busyWorkers: busyCount,
      idleWorkers: this._maxWorkers - busyCount,
      initialized: this._initialized,
    }
  }
}

export default ParallelLayoutManager
