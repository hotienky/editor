/**
 * Document Serializer
 *
 * Bidirectional conversion between KindyDocument AST and ProseMirror JSON.
 * Ensures the Document Model layer stays in sync with the Editing Engine layer.
 *
 * Architecture: Layer 1 ↔ Layer 2 Bridge
 */

import { KindyDocument, fromProseMirrorJSON, toProseMirrorJSON } from './document'

// ─── Format Versions ───────────────────────────────────────────────────────

export const Format = {
  PROSE_MIRROR: 'prosemirror',
  KINDY_AST: 'kindy-ast',
  HTML: 'html',
  PLAIN_TEXT: 'plain-text',
}

// ─── Serializer ────────────────────────────────────────────────────────────

export class DocumentSerializer {
  constructor() {
    this._customSerializers = new Map()
  }

  /**
   * Register a custom serializer for a node type
   * @param {string} typeName - Node type name
   * @param {Function} serializer - (node) => Object
   */
  registerSerializer(typeName, serializer) {
    this._customSerializers.set(typeName, serializer)
  }

  // ─── ProseMirror → KindyDocument ─────────────────────────────────────

  /**
   * Convert ProseMirror JSON to KindyDocument
   * @param {Object} pmJson - ProseMirror document JSON
   * @returns {KindyDocument}
   */
  fromProseMirror(pmJson) {
    if (!pmJson) return new KindyDocument()
    return fromProseMirrorJSON(pmJson)
  }

  /**
   * Convert ProseMirror editor state to KindyDocument
   * @param {Object} editor - Tiptap/ProseMirror editor instance
   * @returns {KindyDocument}
   */
  fromEditor(editor) {
    if (!editor?.getJSON) return new KindyDocument()
    return this.fromProseMirror(editor.getJSON())
  }

  // ─── KindyDocument → ProseMirror ─────────────────────────────────────

  /**
   * Convert KindyDocument to ProseMirror JSON
   * @param {KindyDocument} doc - The document
   * @returns {Object} ProseMirror document JSON
   */
  toProseMirror(doc) {
    if (!doc) return { type: 'doc', content: [{ type: 'paragraph' }] }
    return toProseMirrorJSON(doc)
  }

  /**
   * Set editor content from KindyDocument
   * @param {Object} editor - Tiptap/ProseMirror editor instance
   * @param {KindyDocument} doc - The document
   * @param {Object} options - { emitUpdate: boolean }
   */
  setEditorContent(editor, doc, options = {}) {
    if (!editor?.commands) return
    const pmJson = this.toProseMirror(doc)
    editor.commands.setContent(pmJson, options.emitUpdate !== false)
  }

  // ─── KindyDocument → Transport Format ────────────────────────────────

  /**
   * Serialize KindyDocument to JSON for storage/transport
   * @param {KindyDocument} doc - The document
   * @returns {Object} Serializable JSON
   */
  toJSON(doc) {
    if (!doc) return null
    return doc.toJSON()
  }

  /**
   * Deserialize JSON to KindyDocument
   * @param {Object} json - Serialized JSON
   * @returns {KindyDocument}
   */
  fromJSON(json) {
    return KindyDocument.fromJSON(json)
  }

  // ─── HTML Export (Read-only) ──────────────────────────────────────────

  /**
   * Convert KindyDocument to HTML string (export only)
   * This is a read-only conversion. HTML is NOT used for storage.
   *
   * @param {KindyDocument} doc - The document
   * @returns {string} HTML string
   */
  toHTML(doc) {
    if (!doc) return ''
    return this._nodesToHTML(doc.children)
  }

  // ─── Plain Text Export ────────────────────────────────────────────────

  /**
   * Convert KindyDocument to plain text
   * @param {KindyDocument} doc - The document
   * @returns {string}
   */
  toPlainText(doc) {
    if (!doc) return ''
    return doc.toPlainText()
  }

  // ─── Diff ─────────────────────────────────────────────────────────────

  /**
   * Compute minimal changes between two documents
   * @param {KindyDocument} oldDoc - Previous document
   * @param {KindyDocument} newDoc - New document
   * @returns {Array<Object>} List of change operations
   */
  diff(oldDoc, newDoc) {
    if (!oldDoc && !newDoc) return []
    if (!oldDoc) return [{ type: 'create', doc: newDoc }]
    if (!newDoc) return [{ type: 'delete' }]

    const changes = []
    this._diffNodes(oldDoc.children, newDoc.children, [], changes)
    return changes
  }

  // ─── Internal HTML Conversion ─────────────────────────────────────────

  _nodesToHTML(nodes) {
    if (!nodes) return ''
    return nodes.map((node) => this._nodeToHTML(node)).join('')
  }

  _nodeToHTML(node) {
    if (!node) return ''

    // Text node
    if (node.text !== undefined) {
      let text = this._escapeHTML(node.text)
      if (node.marks) {
        text = this._applyMarks(text, node.marks)
      }
      return text
    }

    const tag = this._getNodeTag(node)
    if (!tag) return ''

    const attrs = this._getNodeAttrs(node)
    const attrStr = this._attrsToHTML(attrs)
    const content = node.children ? this._nodesToHTML(node.children) : ''

    if (node.type === 'hardBreak') return '<br>'
    if (node.type === 'horizontalRule') return '<hr>'
    if (['image', 'video', 'audio', 'file', 'iframe', 'echarts'].includes(node.type)) {
      return this._mediaToHTML(node)
    }

    return `<${tag}${attrStr}>${content}</${tag}>`
  }

