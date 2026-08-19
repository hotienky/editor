/**
 * Worker Pool Manager
 *
 * Manages a pool of Web Workers for parallel processing.
 *
 * Architecture: Performance Layer — Worker Pool
 */

export class WorkerPool {
  constructor(options = {}) {
    this.workers = []
    this.taskQueue = []
    this.workerStates = new Map()
    this.maxWorkers = options.maxWorkers || navigator.hardwareConcurrency || 4
    this.workerScript = options.workerScript || ''
    this.onTaskComplete = options.onTaskComplete || (() => {})
    this.onWorkerError = options.onWorkerError || (() => {})
    this.initialized = false
  }

  /**
   * Initialize worker pool
   */
  async init() {
    if (this.initialized) return

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = this.createWorker(i)
      this.workers.push(worker)
      this.workerStates.set(i, { busy: false, task: null })
    }

    this.initialized = true
  }

  /**
   * Create a single worker
   */
  createWorker(id) {
    const worker = new Worker(this.workerScript || this.getWorkerBlob(), {
      type: 'module',
    })

    worker.id = id

    worker.onmessage = (event) => {
      this.handleWorkerMessage(id, event.data)
    }

    worker.onerror = (error) => {
      this.onWorkerError(id, error)
      this.workerStates.set(id, { busy: false, task: null })
      this.processQueue()
    }

    return worker
  }

  /**
   * Get worker blob for inline workers
   */
  getWorkerBlob() {
    const code = `
      self.onmessage = function(event) {
        const { id, task, data } = event.data;

        try {
          // Process task based on type
          let result;

          switch (task) {
            case 'computeLayout':
              result = computeLayout(data);
              break;
            case 'measureText':
              result = measureText(data);
              break;
            case 'processContent':
              result = processContent(data);
              break;
            default:
              result = data;
          }

          self.postMessage({ id, result, error: null });
        } catch (error) {
          self.postMessage({ id, result: null, error: error.message });
        }
      };

      function computeLayout(data) {
        // Simplified layout computation
        const { blocks, pageOptions } = data;
        const { width, height } = pageOptions.size || { width: 21, height: 29.7 };
        const margin = pageOptions.margin || { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 };

        const contentWidth = width - margin.left - margin.right;
        const contentHeight = height - margin.top - margin.bottom;

        let currentHeight = 0;
        let pageNumber = 1;
        const pages = [];

        for (const block of blocks) {
          const blockHeight = estimateBlockHeight(block, contentWidth);

          if (currentHeight + blockHeight > contentHeight) {
            pageNumber++
            currentHeight = 0
          }

          currentHeight += blockHeight
        }

        return { totalPages: pageNumber, pages: [{ pageNumber: 1, width, height }] };
      }

      function estimateBlockHeight(block, contentWidth) {
        // Simplified height estimation
        switch (block.type) {
          case 'heading':
            return 1.5;
          case 'paragraph':
            return 0.8;
          case 'list':
            return 0.6 * (block.content?.length || 1);
          default:
            return 1.0;
        }
      }

      function measureText(data) {
        // Placeholder for text measurement
        return { width: data.text.length * 0.5, height: 1.0 };
      }

      function processContent(data) {
        return data;
      }
    `

    const blob = new Blob([code], { type: 'application/javascript' })
    return URL.createObjectURL(blob)
  }

  /**
   * Submit task to worker pool
   */
  async submit(task, data) {
    return new Promise((resolve, reject) => {
      const taskObj = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        task,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      }

      this.taskQueue.push(taskObj)
      this.processQueue()
    })
  }

  /**
   * Process task queue
   */
  processQueue() {
    if (this.taskQueue.length === 0) return

    // Find available worker
    for (let i = 0; i < this.maxWorkers; i++) {
      const state = this.workerStates.get(i)
      if (!state.busy) {
        const task = this.taskQueue.shift()
        if (task) {
          this.executeTask(i, task)
        }
        break
      }
    }
  }

  /**
   * Execute task on specific worker
   */
  executeTask(workerId, task) {
    const worker = this.workers[workerId]
    if (!worker) return

    this.workerStates.set(workerId, { busy: true, task })

    worker.postMessage({
      id: task.id,
      task: task.task,
      data: task.data,
    })
  }

  /**
   * Handle worker message
   */
  handleWorkerMessage(workerId, message) {
    const state = this.workerStates.get(workerId)
    const task = state?.task

    this.workerStates.set(workerId, { busy: false, task: null })

    if (task) {
      if (message.error) {
        task.reject(new Error(message.error))
      } else {
        task.resolve(message.result)
        this.onTaskComplete(task.id, message.result)
      }
    }

    // Process next task in queue
    this.processQueue()
  }

  /**
   * Get pool statistics
   */
  getStats() {
    let busyCount = 0
    for (const state of this.workerStates.values()) {
      if (state.busy) busyCount++
    }

    return {
      totalWorkers: this.maxWorkers,
      busyWorkers: busyCount,
      idleWorkers: this.maxWorkers - busyCount,
      queuedTasks: this.taskQueue.length,
    }
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach((worker) => {
      worker.terminate()
    })

    this.workers = []
    this.workerStates.clear()
    this.taskQueue = []
    this.initialized = false
  }
}

export default WorkerPool
