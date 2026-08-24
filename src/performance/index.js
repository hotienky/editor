/**
 * @kindy/performance
 *
 * Performance utilities for Open Document Platform.
 *
 * Architecture: Performance Layer
 */

// ─── Virtual Scrolling ──────────────────────────────────────────────────────

export { VirtualScroller, PagePool } from './virtual-scrolling/index'

// ─── Worker Pool ────────────────────────────────────────────────────────────

export { WorkerPool } from './worker-pool/index'

// ─── Cache ──────────────────────────────────────────────────────────────────

export { CacheManager, MemoryCache, SessionCache, LayoutCache } from './cache/index'

// ─── Benchmark ──────────────────────────────────────────────────────────────

export { Benchmark, PerformanceMonitor, DocumentProfiler } from './benchmark/index'

// ─── Convenience Factory Functions ──────────────────────────────────────────

import { VirtualScroller } from './virtual-scrolling/index'
import { WorkerPool } from './worker-pool/index'
import { CacheManager, LayoutCache } from './cache/index'
import { DocumentProfiler } from './benchmark/index'

/**
 * Create a pre-configured performance toolkit
 */
export function createPerformanceToolkit(options = {}) {
  const cache = new CacheManager(options.cache)
  const layoutCache = new LayoutCache(cache)
  const workerPool = new WorkerPool(options.worker)
  const virtualScroller = new VirtualScroller(options.virtualScrolling)
  const profiler = new DocumentProfiler()

  return {
    cache,
    layoutCache,
    workerPool,
    virtualScroller,
    profiler,

    /**
     * Initialize all performance tools
     */
    async init() {
      await workerPool.init()
    },

    /**
     * Destroy all performance tools
     */
    destroy() {
      workerPool.terminate()
      virtualScroller.destroy()
      profiler.stopMonitoring()
      cache.clear()
    },

    /**
     * Get performance report
     */
    getReport() {
      return {
        cache: cache.getStats(),
        workerPool: workerPool.getStats(),
        profiler: profiler.getReport(),
      }
    },
  }
}

export default {
  VirtualScroller,
  PagePool,
  WorkerPool,
  CacheManager,
  MemoryCache,
  SessionCache,
  LayoutCache,
  Benchmark,
  PerformanceMonitor,
  DocumentProfiler,
  createPerformanceToolkit,
}
