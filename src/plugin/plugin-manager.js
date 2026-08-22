/**
 * Plugin Manager
 *
 * Manages plugin registration, lifecycle, and execution.
 * Central hub for the plugin system.
 *
 * Architecture: Layer 9 — Plugin System
 */

import { PluginStatus, HookType } from './plugin-types'

// ─── Plugin Manager Class ──────────────────────────────────────────────────

export class PluginManager {
  constructor() {
    this._plugins = new Map()
    this._hooks = new Map()
    this._editor = null
  }

  // ─── Initialization ─────────────────────────────────────────────────────

  /**
   * Initialize the plugin manager with an editor
   * @param {Object} editor - Editor instance
   */
  init(editor) {
    this._editor = editor
    this._initializePlugins()
  }

  // ─── Plugin Registration ────────────────────────────────────────────────

  /**
   * Register a plugin
   * @param {Object} plugin - Plugin instance
   * @returns {boolean} Success status
   */
  register(plugin) {
    if (!plugin || !plugin.id) {
      console.error('[PluginManager] Invalid plugin')
      return false
    }

    if (this._plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin ${plugin.id} already registered`)
      return false
    }

    // Check dependencies
    if (!this._checkDependencies(plugin)) {
      return false
    }

    this._plugins.set(plugin.id, plugin)

    // Register plugin's hooks
    this._registerPluginHooks(plugin)

    return true
  }

  /**
   * Unregister a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} Success status
   */
  unregister(pluginId) {
    const plugin = this._plugins.get(pluginId)
    if (!plugin) return false

    // Destroy plugin
    plugin.onDestroy()

    // Remove plugin's hooks
    this._unregisterPluginHooks(plugin)

    this._plugins.delete(pluginId)
    return true
  }

  /**
   * Get a plugin by ID
   * @param {string} pluginId - Plugin ID
   * @returns {Object|null}
   */
  get(pluginId) {
    return this._plugins.get(pluginId) || null
  }

  /**
   * Get all registered plugins
   * @returns {Array<Object>}
   */
  getAll() {
    return Array.from(this._plugins.values())
  }

  /**
   * Get plugins by type
   * @param {string} type - Plugin type
   * @returns {Array<Object>}
   */
  getByType(type) {
    return this.getAll().filter(p => p.type === type)
  }

  // ─── Plugin Control ─────────────────────────────────────────────────────

  /**
   * Enable a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  enable(pluginId) {
    const plugin = this._plugins.get(pluginId)
    if (!plugin) return false

    plugin._status = PluginStatus.ENABLED
    return true
  }

  /**
   * Disable a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  disable(pluginId) {
    const plugin = this._plugins.get(pluginId)
    if (!plugin) return false

    plugin._status = PluginStatus.DISABLED
    return true
  }

  // ─── Hook Execution ─────────────────────────────────────────────────────

  /**
   * Execute hooks for a specific event
   * @param {string} hookName - Hook name
   * @param {Object} context - Hook context
   * @returns {Promise<Object>}
   */
  async executeHook(hookName, context) {
    const hooks = this._getHooksForEvent(hookName)
    let result = { ...context }

    for (const { plugin, handler } of hooks) {
      if (plugin.status !== PluginStatus.ENABLED) continue

      try {
        const hookResult = await handler.call(plugin, result)
        if (hookResult !== undefined) {
          result = { ...result, ...hookResult }
        }
      } catch (e) {
        console.error(`[PluginManager] Hook error in ${plugin.name}:`, e)
      }
    }

    return result
  }

  // ─── Command Execution ──────────────────────────────────────────────────

  /**
   * Get all commands from all plugins
   * @returns {Object}
   */
  getAllCommands() {
    const commands = {}

    for (const plugin of this._plugins.values()) {
      if (plugin.status !== PluginStatus.ENABLED) continue

      const pluginCommands = plugin.getCommands()
      Object.assign(commands, pluginCommands)
    }

    return commands
  }

  /**
   * Get all keyboard shortcuts from all plugins
   * @returns {Object}
   */
  getAllShortcuts() {
    const shortcuts = {}

    for (const plugin of this._plugins.values()) {
      if (plugin.status !== PluginStatus.ENABLED) continue

      const pluginShortcuts = plugin.getShortcuts()
      Object.assign(shortcuts, pluginShortcuts)
    }

    return shortcuts
  }

  // ─── UI Extensions ──────────────────────────────────────────────────────

  /**
   * Get all toolbar items from all plugins
   * @returns {Array}
   */
  getAllToolbarItems() {
    const items = []

    for (const plugin of this._plugins.values()) {
      if (plugin.status !== PluginStatus.ENABLED) continue

      items.push(...plugin.getToolbarItems())
    }

    return items.sort((a, b) => (a.priority || 0) - (b.priority || 0))
  }

  /**
   * Get all menu items from all plugins
   * @returns {Array}
   */
  getAllMenuItems() {
    const items = []

    for (const plugin of this._plugins.values()) {
      if (plugin.status !== PluginStatus.ENABLED) continue

      items.push(...plugin.getMenuItems())
    }

    return items.sort((a, b) => (a.priority || 0) - (b.priority || 0))
  }

  // ─── Internal Methods ───────────────────────────────────────────────────

  _initializePlugins() {
    const sortedPlugins = this._getPluginsByPriority()

    for (const plugin of sortedPlugins) {
      try {
        plugin.onInit(this._editor)
        plugin.onReady()
      } catch (e) {
        console.error(`[PluginManager] Failed to initialize ${plugin.name}:`, e)
        plugin._status = PluginStatus.ERROR
      }
    }
  }

  _getPluginsByPriority() {
    return this.getAll().sort((a, b) => b.priority - a.priority)
  }

  _checkDependencies(plugin) {
    for (const depId of plugin.dependencies) {
      if (!this._plugins.has(depId)) {
        console.error(`[PluginManager] Missing dependency: ${depId}`)
        return false
      }
    }
    return true
  }

  _registerPluginHooks(plugin) {
    // Register hooks from plugin's hook map
    for (const [hookName, hooks] of plugin._hooks) {
      const pluginHooks = this._hooks.get(hookName) || []
      for (const hook of hooks) {
        pluginHooks.push({
          plugin,
          handler: hook.handler,
          priority: hook.priority,
        })
      }
      this._hooks.set(hookName, pluginHooks)
    }
  }

  _unregisterPluginHooks(plugin) {
    for (const [hookName, hooks] of this._hooks) {
      this._hooks.set(
        hookName,
        hooks.filter(h => h.plugin.id !== plugin.id),
      )
    }
  }

  _getHooksForEvent(hookName) {
    const hooks = this._hooks.get(hookName) || []
    return hooks.sort((a, b) => b.priority - a.priority)
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

let _instance = null

/**
 * Get the global plugin manager
 * @returns {PluginManager}
 */
export function getPluginManager() {
  if (!_instance) {
    _instance = new PluginManager()
  }
  return _instance
}

/**
 * Create a new plugin manager instance
 * @returns {PluginManager}
 */
export function createPluginManager() {
  return new PluginManager()
}

export default {
  PluginManager,
  getPluginManager,
  createPluginManager,
}
