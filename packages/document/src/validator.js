/**
 * Document Validator
 *
 * Validates document AST structure, ensuring compliance with the schema.
 * Catches structural errors before they reach the Editing Engine.
 *
 * Architecture: Layer 1 — Document Model
 */

import { NodeTypes, MarkTypes } from './schema'

// ─── Validation Severity ───────────────────────────────────────────────────

export const Severity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
}

// ─── Validation Result ─────────────────────────────────────────────────────

export class ValidationResult {
  constructor() {
    this._issues = []
  }

  /**
   * Add a validation issue
   * @param {Object} issue
   */
  add(issue) {
    this._issues.push({
      severity: Severity.WARNING,
      ...issue,
    })
  }

  /**
   * Add an error
   * @param {string} message - Error message
   * @param {number[]} [path] - Path to the problematic node
   * @param {string} [code] - Error code
   */
  error(message, path = [], code = 'UNKNOWN') {
    this.add({ severity: Severity.ERROR, message, path, code })
  }

  /**
   * Add a warning
   * @param {string} message - Warning message
   * @param {number[]} [path] - Path to the problematic node
   * @param {string} [code] - Warning code
   */
  warning(message, path = [], code = 'UNKNOWN') {
    this.add({ severity: Severity.WARNING, message, path, code })
  }

  /**
   * Add an info
   * @param {string} message - Info message
   * @param {number[]} [path] - Path to the problematic node
   */
  info(message, path = []) {
    this.add({ severity: Severity.INFO, message, path })
  }

  /**
   * Check if validation passed (no errors)
   * @returns {boolean}
   */
  get isValid() {
    return !this._issues.some((i) => i.severity === Severity.ERROR)
  }

  /**
   * Get all issues
   * @returns {Array<Object>}
   */
  get issues() {
    return [...this._issues]
  }

  /**
   * Get only errors
   * @returns {Array<Object>}
   */
  get errors() {
    return this._issues.filter((i) => i.severity === Severity.ERROR)
  }

  /**
   * Get only warnings
   * @returns {Array<Object>}
   */
  get warnings() {
    return this._issues.filter((i) => i.severity === Severity.WARNING)
  }

  /**
   * Get issue count by severity
   * @returns {Object}
   */
  get counts() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      infos: this._issues.filter((i) => i.severity === Severity.INFO).length,
      total: this._issues.length,
    }
  }

  /**
   * Merge another result into this one
   * @param {ValidationResult} other
   */
  merge(other) {
    this._issues.push(...other.issues)
  }

  /**
   * Get a summary string
   * @returns {string}
   */
  toString() {
    const { errors, warnings, infos } = this.counts
    return `Validation: ${errors} errors, ${warnings} warnings, ${infos} info`
  }
}

// ─── Validator ─────────────────────────────────────────────────────────────

export class DocumentValidator {
  constructor(options = {}) {
    this._strict = options.strict !== false
    this._maxNestingDepth = options.maxNestingDepth || 20
    this._maxTextLength = options.maxTextLength || 1_000_000
  }

  /**
   * Validate a document AST
   * @param {Object} ast - Document AST (KindyDocument AST format)
   * @returns {ValidationResult}
   */
  validate(ast) {
    const result = new ValidationResult()

    if (!ast) {
      result.error('Document is null or undefined')
      return result
    }

    if (ast.type !== 'document') {
      result.error(`Root node type must be "document", got "${ast.type}"`)
    }

    if (!Array.isArray(ast.children)) {
      result.error('Document children must be an array')
      return result
    }

    this._validateNodes(ast.children, [], result, 0)
    return result
  }

  /**
   * Validate a ProseMirror JSON document
   * @param {Object} pmJson - ProseMirror document JSON
   * @returns {ValidationResult}
   */
  validateProseMirror(pmJson) {
    const result = new ValidationResult()

    if (!pmJson) {
      result.error('ProseMirror document is null or undefined')
      return result
    }

    if (pmJson.type !== 'doc') {
      result.error(`Root node type must be "doc", got "${pmJson.type}"`)
    }

    if (!Array.isArray(pmJson.content)) {
      result.error('Document content must be an array')
      return result
    }

    this._validatePMNodes(pmJson.content, [], result, 0)
    return result
  }

  // ─── Internal Validation ──────────────────────────────────────────────

