/**
 * @umo/performance Tests
 *
 * Architecture: Test Layer — Performance Package
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  VirtualScroller,
  WorkerPool,
  CacheManager,
  MemoryCache,
  LayoutCache,
  Benchmark,
  PerformanceMonitor,
  DocumentProfiler,
  createPerformanceToolkit,
} from '../src/index'

describe('Performance Package', () => {
  describe('VirtualScroller', () => {
    let scroller

    beforeEach(() => {
      scroller = new VirtualScroller({
        bufferSize: 2,
        pageHeight: 100,
      })
    })

    it('should create virtual scroller instance', () => {
      expect(scroller).toBeDefined()
      expect(scroller.bufferSize).toBe(2)
      expect(scroller.pageHeight).toBe(100)
    })

    it('should have init method', () => {
      expect(typeof scroller.init).toBe('function')
    })

    it('should have scrollToPage method', () => {
      expect(typeof scroller.scrollToPage).toBe('function')
    })

    it('should have getVisiblePages method', () => {
      expect(typeof scroller.getVisiblePages).toBe('function')
    })

    it('should have destroy method', () => {
      expect(typeof scroller.destroy).toBe('function')
    })

    it('should return empty visible pages initially', () => {
      const visible = scroller.getVisiblePages()
      expect(visible).toEqual([])
    })
  })

  describe('WorkerPool', () => {
    let pool

    beforeEach(() => {
      pool = new WorkerPool({
        maxWorkers: 2,
        workerScript: 'blob:',
      })
    })

    it('should create worker pool instance', () => {
      expect(pool).toBeDefined()
      expect(pool.maxWorkers).toBe(2)
    })

    it('should have init method', () => {
      expect(typeof pool.init).toBe('function')
    })

    it('should have submit method', () => {
      expect(typeof pool.submit).toBe('function')
    })

    it('should have getStats method', () => {
      expect(typeof pool.getStats).toBe('function')
    })

    it('should have terminate method', () => {
      expect(typeof pool.terminate).toBe('function')
    })

    it('should return stats before init', () => {
      const stats = pool.getStats()
      expect(stats.totalWorkers).toBe(2)
      expect(stats.busyWorkers).toBe(0)
      expect(stats.idleWorkers).toBe(2)
      expect(stats.queuedTasks).toBe(0)
    })
  })

  describe('CacheManager', () => {
    let cache

    beforeEach(() => {
      cache = new CacheManager({
        l1MaxSize: 10,
      })
    })

    it('should create cache manager instance', () => {
      expect(cache).toBeDefined()
    })

    it('should set and get values', () => {
      cache.set('key1', { value: 'test' })

      const result = cache.get('key1')
      expect(result).toEqual({ value: 'test' })
    })

    it('should return undefined for missing keys', () => {
      const result = cache.get('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should delete values', () => {
      cache.set('key1', { value: 'test' })
      cache.delete('key1')

      const result = cache.get('key1')
      expect(result).toBeUndefined()
    })

    it('should clear all values', () => {
      cache.set('key1', { value: 'test1' })
      cache.set('key2', { value: 'test2' })
      cache.clear()

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
    })

    it('should track stats', () => {
      cache.set('key1', { value: 'test' })
      cache.get('key1')
      cache.get('nonexistent')

      const stats = cache.getStats()
      expect(stats.sets).toBe(1)
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
    })
  })

  describe('MemoryCache', () => {
    let cache

    beforeEach(() => {
      cache = new MemoryCache(5)
    })

    it('should create memory cache instance', () => {
      expect(cache).toBeDefined()
    })

    it('should set and get values', () => {
      cache.set('key1', { value: 'test' })

      const result = cache.get('key1')
      expect(result).toEqual({ value: 'test' })
    })

    it('should evict LRU entries', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, i)
      }

      // Access key0 to make it recently used
      cache.get('key0')

      // Add new entry - should evict key1 (oldest unused)
      cache.set('key5', 5)

      expect(cache.get('key0')).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should return stats', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(5)
    })
  })

  describe('LayoutCache', () => {
    let cache
    let layoutCache

    beforeEach(() => {
      cache = new CacheManager()
      layoutCache = new LayoutCache(cache)
    })

    it('should create layout cache instance', () => {
      expect(layoutCache).toBeDefined()
    })

    it('should set and get layout', () => {
      const docHash = 'abc123'
      const pageOptions = { size: { width: 21, height: 29.7 } }
      const layout = { totalPages: 5 }

      layoutCache.set(docHash, pageOptions, layout)

      const result = layoutCache.get(docHash, pageOptions)
      expect(result).toEqual(layout)
    })
  })

  describe('Benchmark', () => {
    let benchmark

    beforeEach(() => {
      benchmark = new Benchmark('test')
    })

    it('should create benchmark instance', () => {
      expect(benchmark).toBeDefined()
      expect(benchmark.name).toBe('test')
    })

    it('should measure synchronous function', () => {
      const result = benchmark.measure('sync-test', () => {
        let sum = 0
        for (let i = 0; i < 1000; i++) {
          sum += i
        }
        return sum
      })

      expect(result).toBe(499500)
    })

    it('should measure async function', async () => {
      const result = await benchmark.measureAsync('async-test', async () => {
        return new Promise((resolve) => setTimeout(() => resolve(42), 10))
      })

      expect(result).toBe(42)
    })

    it('should get summary', () => {
      benchmark.measure('test1', () => {})
      benchmark.measure('test2', () => {})

      const summary = benchmark.getSummary()
      expect(summary.measureCount).toBe(2)
      expect(summary.measures).toHaveLength(2)
    })

    it('should clear measurements', () => {
      benchmark.measure('test', () => {})
      benchmark.clear()

      const summary = benchmark.getSummary()
      expect(summary.measureCount).toBe(0)
    })
  })

  describe('PerformanceMonitor', () => {
    let monitor

    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    it('should create performance monitor instance', () => {
      expect(monitor).toBeDefined()
    })

    it('should have start method', () => {
      expect(typeof monitor.start).toBe('function')
    })

    it('should have stop method', () => {
      expect(typeof monitor.stop).toBe('function')
    })

    it('should have getMetrics method', () => {
      expect(typeof monitor.getMetrics).toBe('function')
    })

    it('should have record method', () => {
      expect(typeof monitor.record).toBe('function')
    })

    it('should record custom metrics', () => {
      monitor.record('render', { duration: 16.67 })

      expect(monitor.metrics.render).toHaveLength(1)
      expect(monitor.metrics.render[0].duration).toBe(16.67)
    })

    it('should get metrics', () => {
      const metrics = monitor.getMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.fps).toBeDefined()
    })
  })

  describe('DocumentProfiler', () => {
    let profiler

    beforeEach(() => {
      profiler = new DocumentProfiler()
    })

    it('should create document profiler instance', () => {
      expect(profiler).toBeDefined()
    })

    it('should have profileDocumentLoad method', () => {
      expect(typeof profiler.profileDocumentLoad).toBe('function')
    })

    it('should have profileTyping method', () => {
      expect(typeof profiler.profileTyping).toBe('function')
    })

    it('should have profileLayout method', () => {
      expect(typeof profiler.profileLayout).toBe('function')
    })

    it('should have getReport method', () => {
      expect(typeof profiler.getReport).toBe('function')
    })

    it('should get report', () => {
      const report = profiler.getReport()
      expect(report).toBeDefined()
      expect(report.benchmark).toBeDefined()
      expect(report.monitor).toBeDefined()
    })
  })

  describe('createPerformanceToolkit', () => {
    it('should create performance toolkit', () => {
      const toolkit = createPerformanceToolkit()

      expect(toolkit).toBeDefined()
      expect(toolkit.cache).toBeDefined()
      expect(toolkit.layoutCache).toBeDefined()
      expect(toolkit.workerPool).toBeDefined()
      expect(toolkit.virtualScroller).toBeDefined()
      expect(toolkit.profiler).toBeDefined()
    })

    it('should have init method', () => {
      const toolkit = createPerformanceToolkit()
      expect(typeof toolkit.init).toBe('function')
    })

    it('should have destroy method', () => {
      const toolkit = createPerformanceToolkit()
      expect(typeof toolkit.destroy).toBe('function')
    })

    it('should have getReport method', () => {
      const toolkit = createPerformanceToolkit()
      expect(typeof toolkit.getReport).toBe('function')
    })

    it('should get report', () => {
      const toolkit = createPerformanceToolkit()
      const report = toolkit.getReport()

      expect(report).toBeDefined()
      expect(report.cache).toBeDefined()
      expect(report.workerPool).toBeDefined()
    })
  })
})
