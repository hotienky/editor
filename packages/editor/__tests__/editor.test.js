/**
 * @kindy/editor Tests
 *
 * Architecture: Test Layer — Editor Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UndoManager, initEditing, execute, getSelection } from '../src/index'

describe('Editor Package', () => {
  describe('UndoManager', () => {
    it('should create undo manager instance', () => {
      const undoManager = new UndoManager()

      expect(undoManager).toBeDefined()
    })

    it('should track undo/redo', () => {
      const undoManager = new UndoManager()

      expect(undoManager.canUndo).toBe(false)
      expect(undoManager.canRedo).toBe(false)
    })

    it('should undo and redo', () => {
      const undoManager = new UndoManager()

      undoManager.recordPage('insert', { text: 'Hello' }, { text: '' })

      expect(undoManager.canUndo).toBe(true)

      undoManager.undo(() => {})

      expect(undoManager.canRedo).toBe(true)

      undoManager.redo(() => {})

      expect(undoManager.canUndo).toBe(true)
    })
  })

  describe('Convenience Functions', () => {
    it('should export initEditing', () => {
      expect(typeof initEditing).toBe('function')
    })

    it('should export execute', () => {
      expect(typeof execute).toBe('function')
    })

    it('should export getSelection', () => {
      expect(typeof getSelection).toBe('function')
    })
  })
})
