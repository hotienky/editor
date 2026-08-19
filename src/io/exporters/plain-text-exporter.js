/**
 * Plain Text Exporter
 *
 * Exports Document AST to plain text format.
 * Strips all formatting and returns raw text.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── Plain Text Exporter Class ─────────────────────────────────────────────

export class PlainTextExporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Export document to plain text
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<string>} Plain text string
   */
  async export(doc, options = {}) {
    const { lineSeparator = '\n\n' } = options

    const children = this._convertNodes(doc.children || [])
    return children
  }

  /**
   * Convert multiple nodes
   * @private
   * @param {Array} nodes - AST nodes
   * @returns {string} Plain text string
   */
  _convertNodes(nodes) {
    return nodes
      .map(node => this._convertNode(node))
      .filter(text => text !== null)
      .join('\n\n')
  }

  /**
   * Convert a single node
   * @private
   * @param {Object} node - AST node
   * @returns {string|null} Plain text string
   */
  _convertNode(node) {
    if (!node) return null

    switch (node.type) {
      case 'heading':
        return this._convertHeading(node)

      case 'paragraph':
        return this._convertParagraph(node)

      case 'blockquote':
        return this._convertBlockquote(node)

      case 'codeBlock':
        return this._convertCodeBlock(node)

      case 'bulletList':
      case 'orderedList':
        return this._convertList(node)

      case 'listItem':
        return this._convertListItem(node)

      case 'table':
        return this._convertTable(node)

      case 'image':
        return this._convertImage(node)

      case 'horizontalRule':
        return '---'

      case 'hardBreak':
        return '\n'

      default:
        return null
    }
  }

  /**
   * Convert heading node
   * @private
   */
  _convertHeading(node) {
    const content = this._convertInlineContent(node.children || [])
    return content
  }

  /**
   * Convert paragraph node
   * @private
   */
  _convertParagraph(node) {
    return this._convertInlineContent(node.children || [])
  }

  /**
   * Convert blockquote node
   * @private
   */
  _convertBlockquote(node) {
    const content = this._convertNodes(node.children || '')
    const lines = content.split('\n')

    return lines.map(line => `> ${line}`).join('\n')
  }

  /**
   * Convert code block node
   * @private
   */
  _convertCodeBlock(node) {
    return this._extractText(node)
  }

  /**
   * Convert list node
   * @private
   */
  _convertList(node) {
    const items = node.children
      ?.filter(child => child.type === 'listItem')
      .map(child => this._convertListItem(child))
      .join('\n')

    return items
  }

  /**
   * Convert list item node
   * @private
   */
  _convertListItem(node) {
    const content = this._convertNodes(node.children || '')
    return `- ${content}`
  }

  /**
   * Convert table node
   * @private
   */
  _convertTable(node) {
    const rows = []

    for (const child of node.children || []) {
      if (child.type === 'tableRow') {
        rows.push(this._convertTableRow(child))
      }
    }

    return rows.join('\n')
  }

  /**
   * Convert table row node
   * @private
   */
  _convertTableRow(node) {
    const cells = node.children
      ?.filter(child => child.type === 'tableCell' || child.type === 'tableHeader')
      .map(child => this._convertTableCell(child))
      .join(' | ')

    return `| ${cells} |`
  }

  /**
   * Convert table cell node
   * @private
   */
  _convertTableCell(node) {
    return this._convertInlineContent(node.children || [])
  }

  /**
   * Convert image node
   * @private
   */
  _convertImage(node) {
    const alt = node.attrs?.alt || 'image'
    return `[${alt}]`
  }

  /**
   * Convert inline content
   * @private
   */
  _convertInlineContent(children) {
    return children.map(child => this._convertInline(child)).join('')
  }

  /**
   * Convert inline node
   * @private
   */
  _convertInline(node) {
    if (!node) return ''

    if (node.type === 'text') {
      return node.text || ''
    }

    if (node.type === 'hardBreak') {
      return '\n'
    }

    if (node.type === 'image') {
      return this._convertImage(node)
    }

    return ''
  }

  /**
   * Extract text from a node
   * @private
   */
  _extractText(node) {
    if (node.text) return node.text
    if (!node.children) return ''

    return node.children
      .map(child => this._extractText(child))
      .join('')
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a plain text exporter instance
 * @param {Object} [options] - Export options
 * @returns {PlainTextExporter}
 */
export function createPlainTextExporter(options) {
  return new PlainTextExporter(options)
}

export default {
  PlainTextExporter,
  createPlainTextExporter,
}
