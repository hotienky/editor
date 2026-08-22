/**
 * Base Plugin
 *
 * Abstract base class for all plugins.
 * Provides common functionality and lifecycle methods.
 *
 * Architecture: Layer 9 — Plugin System
 */

import { PluginType, PluginPriority, PluginStatus } from './plugin-types'

// ─── Base Plugin Class ─────────────────────────────────────────────────────

export class BasePlugin {
  /**
   * Create a new plugin
   * @param {Object} config - Plugin configuration
   */
  constructor(config = {}) {
    this._id = config.id || this._generateId()
    this._name = config.name || 'Unnamed Plugin'
    this._version = config.version || '1.0.0'
    this._description = config.description || ''
    this._type = config.type || PluginType.EDITOR
    this._priority = config.priority || PluginPriority.NORMAL
    this._status = PluginStatus.REGISTERED
    this._dependencies = config.dependencies || []
    this._options = config.options || {}
    this._editor = null
    this._hooks = new Map()
  }

  // ─── Properties ────────────────────────────────────────────────────────

  get id() {
    return this._id
  }

  get name() {
    return this._name
  }

  get version() {
    return this._version
  }

  get description() {
    return this._description
  }

  get type() {
    return this._type
  }

  get priority() {
    return this._priority
  }

  get status() {
    return this._status
  }

  get dependencies() {
    return this._dependencies
  }

  get options() {
    return this._options
  }

  get editor() {
    return this._editor
  }

  // ─── Lifecycle Methods ─────────────────────────────────────────────────

  /**
   * Initialize the plugin
   * @param {Object} editor - Editor instance
   */
  onInit(editor) {
    this._editor = editor
    this._status = PluginStatus.ENABLED
  }

  /**
   * Destroy the plugin
   */
  onDestroy() {
    this._editor = null
    this._status = PluginStatus.DISABLED
    this._hooks.clear()
  }

  /**
   * Called when plugin is ready
   */
  onReady() {
    // Override in subclass
  }

  // ─── Hook Registration ─────────────────────────────────────────────────

  /**
   * Register a hook
   * @param {string} hookName - Hook name
   * @param {Function} handler - Hook handler
   * @param {Object} [options] - Hook options
   */
  registerHook(hookName, handler, options = {}) {
    const hooks = this._hooks.get(hookName) || []
    hooks.push({
      handler,
      priority: options.priority || 0,
      once: options.once || false,
    })
    this._hooks.set(hookName, hooks)
  }

  /**
   * Remove a hook
   * @param {string} hookName - Hook name
   * @param {Function} handler - Hook handler
   */
  removeHook(hookName, handler) {
    const hooks = this._hooks.get(hookName) || []
    this._hooks.set(
      hookName,
      hooks.filter(h => h.handler !== handler),
    )
  }

  /**
   * Execute registered hooks
   * @param {string} hookName - Hook name
   * @param {Object} context - Hook context
   * @returns {Promise<Object>}
   */
  async executeHooks(hookName, context) {
    const hooks = this._hooks.get(hookName) || []
    let result = { ...context }

    for (const hook of hooks) {
      try {
        const hookResult = await hook.handler(result)
        if (hookResult !== undefined) {
          result = { ...result, ...hookResult }
        }
        if (hook.once) {
          this.removeHook(hookName, hook.handler)
        }
      } catch (e) {
        console.error(`[Plugin:${this._name}] Hook error:`, e)
      }
    }

    return result
  }

  // ─── Commands ──────────────────────────────────────────────────────────

  /**
   * Get plugin commands
   * @returns {Object}
   */
  getCommands() {
    return {}
  }

  /**
   * Get keyboard shortcuts
   * @returns {Object}
   */
  getShortcuts() {
    return {}
  }

  // ─── Schema Extensions ─────────────────────────────────────────────────

  /**
   * Get schema extensions
   * @returns {Object}
   */
  getSchema() {
    return {}
  }

  // ─── UI Extensions ─────────────────────────────────────────────────────

  /**
   * Get toolbar items
   * @returns {Array}
   */
  getToolbarItems() {
    return []
  }

  /**
   * Get menu items
   * @returns {Array}
   */
  getMenuItems() {
    return []
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  _generateId() {
    return `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a plugin from a configuration object
 * @param {Object} config - Plugin configuration
 * @returns {BasePlugin}
 */
export function createPlugin(config) {
  return new BasePlugin(config)
}

export default {
  BasePlugin,
  createPlugin,
}
