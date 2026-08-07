/**
 * Page Renderer
 *
 * Renders a single page from Layout Tree data.
 * Generates CSS styles and HTML structure for a page.
 * Framework-agnostic — can be used by Vue, React, or plain DOM.
 *
 * Architecture: Layer 4 — Render Engine
 */

import { cmToPx } from '@/layout/text-measurer'
import { getHeaderFooterContent } from '@/layout/header-footer'
import { getPageNumberText } from '@/layout/page-numbers'

// ─── Page Renderer Class ───────────────────────────────────────────────────

export class PageRenderer {
  constructor(options = {}) {
    this._zoomLevel = options.zoomLevel || 100
    this._pageOptions = options.pageOptions || {}
  }

  /**
   * Update zoom level
   * @param {number} zoomLevel
   */
  updateZoom(zoomLevel) {
    this._zoomLevel = zoomLevel
  }

  /**
   * Update page options
   * @param {Object} pageOptions
   */
  updateOptions(pageOptions) {
    this._pageOptions = pageOptions
  }

  /**
   * Generate CSS styles for a page
   * @param {Object} layoutPage - Page from LayoutTree
   * @returns {Object} CSS style object
   */
  getPageStyles(layoutPage) {
    const config = this._pageOptions
    const zoom = this._zoomLevel / 100
    const size = config.size || { width: 21, height: 29.7 }
    const orientation = config.orientation || 'portrait'

    const pageWidth = orientation === 'landscape' ? size.height : size.width
    const pageHeight = orientation === 'landscape' ? size.width : size.height

    return {
      width: `${pageWidth}cm`,
      height: `${pageHeight}cm`,
      backgroundColor: config.background || '#ffffff',
      transform: `scale(${zoom})`,
      transformOrigin: 'top left',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      borderRadius: '2px',
    }
  }

  /**
   * Generate CSS styles for page content area
   * @param {Object} layoutPage - Page from LayoutTree
   * @returns {Object} CSS style object
   */
  getContentStyles(layoutPage) {
    const config = this._pageOptions
    const margin = config.margin || { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }
    const header = config.header || {}
    const footer = config.footer || {}

    const paddingTop = header.enable ? (header.marginTop || 1.5) : 0
    const paddingBottom = footer.enable ? (footer.marginBottom || 1.5) : 0

    return {
      position: 'relative',
      boxSizing: 'border-box',
      paddingLeft: `${margin.left}cm`,
      paddingRight: `${margin.right}cm`,
      paddingTop: `${paddingTop}cm`,
      paddingBottom: `${paddingBottom}cm`,
      minHeight: `${layoutPage.contentHeight || 100}px`,
    }
  }

  /**
   * Generate HTML for a page
   * @param {Object} layoutPage - Page from LayoutTree
   * @param {string} contentHtml - Content HTML
   * @returns {string} Complete page HTML
   */
  renderPage(layoutPage, contentHtml = '') {
    const pageStyles = this.getPageStyles(layoutPage)
    const contentStyles = this.getContentStyles(layoutPage)
    const headerHtml = this._renderHeader(layoutPage)
    const footerHtml = this._renderFooter(layoutPage)

    const styleStr = this._stylesToCSS(pageStyles)
    const contentStyleStr = this._stylesToCSS(contentStyles)

    return `
      <div class="kindy-print-page" style="${styleStr}">
        ${headerHtml}
        <div class="kindy-print-page-content" style="${contentStyleStr}">
          ${contentHtml}
        </div>
        ${footerHtml}
      </div>
    `
  }

  /**
   * Generate page styles for print
   * @param {Object} layoutPage
   * @returns {string} CSS string
   */
  getPrintStyles(layoutPage) {
    const config = this._pageOptions
    const size = config.size || { width: 21, height: 29.7 }
    const orientation = config.orientation || 'portrait'
    const margin = config.margin || { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }

    const pageWidth = orientation === 'landscape' ? size.height : size.width
    const pageHeight = orientation === 'landscape' ? size.width : size.height

    return `
      @page {
        size: ${pageWidth}cm ${pageHeight}cm;
        margin: 0;
      }
      .kindy-print-page {
        width: ${pageWidth}cm;
        height: ${pageHeight}cm;
        padding: ${margin.top}cm ${margin.right}cm ${margin.bottom}cm ${margin.left}cm;
        box-sizing: border-box;
        page-break-after: always;
        position: relative;
        background: ${config.background || '#ffffff'};
        overflow: hidden;
      }
      .kindy-print-page:last-child {
        page-break-after: auto;
      }
      .kindy-print-page-content {
        position: relative;
        min-height: 0;
      }
      .kindy-page-break {
        display: none;
      }
    `
  }

