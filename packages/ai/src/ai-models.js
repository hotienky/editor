/**
 * AI Models
 *
 * Defines available AI models and providers.
 *
 * Architecture: Layer 10 — AI Platform
 */

// ─── AI Model Providers ────────────────────────────────────────────────────

export const AIModelProvider = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  AZURE: 'azure',
  LOCAL: 'local',
}

// ─── AI Models ─────────────────────────────────────────────────────────────

export const AIModel = {
  // OpenAI Models
  GPT_4: 'gpt-4',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',

  // Anthropic Models
  CLAUDE_3_OPUS: 'claude-3-opus',
  CLAUDE_3_SONNET: 'claude-3-sonnet',
  CLAUDE_3_HAIKU: 'claude-3-haiku',
  CLAUDE_2: 'claude-2',

  // Google Models
  GEMINI_PRO: 'gemini-pro',
  GEMINI_ULTRA: 'gemini-ultra',

  // Local Models
  LLAMA_2: 'llama-2',
  MISTRAL: 'mistral',
  CODELLAMA: 'codellama',
}

// ─── Model Capabilities ────────────────────────────────────────────────────

export const ModelCapabilities = {
  [AIModel.GPT_4]: {
    name: 'GPT-4',
    provider: AIModelProvider.OPENAI,
    maxTokens: 8192,
    supportsImages: true,
    supportsCode: true,
    languages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  },
  [AIModel.GPT_4_TURBO]: {
    name: 'GPT-4 Turbo',
    provider: AIModelProvider.OPENAI,
    maxTokens: 128000,
    supportsImages: true,
    supportsCode: true,
    languages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  },
  [AIModel.GPT_3_5_TURBO]: {
    name: 'GPT-3.5 Turbo',
    provider: AIModelProvider.OPENAI,
    maxTokens: 4096,
    supportsImages: false,
    supportsCode: true,
    languages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  },
  [AIModel.CLAUDE_3_OPUS]: {
    name: 'Claude 3 Opus',
    provider: AIModelProvider.ANTHROPIC,
    maxTokens: 200000,
    supportsImages: true,
    supportsCode: true,
    languages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  },
  [AIModel.CLAUDE_3_SONNET]: {
    name: 'Claude 3 Sonnet',
    provider: AIModelProvider.ANTHROPIC,
    maxTokens: 200000,
    supportsImages: true,
    supportsCode: true,
    languages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  },
  [AIModel.GEMINI_PRO]: {
    name: 'Gemini Pro',
    provider: AIModelProvider.GOOGLE,
    maxTokens: 32000,
    supportsImages: true,
    supportsCode: true,
    languages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'],
  },
}

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Get model info
 * @param {string} modelId - Model ID
 * @returns {Object|null}
 */
export function getModelInfo(modelId) {
  return ModelCapabilities[modelId] || null
}

/**
 * Get models by provider
 * @param {string} provider - Provider name
 * @returns {Array<string>}
 */
export function getModelsByProvider(provider) {
  return Object.entries(ModelCapabilities)
    .filter(([, info]) => info.provider === provider)
    .map(([id]) => id)
}

/**
 * Get default model for a provider
 * @param {string} provider - Provider name
 * @returns {string|null}
 */
export function getDefaultModel(provider) {
  const models = getModelsByProvider(provider)
  return models[0] || null
}

export default {
  AIModelProvider,
  AIModel,
  ModelCapabilities,
  getModelInfo,
  getModelsByProvider,
  getDefaultModel,
}
