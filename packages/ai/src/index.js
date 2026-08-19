/**
 * AI Platform — Public API
 *
 * Single entry point for the AI Platform layer.
 * Provides AI-powered features for document editing.
 *
 * Architecture: Layer 10 — AI Platform
 */

// ─── AI Provider ───────────────────────────────────────────────────────────

export {
  AIProvider,
  getAIProvider,
  createAIProvider,
} from './ai-provider'

// ─── AI Features ───────────────────────────────────────────────────────────

export {
  TextCompletion,
  createTextCompletion,
} from './features/text-completion'

export {
  GrammarCheck,
  createGrammarCheck,
} from './features/grammar-check'

export {
  Summarization,
  createSummarization,
} from './features/summarization'

export {
  Translation,
  createTranslation,
} from './features/translation'

export {
  ContentGeneration,
  createContentGeneration,
} from './features/content-generation'

// ─── AI Models ─────────────────────────────────────────────────────────────

export {
  AIModel,
  AIModelProvider,
} from './ai-models'

// ─── Convenience Functions ─────────────────────────────────────────────────

import { AIProvider, getAIProvider, createAIProvider } from './ai-provider'
import { AIModel, AIModelProvider } from './ai-models'
import { TextCompletion, createTextCompletion } from './features/text-completion'
import { GrammarCheck, createGrammarCheck } from './features/grammar-check'
import { Summarization, createSummarization } from './features/summarization'
import { Translation, createTranslation } from './features/translation'
import { ContentGeneration, createContentGeneration } from './features/content-generation'

/**
 * Initialize AI features
 * @param {Object} config - AI configuration
 */
export function initAI(config = {}) {
  const provider = getAIProvider()
  provider.configure(config)
  return provider
}

/**
 * Complete text
 * @param {string} prompt - Text prompt
 * @param {Object} [options] - Completion options
 * @returns {Promise<string>}
 */
export async function completeText(prompt, options = {}) {
  const provider = getAIProvider()
  return provider.complete(prompt, options)
}

/**
 * Check grammar
 * @param {string} text - Text to check
 * @param {Object} [options] - Check options
 * @returns {Promise<Object>}
 */
export async function checkGrammar(text, options = {}) {
  const provider = getAIProvider()
  return provider.grammarCheck(text, options)
}

/**
 * Summarize text
 * @param {string} text - Text to summarize
 * @param {Object} [options] - Summary options
 * @returns {Promise<string>}
 */
export async function summarize(text, options = {}) {
  const provider = getAIProvider()
  return provider.summarize(text, options)
}

/**
 * Translate text
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language
 * @param {Object} [options] - Translation options
 * @returns {Promise<string>}
 */
export async function translate(text, targetLang, options = {}) {
  const provider = getAIProvider()
  return provider.translate(text, targetLang, options)
}

/**
 * Generate content
 * @param {string} prompt - Content prompt
 * @param {Object} [options] - Generation options
 * @returns {Promise<string>}
 */
export async function generateContent(prompt, options = {}) {
  const provider = getAIProvider()
  return provider.generate(prompt, options)
}

export default {
  // AI Provider
  getAIProvider,
  createAIProvider,

  // AI Models
  AIModel,
  AIModelProvider,

  // Features
  createTextCompletion,
  createGrammarCheck,
  createSummarization,
  createTranslation,
  createContentGeneration,

  // Convenience
  initAI,
  completeText,
  checkGrammar,
  summarize,
  translate,
  generateContent,
}
