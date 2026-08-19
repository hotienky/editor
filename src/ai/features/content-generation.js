/**
 * Content Generation Feature
 *
 * AI-powered content generation.
 *
 * Architecture: Layer 10 — AI Platform
 */

import { getAIProvider } from '../ai-provider'

// ─── Content Generation Class ──────────────────────────────────────────────

export class ContentGeneration {
  constructor(options = {}) {
    this._provider = options.provider || getAIProvider()
    this._enabled = options.enabled !== false
  }

  /**
   * Generate content from prompt
   * @param {string} prompt - Content prompt
   * @param {Object} [options] - Generation options
   * @returns {Promise<string>}
   */
  async generate(prompt, options = {}) {
    if (!this._enabled) {
      return ''
    }

    const {
      style = 'paragraph',
      tone = 'professional',
      length = 'medium',
      language = 'en',
    } = options

    const enhancedPrompt = `Generate content with the following requirements:
- Style: ${style}
- Tone: ${tone}
- Length: ${length}
- Language: ${language}

Topic: ${prompt}`

    return this._provider.generate(enhancedPrompt, {
      temperature: 0.8,
      maxTokens: 2000,
      ...options,
    })
  }

  /**
   * Generate article outline
   * @param {string} topic - Article topic
   * @param {Object} [options] - Outline options
   * @returns {Promise<Object>}
   */
  async generateOutline(topic, options = {}) {
    const prompt = `Create an article outline for the topic: "${topic}"

Return JSON with:
- title: Article title
- introduction: Brief intro paragraph
- sections: Array of { title, points: string[] }
- conclusion: Brief conclusion`

    const result = await this._provider.generate(prompt, {
      temperature: 0.6,
      maxTokens: 1500,
      ...options,
    })

    try {
      return JSON.parse(result)
    } catch {
      return {
        title: topic,
        sections: [],
      }
    }
  }

  /**
   * Expand text
   * @param {string} text - Text to expand
   * @param {Object} [options] - Expansion options
   * @returns {Promise<string>}
   */
  async expand(text, options = {}) {
    const prompt = `Expand the following text with more details and examples:

${text}`

    return this._provider.generate(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
      ...options,
    })
  }

  /**
   * Rewrite text
   * @param {string} text - Text to rewrite
   * @param {Object} [options] - Rewrite options
   * @returns {Promise<string>}
   */
  async rewrite(text, options = {}) {
    const { style = 'formal', preserveLength = false } = options

    const prompt = `Rewrite the following text in a ${style} style${preserveLength ? ', preserving the original length' : ''}:

${text}`

    return this._provider.generate(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
      ...options,
    })
  }

  /**
   * Simplify text
   * @param {string} text - Text to simplify
   * @param {Object} [options] - Simplification options
   * @returns {Promise<string>}
   */
  async simplify(text, options = {}) {
    const prompt = `Simplify the following text to make it easier to understand:

${text}`

    return this._provider.generate(prompt, {
      temperature: 0.5,
      maxTokens: 1500,
      ...options,
    })
  }

  /**
   * Generate bullet points
   * @param {string} text - Text to convert
   * @param {Object} [options] - Generation options
   * @returns {Promise<Array<string>>}
   */
  async generateBulletPoints(text, options = {}) {
    const prompt = `Convert the following text into concise bullet points:

${text}`

    const result = await this._provider.generate(prompt, {
      temperature: 0.4,
      maxTokens: 1000,
      ...options,
    })

    return result
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim())
  }

  /**
   * Generate introduction
   * @param {string} topic - Topic
   * @param {Object} [options] - Generation options
   * @returns {Promise<string>}
   */
  async generateIntroduction(topic, options = {}) {
    const prompt = `Write an engaging introduction paragraph for an article about: "${topic}"`

    return this._provider.generate(prompt, {
      temperature: 0.7,
      maxTokens: 300,
      ...options,
    })
  }

  /**
   * Generate conclusion
   * @param {string} text - Article text
   * @param {Object} [options] - Generation options
   * @returns {Promise<string>}
   */
  async generateConclusion(text, options = {}) {
    const prompt = `Write a conclusion paragraph that summarizes the key points of:

${text}`

    return this._provider.generate(prompt, {
      temperature: 0.6,
      maxTokens: 300,
      ...options,
    })
  }

  /**
   * Enable/disable content generation
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createContentGeneration(options) {
  return new ContentGeneration(options)
}

export default {
  ContentGeneration,
  createContentGeneration,
}
