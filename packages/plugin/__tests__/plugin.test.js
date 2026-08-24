/**
 * @kindy/plugin Tests
 *
 * Architecture: Test Layer — Plugin Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PluginManager, BasePlugin, PluginType, PluginPriority, PluginStatus } from '../src/index'

describe('Plugin Package', () => {
  describe('PluginManager', () => {
    let manager

    beforeEach(() => {
      manager = new PluginManager()
    })

    it('should create plugin manager instance', () => {
      expect(manager).toBeDefined()
    })

    it('should register plugin', () => {
      const plugin = new BasePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: PluginType.EDITOR,
        priority: PluginPriority.NORMAL,
      })

      manager.register(plugin)

      const registered = manager.get('test-plugin')

      expect(registered).toBeDefined()
      expect(registered.id).toBe('test-plugin')
    })

    it('should get all plugins', () => {
      manager.register(new BasePlugin({
        id: 'plugin-1',
        name: 'Plugin 1',
        type: PluginType.EDITOR,
        priority: PluginPriority.NORMAL,
      }))

      manager.register(new BasePlugin({
        id: 'plugin-2',
        name: 'Plugin 2',
        type: PluginType.EDITOR,
        priority: PluginPriority.HIGH,
      }))

      const plugins = manager.getAll()

      expect(plugins).toHaveLength(2)
    })

    it('should enable plugin', () => {
      const plugin = new BasePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: PluginType.EDITOR,
        priority: PluginPriority.NORMAL,
      })

      manager.register(plugin)
      manager.enable('test-plugin')

      const enabled = manager.get('test-plugin')

      expect(enabled.status).toBe(PluginStatus.ENABLED)
    })

    it('should disable plugin', () => {
      const plugin = new BasePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: PluginType.EDITOR,
        priority: PluginPriority.NORMAL,
      })

      manager.register(plugin)
      manager.enable('test-plugin')
      manager.disable('test-plugin')

      const disabled = manager.get('test-plugin')

      expect(disabled.status).toBe(PluginStatus.DISABLED)
    })

    it('should execute hook', async () => {
      let hookCalled = false

      const plugin = new BasePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: PluginType.EDITOR,
        priority: PluginPriority.NORMAL,
      })

      plugin.registerHook('document:beforeSave', () => {
        hookCalled = true
      })

      manager.register(plugin)
      manager.enable('test-plugin')

      await manager.executeHook('document:beforeSave', {})

      expect(hookCalled).toBe(true)
    })
  })

  describe('BasePlugin', () => {
    it('should create base plugin instance', () => {
      const plugin = new BasePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        type: PluginType.EDITOR,
      })

      expect(plugin).toBeDefined()
      expect(plugin.id).toBe('test-plugin')
    })

    it('should have default values', () => {
      const plugin = new BasePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
      })

      expect(plugin.type).toBe(PluginType.EDITOR)
      expect(plugin.priority).toBe(PluginPriority.NORMAL)
      expect(plugin.status).toBe(PluginStatus.REGISTERED)
    })
  })

  describe('Enums', () => {
    it('should have PluginType values', () => {
      expect(PluginType.EDITOR).toBeDefined()
      expect(PluginType.TOOLBAR).toBeDefined()
      expect(PluginType.KEYBOARD).toBeDefined()
    })

    it('should have PluginPriority values', () => {
      expect(PluginPriority.LOW).toBeDefined()
      expect(PluginPriority.NORMAL).toBeDefined()
      expect(PluginPriority.HIGH).toBeDefined()
      expect(PluginPriority.CRITICAL).toBeDefined()
    })

    it('should have PluginStatus values', () => {
      expect(PluginStatus.REGISTERED).toBeDefined()
      expect(PluginStatus.ENABLED).toBeDefined()
      expect(PluginStatus.DISABLED).toBeDefined()
      expect(PluginStatus.ERROR).toBeDefined()
    })
  })
})
