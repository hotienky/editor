/**
 * Markdown Importer
 *
 * Imports Markdown files and converts to Document AST.
 * Parses Markdown syntax and maps to document structure.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── Markdown Importer Class ───────────────────────────────────────────────

export class MarkdownImporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Import Markdown content
   * @param {File|string} file - Markdown file or string
   * @param {Object} [options] - Import options
   * @returns {Promise<Object>} Document AST
   */
  async import(file, options = {}) {
    let markdown = ''

    if (file instanceof File) {
      markdown = await file.text()
    } else if (typeof file === 'string') {
      markdown = file
    } else if (file instanceof ArrayBuffer) {
      markdown = new TextDecoder().decode(file)
    }

    return this._parseMarkdown(markdown)
  }

  /**
   * Parse Markdown string
   * @private
   * @param {string} markdown - Markdown string
   * @returns {Object} Document AST
   */
  _parseMarkdown(markdown) {
    const lines = markdown.split('\n')
    const children = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Empty line
      if (line.trim() === '') {
        i++
        continue
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
      if (headingMatch) {
        const [, hashes, text] = headingMatch
        const level = hashes.length
        children.push({
          type: 'heading',
          attrs: { level },
          children: [{ type: 'text', text }],
        })
        i++
        continue
      }

      // Code block
      if (line.trim().startsWith('```')) {
        const language = line.trim().slice(3).trim() || 'plaintext'
        const codeLines = []
        i++

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }

        children.push({
          type: 'codeBlock',
          attrs: { language },
          children: [{ type: 'text', text: codeLines.join('\n') }],
        })
        i++ // Skip closing ```
        continue
      }

      // Blockquote
      if (line.trim().startsWith('>')) {
        const quoteLines = []
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s*/, ''))
          i++
        }

        const quoteChildren = this._parseInlineContent(quoteLines.join('\n'))
        children.push({
          type: 'blockquote',
          children: quoteChildren,
        })
        continue
      }

      // Unordered list
      if (line.match(/^\s*[-*+]\s/)) {
        const listItems = []
        while (i < lines.length && lines[i].match(/^\s*[-*+]\s/)) {
          const itemText = lines[i].replace(/^\s*[-*+]\s/, '')
          listItems.push({
            type: 'listItem',
            children: this._parseInlineContent(itemText),
          })
          i++
        }

        children.push({
          type: 'bulletList',
          children: listItems,
        })
        continue
      }

      // Ordered list
      if (line.match(/^\s*\d+\.\s/)) {
        const listItems = []
        while (i < lines.length && lines[i].match(/^\s*\d+\.\s/)) {
          const itemText = lines[i].replace(/^\s*\d+\.\s/, '')
          listItems.push({
            type: 'listItem',
            children: this._parseInlineContent(itemText),
          })
          i++
        }

        children.push({
          type: 'orderedList',
          children: listItems,
        })
        continue
      }

      // Horizontal rule
      if (line.match(/^[-*_]{3,}$/)) {
        children.push({
          type: 'horizontalRule',
        })
        i++
        continue
      }

      // Table
      if (line.includes('|') && lines[i + 1]?.match(/^\|?[\s:-]+\|/)) {
        const tableResult = this._parseTable(lines, i)
        children.push(tableResult.table)
        i = tableResult.endIndex
        continue
      }

      // Paragraph (default)
      const paragraphLines = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].match(/^#{1,6}\s/) &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('>') &&
        !lines[i].match(/^\s*[-*+]\s/) &&
        !lines[i].match(/^\s*\d+\.\s/) &&
        !lines[i].match(/^[-*_]{3,}$/)
      ) {
        paragraphLines.push(lines[i])
        i++
      }

      if (paragraphLines.length > 0) {
        children.push({
          type: 'paragraph',
          children: this._parseInlineContent(paragraphLines.join(' ')),
        })
      }
    }

    return {
      type: 'document',
      children,
      metadata: {
        createdAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Parse inline content (bold, italic, code, links, etc.)
   * @private
   * @param {string} text - Text with inline formatting
   * @returns {Array<Object>}
   */
  _parseInlineContent(text) {
    const children = []
    let remaining = text

    while (remaining.length > 0) {
      // Code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        children.push({
          type: 'text',
          text: codeMatch[1],
          marks: [{ type: 'code' }],
        })
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
      if (boldMatch) {
        children.push({
          type: 'text',
          text: boldMatch[1],
          marks: [{ type: 'bold' }],
        })
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/)
      if (italicMatch) {
        children.push({
          type: 'text',
          text: italicMatch[1],
          marks: [{ type: 'italic' }],
        })
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Link
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        children.push({
          type: 'text',
          text: linkMatch[1],
          marks: [{ type: 'link', attrs: { href: linkMatch[2] } }],
        })
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // Image
      const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
      if (imageMatch) {
        children.push({
          type: 'image',
          attrs: {
            alt: imageMatch[1],
            src: imageMatch[2],
          },
        })
        remaining = remaining.slice(imageMatch[0].length)
        continue
      }

      // Strikethrough
      const strikeMatch = remaining.match(/^~~([^~]+)~~/)
      if (strikeMatch) {
        children.push({
          type: 'text',
          text: strikeMatch[1],
          marks: [{ type: 'strike' }],
        })
        remaining = remaining.slice(strikeMatch[0].length)
        continue
      }

      // Plain text (up to next special character)
      const textMatch = remaining.match(/^[^`*[~!]+/)
      if (textMatch) {
        children.push({
          type: 'text',
          text: textMatch[0],
        })
        remaining = remaining.slice(textMatch[0].length)
        continue
      }

      // Single character (if no pattern matches)
      children.push({
        type: 'text',
        text: remaining[0],
      })
      remaining = remaining.slice(1)
    }

    return children.length > 0 ? children : [{ type: 'text', text: '' }]
  }

  /**
   * Parse a Markdown table
   * @private
   * @param {Array<string>} lines - Lines array
   * @param {number} startIndex - Start index
   * @returns {{ table: Object, endIndex: number }}
   */
  _parseTable(lines, startIndex) {
    const rows = []
    let i = startIndex

    // Parse header row
    const headerLine = lines[i]
    const headerCells = this._parseTableRow(headerLine)
    rows.push({
      type: 'tableRow',
      children: headerCells.map(cell => ({
        type: 'tableHeader',
        children: this._parseInlineContent(cell),
      })),
    })
    i++

    // Skip separator row
    i++

    // Parse data rows
    while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
      const cells = this._parseTableRow(lines[i])
      rows.push({
        type: 'tableRow',
        children: cells.map(cell => ({
          type: 'tableCell',
          children: this._parseInlineContent(cell),
        })),
      })
      i++
    }

    return {
      table: {
        type: 'table',
        children: rows,
      },
      endIndex: i,
    }
  }

  /**
   * Parse a table row
   * @private
   * @param {string} row - Table row string
   * @returns {Array<string>}
   */
  _parseTableRow(row) {
    return row
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== '')
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a Markdown importer instance
 * @param {Object} [options] - Import options
 * @returns {MarkdownImporter}
 */
export function createMarkdownImporter(options) {
  return new MarkdownImporter(options)
}

export default {
  MarkdownImporter,
  createMarkdownImporter,
}
