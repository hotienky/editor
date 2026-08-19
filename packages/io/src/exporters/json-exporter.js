/**
 * JSON Exporter
 *
 * Exports Document AST to JSON format.
 * Serializes the document for storage or transport.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── JSON Exporter Class ───────────────────────────────────────────────────

export class JsonExporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Export document to JSON
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<string>} JSON string
   */
  async export(doc, options = {}) {
    const { pretty = false, includeMetadata = true } = options

    const exported = this._exportDocument(doc, includeMetadata)

    if (pretty) {
      return JSON.stringify(exported, null, 2)
    }
    return JSON.stringify(exported)
  }

  /**
   * Export as object (not stringified)
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Export options
   * @returns {Promise<Object>} JSON object
   */
  async exportObject(doc, options = {}) {
    const { includeMetadata = true } = options
    return this._exportDocument(doc, includeMetadata)
  }

  /**
   * Export document
   * @private
   * @param {Object} doc - Document AST
   * @param {boolean} includeMetadata - Include metadata
   * @returns {Object} Exported document
   */
  _exportDocument(doc, includeMetadata) {
    const exported = {
      type: 'document',
      children: this._exportNodes(doc.children || []),
    }

    if (includeMetadata && doc.metadata) {
      exported.metadata = { ...doc.metadata }
    }

    return exported
  }

  /**
   * Export multiple nodes
   * @private
   * @param {Array} nodes - AST nodes
   * @returns {Array} Exported nodes
   */
  _exportNodes(nodes) {
    return nodes.map(node => this._exportNode(node)).filter(Boolean)
  }

  /**
   * Export a single node
   * @private
   * @param {Object} node - AST node
   * @returns {Object|null} Exported node
   */
  _exportNode(node) {
    if (!node) return null

    const exported = {
      type: node.type,
    }

    if (node.attrs) {
      exported.attrs = { ...node.attrs }
    }

    if (node.text !== undefined) {
      exported.text = node.text
    }

    if (node.marks) {
      exported.marks = node.marks.map(mark => this._exportMark(mark))
    }

    if (node.children) {
      exported.children = this._exportNodes(node.children)
    }

    return exported
  }

  /**
   * Export a mark
   * @private
   * @param {Object} mark - Mark
   * @returns {Object} Exported mark
   */
  _exportMark(mark) {
    const exported = {
      type: mark.type,
    }

    if (mark.attrs) {
      exported.attrs = { ...mark.attrs }
    }

    return exported
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a JSON exporter instance
 * @param {Object} [options] - Export options
 * @returns {JsonExporter}
 */
export function createJsonExporter(options) {
  return new JsonExporter(options)
}

export default {
  JsonExporter,
  createJsonExporter,
}
