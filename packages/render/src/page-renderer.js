/**
 * Page Renderer
 *
 * Renders a single page from Layout Tree data.
 * Generates CSS styles and HTML structure for a page.
 * Framework-agnostic — can be used by Vue, React, or plain DOM.
 *
 * Architecture: Layer 4 — Render Engine
 */

import { getHeaderFooterContent } from '@kindy/layout'
import { getPageNumberText } from '@kindy/layout'

// ─── CSS Class Names ───────────────────────────────────────────────────────

export const CSSClasses = {
  PAGE: 'kindy-print-page',
  CONTENT: 'kindy-print-page-content',
  HEADER: 'kindy-print-header',
  FOOTER: 'kindy-print-footer',
  PAGE_BREAK: 'kindy-page-break',
  TABLE: 'kindy-table',
  IMAGE: 'kindy-image',
  CODE_BLOCK: 'kindy-code-block',
  BLOCKQUOTE: 'kindy-blockquote',
}

// ─── Page Renderer Class ───────────────────────────────────────────────────

export class PageRenderer {
  constructor(options = {}) {
    this._zoomLevel = options.zoomLevel || 100
    this._pageOptions = options.pageOptions || {}
    this._customStyles = options.customStyles || {}
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
   * Add custom styles for a component
   * @param {string} component - Component name
   * @param {Object} styles - CSS styles
   */
  addCustomStyles(component, styles) {
    this._customStyles[component] = styles
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

    const baseStyles = {
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

    return { ...baseStyles, ...this._customStyles.page }
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

    const baseStyles = {
      position: 'relative',
      boxSizing: 'border-box',
      paddingLeft: `${margin.left}cm`,
      paddingRight: `${margin.right}cm`,
      paddingTop: `${paddingTop}cm`,
      paddingBottom: `${paddingBottom}cm`,
      minHeight: `${layoutPage.contentHeight || 100}px`,
    }

    return { ...baseStyles, ...this._customStyles.content }
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
      <div class="${CSSClasses.PAGE}" style="${styleStr}">
        ${headerHtml}
        <div class="${CSSClasses.CONTENT}" style="${contentStyleStr}">
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
      .${CSSClasses.PAGE} {
        width: ${pageWidth}cm;
        height: ${pageHeight}cm;
        padding: ${margin.top}cm ${margin.right}cm ${margin.bottom}cm ${margin.left}cm;
        box-sizing: border-box;
        page-break-after: always;
        position: relative;
        background: ${config.background || '#ffffff'};
        overflow: hidden;
      }
      .${CSSClasses.PAGE}:last-child {
        page-break-after: auto;
      }
      .${CSSClasses.CONTENT} {
        position: relative;
        min-height: 0;
      }
      .${CSSClasses.PAGE_BREAK} {
        display: none;
      }
      .${CSSClasses.TABLE} {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
      }
      .${CSSClasses.TABLE} th,
      .${CSSClasses.TABLE} td {
        border: 1px solid #e2e8f0;
        padding: 8px 12px;
        text-align: left;
      }
      .${CSSClasses.TABLE} th {
        background-color: #f8fafc;
        font-weight: 600;
      }
      .${CSSClasses.IMAGE} {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1em auto;
      }
      .${CSSClasses.CODE_BLOCK} {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.5;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 16px;
        overflow-x: auto;
      }
      .${CSSClasses.BLOCKQUOTE} {
        margin: 1em 0;
        padding: 0.5em 1em;
        border-left: 4px solid #e2e8f0;
        background-color: #f8fafc;
        color: #64748b;
      }
    `
  }

  /**
   * Render a block element
   * @param {Object} node - AST node
   * @param {string} innerHtml - Inner HTML content
   * @returns {string}
   */
  renderBlock(node, innerHtml = '') {
    const { type, attrs = {} } = node

    switch (type) {
      case 'paragraph':
        return `<p style="margin: 0.5em 0; line-height: 1.6;">${innerHtml}</p>`

      case 'heading': {
        const level = attrs.level || 1
        const fontSize = 32 - (level * 4)
        return `<h${level} style="margin: 1em 0 0.5em; font-size: ${fontSize}px; font-weight: 600;">${innerHtml}</h${level}>`
      }

      case 'codeBlock':
        return `<pre class="${CSSClasses.CODE_BLOCK}"><code>${this._escapeHtml(innerHtml)}</code></pre>`

      case 'blockquote':
        return `<blockquote class="${CSSClasses.BLOCKQUOTE}">${innerHtml}</blockquote>`

      case 'bulletList':
        return `<ul style="margin: 0.5em 0; padding-left: 1.5em;">${innerHtml}</ul>`

      case 'orderedList':
        return `<ol style="margin: 0.5em 0; padding-left: 1.5em;">${innerHtml}</ol>`

      case 'listItem':
        return `<li style="margin: 0.25em 0;">${innerHtml}</li>`

      case 'taskList':
        return `<ul class="task-list" style="list-style: none; padding-left: 0;">${innerHtml}</ul>`

      case 'taskItem':
        return `<li class="task-item" style="margin: 0.25em 0;">${innerHtml}</li>`

      case 'horizontalRule':
        return `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 1em 0;" />`

      case 'hardBreak':
        return `<br>`

      case 'image': {
        const src = attrs.src || ''
        const alt = attrs.alt || ''
        const width = attrs.width ? `width: ${attrs.width}px;` : ''
        return `<img class="${CSSClasses.IMAGE}" src="${src}" alt="${alt}" style="${width}" />`
      }

      case 'inlineImage': {
        const src = attrs.src || ''
        const alt = attrs.alt || ''
        const w = attrs.width ? `width: ${attrs.width}px;` : ''
        const h = attrs.height ? `height: ${attrs.height}px;` : ''
        return `<img class="${CSSClasses.IMAGE}" src="${src}" alt="${alt}" style="display: inline-block; ${w}${h}" />`
      }

      case 'video': {
        const src = attrs.src || ''
        return `<video src="${src}" controls style="max-width: 100%; margin: 1em 0;"></video>`
      }

      case 'audio': {
        const src = attrs.src || ''
        return `<audio src="${src}" controls style="margin: 1em 0;"></audio>`
      }

      case 'file': {
        const name = attrs.name || 'File'
        const url = attrs.url || '#'
        return `<div style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; margin: 1em 0;"><a href="${url}" target="_blank">${name}</a></div>`
      }

      case 'iframe': {
        const src = attrs.src || ''
        return `<iframe src="${src}" style="width: 100%; min-height: 400px; border: 1px solid #e2e8f0; margin: 1em 0;"></iframe>`
      }

      case 'table':
        return `<table class="${CSSClasses.TABLE}">${innerHtml}</table>`

      case 'tableRow':
        return `<tr>${innerHtml}</tr>`

      case 'tableCell':
        return `<td>${innerHtml}</td>`

      case 'tableHeader':
        return `<th>${innerHtml}</th>`

      case 'details':
        return `<details style="margin: 1em 0; border: 1px solid #e2e8f0; border-radius: 4px;">${innerHtml}</details>`

      case 'detailsSummary':
        return `<summary style="padding: 8px 12px; cursor: pointer; font-weight: 600;">${innerHtml}</summary>`

      case 'detailsContent':
        return `<div style="padding: 8px 12px;">${innerHtml}</div>`

      case 'callout':
        return `<div style="padding: 12px 16px; margin: 1em 0; border-left: 4px solid #3b82f6; background-color: #eff6ff; border-radius: 0 4px 4px 0;">${innerHtml}</div>`

      case 'column':
        return `<div style="flex: 1;">${innerHtml}</div>`

      case 'columnContainer':
        return `<div style="display: flex; gap: 16px;">${innerHtml}</div>`

      case 'textBox':
        return `<div style="border: 1px solid #e2e8f0; padding: 12px; margin: 1em 0; border-radius: 4px;">${innerHtml}</div>`

      case 'sectionBreak':
        return `<hr style="border: none; border-top: 2px dashed #e2e8f0; margin: 1em 0;" />`

      case 'footnote':
        return `<div class="footnote-content" style="font-size: 0.85em; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 8px;">${innerHtml}</div>`

      case 'footnotes':
        return `<div class="footnotes-section" style="border-top: 1px solid #e2e8f0; margin-top: 1em; padding-top: 8px;">${innerHtml}</div>`

      case 'footnoteReference':
        return `<sup class="footnote-ref" style="color: #3b82f6; cursor: pointer;">${attrs.number || '*'}</sup>`

      case 'echarts':
        return `<div data-type="echarts" style="width: 100%; height: 400px; margin: 1em 0;"></div>`

      case 'blockMath':
        return `<div class="block-math" style="text-align: center; margin: 1em 0; padding: 16px; background: #f8fafc; border-radius: 4px;">${innerHtml}</div>`

      case 'inlineMath':
        return `<span class="inline-math" style="font-style: italic;">${innerHtml}</span>`

      case 'toc':
        return `<div class="table-of-contents" style="margin: 1em 0; padding: 16px; background: #f8fafc; border-radius: 4px;">${innerHtml}</div>`

      case 'datetime':
        return `<span class="datetime" style="color: #64748b;">${attrs.value || ''}</span>`

      case 'mention':
        return `<span class="mention" style="color: #3b82f6; font-weight: 500;">@${attrs.label || attrs.id || ''}</span>`

      case 'tag':
        return `<span class="tag" style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 0.85em;">${attrs.label || ''}</span>`

      case 'optionBox':
        return `<div class="option-box" style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; margin: 0.5em 0;">${innerHtml}</div>`

      case 'bookmark':
        return `<span class="bookmark" style="background: #fef3c7; padding: 2px 4px; border-radius: 2px;">${innerHtml}</span>`

      default:
        return innerHtml
    }
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
      <div class="${CSSClasses.HEADER}" style="
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
      <div class="${CSSClasses.FOOTER}" style="
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

  _escapeHtml(str) {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
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
  CSSClasses,
}
