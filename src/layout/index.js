/**
 * Layout Engine — Public API
 *
 * Single entry point for the Layout Engine layer.
 * All external code should import from here.
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Text Measurement ──────────────────────────────────────────────────────

import {
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
  clearMeasureCache,
}

// ─── Page Calculator ───────────────────────────────────────────────────────

import {
  PageSizes,
  createPageConfig,
  getContentArea,
  computePageBreaks,
  computeFromNodes,
  getPageFromScroll,
  scrollToPage,
} from './page-calculator'

export {
  PageSizes,
  createPageConfig,
  getContentArea,
  computePageBreaks,
  computeFromNodes,
  getPageFromScroll,
  scrollToPage,
}

// ─── Header/Footer ─────────────────────────────────────────────────────────

import {
  HeaderFooterScope,
  HeaderFooterLayout,
  shouldShowHeaderFooter,
  getHeaderPosition,
  getFooterPosition,
  buildHeaderFooterMap,
  formatHeaderFooterText,
  getHeaderFooterContent,
} from './header-footer'

export {
  HeaderFooterScope,
  HeaderFooterLayout,
  shouldShowHeaderFooter,
  getHeaderPosition,
  getFooterPosition,
  buildHeaderFooterMap,
  formatHeaderFooterText,
  getHeaderFooterContent,
}

// ─── Page Numbers ──────────────────────────────────────────────────────────

import {
  NumberFormat,
  PageNumberTemplate,
  PageNumberAlign,
  formatPageNumber,
  getPageNumberText,
  getPageNumberDisplay,
  buildPageNumbers,
} from './page-numbers'

export {
  NumberFormat,
  PageNumberTemplate,
  PageNumberAlign,
  formatPageNumber,
  getPageNumberText,
  getPageNumberDisplay,
  buildPageNumbers,
}

// ─── Layout Engine ─────────────────────────────────────────────────────────

import {
  LayoutEngine,
  getLayoutEngine,
  createLayoutEngine,
  computeLayout,
} from './engine'

export {
  LayoutEngine,
  getLayoutEngine,
  createLayoutEngine,
  computeLayout,
}

// ─── Incremental Layout ─────────────────────────────────────────────────────

import {
  IncrementalLayoutEngine,
  DirtyTracker,
  PageCache,
} from './incremental-layout'

export {
  IncrementalLayoutEngine,
  DirtyTracker,
  PageCache,
}

// ─── Parallel Layout ────────────────────────────────────────────────────────

import {
  ParallelLayoutManager,
} from './parallel-layout'

export {
  ParallelLayoutManager,
}

// ─── Convenience Functions ─────────────────────────────────────────────────

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
