/**
 * Page Calculator
 *
 * Computes page breaks from document content.
 * Determines which blocks go on which page, based on page dimensions.
 * Page breaks are computed layout metadata — NOT stored in the document.
 *
 * Architecture: Layer 3 — Layout Engine
 */

import { cmToPx, estimateBlockHeight } from './text-measurer'

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
 * @property {Object} widowOrphan - Widow/orphan control config
 * @property {number|null} columns - Number of columns (null = single column)
 * @property {number|null} columnGap - Gap between columns in cm
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
  const widowOrphan = pageOptions.widowOrphan || { enable: true, widowLines: 2, orphanLines: 2 }

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
      enable: header.enable === true,
      height: header.marginTop || 1.5,
    },
    footer: {
      enable: footer.enable === true,
      height: footer.marginBottom || 1.5,
    },
    widowOrphan: {
      enable: widowOrphan.enable !== false,
      widowLines: widowOrphan.widowLines || 2,
      orphanLines: widowOrphan.orphanLines || 2,
    },
    columns: pageOptions.columns || null,
    columnGap: pageOptions.columnGap || 0.5,
  }
}

/**
 * Create a PageConfig for a section break, inheriting from parent config
 * @param {Object} sectionAttrs - Section break node attributes
 * @param {PageConfig} parentConfig - Parent section config to inherit from
 * @returns {PageConfig}
 */
