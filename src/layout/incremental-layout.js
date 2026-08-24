/**
 * Incremental Layout Engine
 *
 * Tracks dirty pages and only recomputes layout for pages affected by edits.
 * Dramatically improves typing latency in large documents (500+ pages).
 *
 * Architecture: Layer 3 — Layout Engine (incremental)
 */

import { cmToPx, estimateBlockHeight } from './text-measurer'
import { createPageConfig, getContentArea, computePageBreaks } from './page-calculator'
import { buildHeaderFooterMap, getHeaderFooterContent } from './header-footer'
import { buildPageNumbers } from './page-numbers'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} DirtyRange
 * @property {number} fromBlock - First affected block index (inclusive)
 * @property {number} toBlock - Last affected block index (inclusive, -1 = end)
 * @property {string} reason - Why this range is dirty
 */

/**
 * @typedef {Object} IncrementalLayoutResult
 * @property {LayoutPage[]} pages - All pages (updated + unchanged)
 * @property {number[]} dirtyPages - Page numbers that were recomputed
 * @property {number} totalPages - Total page count
 * @property {number} elapsedMs - Time taken for incremental layout
 */

// ─── Dirty Tracker ──────────────────────────────────────────────────────────

export class DirtyTracker {
  constructor() {
    /** @type {DirtyRange[]} */
    this._dirtyRanges = []
    /** @type {Set<number>} */
    this._dirtyPages = new Set()
    /** @type {boolean} */
    this._fullRelayout = false
  }

  /**
   * Mark a block range as dirty
   * @param {number} fromBlock - Start block index (inclusive)
   * @param {number} toBlock - End block index (inclusive, -1 = end of document)
   * @param {string} reason - Why it's dirty
   */
  markDirty(fromBlock, toBlock = -1, reason = 'edit') {
    this._dirtyRanges.push({ fromBlock, toBlock, reason })
  }

  /**
   * Mark entire document as needing full relayout
   */
  markFullRelayout(reason = 'structural') {
    this._fullRelayout = true
    this._dirtyRanges = []
    this._dirtyPages.clear()
  }

  /**
   * Check if full relayout is needed
   * @returns {boolean}
   */
  needsFullRelayout() {
    return this._fullRelayout
  }

  /**
   * Get dirty page numbers from dirty ranges
   * @param {Array} pageAssignments - Current page assignments
   * @returns {Set<number>} Dirty page numbers
   */
  getDirtyPages(pageAssignments) {
    if (this._fullRelayout) {
      return new Set(pageAssignments.map((p) => p.pageNumber))
    }

    const dirty = new Set()
    for (const range of this._dirtyRanges) {
      for (const page of pageAssignments) {
        if (range.toBlock === -1) {
          // Dirty to end of document
          if (page.blockEnd >= range.fromBlock) {
            dirty.add(page.pageNumber)
          }
        } else {
          // Check overlap
          if (page.blockEnd >= range.fromBlock && page.blockStart <= range.toBlock) {
            dirty.add(page.pageNumber)
          }
        }
      }
    }

    // Also dirty all downstream pages (page breaks may shift)
    if (dirty.size > 0) {
      const maxDirty = Math.max(...dirty)
      for (const page of pageAssignments) {
        if (page.pageNumber >= maxDirty) {
          dirty.add(page.pageNumber)
        }
      }
    }

    return dirty
  }

  /**
   * Clear all dirty state
   */
  clear() {
    this._dirtyRanges = []
    this._dirtyPages.clear()
    this._fullRelayout = false
  }

  /**
   * Get count of pending dirty ranges
   * @returns {number}
   */
  get pendingCount() {
    return this._dirtyRanges.length + (this._fullRelayout ? 1 : 0)
  }
}

// ─── Page Cache ─────────────────────────────────────────────────────────────

export class PageCache {
  constructor() {
    /** @type {Map<number, CachedPage>} */
    this._pages = new Map()
    /** @type {number} */
    this._version = 0
  }

