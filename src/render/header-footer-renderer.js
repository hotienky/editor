/**
 * Header/Footer Renderer
 *
 * Renders header and footer content for each page.
 * Handles different layouts (single, split) and scopes.
 * Generates HTML/CSS for display.
 *
 * Architecture: Layer 4 — Render Engine
 */

import { getHeaderFooterContent } from '@/layout/header-footer'
import { shouldShowHeaderFooter } from '@/layout/header-footer'

// ─── Header/Footer Renderer Class ──────────────────────────────────────────

export class HeaderFooterRenderer {
  constructor(options = {}) {
    this._pageOptions = options.pageOptions || {}
  }

  /**
   * Update page options
   * @param {Object} pageOptions
   */
  updateOptions(pageOptions) {
    this._pageOptions = pageOptions
  }

  /**
   * Render header for a page
   * @param {number} pageNumber
   * @param {number} totalPages
   * @returns {{ html: string, visible: boolean, styles: Object }}
   */
  renderHeader(pageNumber, totalPages) {
    const headerConfig = this._pageOptions.header
    if (!headerConfig?.enable) {
      return { html: '', visible: false, styles: {} }
    }

    const visible = shouldShowHeaderFooter(headerConfig, pageNumber, totalPages)
    if (!visible) {
      return { html: '', visible: false, styles: {} }
    }

    const content = getHeaderFooterContent(headerConfig, pageNumber, totalPages)
    const margin = this._pageOptions.margin || { top: 2.54, left: 2.54, right: 2.54 }

    const styles = {
      position: 'absolute',
      top: `${margin.top}cm`,
      left: `${margin.left}cm`,
      right: `${margin.right}cm`,
      height: `${headerConfig.marginTop || 1.5}cm`,
    }

    const html = this._buildHeaderHtml(content, pageNumber, totalPages)

    return { html, visible: true, styles }
  }

  /**
   * Render footer for a page
   * @param {number} pageNumber
   * @param {number} totalPages
   * @returns {{ html: string, visible: boolean, styles: Object }}
   */
  renderFooter(pageNumber, totalPages) {
    const footerConfig = this._pageOptions.footer
    if (!footerConfig?.enable) {
      return { html: '', visible: false, styles: {} }
    }

    const visible = shouldShowHeaderFooter(footerConfig, pageNumber, totalPages)
    if (!visible) {
      return { html: '', visible: false, styles: {} }
    }

    const content = getHeaderFooterContent(footerConfig, pageNumber, totalPages)
    const margin = this._pageOptions.margin || { bottom: 2.54, left: 2.54, right: 2.54 }

    const styles = {
      position: 'absolute',
      bottom: `${margin.bottom}cm`,
      left: `${margin.left}cm`,
      right: `${margin.right}cm`,
      height: `${footerConfig.marginBottom || 1.5}cm`,
    }

    const html = this._buildFooterHtml(content, pageNumber, totalPages)

    return { html, visible: true, styles }
  }

  /**
   * Render both header and footer for a page
   * @param {number} pageNumber
   * @param {number} totalPages
   * @returns {{ header: Object, footer: Object }}
   */
  renderBoth(pageNumber, totalPages) {
    return {
      header: this.renderHeader(pageNumber, totalPages),
      footer: this.renderFooter(pageNumber, totalPages),
    }
  }

  /**
   * Get CSS styles for header
   * @param {Object} content - Header content data
   * @returns {string} CSS string
   */
  getHeaderStyles(content) {
    const fontSize = content.fontSize || 14
    const fontColor = content.fontColor || '#333'
    const fontFamily = content.fontFamily || 'Arial'
    const fontWeight = content.fontWeight || 'normal'
    const align = content.align || 'center'

    let css = `
      font-size: ${fontSize}px;
      color: ${fontColor};
      font-family: ${fontFamily};
      font-weight: ${fontWeight};
      text-align: ${align};
    `

    if (content.showBorder) {
      css += 'border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'
    }

    return css
  }

  /**
   * Get CSS styles for footer
   * @param {Object} content - Footer content data
   * @returns {string} CSS string
   */
  getFooterStyles(content) {
    const fontSize = content.fontSize || 14
    const fontColor = content.fontColor || '#333'
    const fontFamily = content.fontFamily || 'Arial'
    const fontWeight = content.fontWeight || 'normal'
    const align = content.align || 'center'

    let css = `
      font-size: ${fontSize}px;
      color: ${fontColor};
      font-family: ${fontFamily};
      font-weight: ${fontWeight};
      text-align: ${align};
    `

    if (content.showBorder) {
      css += 'border-top: 1px solid #e2e8f0; padding-top: 4px;'
    }

    return css
  }

  // ─── Internal Methods ──────────────────────────────────────────────────

  _buildHeaderHtml(content, pageNumber, totalPages) {
    const style = this.getHeaderStyles(content)

    let innerHtml = ''
    if (content.layout === 'split' || content.leftText || content.rightText) {
      innerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
            <span>${this._escapeHtml(content.leftText || '')}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${this._escapeHtml(content.rightText || '')}</span>
          </div>
        </div>
      `
    } else {
      innerHtml = `
        <div style="display: flex; align-items: center; justify-content: ${this._getJustifyValue(content.align)}; gap: 6px;">
          ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
          <span>${this._escapeHtml(content.text || '')}</span>
        </div>
      `
    }

    return `
      <div class="kindy-page-header" style="${style}">
        ${innerHtml}
      </div>
    `
  }

  _buildFooterHtml(content, pageNumber, totalPages) {
    const style = this.getFooterStyles(content)

    let innerHtml = ''
    if (content.layout === 'split' || content.leftText || content.rightText) {
      innerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
            <span>${this._escapeHtml(content.leftText || '')}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${this._escapeHtml(content.rightText || '')}</span>
          </div>
        </div>
      `
    } else {
      innerHtml = `
        <div style="display: flex; align-items: center; justify-content: ${this._getJustifyValue(content.align)}; gap: 6px;">
          ${content.logo ? `<img src="${content.logo}" style="height: auto; max-height: 32px; width: ${content.logoWidth}px;" />` : ''}
          <span>${this._escapeHtml(content.text || '')}</span>
        </div>
      `
    }

    return `
      <div class="kindy-page-footer" style="${style}">
        ${innerHtml}
      </div>
    `
  }

  _getJustifyValue(align) {
    switch (align) {
      case 'right': return 'flex-end'
      case 'center': return 'center'
      default: return 'flex-start'
    }
  }

  _escapeHtml(str) {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global header/footer renderer
 * @returns {HeaderFooterRenderer}
 */
export function getHeaderFooterRenderer() {
  if (!_instance) {
    _instance = new HeaderFooterRenderer()
  }
  return _instance
}

/**
 * Create a new header/footer renderer
 * @param {Object} options
 * @returns {HeaderFooterRenderer}
 */
export function createHeaderFooterRenderer(options) {
  return new HeaderFooterRenderer(options)
}

export default {
  HeaderFooterRenderer,
  getHeaderFooterRenderer,
  createHeaderFooterRenderer,
}
