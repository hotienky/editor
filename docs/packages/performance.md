# @kindy/performance

Performance utilities for Open Document Platform.

## Installation

```bash
npm install @kindy/performance
```

## Quick Start

```javascript
import { createPerformanceToolkit } from '@kindy/performance'

const toolkit = createPerformanceToolkit()

// Initialize
await toolkit.init()

// Get performance report
const report = toolkit.getReport()
console.log(report)

// Cleanup
toolkit.destroy()
```

## Features

- Virtual scrolling for large documents
- Web Worker pool for parallel processing
- Multi-level caching (Memory + SessionStorage)
- Benchmark and profiling tools

## Components

### `VirtualScroller`

Efficient rendering for large documents.

```javascript
import { VirtualScroller } from '@kindy/performance'

const scroller = new VirtualScroller({
  bufferSize: 2, // Pages above/below viewport
  pageHeight: 1122, // A4 height in px at 96dpi
})

// Initialize with container and pages
scroller.init(container, pages)

// Scroll to page
scroller.scrollToPage(5)

// Get visible pages
const visible = scroller.getVisiblePages()

// Cleanup
scroller.destroy()
```

### `WorkerPool`

Parallel task execution.

```javascript
import { WorkerPool } from '@kindy/performance'

const pool = new WorkerPool({
  maxWorkers: 4,
})

await pool.init()

// Submit task
const result = await pool.submit('computeLayout', {
  blocks,
  pageOptions,
})

// Get stats
const stats = pool.getStats()
console.log(stats)

// Cleanup
pool.terminate()
```

### `CacheManager`

Multi-level caching.

```javascript
import { CacheManager } from '@kindy/performance'

const cache = new CacheManager({
  l1MaxSize: 50, // Memory cache size
})

// Set value
cache.set('key1', { data: 'value' }, { ttl: 60000 }) // 1 minute TTL

// Get value
const value = cache.get('key1')

// Delete
cache.delete('key1')

// Clear all
cache.clear()

// Stats
const stats = cache.getStats()
```

### `MemoryCache`

LRU memory cache.

```javascript
import { MemoryCache } from '@kindy/performance'

const cache = new MemoryCache(100) // Max 100 entries

cache.set('key', 'value')
const value = cache.get('key')
```

### `LayoutCache`

Specialized cache for layout computations.

```javascript
import { LayoutCache, CacheManager } from '@kindy/performance'

const cache = new CacheManager()
const layoutCache = new LayoutCache(cache)

// Cache layout
const docHash = 'abc123'
const pageOptions = { size: { width: 21, height: 29.7 } }
const layout = { totalPages: 5 }

layoutCache.set(docHash, pageOptions, layout)

// Get cached layout
const cached = layoutCache.get(docHash, pageOptions)
```

### `Benchmark`

Function timing.

```javascript
import { Benchmark } from '@kindy/performance'

const benchmark = new Benchmark('my-operation')

// Measure sync function
const result = benchmark.measure('process', () => {
  // Do work
  return result
})

// Measure async function
const asyncResult = await benchmark.measureAsync('fetch', async () => {
  // Do async work
  return result
})

// Get summary
const summary = benchmark.getSummary()
console.log(summary)
```

### `PerformanceMonitor`

FPS and memory monitoring.

```javascript
import { PerformanceMonitor } from '@kindy/performance'

const monitor = new PerformanceMonitor()

// Start monitoring
monitor.start()

// Record custom metric
monitor.record('render', { duration: 16.67 })

// Get metrics
const metrics = monitor.getMetrics()
console.log(metrics.fps.current)
console.log(metrics.memory.used)

// Stop
monitor.stop()
```

### `DocumentProfiler`

Document operation profiling.

```javascript
import { DocumentProfiler } from '@kindy/performance'

const profiler = new DocumentProfiler()

// Profile document load
const loadResult = await profiler.profileDocumentLoad(document)

// Profile typing
const typingResult = await profiler.profileTyping(editor, 'Hello World')

// Profile layout
const layoutResult = await profiler.profileLayout(engine, blocks, pageOptions)

// Get report
const report = profiler.getReport()
```

## Convenience Factory

```javascript
import { createPerformanceToolkit } from '@kindy/performance'

const toolkit = createPerformanceToolkit({
  cache: { l1MaxSize: 100 },
  worker: { maxWorkers: 4 },
  virtualScrolling: { bufferSize: 2 },
})

await toolkit.init()

// Use toolkit
toolkit.cache.set('key', 'value')
toolkit.layoutCache.set(docHash, options, layout)

// Get report
const report = toolkit.getReport()

// Cleanup
toolkit.destroy()
```

## Best Practices

1. **Use virtual scrolling** for documents with many pages
2. **Cache layout computations** to avoid recomputation
3. **Use worker pool** for heavy computations
4. **Profile regularly** to identify bottlenecks
5. **Monitor FPS** to ensure smooth scrolling