  /**
   * Get a cached page
   * @param {number} pageNumber
   * @returns {CachedPage | undefined}
   */
  get(pageNumber) {
    return this._pages.get(pageNumber)
  }

  /**
   * Store a page in cache
   * @param {number} pageNumber
   * @param {CachedPage} page
   */
  set(pageNumber, page) {
    this._pages.set(pageNumber, page)
    this._version++
  }

  /**
   * Remove a page from cache
   * @param {number} pageNumber
   */
  delete(pageNumber) {
    this._pages.delete(pageNumber)
    this._version++
  }

  /**
   * Get all cached page numbers
   * @returns {number[]}
   */
  getPageNumbers() {
    return Array.from(this._pages.keys()).sort((a, b) => a - b)
  }

  /**
   * Get cached page assignments (for dirty tracking)
   * @returns {Array<{pageNumber: number, blockStart: number, blockEnd: number}>}
   */
  getPageAssignments() {
    return Array.from(this._pages.values()).map((p) => ({
      pageNumber: p.pageNumber,
      blockStart: p.blockStart,
      blockEnd: p.blockEnd,
    }))
  }

  /**
   * Clear all cached pages
   */
  clear() {
    this._pages.clear()
    this._version++
  }

  /**
   * Get cache version
   * @returns {number}
   */
  get version() {
    return this._version
  }
}

// ─── Incremental Layout Engine ──────────────────────────────────────────────

export class IncrementalLayoutEngine {
  constructor(options = {}) {
    this._dirtyTracker = new DirtyTracker()
    this._pageCache = new PageCache()
    this._defaults = {
      fontSize: 16,
      fontFamily: 'Arial',
      lineHeight: 1.5,
      ...options.defaults,
    }
    this._lastNodes = null
    this._lastPageOptions = null
    this._lastLayout = null
  }

  /**
   * Mark a range of blocks as dirty
   * @param {number} fromBlock
   * @param {number} toBlock
   * @param {string} reason
   */
  markDirty(fromBlock, toBlock = -1, reason = 'edit') {
    this._dirtyTracker.markDirty(fromBlock, toBlock, reason)
  }

  /**
   * Mark full relayout needed
   * @param {string} reason
   */
  markFullRelayout(reason = 'structural') {
    this._dirtyTracker.markFullRelayout(reason)
    this._pageCache.clear()
  }

