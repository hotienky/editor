/**
 * Document AST Wrapper
 *
 * Wraps the document content in a framework-agnostic AST format.
 * This is the single source of truth for document content.
 * ProseMirror's internal model is synchronized with this AST.
 *
 * Architecture: Layer 1 — Document Model
 */

import { NodeTypes, MarkTypes } from './schema'

// ─── AST Node Types ────────────────────────────────────────────────────────

/**
 * @typedef {Object} ASTNode
 * @property {string} type - Node type name
 * @property {Object} [attrs] - Node attributes
 * @property {Array<ASTNode|ASTText>} [children] - Child nodes (block nodes)
 * @property {string} [text] - Text content (text nodes)
 * @property {Array<ASTMark>} [marks] - Marks on text nodes
 */

/**
 * @typedef {Object} ASTMark
 * @property {string} type - Mark type name
 * @property {Object} [attrs] - Mark attributes
 */

/**
 * @typedef {Object} ASTDocument
 * @property {string} type - Always 'document'
 * @property {Array<ASTNode>} children - Top-level block nodes
 * @property {Object} [metadata] - Document metadata
 */

// ─── Document Class ────────────────────────────────────────────────────────

export class KindyDocument {
  /**
   * Create a new KindyDocument
   * @param {ASTDocument|Object} ast - Initial AST data
   */
  constructor(ast = null) {
    if (ast) {
      this._ast = this._normalizeAst(ast)
    } else {
      this._ast = this._createEmpty()
    }
    this._metadata = this._ast.metadata || {}
    this._version = 0
  }

  /**
   * Get the raw AST
   * @returns {ASTDocument}
   */
  get ast() {
    return this._ast
  }

  /**
   * Get document children (top-level blocks)
   * @returns {Array<ASTNode>}
   */
  get children() {
    return this._ast.children || []
  }

  /**
   * Get document metadata
   * @returns {Object}
   */
  get metadata() {
    return this._metadata
  }

  /**
   * Get document version
   * @returns {number}
   */
  get version() {
    return this._version
  }

  /**
   * Get document as plain JSON (for storage/transport)
   * @returns {Object}
   */
  toJSON() {
    return {
      type: 'document',
      version: this._version,
      metadata: { ...this._metadata },
      children: this._serializeChildren(this._ast.children),
    }
  }

