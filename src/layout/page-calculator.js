/**
 * Page Calculator
 *
 * Computes page breaks from document content.
 * Determines which blocks go on which page, based on page dimensions.
 * Page breaks are computed layout metadata — NOT stored in the document.
 *
 * Architecture: Layer 3 — Layout Engine
 */

import { cmToPx } from './text-measurer'
import { estimateBlockHeight } from './text-measurer'

// ─── Page Size Presets ─────────────────────────────────────────────────────

export const PageSizes = {
  A4: { width: 21, height: 29.7 },
  A3: { width: 29.7, height: 42 },
  A5: { width: 14.8, height: 21 },
  B5: { width: 17.6, height: 25 },
  LETTER: { width: 21.5, height: 27.9 },
  LEGAL: { width: 21.5, height: 33.5 },
}

// ─── Page Config ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} PageConfig
 * @property {string} pageSize - Page size name (e.g., 'A4')
 * @property {number} pageWidth - Page width in cm
 * @property {number} pageHeight - Page height in cm
 * @property {string} orientation - 'portrait' | 'landscape'
 * @property {Object} margin - { top, bottom, left, right } in cm
 * @property {Object} header - Header config { enable, height } in cm
 * @property {Object} footer - Footer config { enable, height } in cm
 */

/**
 * Create a PageConfig from page options
 * @param {Object} pageOptions - Page options from the editor
 * @returns {PageConfig}
 */
export function createPageConfig(pageOptions = {}) {
  const size = pageOptions.size || PageSizes.A4
  const orientation = pageOptions.orientation || 'portrait'
  const margin = pageOptions.margin || { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }
  const header = pageOptions.header || { enable: false, marginTop: 1.5 }
  const footer = pageOptions.footer || { enable: false, marginBottom: 1.5 }

  const pageWidth = orientation === 'landscape' ? size.height : size.width
  const pageHeight = orientation === 'landscape' ? size.width : size.height

  return {
    pageSize: size,
    pageWidth,
    pageHeight,
    orientation,
    margin: {
      top: margin.top || 2.54,
      bottom: margin.bottom || 2.54,
      left: margin.left || 2.54,
      right: margin.right || 2.54,
    },
    header: {
      enable: header.enable !== false,
      height: header.marginTop || 1.5,
    },
    footer: {
      enable: footer.enable !== false,
      height: footer.marginBottom || 1.5,
    },
  }
}

// ─── Content Area Calculation ──────────────────────────────────────────────

/**
 * Calculate available content area dimensions
 * @param {PageConfig} config - Page configuration
 * @returns {{ widthPx: number, heightPx: number, widthCm: number, heightCm: number }}
 */
export function getContentArea(config) {
  const { pageWidth, pageHeight, margin, header, footer } = config

  const widthCm = pageWidth - margin.left - margin.right
  const heightCm = pageHeight - margin.top - margin.bottom -
    (header.enable ? header.height : 0) -
    (footer.enable ? footer.height : 0)

  return {
    widthCm,
    heightCm,
    widthPx: cmToPx(widthCm),
    heightPx: cmToPx(heightCm),
  }
}

// ─── Page Break Calculation ────────────────────────────────────────────────

/**
 * @typedef {Object} PageBreak
 * @property {number} blockIndex - Index of the block that starts the new page
 * @property {number} blockPos - ProseMirror position of the block
 * @property {number} prevBlockPos - ProseMirror position of the last block on previous page
 */

/**
 * @typedef {Object} PageAssignment
 * @property {number} pageNumber - 1-based page number
 * @property {number} blockStart - Index of first block on this page
 * @property {number} blockEnd - Index of last block on this page (inclusive)
 * @property {number} startY - Y offset from top of content area (in px)
 * @property {number} height - Height of content on this page (in px)
 */

/**
 * Compute page breaks from a list of block heights
 * @param {Array<{height: number, pos: number, type: string}>} blocks - Block info
 * @param {PageConfig} config - Page configuration
 * @returns {{ breaks: PageBreak[], pages: PageAssignment[], totalHeight: number }}
 */
