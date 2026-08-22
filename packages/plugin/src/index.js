/**
 * Plugin System — Public API
 *
 * Single entry point for the Plugin System layer.
 * Provides extensible architecture for adding functionality.
 *
 * Architecture: Layer 9 — Plugin System
 */

// ─── Plugin Manager ────────────────────────────────────────────────────────

export {
  PluginManager,
  getPluginManager,
  createPluginManager,
} from './plugin-manager'

// ─── Plugin Types ──────────────────────────────────────────────────────────

export {
  PluginType,
  PluginPriority,
  PluginStatus,
} from './plugin-types'

// ─── Plugin Base ───────────────────────────────────────────────────────────

export {
  BasePlugin,
  createPlugin,
} from './base-plugin'

// ─── Plugin Hooks ──────────────────────────────────────────────────────────

export {
  HookType,
  createHook,
} from './hooks'

// ─── Convenience Functions ─────────────────────────────────────────────────

import { PluginManager, getPluginManager, createPluginManager } from './plugin-manager'
import { PluginType, PluginPriority, PluginStatus } from './plugin-types'
import { BasePlugin, createPlugin } from './base-plugin'
import { HookType, createHook } from './hooks'

import { getPluginManager } from './plugin-manager'

/**
 * Register a plugin
 * @param {Object} plugin - Plugin to register
 * @returns {boolean} Success status
 */
export function registerPlugin(plugin) {
  const manager = getPluginManager()
  return manager.register(plugin)
}

/**
 * Unregister a plugin
 * @param {string} pluginId - Plugin ID
 * @returns {boolean} Success status
 */
export function unregisterPlugin(pluginId) {
  const manager = getPluginManager()
  return manager.unregister(pluginId)
}

/**
 * Get a plugin by ID
 * @param {string} pluginId - Plugin ID
 * @returns {Object|null}
 */
export function getPlugin(pluginId) {
  const manager = getPluginManager()
  return manager.get(pluginId)
}

/**
 * Get all registered plugins
 * @returns {Array<Object>}
 */
export function getAllPlugins() {
  const manager = getPluginManager()
  return manager.getAll()
}

/**
 * Enable a plugin
 * @param {string} pluginId - Plugin ID
 * @returns {boolean}
 */
export function enablePlugin(pluginId) {
  const manager = getPluginManager()
  return manager.enable(pluginId)
}

/**
 * Disable a plugin
 * @param {string} pluginId - Plugin ID
 * @returns {boolean}
 */
export function disablePlugin(pluginId) {
  const manager = getPluginManager()
  return manager.disable(pluginId)
}

/**
 * Execute a plugin hook
 * @param {string} hookName - Hook name
 * @param {Object} context - Hook context
 * @returns {Promise<Object>}
 */
export async function executeHook(hookName, context) {
  const manager = getPluginManager()
  return manager.executeHook(hookName, context)
}

export default {
  // Plugin Manager
  getPluginManager,
  createPluginManager,

  // Plugin Types
  PluginType,
  PluginPriority,
  PluginStatus,

  // Base Plugin
  BasePlugin,
  createPlugin,

  // Hooks
  HookType,
  createHook,

  // Convenience
  registerPlugin,
  unregisterPlugin,
  getPlugin,
  getAllPlugins,
  enablePlugin,
  disablePlugin,
  executeHook,
}
