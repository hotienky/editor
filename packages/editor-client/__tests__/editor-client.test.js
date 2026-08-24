/**
 * @kindy/editor-client Tests
 *
 * Architecture: Test Layer — Editor Client Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useKindyEditor, useDocumentManager, useFileOperations } from '../src/index'

describe('Editor Client Package', () => {
  describe('useKindyEditor', () => {
    it('should return editor composable', () => {
      expect(typeof useKindyEditor).toBe('function')
    })

    it('should return editor state', () => {
      const editor = useKindyEditor()

      expect(editor).toBeDefined()
      expect(editor.document).toBeDefined()
      expect(editor.layout).toBeDefined()
      expect(editor.selection).toBeDefined()
      expect(editor.pageOptions).toBeDefined()
    })

    it('should return editor methods', () => {
      const editor = useKindyEditor()

      expect(typeof editor.updateDocument).toBe('function')
      expect(typeof editor.updateSelection).toBe('function')
      expect(typeof editor.updatePageOptions).toBe('function')
    })

    it('should have default page options', () => {
      const editor = useKindyEditor()

      expect(editor.pageOptions.size).toBeDefined()
      expect(editor.pageOptions.orientation).toBe('portrait')
      expect(editor.pageOptions.margin).toBeDefined()
    })
  })

  describe('useDocumentManager', () => {
    it('should return document manager composable', () => {
      expect(typeof useDocumentManager).toBe('function')
    })

    it('should return document manager state', () => {
      const manager = useDocumentManager()

      expect(manager).toBeDefined()
      expect(manager.tabs).toBeDefined()
      expect(manager.activeTabId).toBeDefined()
      expect(manager.currentDocument).toBeDefined()
    })

    it('should return document manager methods', () => {
      const manager = useDocumentManager()

      expect(typeof manager.selectTab).toBe('function')
      expect(typeof manager.addTab).toBe('function')
      expect(typeof manager.closeTab).toBe('function')
      expect(typeof manager.setCurrentDocument).toBe('function')
    })

    it('should have initial tab', () => {
      const manager = useDocumentManager()

      expect(manager.tabs.value).toHaveLength(1)
      expect(manager.activeTabId.value).toBe('doc-1')
    })

    it('should add new tab', () => {
      const manager = useDocumentManager()

      manager.addTab()

      expect(manager.tabs.value).toHaveLength(2)
    })
  })

  describe('useFileOperations', () => {
    it('should return file operations composable', () => {
      expect(typeof useFileOperations).toBe('function')
    })

    it('should return file operations state', () => {
      const ops = useFileOperations()

      expect(ops).toBeDefined()
      expect(ops.isSaving).toBeDefined()
      expect(ops.lastSavedAt).toBeDefined()
    })

    it('should return file operations methods', () => {
      const ops = useFileOperations()

      expect(typeof ops.save).toBe('function')
      expect(typeof ops.load).toBe('function')
      expect(typeof ops.exportDocument).toBe('function')
      expect(typeof ops.importDocument).toBe('function')
    })

    it('should save to localStorage', async () => {
      const ops = useFileOperations()

      const document = {
        title: 'Test',
        content: { type: 'doc', content: [] },
      }

      const result = await ops.save(document)

      expect(result.success).toBe(true)
      expect(ops.isSaving.value).toBe(false)
    })

    it('should load from localStorage', () => {
      const ops = useFileOperations()

      const document = {
        title: 'Test',
        content: { type: 'doc', content: [] },
      }

      localStorage.setItem('kindy-document', JSON.stringify(document))

      const loaded = ops.load()

      expect(loaded).toBeDefined()
      expect(loaded.title).toBe('Test')
    })
  })
})
