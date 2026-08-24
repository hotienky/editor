/**
 * @kindy/vue Tests
 *
 * Architecture: Test Layer — Vue Adapter Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useEditor,
  useDocument,
  useLayout,
  useSelection,
  useCollaboration,
  usePlugin,
} from '../src/index'

describe('Vue Adapter Package', () => {
  describe('Composables', () => {
    it('should export useEditor composable', () => {
      expect(typeof useEditor).toBe('function')
    })

    it('should export useDocument composable', () => {
      expect(typeof useDocument).toBe('function')
    })

    it('should export useLayout composable', () => {
      expect(typeof useLayout).toBe('function')
    })

    it('should export useSelection composable', () => {
      expect(typeof useSelection).toBe('function')
    })

    it('should export useCollaboration composable', () => {
      expect(typeof useCollaboration).toBe('function')
    })

    it('should export usePlugin composable', () => {
      expect(typeof usePlugin).toBe('function')
    })
  })

  describe('useDocument', () => {
    it('should return document composable', () => {
      const doc = useDocument()

      expect(doc).toBeDefined()
      expect(doc.document).toBeDefined()
      expect(doc.text).toBeDefined()
      expect(doc.wordCount).toBeDefined()
      expect(doc.charCount).toBeDefined()
    })

    it('should return document methods', () => {
      const doc = useDocument()

      expect(typeof doc.updateDocument).toBe('function')
      expect(typeof doc.insertText).toBe('function')
      expect(typeof doc.deleteText).toBe('function')
    })
  })

  describe('useLayout', () => {
    it('should return layout composable', () => {
      const layout = useLayout()

      expect(layout).toBeDefined()
      expect(layout.layout).toBeDefined()
      expect(layout.pageOptions).toBeDefined()
      expect(layout.totalPages).toBeDefined()
      expect(layout.pages).toBeDefined()
    })

    it('should return layout methods', () => {
      const layout = useLayout()

      expect(typeof layout.updatePageOptions).toBe('function')
    })
  })

  describe('useSelection', () => {
    it('should return selection composable', () => {
      const selection = useSelection()

      expect(selection).toBeDefined()
      expect(selection.selection).toBeDefined()
      expect(selection.isSelected).toBeDefined()
      expect(selection.selectedText).toBeDefined()
    })

    it('should return selection methods', () => {
      const selection = useSelection()

      expect(typeof selection.updateSelection).toBe('function')
    })
  })

  describe('useCollaboration', () => {
    it('should return collaboration composable', () => {
      const collab = useCollaboration()

      expect(collab).toBeDefined()
      expect(collab.isConnected).toBeDefined()
      expect(collab.users).toBeDefined()
      expect(collab.cursors).toBeDefined()
    })

    it('should return collaboration methods', () => {
      const collab = useCollaboration()

      expect(typeof collab.connect).toBe('function')
      expect(typeof collab.disconnect).toBe('function')
      expect(typeof collab.setCursor).toBe('function')
    })
  })

  describe('usePlugin', () => {
    it('should return plugin composable', () => {
      const plugin = usePlugin()

      expect(plugin).toBeDefined()
      expect(typeof plugin.registerPlugin).toBe('function')
      expect(typeof plugin.getPlugin).toBe('function')
      expect(typeof plugin.getAllPlugins).toBe('function')
      expect(typeof plugin.enablePlugin).toBe('function')
      expect(typeof plugin.disablePlugin).toBe('function')
      expect(typeof plugin.executeHook).toBe('function')
    })
  })

  describe('Install function', () => {
    it('should export install function', async () => {
      const module = await import('../src/index')
      expect(typeof module.install).toBe('function')
    })
  })
})