  _getNodeTag(node) {
    const tagMap = {
      paragraph: 'p',
      heading: (n) => `h${n.attrs?.level || 1}`,
      blockquote: 'blockquote',
      codeBlock: 'pre',
      bulletList: 'ul',
      orderedList: 'ol',
      taskList: 'ul',
      listItem: 'li',
      taskItem: 'li',
      table: 'table',
      tableRow: 'tr',
      tableCell: 'td',
      tableHeader: 'th',
      details: 'details',
      detailsSummary: 'summary',
      detailsContent: 'div',
      callout: 'div',
      column: 'div',
      columnContainer: 'div',
      textBox: 'div',
      footnoteReference: 'sup',
      footnote: 'li',
      footnotes: 'ol',
    }

    const tag = tagMap[node.type]
    if (typeof tag === 'function') return tag(node)
    return tag || 'div'
  }

  _getNodeAttrs(node) {
    if (!node.attrs) return {}
    const attrs = { ...node.attrs }
    // Remove internal-only attributes
    delete attrs.vnode
    delete attrs.uploaded
    delete attrs.error
    delete attrs.initialAttrs
    return attrs
  }

  _attrsToHTML(attrs) {
    if (!attrs || Object.keys(attrs).length === 0) return ''
    return ` ${  Object.entries(attrs)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => {
        if (typeof v === 'object') v = JSON.stringify(v)
        return `${k}="${this._escapeHTML(String(v))}"`
      })
      .join(' ')}`
  }

  _applyMarks(text, marks) {
    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          text = `<b>${text}</b>`
          break
        case 'italic':
          text = `<em>${text}</em>`
          break
        case 'strike':
          text = `<s>${text}</s>`
          break
        case 'underline':
          text = `<u>${text}</u>`
          break
        case 'code':
          text = `<code>${text}</code>`
          break
        case 'link':
          text = `<a href="${mark.attrs?.href || ''}">${text}</a>`
          break
        case 'subscript':
          text = `<sub>${text}</sub>`
          break
        case 'superscript':
          text = `<sup>${text}</sup>`
          break
        case 'textStyle':
          if (mark.attrs?.color || mark.attrs?.fontSize) {
            const style = []
            if (mark.attrs.color) style.push(`color: ${mark.attrs.color}`)
            if (mark.attrs.fontSize) style.push(`font-size: ${mark.attrs.fontSize}`)
            text = `<span style="${style.join('; ')}">${text}</span>`
          }
          break
        case 'letterSpacing':
          if (mark.attrs?.spacing) {
            text = `<span style="letter-spacing: ${mark.attrs.spacing}">${text}</span>`
          }
          break
        case 'comment':
          // Internal-only mark, not rendered in HTML
          break
        case 'bookmark':
          text = `<span class="bookmark" data-name="${mark.attrs?.bookmarkName || ''}">${text}</span>`
          break
      }
    }
    return text
  }

  _mediaToHTML(node) {
    switch (node.type) {
      case 'image':
        return `<figure data-type="image"><img src="${node.attrs?.src || ''}" alt="${node.attrs?.alt || ''}" width="${node.attrs?.width || ''}" height="${node.attrs?.height || ''}"><figcaption>${node.children ? this._nodesToHTML(node.children) : ''}</figcaption></figure>`
      case 'video':
        return `<video src="${node.attrs?.src || ''}" width="${node.attrs?.width || ''}" height="${node.attrs?.height || ''}"></video>`
      case 'audio':
        return `<audio src="${node.attrs?.src || ''}"></audio>`
      case 'file':
        return `<div data-type="file"><a href="${node.attrs?.url || '#'}" target="_blank">${node.attrs?.name || 'File'}</a></div>`
      case 'iframe':
        return `<iframe src="${node.attrs?.src || ''}" width="${node.attrs?.width || ''}" height="${node.attrs?.height || ''}"></iframe>`
      case 'echarts':
        return `<div data-type="echarts" data-options="${this._escapeHTML(JSON.stringify(node.attrs?.chartOptions || {}))}"></div>`
      default:
        return `<div data-type="${node.type}"></div>`
    }
  }

  _escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // ─── Internal Diff ────────────────────────────────────────────────────

  _diffNodes(oldNodes, newNodes, path, changes) {
    const maxLen = Math.max(oldNodes?.length || 0, newNodes?.length || 0)
    for (let i = 0; i < maxLen; i++) {
      const oldNode = oldNodes?.[i]
      const newNode = newNodes?.[i]
      const currentPath = [...path, i]

      if (!oldNode && newNode) {
        changes.push({ type: 'insert', path: currentPath, node: newNode })
      } else if (oldNode && !newNode) {
        changes.push({ type: 'remove', path: currentPath })
      } else if (oldNode && newNode) {
        if (oldNode.type !== newNode.type) {
          changes.push({ type: 'replace', path: currentPath, oldNode, newNode })
        } else if (JSON.stringify(oldNode.attrs) !== JSON.stringify(newNode.attrs)) {
          changes.push({ type: 'attrs', path: currentPath, oldAttrs: oldNode.attrs, newAttrs: newNode.attrs })
        } else if (oldNode.text !== newNode.text) {
          changes.push({ type: 'text', path: currentPath, oldText: oldNode.text, newText: newNode.text })
        } else if (oldNode.children || newNode.children) {
          this._diffNodes(oldNode.children || [], newNode.children || [], currentPath, changes)
        }
      }
    }
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global serializer instance
 * @returns {DocumentSerializer}
 */
export function getSerializer() {
  if (!_instance) {
    _instance = new DocumentSerializer()
  }
  return _instance
}

/**
 * Create a new serializer instance
 * @returns {DocumentSerializer}
 */
export function createSerializer() {
  return new DocumentSerializer()
}

export default {
  DocumentSerializer,
  Format,
  getSerializer,
  createSerializer,
}
