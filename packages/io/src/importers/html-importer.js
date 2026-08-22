/**
 * HTML Importer
 *
 * Imports HTML files and converts to Document AST.
 * Parses HTML and maps elements to our document structure.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── HTML Importer Class ───────────────────────────────────────────────────

export class HtmlImporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Import HTML content
   * @param {File|string} file - HTML file or string
   * @param {Object} [options] - Import options
   * @returns {Promise<Object>} Document AST
   */
  async import(file, options = {}) {
    let html = ''

    if (file instanceof File) {
      html = await file.text()
    } else if (typeof file === 'string') {
      html = file
    } else if (file instanceof ArrayBuffer) {
      html = new TextDecoder().decode(file)
    }

    return this._parseHTML(html)
  }

  /**
   * Parse HTML string
   * @private
   * @param {string} html - HTML string
   * @returns {Object} Document AST
   */
  _parseHTML(html) {
    // Create a temporary DOM element for parsing
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const children = []
    const body = doc.body

    for (const node of body.childNodes) {
      const converted = this._convertNode(node)
      if (converted) {
        children.push(converted)
      }
    }

    return {
      type: 'document',
      children,
      metadata: {
        title: doc.title || '',
        createdAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Convert a DOM node
   * @private
   * @param {Node} node - DOM node
   * @returns {Object|null} AST node
   */
  _convertNode(node) {
    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text.trim()) {
        return {
          type: 'text',
          text,
        }
      }
      return null
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
      return this._convertElement(node)
    }

    return null
  }

  /**
   * Convert a DOM element
   * @private
   * @param {Element} element - DOM element
   * @returns {Object|null} AST node
   */
  _convertElement(element) {
    const tagName = element.tagName.toLowerCase()
    const children = this._convertChildren(element)

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return this._convertHeading(element, tagName, children)

      case 'p':
        return this._convertParagraph(element, children)

      case 'blockquote':
        return {
          type: 'blockquote',
          children,
        }

      case 'pre':
        return this._convertCodeBlock(element)

      case 'ul':
        return this._convertList(element, 'bulletList')

      case 'ol':
        return this._convertList(element, 'orderedList')

      case 'li':
        return {
          type: 'listItem',
          children,
        }

      case 'table':
        return this._convertTable(element)

      case 'tr':
        return {
          type: 'tableRow',
          children,
        }

      case 'td':
      case 'th':
        return {
          type: tagName === 'th' ? 'tableHeader' : 'tableCell',
          children,
        }

      case 'img':
        return this._convertImage(element)

      case 'hr':
        return {
          type: 'horizontalRule',
        }

      case 'br':
        return {
          type: 'hardBreak',
        }

      case 'a':
        return this._convertLink(element, children)

      case 'b':
      case 'strong':
        return this._wrapWithMark(children, 'bold')

      case 'i':
      case 'em':
        return this._wrapWithMark(children, 'italic')

      case 'u':
        return this._wrapWithMark(children, 'underline')

      case 's':
      case 'del':
        return this._wrapWithMark(children, 'strike')

      case 'code':
        return this._wrapWithMark(children, 'code')

      case 'sub':
        return this._wrapWithMark(children, 'subscript')

      case 'sup':
        return this._wrapWithMark(children, 'superscript')

      default:
        // Unknown element, return children as paragraph
        if (children.length > 0) {
          return {
            type: 'paragraph',
            children,
          }
        }
        return null
    }
  }

  /**
   * Convert children of an element
   * @private
   * @param {Element} element - Parent element
   * @returns {Array<Object>}
   */
  _convertChildren(element) {
    const children = []

    for (const child of element.childNodes) {
      const converted = this._convertNode(child)
      if (converted) {
        children.push(converted)
      }
    }

    return children
  }

  /**
   * Convert heading element
   * @private
   */
  _convertHeading(element, tagName, children) {
    const level = parseInt(tagName.replace('h', ''), 10)
    return {
      type: 'heading',
      attrs: { level },
      children,
    }
  }

  /**
   * Convert paragraph element
   * @private
   */
  _convertParagraph(element, children) {
    const textAlign = element.style.textAlign || undefined
    return {
      type: 'paragraph',
      children,
      attrs: textAlign ? { textAlign } : undefined,
    }
  }

  /**
   * Convert code block
   * @private
   */
  _convertCodeBlock(element) {
    const text = element.textContent || ''
    const language = element.className.replace('language-', '') || 'plaintext'

    return {
      type: 'codeBlock',
      attrs: { language },
      children: [{ type: 'text', text }],
    }
  }

  /**
   * Convert list element
   * @private
   */
  _convertList(element, type) {
    const children = []

    for (const child of element.children) {
      if (child.tagName.toLowerCase() === 'li') {
        children.push({
          type: 'listItem',
          children: this._convertChildren(child),
        })
      }
    }

    return {
      type,
      children,
    }
  }

  /**
   * Convert table element
   * @private
   */
  _convertTable(element) {
    const rows = []

    for (const row of element.querySelectorAll('tr')) {
      const cells = []

      for (const cell of row.querySelectorAll('td, th')) {
        const cellType = cell.tagName.toLowerCase() === 'th' ? 'tableHeader' : 'tableCell'
        cells.push({
          type: cellType,
          children: this._convertChildren(cell),
        })
      }

      rows.push({
        type: 'tableRow',
        children: cells,
      })
    }

    return {
      type: 'table',
      children: rows,
    }
  }

  /**
   * Convert image element
   * @private
   */
  _convertImage(element) {
    return {
      type: 'image',
      attrs: {
        src: element.src || '',
        alt: element.alt || '',
        width: element.width || null,
        height: element.height || null,
      },
    }
  }

  /**
   * Convert link element
   * @private
   */
  _convertLink(element, children) {
    return {
      type: 'text',
      text: children.map(c => c.text || '').join(''),
      marks: [
        {
          type: 'link',
          attrs: {
            href: element.href || '',
          },
        },
      ],
    }
  }

  /**
   * Wrap children with a mark
   * @private
   */
  _wrapWithMark(children, markType) {
    if (children.length === 0) return null

    // If single text child, add mark directly
    if (children.length === 1 && children[0].type === 'text') {
      return {
        type: 'text',
        text: children[0].text,
        marks: [{ type: markType }],
      }
    }

    // Otherwise, wrap in text node
    const text = children.map(c => c.text || '').join('')
    return {
      type: 'text',
      text,
      marks: [{ type: markType }],
    }
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create an HTML importer instance
 * @param {Object} [options] - Import options
 * @returns {HtmlImporter}
 */
export function createHtmlImporter(options) {
  return new HtmlImporter(options)
}

export default {
  HtmlImporter,
  createHtmlImporter,
}