export function computePageBreaks(blocks, config) {
  const contentArea = getContentArea(config)
  const availableHeight = contentArea.heightPx

  if (!blocks || blocks.length === 0) {
    return {
      breaks: [],
      pages: [{
        pageNumber: 1,
        blockStart: 0,
        blockEnd: -1,
        startY: 0,
        height: 0,
      }],
      totalHeight: 0,
    }
  }

  const breaks = []
  const pages = []
  let currentPageStart = 0
  let currentY = 0
  let totalPages = 1

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const blockHeight = block.height || 0

    // Check if this block fits on the current page
    if (currentY + blockHeight > availableHeight && currentPageStart < i) {
      // This block starts a new page
      breaks.push({
        blockIndex: i,
        blockPos: block.pos,
        prevBlockPos: blocks[i - 1]?.pos || 0,
      })

      // Finalize current page
      pages.push({
        pageNumber: totalPages,
        blockStart: currentPageStart,
        blockEnd: i - 1,
        startY: currentPageStart === 0 ? 0 : pages.length > 0
          ? pages[pages.length - 1].startY + pages[pages.length - 1].height
          : 0,
        height: currentY,
      })

      totalPages++
      currentPageStart = i
      currentY = blockHeight
    } else {
      currentY += blockHeight
    }
  }

  // Finalize last page
  pages.push({
    pageNumber: totalPages,
    blockStart: currentPageStart,
    blockEnd: blocks.length - 1,
    startY: pages.length > 0
      ? pages[pages.length - 1].startY + pages[pages.length - 1].height
      : 0,
    height: currentY,
  })

  return {
    breaks,
    pages,
    totalHeight: currentY,
    totalPages,
  }
}

/**
 * Compute page breaks from AST nodes
 * @param {Array<Object>} nodes - AST nodes
 * @param {PageConfig} config - Page configuration
 * @param {Object} defaults - Default style properties for measurement
 * @returns {Object} Page break result
 */
export function computeFromNodes(nodes, config, defaults = {}) {
  const contentArea = getContentArea(config)

  const blocks = (nodes || []).map((node, index) => {
    const height = estimateBlockHeight(node, contentArea.widthPx, defaults)
    return {
      height,
      pos: index, // Simplified; real implementation would use ProseMirror positions
      type: node.type || 'unknown',
    }
  })

  return computePageBreaks(blocks, config)
}

// ─── Scroll Position Mapping ───────────────────────────────────────────────

/**
 * Get page number from scroll position
 * @param {number} scrollTop - Current scroll position in px
 * @param {PageAssignment[]} pages - Page assignments
 * @param {number} zoomLevel - Zoom level (100 = 100%)
 * @returns {number} Current page number (1-based)
 */
export function getPageFromScroll(scrollTop, pages, zoomLevel = 100) {
  if (!pages || pages.length === 0) return 1

  const zoom = zoomLevel / 100
  for (let i = pages.length - 1; i >= 0; i--) {
    if (scrollTop >= (pages[i].startY * zoom) - 100) {
      return pages[i].pageNumber
    }
  }
  return 1
}

/**
 * Get scroll position for a specific page
 * @param {number} pageNumber - Target page number
 * @param {PageAssignment[]} pages - Page assignments
 * @param {number} zoomLevel - Zoom level
 * @returns {number} Scroll position in px
 */
export function scrollToPage(pageNumber, pages, zoomLevel = 100) {
  if (!pages || pages.length === 0) return 0

  const page = pages.find((p) => p.pageNumber === pageNumber)
  if (!page) return 0

  const zoom = zoomLevel / 100
  return page.startY * zoom
}

export default {
  PageSizes,
  createPageConfig,
  getContentArea,
  computePageBreaks,
  computeFromNodes,
  getPageFromScroll,
  scrollToPage,
}
