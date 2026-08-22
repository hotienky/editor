/**
 * Viewport Virtualizer
 *
 * Determines which pages are visible in the viewport and should be rendered.
 * Only renders pages that are near the visible area (with buffer).
 * Dramatically improves performance for large documents.
 *
 * Architecture: Layer 4 — Render Engine
 */

// ─── Default Configuration ─────────────────────────────────────────────────

const DEFAULT_BUFFER_PAGES = 2 // Render 2 pages above/below visible area
const DEFAULT_MIN_VISIBLE_PAGES = 3 // Always render at least 3 pages

// ─── Viewport State ────────────────────────────────────────────────────────

/**
 * @typedef {Object} ViewportState
 * @property {number} scrollTop - Current scroll position
 * @property {number} viewportHeight - Height of the visible viewport
 * @property {number} zoomLevel - Current zoom level (100 = 100%)
 * @property {number[]} visiblePageNumbers - Page numbers currently visible
 * @property {number[]} renderPageNumbers - Page numbers to render (visible + buffer)
 * @property {number} totalPages - Total number of pages
 */

// ─── Viewport Virtualizer Class ────────────────────────────────────────────

export class ViewportVirtualizer {
  constructor(options = {}) {
    this._bufferPages = options.bufferPages ?? DEFAULT_BUFFER_PAGES
    this._minVisiblePages = options.minVisiblePages ?? DEFAULT_MIN_VISIBLE_PAGES
    this._state = {
      scrollTop: 0,
      viewportHeight: 0,
      zoomLevel: 100,
      visiblePageNumbers: [],
      renderPageNumbers: [],
      totalPages: 0,
    }
    this._listeners = new Set()
    this._container = null
    this._layoutTree = null
  }

  /**
   * Get current viewport state
   * @returns {ViewportState}
   */
  get state() {
    return { ...this._state }
  }

  /**
   * Get visible page numbers
   * @returns {number[]}
   */
  get visiblePages() {
    return this._state.visiblePageNumbers
  }

  /**
   * Get page numbers that should be rendered
   * @returns {number[]}
   */
  get renderPages() {
    return this._state.renderPageNumbers
  }

  /**
   * Check if a specific page should be rendered
   * @param {number} pageNumber
   * @returns {boolean}
   */
  shouldRender(pageNumber) {
    return this._state.renderPageNumbers.includes(pageNumber)
  }

  /**
   * Check if a specific page is visible
   * @param {number} pageNumber
   * @returns {boolean}
   */
  isVisible(pageNumber) {
    return this._state.visiblePageNumbers.includes(pageNumber)
  }

  /**
   * Subscribe to viewport changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._listeners.add(callback)
    return () => this._listeners.delete(callback)
  }

  /**
   * Attach to a scroll container
   * @param {HTMLElement} container
   */
  attach(container) {
    if (this._container) {
      this.detach()
    }

    this._container = container
    this._updateState()

    this._scrollHandler = () => this._onScroll()
    this._resizeHandler = () => this._onResize()

    container.addEventListener('scroll', this._scrollHandler, { passive: true })
    window.addEventListener('resize', this._resizeHandler, { passive: true })
  }

  /**
   * Detach from scroll container
   */
  detach() {
    if (this._container && this._scrollHandler) {
      this._container.removeEventListener('scroll', this._scrollHandler)
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
    }
    this._container = null
    this._scrollHandler = null
    this._resizeHandler = null
  }

  /**
   * Update layout tree (call when layout changes)
   * @param {Object} layoutTree
   */
  updateLayout(layoutTree) {
    this._layoutTree = layoutTree
    this._state.totalPages = layoutTree?.totalPages || 0
    this._updateState()
  }

  /**
   * Update zoom level
   * @param {number} zoomLevel
   */
  updateZoom(zoomLevel) {
    if (this._state.zoomLevel !== zoomLevel) {
      this._state.zoomLevel = zoomLevel
      this._updateState()
    }
  }

  /**
   * Force recalculation
   */
  recalculate() {
    this._updateState()
  }

  /**
   * Get Y range for visible area
   * @returns {{ startY: number, endY: number }}
   */
  getVisibleRange() {
    const { scrollTop, viewportHeight, zoomLevel } = this._state
    const zoom = zoomLevel / 100
    return {
      startY: scrollTop / zoom,
      endY: (scrollTop + viewportHeight) / zoom,
    }
  }

  // ─── Internal Methods ──────────────────────────────────────────────────

  _onScroll() {
    this._updateState()
  }

  _onResize() {
    this._updateState()
  }

  _updateState() {
    if (!this._container) return

    const {scrollTop} = this._container
    const viewportHeight = this._container.clientHeight
    const zoom = this._state.zoomLevel / 100

    this._state.scrollTop = scrollTop
    this._state.viewportHeight = viewportHeight

    if (!this._layoutTree?.pages) {
      this._state.visiblePageNumbers = []
      this._state.renderPageNumbers = this._generateAllPageNumbers()
      this._notify()
      return
    }

    // Calculate visible pages
    const visiblePages = new Set()
    for (const page of this._layoutTree.pages) {
      const pageTop = (page.contentStartY || 0) * zoom
      const pageBottom = pageTop + (page.contentHeight || 0) * zoom

      if (pageBottom >= scrollTop - 100 && pageTop <= scrollTop + viewportHeight + 100) {
        visiblePages.add(page.pageNumber)
      }
    }

    this._state.visiblePageNumbers = [...visiblePages].sort((a, b) => a - b)

    // Calculate render pages (visible + buffer)
    const renderPages = new Set()
    const minPage = Math.max(1, Math.min(...visiblePages) - this._bufferPages)
    const maxPage = Math.min(
      this._state.totalPages,
      Math.max(...(visiblePages.size > 0 ? [...visiblePages] : [1])) + this._bufferPages,
    )

    for (let i = minPage; i <= maxPage; i++) {
      renderPages.add(i)
    }

    // Ensure minimum visible pages
    while (renderPages.size < this._minVisiblePages && renderPages.size < this._state.totalPages) {
      const nextNum = renderPages.size + 1
      if (!renderPages.has(nextNum)) {
        renderPages.add(nextNum)
      } else {
        break
      }
    }

    this._state.renderPageNumbers = [...renderPages].sort((a, b) => a - b)
    this._notify()
  }

  _generateAllPageNumbers() {
    const numbers = []
    for (let i = 1; i <= this._state.totalPages; i++) {
      numbers.push(i)
    }
    return numbers
  }

  _notify() {
    for (const listener of this._listeners) {
      try {
        listener(this._state)
      } catch (e) {
        console.error('Viewport listener error:', e)
      }
    }
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global viewport virtualizer
 * @returns {ViewportVirtualizer}
 */
export function getViewport() {
  if (!_instance) {
    _instance = new ViewportVirtualizer()
  }
  return _instance
}

/**
 * Create a new viewport virtualizer
 * @param {Object} options
 * @returns {ViewportVirtualizer}
 */
export function createViewport(options) {
  return new ViewportVirtualizer(options)
}

export default {
  ViewportVirtualizer,
  getViewport,
  createViewport,
}