  // ─── Internal Methods ──────────────────────────────────────────────────

  _renderHeader(layoutPage) {
    if (!layoutPage.header?.visible) return ''

    const content = getHeaderFooterContent(
      this._pageOptions.header,
      layoutPage.pageNumber,
      this._pageOptions.totalPages || 1,
    )

    const fontSize = content.fontSize || 14
    const fontColor = content.fontColor || '#333'
    const fontFamily = content.fontFamily || 'Arial'
    const fontWeight = content.fontWeight || 'normal'
    const align = content.align || 'center'

    let innerHtml = ''
    if (content.layout === 'split' || content.leftText || content.rightText) {
      innerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
            <span>${content.leftText || ''}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${content.rightText || ''}</span>
          </div>
        </div>
      `
    } else {
      innerHtml = `
        <div style="display: flex; align-items: center; justify-content: ${align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}; gap: 6px;">
          ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
          <span>${content.text || ''}</span>
        </div>
      `
    }

    const borderStyle = content.showBorder ? 'border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;' : ''

    return `
      <div class="kindy-print-header" style="
        padding: 0.5cm 1cm 0.3cm;
        font-size: ${fontSize}px;
        color: ${fontColor};
        font-family: ${fontFamily};
        font-weight: ${fontWeight};
        text-align: ${align};
        ${borderStyle}
      ">
        ${innerHtml}
      </div>
    `
  }

  _renderFooter(layoutPage) {
    if (!layoutPage.footer?.visible) return ''

    const content = getHeaderFooterContent(
      this._pageOptions.footer,
      layoutPage.pageNumber,
      this._pageOptions.totalPages || 1,
    )

    const fontSize = content.fontSize || 14
    const fontColor = content.fontColor || '#333'
    const fontFamily = content.fontFamily || 'Arial'
    const fontWeight = content.fontWeight || 'normal'
    const align = content.align || 'center'

    let innerHtml = ''
    if (content.layout === 'split' || content.leftText || content.rightText) {
      innerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
            <span>${content.leftText || ''}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${content.rightText || ''}</span>
          </div>
        </div>
      `
    } else {
      // Add page number if no custom text
      const displayText = content.text || getPageNumberText(
        layoutPage.pageNumber,
        this._pageOptions.totalPages || 1,
      )
      innerHtml = `
        <div style="display: flex; align-items: center; justify-content: ${align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}; gap: 6px;">
          ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
          <span>${displayText}</span>
        </div>
      `
    }

    const borderStyle = content.showBorder ? 'border-top: 1px solid #e2e8f0; padding-top: 4px;' : ''

    return `
      <div class="kindy-print-footer" style="
        padding: 0.3cm 1cm 0.5cm;
        font-size: ${fontSize}px;
        color: ${fontColor};
        font-family: ${fontFamily};
        font-weight: ${fontWeight};
        text-align: ${align};
        position: absolute;
        bottom: ${this._pageOptions.margin?.bottom || 2.54}cm;
        left: ${this._pageOptions.margin?.left || 2.54}cm;
        right: ${this._pageOptions.margin?.right || 2.54}cm;
        ${borderStyle}
      ">
        ${innerHtml}
      </div>
    `
  }

  _stylesToCSS(styles) {
    if (!styles) return ''
    return Object.entries(styles)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        return `${cssKey}: ${value}`
      })
      .join('; ')
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global page renderer
 * @returns {PageRenderer}
 */
export function getPageRenderer() {
  if (!_instance) {
    _instance = new PageRenderer()
  }
  return _instance
}

/**
 * Create a new page renderer
 * @param {Object} options
 * @returns {PageRenderer}
 */
export function createPageRenderer(options) {
  return new PageRenderer(options)
}

export default {
  PageRenderer,
  getPageRenderer,
  createPageRenderer,
}
