/**
 * Layout Engine
 *
 * Core layout computation engine. Takes a document AST and page config,
 * produces a Layout Tree with page assignments, positions, and metadata.
 *
 * This engine is framework-agnostic — can run headless, in a Web Worker,
 * or in Node.js. No DOM dependency.
 *
 * Architecture: Layer 3 — Layout Engine (core)
 */

import { cmToPx } from './text-measurer'
import { estimateBlockHeight } from './text-measurer'
import {
  createPageConfig,
  getContentArea,
  computePageBreaks,
} from './page-calculator'
import {
  buildHeaderFooterMap,
  getHeaderFooterContent,
} from './header-footer'
import {
  buildPageNumbers,
} from './page-numbers'
import {
  getWorkerManager,
  isWorkerAvailable,
} from './worker-manager'

// ─── Layout Tree Types ─────────────────────────────────────────────────────

/**
 * @typedef {Object} LayoutNode
 * @property {string} type - Node type
 * @property {number} page - Page number (1-based)
 * @property {number} offsetY - Y offset from top of page content area (px)
 * @property {number} height - Node height (px)
 * @property {Object} attrs - Node attributes
 * @property {LayoutNode[]} children - Child nodes
 */

/**
 * @typedef {Object} LayoutPage
 * @property {number} pageNumber - 1-based page number
 * @property {number} blockStart - Index of first block on this page
 * @property {number} blockEnd - Index of last block on this page (inclusive)
 * @property {number} contentHeight - Height of content on this page (px)
 * @property {number} contentWidth - Width of content area (px)
 * @property {Object} header - Header layout data
 * @property {Object} footer - Footer layout data
 * @property {Object} pageNumberDisplay - Page number display data
 * @property {LayoutNode[]} nodes - Layout nodes on this page
 */

/**
 * @typedef {Object} LayoutTree
 * @property {number} totalPages - Total number of pages
 * @property {LayoutPage[]} pages - Page layout data
 * @property {Object} config - Page configuration used
 * @property {number} version - Layout version (incremented on re-layout)
 */

// ─── Layout Engine ─────────────────────────────────────────────────────────

export class LayoutEngine {
  constructor(options = {}) {
    this._version = 0
    this._cache = null
    this._cacheKey = null
    this._defaults = {
      fontSize: 16,
      fontFamily: 'Arial',
      lineHeight: 1.5,
      ...options.defaults,
    }
    this._useWorker = options.useWorker !== false && isWorkerAvailable()
    this._workerManager = null
  }

  /**
   * Compute layout for a document (sync)
   * @param {Array<Object>} nodes - AST nodes (top-level blocks)
   * @param {Object} pageOptions - Page options from editor state
   * @returns {LayoutTree}
   */
  compute(nodes, pageOptions = {}) {
    const config = createPageConfig(pageOptions)
    const contentArea = getContentArea(config)

    // Build block measurements
    const blocks = this._measureBlocks(nodes, contentArea.widthPx)

    // Compute page breaks
    const { breaks, pages: pageAssignments, totalHeight, totalPages } =
      computePageBreaks(blocks, config)

    // Build header/footer map
    const hfMap = buildHeaderFooterMap(
      pageOptions.header || {},
      pageOptions.footer || {},
      config,
      totalPages,
    )

    // Build page numbers
    const pageNums = buildPageNumbers(totalPages, pageOptions.pageNumbers || {})

    // Build layout pages
    const layoutPages = this._buildLayoutPages(
      nodes,
      blocks,
      pageAssignments,
      contentArea,
      hfMap,
      pageNums,
    )

    this._version++

    return {
      totalPages,
      pages: layoutPages,
      config,
      contentArea,
      totalHeight,
      version: this._version,
    }
  }

  /**
   * Compute layout using Web Worker (async)
   * @param {Array<Object>} nodes - AST nodes (top-level blocks)
   * @param {Object} pageOptions - Page options from editor state
   * @returns {Promise<LayoutTree>}
   */
  async computeAsync(nodes, pageOptions = {}) {
    if (!this._useWorker) {
      return this.compute(nodes, pageOptions)
    }

    try {
      const workerManager = getWorkerManager()
      const result = await workerManager.computeLayout({
        nodes,
        pageConfig: createPageConfig(pageOptions),
        defaults: this._defaults,
      })
      return result
    } catch (error) {
      console.warn('Worker computation failed, falling back to sync:', error)
      return this.compute(nodes, pageOptions)
    }
  }

