/**
 * Text Completion Feature
 *
 * AI-powered text completion and suggestions.
 *
 * Architecture: Layer 10 — AI Platform
 */

import { getAIProvider } from '../ai-provider'

// ─── Text Completion Class ─────────────────────────────────────────────────

export class TextCompletion {
  constructor(options = {}) {
    this._provider = options.provider || getAIProvider()
    this._debounceMs = options.debounceMs || 500
    this._enabled = options.enabled !== false
    this._cache = new Map()
  }

  /**
   * Get text completion suggestions
   * @param {string} text - Current text context
   * @param {Object} [options] - Completion options
   * @returns {Promise<Array<string>>}
   */
  async getSuggestions(text, options = {}) {
    if (!this._enabled) return []

    // Check cache
    const cacheKey = this._getCacheKey(text, options)
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)
    }

    const prompt = `Complete the following text naturally. Provide 3 completion suggestions, one per line:

${text}`

    const result = await this._provider.complete(prompt, {
      temperature: 0.7,
      maxTokens: 100,
      ...options,
    })

    const suggestions = result.split('\n').filter(Boolean).slice(0, 3)

    // Cache result
    this._cache.set(cacheKey, suggestions)

    return suggestions
  }

  /**
   * Get inline completion
   * @param {string} prefix - Text before cursor
   * @param {string} suffix - Text after cursor
   * @param {Object} [options] - Completion options
   * @returns {Promise<string>}
   */
  async getInlineCompletion(prefix, suffix, options = {}) {
    const prompt = `Complete the text at the cursor position [CURSOR]:

Before: ${prefix}[CURSOR]${suffix}

Provide only the completion text that should be inserted at [CURSOR]:`

    const result = await this._provider.complete(prompt, {
      temperature: 0.5,
      maxTokens: 50,
      ...options,
    })

    return result.trim()
  }

  /**
   * Clear completion cache
   */
  clearCache() {
    this._cache.clear()
  }

  /**
   * Enable/disable completion
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled
  }

  _getCacheKey(text, options) {
    return `${text}|${options.model || ''}|${options.temperature || ''}`
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createTextCompletion(options) {
  return new TextCompletion(options)
}

export default {
  TextCompletion,
  createTextCompletion,
}