  /**
   * Compute layout incrementally.
   * Only recomputes pages affected by dirty ranges.
   *
   * @param {Array} nodes - All document nodes (top-level blocks)
   * @param {Object} pageOptions - Page configuration
   * @returns {IncrementalLayoutResult}
   */
  computeIncremental(nodes, pageOptions = {}) {
    const startTime = performance.now()
    const config = createPageConfig(pageOptions)
    const contentArea = getContentArea(config)

    // If no previous layout or full relayout needed, do full compute
    if (!this._lastLayout || this._dirtyTracker.needsFullRelayout()) {
      const result = this._computeFull(nodes, contentArea, config, pageOptions)
      this._lastNodes = nodes
      this._lastPageOptions = pageOptions
      this._lastLayout = result
      this._dirtyTracker.clear()

      return {
        ...result,
        dirtyPages: result.pages.map((p) => p.pageNumber),
        elapsedMs: performance.now() - startTime,
      }
    }

    // Get dirty pages
    const oldAssignments = this._pageCache.getPageAssignments()
    const dirtyPages = this._dirtyTracker.getDirtyPages(oldAssignments)

    if (dirtyPages.size === 0) {
      return {
        ...this._lastLayout,
        dirtyPages: [],
        elapsedMs: performance.now() - startTime,
      }
    }

    // Measure all blocks (needed for page break computation)
    const blocks = nodes.map((node, index) => ({
      height: estimateBlockHeight(node, contentArea.widthPx, this._defaults),
      pos: index,
      type: node.type || 'unknown',
      node,
    }))

    // Recompute page breaks from first dirty page onward
    const minDirtyBlock = this._getMinDirtyBlock(nodes, dirtyPages, oldAssignments)
    const { breaks, pages: newAssignments, totalHeight, totalPages } =
      this._recomputeFromBlock(blocks, config, minDirtyBlock)

    // Update page cache for dirty pages
    const hfMap = buildHeaderFooterMap(
      pageOptions.header || {},
      pageOptions.footer || {},
      config,
      totalPages,
    )
    const pageNums = buildPageNumbers(totalPages, pageOptions.pageNumbers || {})

    const updatedPages = newAssignments.map((assignment) => {
      const cached = this._pageCache.get(assignment.pageNumber)
      if (cached && !dirtyPages.has(assignment.pageNumber)) {
        return cached // Return unchanged page from cache
      }

      // Build new page
      const hf = hfMap[assignment.pageNumber - 1] || {}
      const pageNum = pageNums[assignment.pageNumber - 1] || {}

      const pageNodes = []
      for (let i = assignment.blockStart; i <= assignment.blockEnd; i++) {
        if (blocks[i]) {
          let offsetY = 0
          for (let j = assignment.blockStart; j < i; j++) {
            offsetY += blocks[j]?.height || 0
          }
          pageNodes.push({
            ...blocks[i],
            page: assignment.pageNumber,
            offsetY,
          })
        }
      }

      const pageData = {
        pageNumber: assignment.pageNumber,
        blockStart: assignment.blockStart,
        blockEnd: assignment.blockEnd,
        contentHeight: assignment.height,
        contentWidth: contentArea.widthPx,
        contentStartY: this._calculateContentStartY(assignment, newAssignments),
        header: hf.header || {},
        footer: hf.footer || {},
        pageNumberDisplay: pageNum,
        nodes: pageNodes,
      }

      this._pageCache.set(assignment.pageNumber, pageData)
      return pageData
    })

    const result = {
      totalPages,
      pages: updatedPages,
      config,
      contentArea,
      totalHeight,
      version: this._lastLayout.version + 1,
    }

    this._lastNodes = nodes
    this._lastPageOptions = pageOptions
    this._lastLayout = result
    this._dirtyTracker.clear()

    return {
      ...result,
      dirtyPages: Array.from(dirtyPages).sort((a, b) => a - b),
      elapsedMs: performance.now() - startTime,
    }
  }

  /**
   * Get the minimum block index to recompute from
   */
  _getMinDirtyBlock(nodes, dirtyPages, assignments) {
    let minBlock = nodes.length
    for (const assignment of assignments) {
      if (dirtyPages.has(assignment.pageNumber)) {
        minBlock = Math.min(minBlock, assignment.blockStart)
      }
    }
    return minBlock
  }