  /**
   * Check if cache is still valid for given inputs
   * @param {Array<Object>} nodes
   * @param {Object} pageOptions
   * @returns {boolean}
   */
  isCacheValid(nodes, pageOptions) {
    if (!this._cache) return false
    const key = this._buildCacheKey(nodes, pageOptions)
    return key === this._cacheKey
  }

  /**
   * Get cached layout if valid
   * @param {Array<Object>} nodes
   * @param {Object} pageOptions
   * @returns {LayoutTree|null}
   */
  getCached(nodes, pageOptions) {
    if (this.isCacheValid(nodes, pageOptions)) {
      return this._cache
    }
    return null
  }

  /**
   * Compute and cache layout
   * @param {Array<Object>} nodes
   * @param {Object} pageOptions
   * @returns {LayoutTree}
   */
  computeAndCache(nodes, pageOptions) {
    const layout = this.compute(nodes, pageOptions)
    this._cache = layout
    this._cacheKey = this._buildCacheKey(nodes, pageOptions)
    return layout
  }

  /**
   * Get page number from Y position
   * @param {number} y - Y position in content area (px)
   * @param {LayoutTree} layout - Layout tree
   * @returns {number} Page number (1-based)
   */
  getPageAtY(y, layout) {
    if (!layout?.pages) return 1
    for (let i = layout.pages.length - 1; i >= 0; i--) {
      if (y >= layout.pages[i].contentStartY) {
        return layout.pages[i].pageNumber
      }
    }
    return 1
  }

  /**
   * Get Y position for a page
   * @param {number} pageNumber
   * @param {LayoutTree} layout
   * @returns {number} Y position (px)
   */
  getYForPage(pageNumber, layout) {
    if (!layout?.pages) return 0
    const page = layout.pages.find((p) => p.pageNumber === pageNumber)
    return page?.contentStartY || 0
  }

  // ─── Internal Methods ──────────────────────────────────────────────────

  _measureBlocks(nodes, contentWidthPx) {
    if (!nodes) return []

    return nodes.map((node, index) => {
      const height = estimateBlockHeight(node, contentWidthPx, this._defaults)
      return {
        height,
        pos: index,
        type: node.type || 'unknown',
        node,
      }
    })
  }

  _buildLayoutPages(nodes, blocks, pageAssignments, contentArea, hfMap, pageNums) {
    const pages = []
    let contentOffsetY = 0

    for (const assignment of pageAssignments) {
      const hf = hfMap[assignment.pageNumber - 1] || {}
      const pageNum = pageNums[assignment.pageNumber - 1] || {}

      // Collect nodes for this page
      const pageNodes = []
      for (let i = assignment.blockStart; i <= assignment.blockEnd; i++) {
        if (blocks[i]) {
          pageNodes.push({
            ...blocks[i],
            page: assignment.pageNumber,
            offsetY: this._calculateNodeOffsetY(i, assignment, blocks),
          })
        }
      }

      pages.push({
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
      })

      contentOffsetY += assignment.height
    }

    return pages
  }

  _calculateNodeOffsetY(blockIndex, assignment, blocks) {
    let offsetY = 0
    for (let i = assignment.blockStart; i < blockIndex; i++) {
      offsetY += blocks[i]?.height || 0
    }
    return offsetY
  }

  _buildCacheKey(nodes, pageOptions) {
    // Simple hash for cache invalidation
    const nodeCount = nodes?.length || 0
    const firstType = nodes?.[0]?.type || ''
    const pageSize = pageOptions?.size?.width || 21
    const orientation = pageOptions?.orientation || 'portrait'
    return `${nodeCount}|${firstType}|${pageSize}|${orientation}`
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global layout engine instance
 * @returns {LayoutEngine}
 */
export function getLayoutEngine() {
  if (!_instance) {
    _instance = new LayoutEngine()
  }
  return _instance
}

/**
 * Create a new layout engine instance
 * @param {Object} options
 * @returns {LayoutEngine}
 */
export function createLayoutEngine(options) {
  return new LayoutEngine(options)
}

/**
 * Quick layout computation
 * @param {Array<Object>} nodes - AST nodes
 * @param {Object} pageOptions - Page options
 * @returns {LayoutTree}
 */
export function computeLayout(nodes, pageOptions) {
  return getLayoutEngine().compute(nodes, pageOptions)
}

export default {
  LayoutEngine,
  getLayoutEngine,
  createLayoutEngine,
  computeLayout,
  isWorkerAvailable,
}
