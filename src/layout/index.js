/**
 * Layout Engine — Public API
 *
 * Single entry point for the Layout Engine layer.
 * All external code should import from here.
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Text Measurement ──────────────────────────────────────────────────────

export {
  cmToPx,
  pxToCm,
  ptToPx,
  getCmToPx,
  measureText,
  measureWords,
  breakTextIntoLines,
  calculateLineMetrics,
  estimateBlockHeight,
  clearCache as clearMeasureCache,
} from './text-measurer'

// ─── Page Calculator ───────────────────────────────────────────────────────

export {
  PageSizes,
  createPageConfig,
  getContentArea,
  computePageBreaks,
  computeFromNodes,
  getPageFromScroll,
  scrollToPage,
} from './page-calculator'

// ─── Header/Footer ─────────────────────────────────────────────────────────

export {
  HeaderFooterScope,
  HeaderFooterLayout,
  shouldShowHeaderFooter,
  getHeaderPosition,
  getFooterPosition,
  buildHeaderFooterMap,
  formatHeaderFooterText,
  getHeaderFooterContent,
} from './header-footer'

// ─── Page Numbers ──────────────────────────────────────────────────────────

export {
  NumberFormat,
  PageNumberTemplate,
  PageNumberAlign,
  formatPageNumber,
  getPageNumberText,
  getPageNumberDisplay,
  buildPageNumbers,
} from './page-numbers'

// ─── Layout Engine ─────────────────────────────────────────────────────────

export {
  LayoutEngine,
  getLayoutEngine,
  createLayoutEngine,
  computeLayout,
} from './engine'

// ─── Convenience Functions ─────────────────────────────────────────────────

import { getLayoutEngine } from './engine'
import { createPageConfig, getContentArea } from './page-calculator'

/**
 * Quick layout computation with defaults
 * @param {Array<Object>} nodes - AST nodes
 * @param {Object} pageOptions - Page options
 * @returns {Object} Layout tree
 */
export function layout(nodes, pageOptions) {
  return getLayoutEngine().compute(nodes, pageOptions)
}

/**
 * Get page dimensions in pixels
 * @param {Object} pageOptions - Page options
 * @returns {{ widthPx: number, heightPx: number, contentWidthPx: number, contentHeightPx: number }}
 */
export function getPageDimensions(pageOptions) {
  const config = createPageConfig(pageOptions)
  const content = getContentArea(config)
  return {
    widthPx: cmToPx(config.pageWidth),
    heightPx: cmToPx(config.pageHeight),
    contentWidthPx: content.widthPx,
    contentHeightPx: content.heightPx,
  }
}

export default {
  // Text measurement
  cmToPx,
  pxToCm,
  ptToPx,
  measureText,
  estimateBlockHeight,

  // Page calculator
  PageSizes,
  createPageConfig,
  getContentArea,
  computePageBreaks,

  // Header/Footer
  shouldShowHeaderFooter,
  getHeaderPosition,
  getFooterPosition,

  // Page numbers
  formatPageNumber,
  getPageNumberText,

  // Layout engine
  layout,
  getPageDimensions,
  getLayoutEngine,
}
