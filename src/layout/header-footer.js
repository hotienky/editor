/**
 * Header/Footer Positioning
 *
 * Computes header and footer positions for each page.
 * Handles different scopes: all pages, first page, last page, odd/even.
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Scope Types ───────────────────────────────────────────────────────────

export const HeaderFooterScope = {
  ALL: 'all',
  FIRST_LAST: 'first_last',
  ODD_EVEN: 'odd_even',
}

// ─── Layout Types ──────────────────────────────────────────────────────────

export const HeaderFooterLayout = {
  SINGLE: 'single',
  SPLIT: 'split',
}

// ─── Position Calculator ───────────────────────────────────────────────────

/**
 * Determine if header/footer should be shown on a specific page
 * @param {Object} config - Header/Footer config
 * @param {number} pageNumber - Current page number (1-based)
 * @param {number} totalPages - Total number of pages
 * @returns {boolean}
 */
export function shouldShowHeaderFooter(config, pageNumber, totalPages) {
  if (!config?.enable) return false

  const scope = config.scope || HeaderFooterScope.ALL

  switch (scope) {
    case HeaderFooterScope.ALL:
      return true

    case HeaderFooterScope.FIRST_LAST:
      return pageNumber === 1 || pageNumber === totalPages

    case HeaderFooterScope.ODD_EVEN:
      return pageNumber % 2 !== 0 // Show on odd pages

    default:
      return true
  }
}

/**
 * Get header position for a page
 * @param {Object} headerConfig - Header configuration
 * @param {Object} pageConfig - Page configuration
 * @param {number} pageNumber - Current page number
 * @param {number} totalPages - Total pages
 * @returns {{ top: number, height: number, visible: boolean, styles: Object }}
 */
export function getHeaderPosition(headerConfig, pageConfig, pageNumber, totalPages) {
  const visible = shouldShowHeaderFooter(headerConfig, pageNumber, totalPages)

  if (!visible) {
    return {
      top: 0,
      height: 0,
      visible: false,
      styles: {},
    }
  }

  const heightCm = headerConfig.marginTop || 1.5
  const topCm = pageConfig.margin.top

  return {
    top: topCm,
    height: heightCm,
    visible: true,
    styles: {
      position: 'absolute',
      top: `${topCm}cm`,
      left: `${pageConfig.margin.left}cm`,
      right: `${pageConfig.margin.right}cm`,
      height: `${heightCm}cm`,
    },
  }
}

/**
 * Get footer position for a page
 * @param {Object} footerConfig - Footer configuration
 * @param {Object} pageConfig - Page configuration
 * @param {number} pageNumber - Current page number
 * @param {number} totalPages - Total pages
 * @returns {{ bottom: number, height: number, visible: boolean, styles: Object }}
 */
export function getFooterPosition(footerConfig, pageConfig, pageNumber, totalPages) {
  const visible = shouldShowHeaderFooter(footerConfig, pageNumber, totalPages)

  if (!visible) {
    return {
      bottom: 0,
      height: 0,
      visible: false,
      styles: {},
    }
  }

  const heightCm = footerConfig.marginBottom || 1.5
  const bottomCm = pageConfig.margin.bottom

  return {
    bottom: bottomCm,
    height: heightCm,
    visible: true,
    styles: {
      position: 'absolute',
      bottom: `${bottomCm}cm`,
      left: `${pageConfig.margin.left}cm`,
      right: `${pageConfig.margin.right}cm`,
      height: `${heightCm}cm`,
    },
  }
}

/**
 * Build header/footer data for all pages
 * @param {Object} headerConfig - Header configuration
 * @param {Object} footerConfig - Footer configuration
 * @param {Object} pageConfig - Page configuration
 * @param {number} totalPages - Total number of pages
 * @returns {Array<{page: number, header: Object, footer: Object}>}
 */
export function buildHeaderFooterMap(headerConfig, footerConfig, pageConfig, totalPages) {
  const map = []

  for (let i = 1; i <= totalPages; i++) {
    map.push({
      page: i,
      header: getHeaderPosition(headerConfig, pageConfig, i, totalPages),
      footer: getFooterPosition(footerConfig, pageConfig, i, totalPages),
    })
  }

  return map
}

/**
 * Format header/footer text with page number placeholders
 * @param {string} text - Text with placeholders
 * @param {Object} vars - Variables to substitute
 * @returns {string}
 */
export function formatHeaderFooterText(text, vars = {}) {
  if (!text) return ''

  let result = text

  // Page number: {page} or {PAGE}
  if (vars.pageNumber !== undefined) {
    result = result.replace(/\{page\}/gi, vars.pageNumber)
  }

  // Total pages: {pages} or {PAGES}
  if (vars.totalPages !== undefined) {
    result = result.replace(/\{pages\}/gi, vars.totalPages)
  }

  // Page of total: {page} of {pages}
  if (vars.pageNumber !== undefined && vars.totalPages !== undefined) {
    result = result.replace(
      /\{page\}\s*(?:of|\/)\s*\{pages\}/gi,
      `${vars.pageNumber} / ${vars.totalPages}`,
    )
  }

  return result
}

/**
 * Build header/footer content data for rendering
 * @param {Object} config - Header/Footer config
 * @param {number} pageNumber
 * @param {number} totalPages
 * @returns {{ text: string, leftText: string, rightText: string, logo: string, styles: Object }}
 */
export function getHeaderFooterContent(config, pageNumber, totalPages) {
  if (!config?.enable) {
    return { text: '', leftText: '', rightText: '', logo: null, styles: {} }
  }

  const text = formatHeaderFooterText(config.text || '', { pageNumber, totalPages })
  const leftText = formatHeaderFooterText(config.leftText || '', { pageNumber, totalPages })
  const rightText = formatHeaderFooterText(config.rightText || '', { pageNumber, totalPages })

  return {
    text,
    leftText,
    rightText,
    logo: config.logo || null,
    logoWidth: config.logoWidth || 48,
    fontColor: config.fontColor || '#333',
    fontSize: config.fontSize || 14,
    fontFamily: config.fontFamily || 'Arial',
    fontWeight: config.fontWeight || 'normal',
    align: config.align || 'center',
    layout: config.layout || HeaderFooterLayout.SINGLE,
    showBorder: config.showBorder !== false,
  }
}

export default {
  HeaderFooterScope,
  HeaderFooterLayout,
  shouldShowHeaderFooter,
  getHeaderPosition,
  getFooterPosition,
  buildHeaderFooterMap,
  formatHeaderFooterText,
  getHeaderFooterContent,
}
