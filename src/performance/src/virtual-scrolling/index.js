/**
 * Virtual Scrolling
 *
 * Efficient rendering for large documents by only rendering visible pages.
 *
 * Architecture: Performance Layer — Virtual Scrolling
 */

export class VirtualScroller {
  constructor(options = {}) {
    this.container = null
    this.pages = []
    this.visiblePages = new Set()
    this.bufferSize = options.bufferSize || 2 // Pages above/below viewport
    this.pageHeight = options.pageHeight || 1122 // A4 height in px at 96dpi
    this.onPageVisible = options.onPageVisible || (() => {})
    this.onPageHidden = options.onPageHidden || (() => {})
    this.observer = null
    this.scrollHandler = null
    this.ticking = false
  }

  /**
   * Initialize virtual scroller
   */
  init(container, pages) {
    this.container = container
    this.pages = pages

    // Setup Intersection Observer for efficient visibility detection
    this.setupObserver()

    // Setup scroll handler with requestAnimationFrame
    this.setupScrollHandler()

    // Initial calculation
    this.updateVisiblePages()
  }

  /**
   * Setup Intersection Observer
   */
  setupObserver() {
    if (!window.IntersectionObserver) {
      return
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNumber = parseInt(entry.target.dataset.page, 10)

          if (entry.isIntersecting) {
            this.visiblePages.add(pageNumber)
            this.onPageVisible(pageNumber, entry.target)
          } else {
            this.visiblePages.delete(pageNumber)
            this.onPageHidden(pageNumber, entry.target)
          }
        })
      },
      {
        root: this.container,
        rootMargin: `${this.bufferSize * this.pageHeight}px 0px`,
        threshold: 0,
      },
    )

    // Observe all page elements
    this.pages.forEach((page) => {
      const element = this.container.querySelector(`[data-page="${page.pageNumber}"]`)
      if (element) {
        this.observer.observe(element)
      }
    })
  }

  /**
   * Setup scroll handler with requestAnimationFrame
   */
  setupScrollHandler() {
    this.scrollHandler = () => {
      if (!this.ticking) {
        requestAnimationFrame(() => {
          this.updateVisiblePages()
          this.ticking = false
        })
        this.ticking = true
      }
    }

    this.container.addEventListener('scroll', this.scrollHandler, { passive: true })
  }

  /**
   * Update visible pages based on scroll position
   */
  updateVisiblePages() {
    if (!this.container) return

    const {scrollTop} = this.container
    const viewportHeight = this.container.clientHeight

    const startIndex = Math.max(0, Math.floor(scrollTop / this.pageHeight) - this.bufferSize)
    const endIndex = Math.min(
      this.pages.length - 1,
      Math.ceil((scrollTop + viewportHeight) / this.pageHeight) + this.bufferSize,
    )

    // Notify about new visible range
    for (let i = startIndex; i <= endIndex; i++) {
      if (!this.visiblePages.has(i)) {
        this.visiblePages.add(i)
        this.onPageVisible(i, this.pages[i])
      }
    }

    // Hide pages outside range
    for (const pageNumber of this.visiblePages) {
      if (pageNumber < startIndex || pageNumber > endIndex) {
        this.visiblePages.delete(pageNumber)
        this.onPageHidden(pageNumber, this.pages[pageNumber])
      }
    }
  }

  /**
   * Scroll to specific page
   */
  scrollToPage(pageNumber) {
    if (!this.container) return

    const targetTop = (pageNumber - 1) * this.pageHeight

    this.container.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    })
  }

  /**
   * Get visible page numbers
   */
  getVisiblePages() {
    return Array.from(this.visiblePages).sort((a, b) => a - b)
  }

  /**
   * Update pages list
   */
  setPages(pages) {
    this.pages = pages
    this.updateVisiblePages()
  }

  /**
   * Destroy virtual scroller
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    if (this.container && this.scrollHandler) {
      this.container.removeEventListener('scroll', this.scrollHandler)
    }

    this.visiblePages.clear()
    this.pages = []
    this.container = null
  }
}

/**
 * Page Pool — Reuses DOM elements for pages
 */
export class PagePool {
  constructor(renderer, options = {}) {
    this.renderer = renderer
    this.pool = []
    this.active = new Map()
    this.maxPoolSize = options.maxPoolSize || 10
  }

  /**
   * Get or create page element
   */
  acquire(page) {
    let element = this.pool.pop()

    if (!element) {
      element = document.createElement('div')
      element.className = 'kindy-page'
    }

    // Render page content
    this.renderer.renderPageInto(element, page)

    this.active.set(page.pageNumber, element)
    return element
  }

  /**
   * Release page element back to pool
   */
  release(pageNumber) {
    const element = this.active.get(pageNumber)
    if (element) {
      this.active.delete(pageNumber)

      // Clear content but keep the element
      element.innerHTML = ''

      // Add to pool if under limit
      if (this.pool.length < this.maxPoolSize) {
        this.pool.push(element)
      }
    }
  }

  /**
   * Clear all pooled elements
   */
  clear() {
    this.pool = []
    this.active.clear()
  }
}

export default { VirtualScroller, PagePool }
