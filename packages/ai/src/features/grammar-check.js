/**
 * Grammar Check Feature
 *
 * AI-powered grammar and spell checking.
 *
 * Architecture: Layer 10 — AI Platform
 */

import { getAIProvider } from '../ai-provider'

// ─── Grammar Check Class ───────────────────────────────────────────────────

export class GrammarCheck {
  constructor(options = {}) {
    this._provider = options.provider || getAIProvider()
    this._enabled = options.enabled !== false
    this._autoFix = options.autoFix || false
  }

  /**
   * Check grammar in text
   * @param {string} text - Text to check
   * @param {Object} [options] - Check options
   * @returns {Promise<Object>}
   */
  async check(text, options = {}) {
    if (!this._enabled || !text.trim()) {
      return { corrected: text, errors: [] }
    }

    const result = await this._provider.grammarCheck(text, options)

    return {
      corrected: result.corrected || text,
      errors: result.errors || [],
      errorCount: (result.errors || []).length,
    }
  }

  /**
   * Check grammar in document
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Check options
   * @returns {Promise<Object>}
   */
  async checkDocument(doc, options = {}) {
    const text = this._extractText(doc)
    const result = await this.check(text, options)

    return {
      ...result,
      documentErrors: this._mapErrorsToDocument(result.errors, doc),
    }
  }

  /**
   * Get grammar suggestions
   * @param {string} text - Text context
   * @param {number} position - Cursor position
   * @param {Object} [options] - Check options
   * @returns {Promise<Array>}
   */
  async getSuggestions(text, position, options = {}) {
    const result = await this.check(text, options)

    // Find errors near cursor position
    const nearbyErrors = result.errors.filter(error => {
      const errorPos = error.position || 0
      return Math.abs(errorPos - position) < 50
    })

    return nearbyErrors.map(error => ({
      type: error.type,
      original: error.original,
      suggestion: error.suggestion,
      position: error.position,
      confidence: error.confidence || 0.8,
    }))
  }

  /**
   * Auto-fix all errors
   * @param {string} text - Text to fix
   * @param {Object} [options] - Fix options
   * @returns {Promise<string>}
   */
  async autoFix(text, options = {}) {
    const result = await this.check(text, options)
    return result.corrected
  }

  /**
   * Enable/disable grammar check
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled
  }

  /**
   * Enable/disable auto-fix
   * @param {boolean} autoFix
   */
  setAutoFix(autoFix) {
    this._autoFix = autoFix
  }

  _extractText(doc) {
    if (!doc) return ''
    if (typeof doc === 'string') return doc
    if (doc.text) return doc.text
    if (!doc.children) return ''

    return doc.children
      .map(child => this._extractText(child))
      .join(' ')
  }

  _mapErrorsToDocument(errors, doc) {
    // Map error positions to document nodes
    return errors.map(error => ({
      ...error,
      node: this._findNodeAtPosition(doc, error.position),
    }))
  }

  _findNodeAtPosition(doc, position) {
    // Simplified - would need proper position tracking
    return null
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createGrammarCheck(options) {
  return new GrammarCheck(options)
}

export default {
  GrammarCheck,
  createGrammarCheck,
}