export function createSectionConfig(sectionAttrs, parentConfig) {
  if (!sectionAttrs) return parentConfig

  // Start with parent config
  const config = { ...parentConfig }

  // Override page size if specified
  if (sectionAttrs.pageFormat) {
    const size = PageSizes[sectionAttrs.pageFormat.toUpperCase()] || parentConfig.pageSize
    config.pageSize = size
    config.pageWidth = config.orientation === 'landscape' ? size.height : size.width
    config.pageHeight = config.orientation === 'landscape' ? size.width : size.height
  }

  if (sectionAttrs.pageSize) {
    config.pageSize = sectionAttrs.pageSize
    config.pageWidth = config.orientation === 'landscape' ? sectionAttrs.pageSize.height : sectionAttrs.pageSize.width
    config.pageHeight = config.orientation === 'landscape' ? sectionAttrs.pageSize.width : sectionAttrs.pageSize.height
  }

  // Override orientation if specified
  if (sectionAttrs.orientation) {
    config.orientation = sectionAttrs.orientation
    // Recalculate page dimensions
    const size = config.pageSize
    config.pageWidth = config.orientation === 'landscape' ? size.height : size.width
    config.pageHeight = config.orientation === 'landscape' ? size.width : size.height
  }

  // Override margins if specified
  if (sectionAttrs.marginTop != null) config.margin.top = sectionAttrs.marginTop
  if (sectionAttrs.marginBottom != null) config.margin.bottom = sectionAttrs.marginBottom
  if (sectionAttrs.marginLeft != null) config.margin.left = sectionAttrs.marginLeft
  if (sectionAttrs.marginRight != null) config.margin.right = sectionAttrs.marginRight

  // Override header/footer if specified
  if (sectionAttrs.headerEnable != null) {
    config.header.enable = sectionAttrs.headerEnable
  }
  if (sectionAttrs.footerEnable != null) {
    config.footer.enable = sectionAttrs.footerEnable
  }

  // Override columns if specified
  if (sectionAttrs.columns != null) {
    config.columns = sectionAttrs.columns
  }
  if (sectionAttrs.columnGap != null) {
    config.columnGap = sectionAttrs.columnGap
  }

  return config
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

// ─── Widow/Orphan Control ──────────────────────────────────────────────────

/**
 * Check if a block can be moved to the next page to avoid widows/orphans
 * @param {Object} block - Current block
 * @param {Object} prevBlock - Previous block
 * @param {PageConfig} config - Page configuration
 * @param {number} availableHeight - Available height on current page
 * @returns {boolean} True if block should be moved to next page
 */
function shouldMoveToNextPage(block, prevBlock, config, availableHeight) {
  if (!config.widowOrphan.enable) return false
  if (!prevBlock) return false

  const { widowLines, orphanLines } = config.widowOrphan
  const fontSize = config.fontSize || 16
  const lineHeightRatio = config.lineHeight || 1.5
  const lineHeight = Math.round(fontSize * lineHeightRatio)

  // Check for orphan: if prevBlock is tall but only a few lines fit on current page
  // availableHeight is the remaining space on the current page
  if (prevBlock.height > lineHeight * orphanLines && availableHeight < prevBlock.height) {
    // prevBlock spans across pages — check if the portion on current page is too small
    if (availableHeight < lineHeight * orphanLines) {
      return true
    }
  }

  // Check for widow: if block is tall but only a few lines fit on the next page
  // We check if the block would be split and the top portion is too small
  if (block.height > lineHeight * widowLines) {
    if (availableHeight < lineHeight * widowLines) {
      return true
    }
  }

  return false
}

// ─── Page Break Calculation ────────────────────────────────────────────────

/**
 * @typedef {Object} PageBreak
 * @property {number} blockIndex - Index of the block that starts the new page
 * @property {number} blockPos - ProseMirror position of the block
 * @property {number} prevBlockPos - ProseMirror position of the last block on previous page
 * @property {string} reason - Reason for page break ('overflow', 'widow', 'orphan', 'section')
 */

/**
 * @typedef {Object} PageAssignment
 * @property {number} pageNumber - 1-based page number
 * @property {number} blockStart - Index of first block on this page
 * @property {number} blockEnd - Index of last block on this page (inclusive)
 * @property {number} startY - Y offset from top of content area (in px)
 * @property {number} height - Height of content on this page (in px)
 * @property {boolean} isSectionBreak - True if this page starts a new section
 */

/**
 * Compute page breaks from a list of block heights
 * @param {Array<{height: number, pos: number, type: string, attrs?: Object}>} blocks - Block info
 * @param {PageConfig} config - Page configuration
 * @returns {{ breaks: PageBreak[], pages: PageAssignment[], totalHeight: number, totalPages: number }}
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
        isSectionBreak: false,
        config,
      }],
      totalHeight: 0,
      totalPages: 1,
    }
  }

  const breaks = []
  const pages = []
  let currentPageStart = 0
  let currentY = 0
  let totalPages = 1
  let currentConfig = config
  let currentAvailableHeight = availableHeight
  let pageNumberStart = 1

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const blockHeight = block.height || 0
    const prevBlock = i > 0 ? blocks[i - 1] : null

    // Check if this block is a section break
    if (block.type === 'sectionBreak') {
      // Force page break for section breaks
      if (currentPageStart < i) {
        breaks.push({
          blockIndex: i,
          blockPos: block.pos,
          prevBlockPos: prevBlock?.pos || 0,
          reason: 'section',
          config: currentConfig,
        })

        pages.push({
          pageNumber: totalPages,
          blockStart: currentPageStart,
          blockEnd: i - 1,
          startY: pages.length > 0
            ? pages[pages.length - 1].startY + pages[pages.length - 1].height
            : 0,
          height: currentY,
          isSectionBreak: false,
          config: currentConfig,
        })

        totalPages++
        currentPageStart = i
        currentY = blockHeight
      }

      // Apply section-specific configuration
      if (block.attrs) {
        currentConfig = createSectionConfig(block.attrs, config)
        const newContentArea = getContentArea(currentConfig)
        currentAvailableHeight = newContentArea.heightPx

        // Reset page number if specified
        if (block.attrs.pageNumberRestart) {
          pageNumberStart = block.attrs.pageNumberStart || 1
          totalPages = pageNumberStart
        }
      }
      continue
    }

    // Check if this block fits on the current page
    if (currentY + blockHeight > currentAvailableHeight && currentPageStart < i) {
      // Check widow/orphan control
      if (shouldMoveToNextPage(block, prevBlock, currentConfig, currentAvailableHeight - currentY)) {
        // Move to next page to avoid widow/orphan
        breaks.push({
          blockIndex: i,
          blockPos: block.pos,
          prevBlockPos: prevBlock?.pos || 0,
          reason: 'widow/orphan',
          config: currentConfig,
        })

        pages.push({
          pageNumber: totalPages,
          blockStart: currentPageStart,
          blockEnd: i - 1,
          startY: pages.length > 0
            ? pages[pages.length - 1].startY + pages[pages.length - 1].height
            : 0,
          height: currentY,
          isSectionBreak: false,
          config: currentConfig,
        })

        totalPages++
        currentPageStart = i
        currentY = blockHeight
      } else {
        // Normal page break due to overflow
        breaks.push({
          blockIndex: i,
          blockPos: block.pos,
          prevBlockPos: prevBlock?.pos || 0,
          reason: 'overflow',
          config: currentConfig,
        })

        pages.push({
          pageNumber: totalPages,
          blockStart: currentPageStart,
          blockEnd: i - 1,
          startY: pages.length > 0
            ? pages[pages.length - 1].startY + pages[pages.length - 1].height
            : 0,
          height: currentY,
          isSectionBreak: false,
          config: currentConfig,
        })

        totalPages++
        currentPageStart = i
        currentY = blockHeight
      }
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
    isSectionBreak: false,
    config: currentConfig,
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

/**
 * Get page information for a given block index
 * @param {number} blockIndex - Block index
 * @param {PageAssignment[]} pages - Page assignments
 * @returns {PageAssignment|null}
 */
export function getPageForBlock(blockIndex, pages) {
  if (!pages || pages.length === 0) return null

  for (const page of pages) {
    if (blockIndex >= page.blockStart && blockIndex <= page.blockEnd) {
      return page
    }
  }
  return null
}

/**
 * Get all blocks on a specific page
 * @param {number} pageNumber - Page number
 * @param {PageAssignment[]} pages - Page assignments
 * @returns {{ blockStart: number, blockEnd: number }|null}
 */
export function getBlocksOnPage(pageNumber, pages) {
  if (!pages || pages.length === 0) return null

  const page = pages.find(p => p.pageNumber === pageNumber)
  if (!page) return null

  return {
    blockStart: page.blockStart,
    blockEnd: page.blockEnd,
  }
}

export default {
  PageSizes,
  createPageConfig,
  createSectionConfig,
  getContentArea,
  computePageBreaks,
  computeFromNodes,
  getPageFromScroll,
  scrollToPage,
  getPageForBlock,
  getBlocksOnPage,
}
