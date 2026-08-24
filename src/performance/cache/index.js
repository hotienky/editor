/**
 * Cache Manager
 *
 * Multi-level caching for documents, layouts, and rendered pages.
 *
 * Architecture: Performance Layer — Cache
 */

export class CacheManager {
  constructor(options = {}) {
    this.l1Cache = new MemoryCache(options.l1MaxSize || 50) // Fast, small
    this.l2Cache = new SessionCache(options.l2Prefix || 'kindy-cache') // Medium
    this.l3Cache = null // Persistent (IndexedDB) - optional

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    }
  }

  /**
   * Get value from cache
   */
  get(key) {
    // Try L1 first
    let value = this.l1Cache.get(key)
    if (value !== undefined) {
      this.stats.hits++
      return value
    }

    // Try L2
    value = this.l2Cache.get(key)
    if (value !== undefined) {
      // Promote to L1
      this.l1Cache.set(key, value)
      this.stats.hits++
      return value
    }

    this.stats.misses++
    return undefined
  }

  /**
   * Set value in cache
   */
  set(key, value, options = {}) {
    const { ttl, level = 'all' } = options

    if (level === 'all' || level === 'l1') {
      this.l1Cache.set(key, value, ttl)
    }

    if (level === 'all' || level === 'l2') {
      this.l2Cache.set(key, value, ttl)
    }

    this.stats.sets++
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    this.l1Cache.delete(key)
    this.l2Cache.delete(key)
    this.stats.deletes++
  }

  /**
   * Clear all caches
   */
  clear() {
    this.l1Cache.clear()
    this.l2Cache.clear()
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      hitRate: total > 0 ? `${(this.stats.hits / total * 100).toFixed(2)  }%` : '0%',
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache.getStats(),
    }
  }
}

/**
 * Memory Cache (L1)
 */
export class MemoryCache {
  constructor(maxSize = 50) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.accessOrder = []
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL
    if (entry.ttl && Date.now() > entry.expiresAt) {
      this.delete(key)
      return undefined
    }

    // Update access order
    this.updateAccessOrder(key)

    return entry.value
  }

  set(key, value, ttl) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict()
    }

    const entry = {
      value,
      createdAt: Date.now(),
    }

    if (ttl) {
      entry.ttl = ttl
      entry.expiresAt = Date.now() + ttl
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
  }

  delete(key) {
    this.cache.delete(key)
    this.accessOrder = this.accessOrder.filter((k) => k !== key)
  }

  clear() {
    this.cache.clear()
    this.accessOrder = []
  }

  updateAccessOrder(key) {
    this.accessOrder = this.accessOrder.filter((k) => k !== key)
    this.accessOrder.push(key)
  }

  evict() {
    // LRU eviction
    if (this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift()
      this.cache.delete(oldest)
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    }
  }
}

/**
 * Session Storage Cache (L2)
 */
export class SessionCache {
  constructor(prefix = 'kindy-cache') {
    this.prefix = prefix
  }

  get(key) {
    try {
      const data = sessionStorage.getItem(`${this.prefix}:${key}`)
      if (!data) return undefined

      const entry = JSON.parse(data)

      // Check TTL
      if (entry.ttl && Date.now() > entry.expiresAt) {
        this.delete(key)
        return undefined
      }

      return entry.value
    } catch {
      return undefined
    }
  }

  set(key, value, ttl) {
    try {
      const entry = {
        value,
        createdAt: Date.now(),
      }

      if (ttl) {
        entry.ttl = ttl
        entry.expiresAt = Date.now() + ttl
      }

      sessionStorage.setItem(`${this.prefix}:${key}`, JSON.stringify(entry))
    } catch {
      // Storage full or unavailable
    }
  }

  delete(key) {
    sessionStorage.removeItem(`${this.prefix}:${key}`)
  }

  clear() {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(this.prefix))
    keys.forEach((k) => sessionStorage.removeItem(k))
  }

  getStats() {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(this.prefix))
    return {
      size: keys.length,
    }
  }
}

/**
 * Layout Cache — Specialized cache for layout computations
 */
export class LayoutCache {
  constructor(cacheManager) {
    this.cache = cacheManager
    this.prefix = 'layout:'
  }

  /**
   * Get cached layout
   */
  get(documentHash, pageOptions) {
    const key = this.createKey(documentHash, pageOptions)
    return this.cache.get(key)
  }

  /**
   * Cache layout result
   */
  set(documentHash, pageOptions, layout) {
    const key = this.createKey(documentHash, pageOptions)
    this.cache.set(key, layout, { ttl: 5 * 60 * 1000 }) // 5 minutes
  }

  /**
   * Create cache key
   */
  createKey(documentHash, pageOptions) {
    const optionsHash = this.hashObject(pageOptions)
    return `${this.prefix}${documentHash}:${optionsHash}`
  }

  /**
   * Simple object hash
   */
  hashObject(obj) {
    const str = JSON.stringify(obj)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

export default { CacheManager, MemoryCache, SessionCache, LayoutCache }
