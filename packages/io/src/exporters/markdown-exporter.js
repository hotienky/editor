/**
 * Markdown Exporter
 *
 * Exports Document AST to Markdown format.
 * Generates clean, readable Markdown.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── Markdown Exporter Class ───────────────────────────────────────────────

export class MarkdownExporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Export document to Markdown
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<string>} Markdown string
   */
  async export(doc, options = {}) {
    const children = this._convertNodes(doc.children || [])
    return children
  }

  /**
   * Convert multiple nodes
   * @private
   * @param {Array} nodes - AST nodes
   * @returns {string} Markdown string
   */
  _convertNodes(nodes) {
    return nodes.map(node => this._convertNode(node)).filter(Boolean).join('\n\n')
  }

  /**
   * Convert a single node
   * @private
   * @param {Object} node - AST node
   * @returns {string|null} Markdown string
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
        return this._convertList(node, false)

      case 'orderedList':
        return this._convertList(node, true)

      case 'listItem':
        return this._convertListItem(node)

      case 'table':
        return this._convertTable(node)

      case 'image':
        return this._convertImage(node)

      case 'horizontalRule':
        return '---'

      case 'hardBreak':
        return '  \n'

      default:
        return null
    }
  }

  /**
   * Convert heading node
   * @private
   */
  _convertHeading(node) {
    const level = node.attrs?.level || 1
    const content = this._convertInlineContent(node.children || [])

    return `${'#'.repeat(level)} ${content}`
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
    const content = this._convertNodes(node.children || [])
    const lines = content.split('\n')

    return lines.map(line => `> ${line}`).join('\n')
  }

  /**
   * Convert code block node
   * @private
   */
  _convertCodeBlock(node) {
    const language = node.attrs?.language || ''
    const text = this._extractText(node)

    return `\`\`\`${language}\n${text}\n\`\`\``
  }

  /**
   * Convert list node
   * @private
   */
  _convertList(node, ordered) {
    const items = node.children
      ?.filter(child => child.type === 'listItem')
      .map((child, index) => this._convertListItem(child, ordered ? index + 1 : null))
      .join('\n')

    return items
  }

  /**
   * Convert list item node
   * @private
   */
  _convertListItem(node, index) {
    const content = this._convertNodes(node.children || '')
    const prefix = index !== null ? `${index}. ` : '- '

    // Handle multi-line content
    const lines = content.split('\n')
    const firstLine = lines[0]
    const rest = lines.slice(1).map(line => `  ${line}`).join('\n')

    return `${prefix}${firstLine}${rest ? '\n' + rest : ''}`
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

    if (rows.length === 0) return ''

    // Add separator after first row (header)
    const separator = this._getTableRowSeparator(rows[0])
    rows.splice(1, 0, separator)

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
   * Get table row separator
   * @private
   */
  _getTableRowSeparator(row) {
    const cellCount = (row.match(/\|/g) || []).length - 1
    return `| ${Array(cellCount).fill('---').join(' | ')} |`
  }

  /**
   * Convert table cell node
   * @private
   */
  _convertTableCell(node) {
    return this._convertInlineContent(node.children || []).replace(/\|/g, '\\|')
  }

  /**
   * Convert image node
   * @private
   */
  _convertImage(node) {
    const src = node.attrs?.src || ''
    const alt = node.attrs?.alt || ''

    return `![${alt}](${src})`
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
      let text = node.text || ''

      if (node.marks) {
        for (const mark of node.marks) {
          text = this._applyMark(text, mark)
        }
      }

      return text
    }

    if (node.type === 'hardBreak') {
      return '  \n'
    }

    if (node.type === 'image') {
      return this._convertImage(node)
    }

    return ''
  }

  /**
   * Apply a mark to text
   * @private
   */
  _applyMark(text, mark) {
    switch (mark.type) {
      case 'bold':
        return `**${text}**`

      case 'italic':
        return `*${text}*`

      case 'underline':
        return `<u>${text}</u>`

      case 'strike':
        return `~~${text}~~`

      case 'code':
        return `\`${text}\``

      case 'link':
        const href = mark.attrs?.href || ''
        return `[${text}](${href})`

      case 'subscript':
        return `<sub>${text}</sub>`

      case 'superscript':
        return `<sup>${text}</sup>`

      default:
        return text
    }
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
 * Create a Markdown exporter instance
 * @param {Object} [options] - Export options
 * @returns {MarkdownExporter}
 */
export function createMarkdownExporter(options) {
  return new MarkdownExporter(options)
}

export default {
  MarkdownExporter,
  createMarkdownExporter,
}
