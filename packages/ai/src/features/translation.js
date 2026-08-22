/**
 * Translation Feature
 *
 * AI-powered text translation.
 *
 * Architecture: Layer 10 — AI Platform
 */

import { getAIProvider } from '../ai-provider'

// ─── Supported Languages ───────────────────────────────────────────────────

export const Languages = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  RU: 'ru',
  JA: 'ja',
  KO: 'ko',
  ZH: 'zh',
  AR: 'ar',
  HI: 'hi',
  TR: 'tr',
  NL: 'nl',
  PL: 'pl',
  SV: 'sv',
}

// ─── Translation Class ─────────────────────────────────────────────────────

export class Translation {
  constructor(options = {}) {
    this._provider = options.provider || getAIProvider()
    this._enabled = options.enabled !== false
    this._defaultTargetLang = options.defaultTargetLang || Languages.EN
  }

  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language
   * @param {Object} [options] - Translation options
   * @returns {Promise<string>}
   */
  async translate(text, targetLang, options = {}) {
    if (!this._enabled || !text.trim()) {
      return text
    }

    const {
      sourceLang = 'auto',
      preserveFormatting = true,
    } = options

    const result = await this._provider.translate(text, targetLang, {
      sourceLang,
      preserveFormatting,
    })

    return result
  }

  /**
   * Translate document
   * @param {Object} doc - Document AST
   * @param {string} targetLang - Target language
   * @param {Object} [options] - Translation options
   * @returns {Promise<Object>}
   */
  async translateDocument(doc, targetLang, options = {}) {
    const text = this._extractText(doc)
    const translation = await this.translate(text, targetLang, options)

    return {
      translation,
      sourceLanguage: options.sourceLang || 'auto',
      targetLanguage: targetLang,
      originalLength: text.length,
      translationLength: translation.length,
    }
  }

  /**
   * Detect language
   * @param {string} text - Text to detect
   * @returns {Promise<Object>}
   */
  async detectLanguage(text) {
    const prompt = `Detect the language of the following text. Return JSON with "language" (code) and "confidence" (0-1):

${text.slice(0, 500)}`

    const result = await this._provider.complete(prompt, {
      temperature: 0.1,
      maxTokens: 50,
    })

    try {
      return JSON.parse(result)
    } catch {
      return { language: 'en', confidence: 0.5 }
    }
  }

  /**
   * Get supported languages
   * @returns {Array<Object>}
   */
  getSupportedLanguages() {
    return Object.entries(Languages).map(([code, value]) => ({
      code: value,
      name: this._getLanguageName(value),
    }))
  }

  /**
   * Enable/disable translation
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled
  }

  /**
   * Set default target language
   * @param {string} lang - Language code
   */
  setDefaultTargetLang(lang) {
    this._defaultTargetLang = lang
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

  _getLanguageName(code) {
    const names = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      hi: 'Hindi',
      tr: 'Turkish',
      nl: 'Dutch',
      pl: 'Polish',
      sv: 'Swedish',
    }
    return names[code] || code
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createTranslation(options) {
  return new Translation(options)
}

export default {
  Translation,
  createTranslation,
  Languages,
}