  _validateNodes(nodes, path, result, depth) {
    if (depth > this._maxNestingDepth) {
      result.error('Maximum nesting depth exceeded', path, 'MAX_DEPTH')
      return
    }

    if (!Array.isArray(nodes)) return

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const currentPath = [...path, i]

      if (!node || typeof node !== 'object') {
        result.error('Node must be an object', currentPath, 'INVALID_NODE')
        continue
      }

      if (!node.type) {
        result.error('Node must have a type', currentPath, 'MISSING_TYPE')
        continue
      }

      // Check if node type is known
      const nodeDef = NodeTypes[node.type]
      if (!nodeDef) {
        result.warning(`Unknown node type: "${node.type}"`, currentPath, 'UNKNOWN_TYPE')
      }

      // Validate text nodes
      if (node.text !== undefined) {
        this._validateTextNode(node, currentPath, result)
        continue
      }

      // Validate block nodes
      if (nodeDef) {
        this._validateBlockNode(node, nodeDef, currentPath, result, depth)
      }

      // Validate children recursively
      if (node.children) {
        this._validateNodes(node.children, currentPath, result, depth + 1)
      }
    }
  }

  _validateTextNode(node, path, result) {
    if (typeof node.text !== 'string') {
      result.error('Text node must have string text', path, 'INVALID_TEXT')
    }

    if (node.text.length > this._maxTextLength) {
      result.warning(
        `Text node exceeds max length (${node.text.length} > ${this._maxTextLength})`,
        path,
        'TEXT_TOO_LONG',
      )
    }

    // Validate marks
    if (node.marks) {
      if (!Array.isArray(node.marks)) {
        result.error('Marks must be an array', path, 'INVALID_MARKS')
      } else {
        for (const mark of node.marks) {
          this._validateMark(mark, path, result)
        }
      }
    }
  }

  _validateMark(mark, path, result) {
    if (!mark || typeof mark !== 'object') {
      result.error('Mark must be an object', path, 'INVALID_MARK')
      return
    }

    if (!mark.type) {
      result.error('Mark must have a type', path, 'MISSING_MARK_TYPE')
      return
    }

    const markDef = MarkTypes[mark.type]
    if (!markDef) {
      result.warning(`Unknown mark type: "${mark.type}"`, path, 'UNKNOWN_MARK')
    }

    // Validate mark attributes
    if (mark.attrs && markDef?.attributes) {
      for (const [key, value] of Object.entries(mark.attrs)) {
        const attrDef = markDef.attributes[key]
        if (!attrDef && this._strict) {
          result.warning(`Unknown attribute "${key}" on mark "${mark.type}"`, path, 'UNKNOWN_ATTR')
        }
      }
    }
  }

  _validateBlockNode(node, nodeDef, path, result, depth) {
    // Validate attributes
    if (node.attrs && nodeDef.attributes) {
      for (const [key, value] of Object.entries(node.attrs)) {
        const attrDef = nodeDef.attributes[key]
        if (!attrDef && this._strict) {
          result.warning(
            `Unknown attribute "${key}" on node "${node.type}"`,
            path,
            'UNKNOWN_ATTR',
          )
        }
      }
    }

    // Validate content spec
    if (nodeDef.content && node.children) {
      const childCount = node.children.length
      const contentSpec = nodeDef.content

      // Check for empty required content
      if (contentSpec.endsWith('+') && childCount === 0) {
        result.warning(
          `Node "${node.type}" requires at least one child (content: ${contentSpec})`,
          path,
          'EMPTY_REQUIRED_CONTENT',
        )
      }
    }

    // Check for unexpected children on atom nodes
    if (nodeDef.atom && node.children?.length > 0) {
      result.warning(
        `Atom node "${node.type}" should not have children`,
        path,
        'ATOM_WITH_CHILDREN',
      )
    }
  }

  // ─── ProseMirror Validation ───────────────────────────────────────────

  _validatePMNodes(nodes, path, result, depth) {
    if (depth > this._maxNestingDepth) {
      result.error('Maximum nesting depth exceeded', path, 'MAX_DEPTH')
      return
    }

    if (!Array.isArray(nodes)) return

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const currentPath = [...path, i]

      if (!node || typeof node !== 'object') {
        result.error('Node must be an object', currentPath, 'INVALID_NODE')
        continue
      }

      if (!node.type) {
        result.error('Node must have a type', currentPath, 'MISSING_TYPE')
        continue
      }

      const nodeDef = NodeTypes[node.type]
      if (!nodeDef) {
        result.warning(`Unknown node type: "${node.type}"`, currentPath, 'UNKNOWN_TYPE')
      }

      // Validate content recursively
      if (node.content && Array.isArray(node.content)) {
        this._validatePMNodes(node.content, currentPath, result, depth + 1)
      }

      // Validate marks
      if (node.marks && Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          this._validateMark(mark, currentPath, result)
        }
      }
    }
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global validator instance
 * @returns {DocumentValidator}
 */
export function getValidator() {
  if (!_instance) {
    _instance = new DocumentValidator()
  }
  return _instance
}

/**
 * Create a new validator instance
 * @param {Object} options
 * @returns {DocumentValidator}
 */
export function createValidator(options) {
  return new DocumentValidator(options)
}

/**
 * Quick validation function
 * @param {Object} ast - Document AST
 * @returns {ValidationResult}
 */
export function validateDocument(ast) {
  return getValidator().validate(ast)
}

export default {
  DocumentValidator,
  ValidationResult,
  Severity,
  getValidator,
  createValidator,
  validateDocument,
}
