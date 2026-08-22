/**
 * JSON Importer
 *
 * Imports JSON files and converts to Document AST.
 * Validates and normalizes JSON structure.
 *
 * Architecture: Layer 8 — IO Engine
 */

// ─── JSON Importer Class ───────────────────────────────────────────────────

export class JsonImporter {
  constructor(options = {}) {
    this._options = options
  }

  /**
   * Import JSON content
   * @param {File|string|Object} file - JSON file, string, or object
   * @param {Object} [options] - Import options
   * @returns {Promise<Object>} Document AST
   */
  async import(file, options = {}) {
    let json = ''

    if (file instanceof File) {
      json = await file.text()
    } else if (typeof file === 'string') {
      json = file
    } else if (file instanceof ArrayBuffer) {
      json = new TextDecoder().decode(file)
    } else if (typeof file === 'object') {
      return this._normalizeDocument(file)
    }

    try {
      const parsed = JSON.parse(json)
      return this._normalizeDocument(parsed)
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`)
    }
  }

  /**
   * Normalize a parsed JSON document
   * @private
   * @param {Object} json - Parsed JSON
   * @returns {Object} Document AST
   */
  _normalizeDocument(json) {
    // Handle our AST format
    if (json.type === 'document') {
      return this._normalizeAST(json)
    }

    // Handle ProseMirror format
    if (json.type === 'doc') {
      return this._normalizeProseMirror(json)
    }

    // Unknown format, try to normalize as AST
    return this._normalizeAST(json)
  }

  /**
   * Normalize AST format
   * @private
   * @param {Object} ast - AST document
   * @returns {Object} Normalized AST
   */
  _normalizeAST(ast) {
    return {
      type: 'document',
      children: this._normalizeChildren(ast.children || []),
      metadata: ast.metadata || {},
    }
  }

  /**
   * Normalize ProseMirror format
   * @private
   * @param {Object} pmJson - ProseMirror document
   * @returns {Object} Document AST
   */
  _normalizeProseMirror(pmJson) {
    return {
      type: 'document',
      children: this._normalizePMNodes(pmJson.content || []),
      metadata: pmJson.attrs || {},
    }
  }

  /**
   * Normalize children nodes
   * @private
   * @param {Array} children - Child nodes
   * @returns {Array} Normalized children
   */
  _normalizeChildren(children) {
    return children.map(child => this._normalizeNode(child)).filter(Boolean)
  }

  /**
   * Normalize a single node
   * @private
   * @param {Object} node - Node to normalize
   * @returns {Object|null} Normalized node
   */
  _normalizeNode(node) {
    if (!node) return null

    // Text node
    if (node.text !== undefined) {
      return {
        type: 'text',
        text: node.text,
        marks: node.marks || undefined,
      }
    }

    // Block node
    const normalized = {
      type: node.type,
    }

    if (node.attrs) {
      normalized.attrs = node.attrs
    }

    if (node.children) {
      normalized.children = this._normalizeChildren(node.children)
    }

    // Handle ProseMirror content array
    if (node.content && Array.isArray(node.content)) {
      normalized.children = this._normalizePMNodes(node.content)
    }

    return normalized
  }

  /**
   * Normalize ProseMirror nodes
   * @private
   * @param {Array} nodes - ProseMirror nodes
   * @returns {Array} Normalized nodes
   */
  _normalizePMNodes(nodes) {
    return nodes.map(node => this._normalizePMNode(node)).filter(Boolean)
  }

  /**
   * Normalize a ProseMirror node
   * @private
   * @param {Object} node - ProseMirror node
   * @returns {Object|null} Normalized node
   */
  _normalizePMNode(node) {
    if (!node) return null

    const normalized = {
      type: node.type,
    }

    if (node.attrs) {
      normalized.attrs = node.attrs
    }

    if (node.content) {
      normalized.children = this._normalizePMNodes(node.content)
    }

    if (node.marks) {
      normalized.marks = node.marks
    }

    if (node.text !== undefined) {
      normalized.text = node.text
    }

    return normalized
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a JSON importer instance
 * @param {Object} [options] - Import options
 * @returns {JsonImporter}
 */
export function createJsonImporter(options) {
  return new JsonImporter(options)
}

export default {
  JsonImporter,
  createJsonImporter,
}
