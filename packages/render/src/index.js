/**
 * Render Engine — Public API
 *
 * Single entry point for the Render Engine layer.
 * All external code should import from here.
 *
 * Architecture: Layer 4 — Render Engine
 */

// ─── Viewport Virtualization ───────────────────────────────────────────────

import {
  ViewportVirtualizer,
  getViewport,
  createViewport,
} from './viewport'

export {
  ViewportVirtualizer,
  getViewport,
  createViewport,
}

// ─── Page Renderer ─────────────────────────────────────────────────────────

import {
  PageRenderer,
  getPageRenderer,
  createPageRenderer,
} from './page-renderer'

export {
  PageRenderer,
  getPageRenderer,
  createPageRenderer,
}

// ─── Header/Footer Renderer ────────────────────────────────────────────────

import {
  HeaderFooterRenderer,
  getHeaderFooterRenderer,
  createHeaderFooterRenderer,
} from './header-footer-renderer'

export {
  HeaderFooterRenderer,
  getHeaderFooterRenderer,
  createHeaderFooterRenderer,
}

// ─── Convenience Functions ─────────────────────────────────────────────────

/**
 * Initialize the render engine with page options
 * @param {Object} pageOptions - Page configuration
 */
export function initRenderer(pageOptions) {
  const renderer = getPageRenderer()
  renderer.updateOptions(pageOptions)

  const hfRenderer = getHeaderFooterRenderer()
  hfRenderer.updateOptions(pageOptions)
}

/**
 * Update zoom level across all renderers
 * @param {number} zoomLevel
 */
export function updateZoom(zoomLevel) {
  const viewport = getViewport()
  viewport.updateZoom(zoomLevel)

  const renderer = getPageRenderer()
  renderer.updateZoom(zoomLevel)
}

/**
 * Update layout tree across all renderers
 * @param {Object} layoutTree
 */
export function updateLayout(layoutTree) {
  const viewport = getViewport()
  viewport.updateLayout(layoutTree)
}

/**
 * Render a complete page HTML
 * @param {Object} layoutPage - Page from LayoutTree
 * @param {string} contentHtml - Content HTML
 * @returns {string}
 */
export function renderPage(layoutPage, contentHtml) {
  const renderer = getPageRenderer()
  return renderer.renderPage(layoutPage, contentHtml)
}

/**
 * Render header for a page
 * @param {number} pageNumber
 * @param {number} totalPages
 * @returns {{ html: string, visible: boolean, styles: Object }}
 */
export function renderHeader(pageNumber, totalPages) {
  const renderer = getHeaderFooterRenderer()
  return renderer.renderHeader(pageNumber, totalPages)
}

/**
 * Render footer for a page
 * @param {number} pageNumber
 * @param {number} totalPages
 * @returns {{ html: string, visible: boolean, styles: Object }}
 */
export function renderFooter(pageNumber, totalPages) {
  const renderer = getHeaderFooterRenderer()
  return renderer.renderFooter(pageNumber, totalPages)
}

/**
 * Check if a page should be rendered
 * @param {number} pageNumber
 * @returns {boolean}
 */
export function shouldRenderPage(pageNumber) {
  const viewport = getViewport()
  return viewport.shouldRender(pageNumber)
}

export default {
  // Viewport
  getViewport,
  createViewport,
  shouldRenderPage,

  // Page Renderer
  getPageRenderer,
  createPageRenderer,
  renderPage,

  // Header/Footer Renderer
  getHeaderFooterRenderer,
  createHeaderFooterRenderer,
  renderHeader,
  renderFooter,

  // Convenience
  initRenderer,
  updateZoom,
  updateLayout,
}
