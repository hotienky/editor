/**
 * HTML Exporter
 *
 * Exports Document AST to HTML format.
 * Generates clean, semantic HTML.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── HTML Exporter Class ───────────────────────────────────────────────────

export class HtmlExporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Export document to HTML
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<string>} HTML string
   */
  async export(doc, options = {}) {
    const { includeStyles = true } = options

    const children = this._convertNodes(doc.children || [])

    let html = ''

    if (includeStyles) {
      html += this._getStyles()
    }

    html += `<div class="kindy-document">\n`
    html += children
    html += `</div>`

    return html
  }

  /**
   * Export as a complete HTML document
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<string>} Complete HTML document
   */
  async exportDocument(doc, options = {}) {
    const { title = 'Document', includeStyles = true } = options

    const content = await this.export(doc, { includeStyles })

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this._escapeHtml(title)}</title>
</head>
<body>
${content}
</body>
</html>`
  }

  /**
   * Convert multiple nodes
   * @private
   * @param {Array} nodes - AST nodes
   * @returns {string} HTML string
   */
  _convertNodes(nodes) {
    return nodes.map(node => this._convertNode(node)).filter(Boolean).join('\n')
  }

  /**
   * Convert a single node
   * @private
   * @param {Object} node - AST node
   * @returns {string|null} HTML string
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

      case 'tableRow':
        return this._convertTableRow(node)

      case 'tableCell':
      case 'tableHeader':
        return this._convertTableCell(node)

      case 'image':
        return this._convertImage(node)

      case 'horizontalRule':
        return '<hr>'

      case 'hardBreak':
        return '<br>'

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

    return `<h${level}>${content}</h${level}>`
  }

  /**
   * Convert paragraph node
   * @private
   */
  _convertParagraph(node) {
    const content = this._convertInlineContent(node.children || [])
    const style = this._getStyleString(node.attrs)

    return `<p${style ? ` style="${style}"` : ''}>${content}</p>`
  }

  /**
   * Convert blockquote node
   * @private
   */
  _convertBlockquote(node) {
    const content = this._convertNodes(node.children || [])

    return `<blockquote>${content}</blockquote>`
  }

  /**
   * Convert code block node
   * @private
   */
  _convertCodeBlock(node) {
    const language = node.attrs?.language || ''
    const text = this._extractText(node)

    return `<pre><code class="language-${this._escapeHtml(language)}">${this._escapeHtml(text)}</code></pre>`
  }

  /**
   * Convert list node
   * @private
   */
  _convertList(node, ordered) {
    const tag = ordered ? 'ol' : 'ul'
    const items = node.children
      ?.filter(child => child.type === 'listItem')
      .map(child => this._convertListItem(child))
      .join('\n')

    return `<tag>${items}</tag>`.replace('tag', tag)
  }

  /**
   * Convert list item node
   * @private
   */
  _convertListItem(node) {
    const content = this._convertNodes(node.children || [])

    return `<li>${content}</li>`
  }

  /**
   * Convert table node
   * @private
   */
  _convertTable(node) {
    const rows = node.children
      ?.filter(child => child.type === 'tableRow')
      .map(child => this._convertTableRow(child))
      .join('\n')

    return `<table>\n<tbody>\n${rows}\n</tbody>\n</table>`
  }

  /**
   * Convert table row node
   * @private
   */
  _convertTableRow(node) {
    const cells = node.children
      ?.filter(child => child.type === 'tableCell' || child.type === 'tableHeader')
      .map(child => this._convertTableCell(child))
      .join('\n')

    return `<tr>\n${cells}\n</tr>`
  }

  /**
   * Convert table cell node
   * @private
   */
  _convertTableCell(node) {
    const tag = node.type === 'tableHeader' ? 'th' : 'td'
    const content = this._convertNodes(node.children || [])

    return `<tag>${content}</tag>`.replace('tag', tag)
  }

  /**
   * Convert image node
   * @private
   */
  _convertImage(node) {
    const src = node.attrs?.src || ''
    const alt = node.attrs?.alt || ''
    const width = node.attrs?.width ? ` width="${node.attrs.width}"` : ''
    const height = node.attrs?.height ? ` height="${node.attrs.height}"` : ''

    return `<img src="${this._escapeHtml(src)}" alt="${this._escapeHtml(alt)}"${width}${height}>`
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
      let text = this._escapeHtml(node.text || '')

      if (node.marks) {
        for (const mark of node.marks) {
          text = this._applyMark(text, mark)
        }
      }

      return text
    }

    if (node.type === 'hardBreak') {
      return '<br>'
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
        return `<strong>${text}</strong>`

      case 'italic':
        return `<em>${text}</em>`

      case 'underline':
        return `<u>${text}</u>`

      case 'strike':
        return `<s>${text}</s>`

      case 'code':
        return `<code>${text}</code>`

      case 'link': {
        const href = this._escapeHtml(mark.attrs?.href || '')
        return `<a href="${href}">${text}</a>`
      }

      case 'subscript':
        return `<sub>${text}</sub>`

      case 'superscript':
        return `<sup>${text}</sup>`

      default:
        return text
    }
  }

  /**
   * Get style string from attributes
   * @private
   */
  _getStyleString(attrs) {
    if (!attrs) return ''

    const styles = []

    if (attrs.textAlign) {
      styles.push(`text-align: ${attrs.textAlign}`)
    }

    if (attrs.lineHeight) {
      styles.push(`line-height: ${attrs.lineHeight}`)
    }

    return styles.join('; ')
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
   * Escape HTML special characters
   * @private
   */
  _escapeHtml(str) {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * Get default styles
   * @private
   */
  _getStyles() {
    return `<style>
.kindy-document {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
h1, h2, h3, h4, h5, h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}
h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }
p {
  margin: 0.5em 0;
}
blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #e2e8f0;
  background-color: #f8fafc;
}
pre {
  margin: 1em 0;
  padding: 1em;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow-x: auto;
}
code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}
pre code {
  background: none;
  padding: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
th, td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}
th {
  background-color: #f8fafc;
  font-weight: 600;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}
hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 2em 0;
}
</style>
`
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create an HTML exporter instance
 * @param {Object} [options] - Export options
 * @returns {HtmlExporter}
 */
export function createHtmlExporter(options) {
  return new HtmlExporter(options)
}

export default {
  HtmlExporter,
  createHtmlExporter,
}
