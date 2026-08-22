/**
 * Benchmark Tools
 *
 * Performance measurement and profiling utilities.
 *
 * Architecture: Performance Layer — Benchmark
 */

export class Benchmark {
  constructor(name) {
    this.name = name
    this.marks = new Map()
    this.measures = []
  }

  /**
   * Start timing
   */
  start(label = 'default') {
    this.marks.set(label, {
      start: performance.now(),
      end: null,
    })
  }

  /**
   * End timing
   */
  end(label = 'default') {
    const mark = this.marks.get(label)
    if (!mark) return null

    mark.end = performance.now()

    const duration = mark.end - mark.start

    this.measures.push({
      label,
      duration,
      start: mark.start,
      end: mark.end,
    })

    return duration
  }

  /**
   * Measure a function
   */
  measure(label, fn) {
    this.start(label)
    const result = fn()
    this.end(label)
    return result
  }

  /**
   * Measure an async function
   */
  async measureAsync(label, fn) {
    this.start(label)
    const result = await fn()
    this.end(label)
    return result
  }

  /**
   * Get all measurements
   */
  getMeasures() {
    return [...this.measures]
  }

  /**
   * Get summary
   */
  getSummary() {
    const total = this.measures.reduce((sum, m) => sum + m.duration, 0)
    const avg = this.measures.length > 0 ? total / this.measures.length : 0

    return {
      name: this.name,
      totalDuration: total,
      averageDuration: avg,
      measureCount: this.measures.length,
      measures: this.measures.map((m) => ({
        label: m.label,
        duration: m.duration.toFixed(2) + 'ms',
      })),
    }
  }

  /**
   * Clear measurements
   */
  clear() {
    this.marks.clear()
    this.measures = []
  }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: [],
      memory: [],
      layout: [],
      render: [],
    }
    this.observers = []
    this.isRunning = false
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) return

    this.isRunning = true

    // FPS monitoring
    this.startFPSMonitoring()

    // Memory monitoring
    this.startMemoryMonitoring()

    // Performance observer
    this.startPerformanceObserver()
  }

  /**
   * Start FPS monitoring
   */
  startFPSMonitoring() {
    let lastTime = performance.now()
    let frames = 0

    const tick = () => {
      if (!this.isRunning) return

      frames++
      const currentTime = performance.now()

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime))

        this.metrics.fps.push({
          value: fps,
          timestamp: Date.now(),
        })

        // Keep only last 60 seconds
        if (this.metrics.fps.length > 60) {
          this.metrics.fps.shift()
        }

        frames = 0
        lastTime = currentTime
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (!performance.memory) return

    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval)
        return
      }

      this.metrics.memory.push({
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      })

      // Keep only last 60 entries
      if (this.metrics.memory.length > 60) {
        this.metrics.memory.shift()
      }
    }, 1000)
  }

  /**
   * Start performance observer
   */
  startPerformanceObserver() {
    if (!window.PerformanceObserver) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.metrics.layout.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: Date.now(),
            })
          }
        }
      })

      observer.observe({ entryTypes: ['measure'] })
      this.observers.push(observer)
    } catch {
      // Observer not supported
    }
  }

  /**
   * Record custom metric
   */
  record(type, data) {
    if (this.metrics[type]) {
      this.metrics[type].push({
        ...data,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Get current FPS
   */
  getCurrentFPS() {
    const fps = this.metrics.fps
    return fps.length > 0 ? fps[fps.length - 1].value : 0
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const memory = this.metrics.memory
    if (memory.length === 0) return null

    const latest = memory[memory.length - 1]
    return {
      used: (latest.used / 1024 / 1024).toFixed(2) + ' MB',
      total: (latest.total / 1024 / 1024).toFixed(2) + ' MB',
      limit: (latest.limit / 1024 / 1024).toFixed(2) + ' MB',
      percentage: ((latest.used / latest.limit) * 100).toFixed(2) + '%',
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      fps: {
        current: this.getCurrentFPS(),
        average: this.calculateAverage(this.metrics.fps.map((f) => f.value)),
        min: Math.min(...this.metrics.fps.map((f) => f.value)),
        max: Math.max(...this.metrics.fps.map((f) => f.value)),
      },
      memory: this.getMemoryUsage(),
      layout: this.metrics.layout.length,
    }
  }

  /**
   * Calculate average
   */
  calculateAverage(values) {
    if (values.length === 0) return 0
    const sum = values.reduce((a, b) => a + b, 0)
    return (sum / values.length).toFixed(2)
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false

    this.observers.forEach((observer) => {
      observer.disconnect()
    })

    this.observers = []
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics = {
      fps: [],
      memory: [],
      layout: [],
      render: [],
    }
  }
}

/**
 * Document Performance Profiler
 */
export class DocumentProfiler {
  constructor() {
    this.benchmark = new Benchmark('document')
    this.monitor = new PerformanceMonitor()
  }

  /**
   * Profile document operations
   */
  async profileDocumentLoad(document) {
    this.benchmark.clear()

    // Profile parsing
    const parseResult = await this.benchmark.measureAsync('parse', async () => {
      // Simulate document parsing
      return document
    })

    // Profile layout computation
    const layoutResult = await this.benchmark.measureAsync('layout', async () => {
      // Simulate layout computation
      return { totalPages: 1 }
    })

    // Profile rendering
    const renderResult = await this.benchmark.measureAsync('render', async () => {
      // Simulate rendering
      return {}
    })

    return {
      document: parseResult,
      layout: layoutResult,
      render: renderResult,
      benchmark: this.benchmark.getSummary(),
    }
  }

  /**
   * Profile typing performance
   */
  async profileTyping(editor, text) {
    this.benchmark.clear()

    const charCount = text.length
    const startTime = performance.now()

    // Type each character
    for (let i = 0; i < charCount; i++) {
      await this.benchmark.measureAsync('keystroke', async () => {
        // Simulate keystroke processing
        return text[i]
      })
    }

    const totalTime = performance.now() - startTime

    return {
      charCount,
      totalTime,
      averagePerChar: totalTime / charCount,
      charsPerSecond: (charCount / totalTime * 1000).toFixed(2),
      benchmark: this.benchmark.getSummary(),
    }
  }

  /**
   * Profile layout computation
   */
  async profileLayout(engine, blocks, pageOptions) {
    this.benchmark.clear()

    // Multiple iterations for accuracy
    const iterations = 10
    const results = []

    for (let i = 0; i < iterations; i++) {
      const result = await this.benchmark.measureAsync(`layout-${i}`, async () => {
        return engine.compute(blocks, pageOptions)
      })
      results.push(result)
    }

    return {
      iterations,
      results,
      benchmark: this.benchmark.getSummary(),
    }
  }

  /**
   * Get comprehensive report
   */
  getReport() {
    return {
      benchmark: this.benchmark.getSummary(),
      monitor: this.monitor.getMetrics(),
      timestamp: Date.now(),
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    this.monitor.start()
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.monitor.stop()
  }
}

export default { Benchmark, PerformanceMonitor, DocumentProfiler }