  /**
   * Create a KindyDocument from JSON
   * @param {Object} json - JSON representation
   * @returns {KindyDocument}
   */
  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      return new KindyDocument()
    }
    return new KindyDocument(json)
  }

  /**
   * Get plain text content of the document
   * @returns {string}
   */
  toPlainText() {
    return this._extractText(this._ast.children)
  }

  /**
   * Get character count
   * @returns {number}
   */
  get charCount() {
    return this.toPlainText().length
  }

  /**
   * Get word count
   * @returns {number}
   */
  get wordCount() {
    const text = this.toPlainText()
    if (!text.trim()) return 0
    return text.split(/\s+/).filter(Boolean).length
  }

  /**
   * Get block count
   * @returns {number}
   */
  get blockCount() {
    return this._countBlocks(this._ast.children)
  }

  // ─── Traversal ─────────────────────────────────────────────────────────

  /**
   * Walk all nodes depth-first
   * @param {Function} callback - (node, path) => boolean|void. Return false to skip children.
   */
  walk(callback) {
    this._walkNodes(this._ast.children, [], callback)
  }

  /**
   * Find nodes matching a predicate
   * @param {Function} predicate - (node) => boolean
   * @returns {Array<{node: ASTNode, path: number[]}>}
   */
  find(predicate) {
    const results = []
    this.walk((node, path) => {
      if (predicate(node)) {
        results.push({ node, path: [...path] })
      }
    })
    return results
  }

  /**
   * Find first node matching a predicate
   * @param {Function} predicate - (node) => boolean
   * @returns {{node: ASTNode, path: number[]} | null}
   */
  findOne(predicate) {
    let result = null
    this.walk((node, path) => {
      if (predicate(node) && !result) {
        result = { node, path: [...path] }
        return false
      }
    })
    return result
  }

  /**
   * Get node at a specific path
   * @param {number[]} path - Path indices
   * @returns {ASTNode|null}
   */
  getNodeAtPath(path) {
    let current = this._ast.children
    for (const index of path) {
      if (!current || !current[index]) return null
      const node = current[index]
      if (index === path[path.length - 1]) return node
      current = node.children || []
    }
    return null
  }

  /**
   * Count nodes of a specific type
   * @param {string} typeName - Node type name
   * @returns {number}
   */
  countByType(typeName) {
    let count = 0
    this.walk((node) => {
      if (node.type === typeName) count++
    })
    return count
  }

  /**
   * Get all nodes of a specific type
   * @param {string} typeName - Node type name
   * @returns {Array<ASTNode>}
   */
  getAllByType(typeName) {
    return this.find((node) => node.type === typeName).map((r) => r.node)
  }

  // ─── Mutation (immutable) ──────────────────────────────────────────────

  /**
   * Create a new document with a node inserted
   * @param {number[]} path - Path to insert at
   * @param {ASTNode} node - Node to insert
   * @param {number} [index] - Index within the path's children (default: append)
   * @returns {KindyDocument}
   */
  insertNode(path, node, index = -1) {
    const newAst = structuredClone(this._ast)
    let current = newAst.children
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) return this
      current = current[path[i]].children || (current[path[i]].children = [])
    }
    const insertAt = index >= 0 ? index : current.length
    current.splice(insertAt, 0, node)
    const doc = new KindyDocument(newAst)
    doc._version = this._version + 1
    return doc
  }

  /**
   * Create a new document with a node removed
   * @param {number[]} path - Path to remove
   * @returns {KindyDocument}
   */
  removeNode(path) {
    const newAst = structuredClone(this._ast)
    let current = newAst.children
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) return this
      current = current[path[i]].children || []
    }
    current.splice(path[path.length - 1], 1)
    const doc = new KindyDocument(newAst)
    doc._version = this._version + 1
    return doc
  }

  /**
   * Create a new document with a node replaced
   * @param {number[]} path - Path to replace
   * @param {ASTNode} newNode - New node
   * @returns {KindyDocument}
   */
  replaceNode(path, newNode) {
    const newAst = structuredClone(this._ast)
    let current = newAst.children
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) return this
      current = current[path[i]].children || []
    }
    current[path[path.length - 1]] = newNode
    const doc = new KindyDocument(newAst)
    doc._version = this._version + 1
    return doc
  }

  /**
   * Create a new document with metadata updated
   * @param {Object} meta - Metadata to merge
   * @returns {KindyDocument}
   */
  withMetadata(meta) {
    const newAst = structuredClone(this._ast)
    newAst.metadata = { ...newAst.metadata, ...meta }
    const doc = new KindyDocument(newAst)
    doc._version = this._version + 1
    return doc
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────

  _normalizeAst(ast) {
    if (ast.type === 'document') {
      return {
        type: 'document',
        children: ast.children || [],
        metadata: ast.metadata || {},
      }
    }
    // If it's a raw ProseMirror JSON, wrap it
    if (ast.type === 'doc') {
      return {
        type: 'document',
        children: ast.content || [],
        metadata: {},
      }
    }
    return {
      type: 'document',
      children: ast.children || [],
      metadata: ast.metadata || {},
    }
  }

  _createEmpty() {
    return {
      type: 'document',
      children: [
        {
          type: 'paragraph',
          children: [],
        },
      ],
      metadata: {},
    }
  }

  _serializeChildren(children) {
    if (!children) return []
    return children.map((child) => this._serializeNode(child))
  }

  _serializeNode(node) {
    if (!node) return null
    if (typeof node === 'string') {
      return { type: 'text', text: node }
    }
    const serialized = { type: node.type }
    if (node.attrs && Object.keys(node.attrs).length > 0) {
      serialized.attrs = { ...node.attrs }
    }
    if (node.children) {
      serialized.children = this._serializeChildren(node.children)
    }
    if (node.text !== undefined) {
      serialized.text = node.text
    }
    if (node.marks) {
      serialized.marks = node.marks.map((m) => ({
        type: m.type,
        ...(m.attrs ? { attrs: { ...m.attrs } } : {}),
      }))
    }
    return serialized
  }

  _extractText(nodes) {
    if (!nodes) return ''
    let text = ''
    for (const node of nodes) {
      if (node.text !== undefined) {
        text += node.text
      }
      if (node.children) {
        text += this._extractText(node.children)
      }
      // Add newline between block nodes
      if (node.type && NodeTypes[node.type]?.group?.includes('block')) {
        text += '\n'
      }
    }
    return text
  }

  _countBlocks(nodes) {
    if (!nodes) return 0
    let count = 0
    for (const node of nodes) {
      if (NodeTypes[node.type]?.group?.includes('block')) {
        count++
      }
      if (node.children) {
        count += this._countBlocks(node.children)
      }
    }
    return count
  }

  _walkNodes(nodes, path, callback) {
    if (!nodes) return
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const currentPath = [...path, i]
      const result = callback(node, currentPath)
      if (result === false) continue
      if (node.children) {
        this._walkNodes(node.children, currentPath, callback)
      }
    }
  }
}

/**
 * Create a new empty document
 * @returns {KindyDocument}
 */
export function createEmptyDocument() {
  return new KindyDocument()
}

/**
 * Create a document from ProseMirror JSON
 * @param {Object} pmJson - ProseMirror document JSON
 * @returns {KindyDocument}
 */
export function fromProseMirrorJSON(pmJson) {
  if (!pmJson) return createEmptyDocument()
  const convertChildren = (content) => {
    if (!content) return []
    return content.map(child => {
      const node = {
        type: child.type,
        ...(child.attrs ? { attrs: child.attrs } : {}),
      }
      if (child.content) {
        node.children = convertChildren(child.content)
      }
      if (child.text !== undefined) {
        node.text = child.text
      }
      if (child.marks) {
        node.marks = child.marks
      }
      return node
    })
  }
  return KindyDocument.fromJSON({
    type: 'document',
    children: convertChildren(pmJson.content),
    metadata: pmJson.attrs || {},
  })
}

/**
 * Convert KindyDocument to ProseMirror-compatible JSON
 * @param {KindyDocument} doc - The document
 * @returns {Object} ProseMirror document JSON
 */
export function toProseMirrorJSON(doc) {
  if (!doc) return { type: 'doc', content: [{ type: 'paragraph' }] }
  const convertChildren = (children) => {
    if (!children) return []
    return children.map(child => {
      const node = {
        type: child.type,
        ...(child.attrs ? { attrs: child.attrs } : {}),
      }
      if (child.children) {
        node.content = convertChildren(child.children)
      }
      if (child.text !== undefined) {
        node.text = child.text
      }
      if (child.marks) {
        node.marks = child.marks
      }
      return node
    })
  }
  return {
    type: 'doc',
    content: convertChildren(doc.children),
  }
}

export default {
  KindyDocument,
  createEmptyDocument,
  fromProseMirrorJSON,
  toProseMirrorJSON,
}
