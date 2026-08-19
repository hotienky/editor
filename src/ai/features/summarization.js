/**
 * Summarization Feature
 *
 * AI-powered text summarization.
 *
 * Architecture: Layer 10 — AI Platform
 */

import { getAIProvider } from '../ai-provider'

// ─── Summarization Class ───────────────────────────────────────────────────

export class Summarization {
  constructor(options = {}) {
    this._provider = options.provider || getAIProvider()
    this._enabled = options.enabled !== false
  }

  /**
   * Summarize text
   * @param {string} text - Text to summarize
   * @param {Object} [options] - Summary options
   * @returns {Promise<string>}
   */
  async summarize(text, options = {}) {
    if (!this._enabled || !text.trim()) {
      return text
    }

    const {
      maxLength = 200,
      style = 'paragraph',
      language = 'en',
    } = options

    const result = await this._provider.summarize(text, {
      maxLength,
      style,
      language,
    })

    return result
  }

  /**
   * Summarize document
   * @param {Object} doc - Document AST
   * @param {Object} [options] - Summary options
   * @returns {Promise<Object>}
   */
  async summarizeDocument(doc, options = {}) {
    const text = this._extractText(doc)
    const summary = await this.summarize(text, options)

    return {
      summary,
      originalLength: text.length,
      summaryLength: summary.length,
      compressionRatio: summary.length / text.length,
    }
  }

  /**
   * Get key points
   * @param {string} text - Text to extract key points from
   * @param {Object} [options] - Extraction options
   * @returns {Promise<Array<string>>}
   */
  async getKeyPoints(text, options = {}) {
    const prompt = `Extract the key points from the following text. Return each key point on a separate line:

${text}`

    const result = await this._provider.complete(prompt, {
      temperature: 0.3,
      maxTokens: 500,
      ...options,
    })

    return result.split('\n').filter(Boolean)
  }

  /**
   * Create outline
   * @param {string} text - Text to create outline from
   * @param {Object} [options] - Outline options
   * @returns {Promise<Object>}
   */
  async createOutline(text, options = {}) {
    const prompt = `Create a structured outline from the following text. Return as JSON with title and sections:

${text}`

    const result = await this._provider.complete(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
      ...options,
    })

    try {
      return JSON.parse(result)
    } catch {
      return { title: 'Outline', sections: [] }
    }
  }

  /**
   * Enable/disable summarization
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled
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
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createSummarization(options) {
  return new Summarization(options)
}

export default {
  Summarization,
  createSummarization,
}
