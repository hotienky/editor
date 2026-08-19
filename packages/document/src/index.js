/**
 * Document Model — Public API
 *
 * This is the single entry point for the Document Model layer.
 * All external code should import from here, not from individual modules.
 *
 * Architecture: Layer 1 — Document Model
 */

// ─── Schema ────────────────────────────────────────────────────────────────

export {
  NodeTypes,
  MarkTypes,
  NodeGroup,
  buildProseMirrorSchema,
  getNodeNames,
  getMarkNames,
  hasNodeType,
  hasMarkType,
  getNodeType,
  getMarkType,
} from './schema'

// ─── Document AST ──────────────────────────────────────────────────────────

export {
  KindyDocument,
  createEmptyDocument,
  fromProseMirrorJSON,
  toProseMirrorJSON,
} from './document'

// ─── Serializer ────────────────────────────────────────────────────────────

export {
  DocumentSerializer,
  Format,
  getSerializer,
  createSerializer,
} from './serializer'

// ─── Validator ─────────────────────────────────────────────────────────────

export {
  DocumentValidator,
  ValidationResult,
  Severity,
  getValidator,
  createValidator,
  validateDocument,
} from './validator'

// ─── Convenience Re-exports ────────────────────────────────────────────────

import { NodeTypes, MarkTypes, NodeGroup, buildProseMirrorSchema } from './schema'
import { KindyDocument, createEmptyDocument } from './document'
import { getSerializer } from './serializer'
import { getValidator } from './validator'

/**
 * Create a document from content
 * @param {string|Object} content - JSON string or object
 * @returns {KindyDocument}
 */
export function createDocument(content) {
  if (!content) return createEmptyDocument()
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      return KindyDocument.fromJSON(parsed)
    } catch {
      return createEmptyDocument()
    }
  }
  return KindyDocument.fromJSON(content)
}

/**
 * Create a document from ProseMirror editor
 * @param {Object} editor - Tiptap/ProseMirror editor instance
 * @returns {KindyDocument}
 */
export function documentFromEditor(editor) {
  return getSerializer().fromEditor(editor)
}

/**
 * Validate a document
 * @param {KindyDocument|Object} doc - Document or AST
 * @returns {ValidationResult}
 */
export function validate(doc) {
  const ast = doc instanceof KindyDocument ? doc.ast : doc
  return getValidator().validate(ast)
}

/**
 * Serialize document to JSON for storage
 * @param {KindyDocument} doc - The document
 * @returns {string} JSON string
 */
export function serialize(doc) {
  return JSON.stringify(getSerializer().toJSON(doc))
}

/**
 * Deserialize JSON string to document
 * @param {string} json - JSON string
 * @returns {KindyDocument}
 */
export function deserialize(json) {
  try {
    return getSerializer().fromJSON(JSON.parse(json))
  } catch {
    return createEmptyDocument()
  }
}

export default {
  // Schema
  NodeTypes,
  MarkTypes,
  NodeGroup,
  buildProseMirrorSchema,

  // Document
  KindyDocument,
  createEmptyDocument,
  createDocument,
  documentFromEditor,

  // Serializer
  getSerializer,
  serialize,
  deserialize,

  // Validator
  validate,
  getValidator,
}
