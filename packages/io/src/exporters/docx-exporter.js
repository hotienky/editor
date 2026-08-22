/**
 * DOCX Exporter
 *
 * Exports Document AST to DOCX format.
 * Uses docx library for generation.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── DOCX Exporter Class ───────────────────────────────────────────────────

export class DocxExporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Export document to DOCX
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<Blob>} DOCX file as Blob
   */
  async export(doc, options = {}) {
    // Build DOCX structure
    const docx = this._buildDocx(doc)

    // Generate DOCX file
    return this._generateDocx(docx)
  }

  /**
   * Build DOCX structure from AST
   * @private
   * @param {Object} doc - Document AST
   * @returns {Object} DOCX structure
   */
  _buildDocx(doc) {
    const paragraphs = []

    for (const child of doc.children || []) {
      const converted = this._convertNode(child)
      if (converted) {
        if (Array.isArray(converted)) {
          paragraphs.push(...converted)
        } else {
          paragraphs.push(converted)
        }
      }
    }

    return {
      title: doc.metadata?.title || '',
      author: doc.metadata?.author || '',
      paragraphs,
    }
  }

  /**
   * Convert an AST node to DOCX format
   * @private
   * @param {Object} node - AST node
   * @returns {Object|Array|null}
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

      case 'table':
        return this._convertTable(node)

      case 'image':
        return this._convertImage(node)

      case 'horizontalRule':
        return this._convertHorizontalRule()

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
    const text = this._extractText(node)

    return {
      type: 'paragraph',
      heading: level,
      children: [{ type: 'text', text }],
    }
  }

  /**
   * Convert paragraph node
   * @private
   */
  _convertParagraph(node) {
    const children = this._convertInlineContent(node.children || [])

    return {
      type: 'paragraph',
      alignment: node.attrs?.textAlign || undefined,
      children,
    }
  }

  /**
   * Convert blockquote node
   * @private
   */
  _convertBlockquote(node) {
    const children = []

    for (const child of node.children || []) {
      const converted = this._convertNode(child)
      if (converted) {
        children.push(converted)
      }
    }

    return {
      type: 'paragraph',
      indent: 1,
      children,
    }
  }

  /**
   * Convert code block node
   * @private
   */
  _convertCodeBlock(node) {
    const text = this._extractText(node)

    return {
      type: 'paragraph',
      children: [{ type: 'text', text, font: 'Courier New' }],
    }
  }

  /**
   * Convert list node
   * @private
   */
  _convertList(node) {
    const items = []

    for (const child of node.children || []) {
      if (child.type === 'listItem') {
        const text = this._extractText(child)
        items.push({
          type: 'text',
          text,
        })
      }
    }

    return {
      type: 'list',
      numbering: node.type === 'orderedList',
      items,
    }
  }

  /**
   * Convert table node
   * @private
   */
  _convertTable(node) {
    const rows = []

    for (const child of node.children || []) {
      if (child.type === 'tableRow') {
        const cells = []

        for (const cell of child.children || []) {
          if (cell.type === 'tableCell' || cell.type === 'tableHeader') {
            cells.push({
              type: cell.type === 'tableHeader' ? 'header' : 'cell',
              children: this._convertInlineContent(cell.children || []),
            })
          }
        }

        rows.push({ cells })
      }
    }

    return {
      type: 'table',
      rows,
    }
  }

  /**
   * Convert image node
   * @private
   */
  _convertImage(node) {
    return {
      type: 'image',
      src: node.attrs?.src || '',
      alt: node.attrs?.alt || '',
      width: node.attrs?.width || undefined,
      height: node.attrs?.height || undefined,
    }
  }

  /**
   * Convert horizontal rule
   * @private
   */
  _convertHorizontalRule() {
    return {
      type: 'horizontalRule',
    }
  }

  /**
   * Convert inline content
   * @private
   */
  _convertInlineContent(children) {
    const result = []

    for (const child of children) {
      if (child.type === 'text') {
        result.push({
          type: 'text',
          text: child.text || '',
          bold: child.marks?.some(m => m.type === 'bold') || false,
          italic: child.marks?.some(m => m.type === 'italic') || false,
          underline: child.marks?.some(m => m.type === 'underline') || false,
          strike: child.marks?.some(m => m.type === 'strike') || false,
          code: child.marks?.some(m => m.type === 'code') || false,
        })
      } else if (child.type === 'hardBreak') {
        result.push({ type: 'break' })
      }
    }

    return result
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

  /**
   * Generate DOCX file
   * @private
   */
  async _generateDocx(docx) {
    // This would use the docx library to generate actual DOCX
    // For now, return a placeholder
    const content = JSON.stringify(docx, null, 2)
    return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a DOCX exporter instance
 * @param {Object} [options] - Export options
 * @returns {DocxExporter}
 */
export function createDocxExporter(options) {
  return new DocxExporter(options)
}

export default {
  DocxExporter,
  createDocxExporter,
}