  /**
   * Recompute page breaks from a given block index onward
   */
  _recomputeFromBlock(blocks, config, fromBlock) {
    const contentArea = getContentArea(config)
    const availableHeight = contentArea.heightPx

    // Get pages before the dirty range
    const beforePages = []
    let preservedBlockEnd = -1

    for (const cached of Array.from(this._pageCache._pages.values()).sort(
      (a, b) => a.pageNumber - b.pageNumber,
    )) {
      if (cached.blockEnd < fromBlock) {
        beforePages.push({
          pageNumber: cached.pageNumber,
          blockStart: cached.blockStart,
          blockEnd: cached.blockEnd,
          height: cached.contentHeight,
        })
        preservedBlockEnd = Math.max(preservedBlockEnd, cached.blockEnd)
      } else {
        break
      }
    }

    // Recompute from the first affected block
    const breaks = []
    const pages = [...beforePages]
    let currentPageStart = preservedBlockEnd + 1
    let currentY = 0
    let totalPages = beforePages.length || 1

    // Calculate Y offset from previous pages
    for (const p of beforePages) {
      currentY += p.height
    }

    for (let i = currentPageStart; i < blocks.length; i++) {
      const block = blocks[i]
      const blockHeight = block.height || 0

      if (currentY + blockHeight > availableHeight && currentPageStart < i) {
        breaks.push({
          blockIndex: i,
          blockPos: block.pos,
          prevBlockPos: blocks[i - 1]?.pos || 0,
        })

        pages.push({
          pageNumber: totalPages,
          blockStart: currentPageStart,
          blockEnd: i - 1,
          height: currentY - (pages.length > 0
            ? pages.reduce((sum, p) => sum + p.height, 0)
            : 0),
        })

        totalPages++
        currentPageStart = i
        currentY = (pages.length > 0
          ? pages.reduce((sum, p) => sum + p.height, 0)
          : 0) + blockHeight
      } else {
        currentY = (pages.length > 0
          ? pages.reduce((sum, p) => sum + p.height, 0)
          : 0) + (i - currentPageStart + 1) * blockHeight
      }
    }

    // Final page
    pages.push({
      pageNumber: totalPages,
      blockStart: currentPageStart,
      blockEnd: blocks.length - 1,
      height: currentY - (pages.length > 0
        ? pages.reduce((sum, p) => sum + p.height, 0)
        : 0),
    })

    const totalHeight = pages.reduce((sum, p) => sum + p.height, 0)

    return { breaks, pages, totalHeight, totalPages }
  }

  /**
   * Calculate contentStartY for a page
   */
  _calculateContentStartY(assignment, allPages) {
    let startY = 0
    for (const page of allPages) {
      if (page.pageNumber === assignment.pageNumber) break
      startY += page.height || 0
    }
    return startY
  }

  /**
   * Full layout computation (used for initial load or full relayout)
   */
  _computeFull(nodes, contentArea, config, pageOptions) {
    const blocks = nodes.map((node, index) => ({
      height: estimateBlockHeight(node, contentArea.widthPx, this._defaults),
      pos: index,
      type: node.type || 'unknown',
      node,
    }))

    const { breaks, pages: assignments, totalHeight, totalPages } =
      computePageBreaks(blocks, config)

    const hfMap = buildHeaderFooterMap(
      pageOptions.header || {},
      pageOptions.footer || {},
      config,
      totalPages,
    )
    const pageNums = buildPageNumbers(totalPages, pageOptions.pageNumbers || {})

    let contentOffsetY = 0
    const layoutPages = assignments.map((assignment) => {
      const hf = hfMap[assignment.pageNumber - 1] || {}
      const pageNum = pageNums[assignment.pageNumber - 1] || {}

      const pageNodes = []
      for (let i = assignment.blockStart; i <= assignment.blockEnd; i++) {
        if (blocks[i]) {
          let offsetY = 0
          for (let j = assignment.blockStart; j < i; j++) {
            offsetY += blocks[j]?.height || 0
          }
          pageNodes.push({
            ...blocks[i],
            page: assignment.pageNumber,
            offsetY,
          })
        }
      }

      const pageData = {
        pageNumber: assignment.pageNumber,
        blockStart: assignment.blockStart,
        blockEnd: assignment.blockEnd,
        contentHeight: assignment.height,
        contentWidth: contentArea.widthPx,
        contentStartY: contentOffsetY,
        header: hf.header || {},
        footer: hf.footer || {},
        pageNumberDisplay: pageNum,
        nodes: pageNodes,
      }

      this._pageCache.set(assignment.pageNumber, pageData)
      contentOffsetY += assignment.height

      return pageData
    })

    return {
      totalPages,
      pages: layoutPages,
      config,
      contentArea,
      totalHeight,
      version: (this._lastLayout?.version || 0) + 1,
    }
  }

  /**
   * Get layout stats
   */
  getStats() {
    return {
      cachedPages: this._pageCache.getPageNumbers().length,
      dirtyRanges: this._dirtyTracker.pendingCount,
      version: this._lastLayout?.version || 0,
    }
  }
}

export default IncrementalLayoutEngine
