/**
 * @kindy/layout Tests
 *
 * Architecture: Test Layer — Layout Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LayoutEngine, measureText, computeLayout } from '../src/index'

describe('Layout Package', () => {
  let engine

  beforeEach(() => {
    engine = new LayoutEngine()
  })

  describe('LayoutEngine', () => {
    it('should create layout engine instance', () => {
      expect(engine).toBeDefined()
      expect(engine).toBeInstanceOf(LayoutEngine)
    })

    it('should compute layout for simple content', () => {
      const blocks = [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Hello World' }],
        },
      ]

      const pageOptions = {
        size: { width: 21, height: 29.7 },
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      }

      const result = engine.compute(blocks, pageOptions)

      expect(result).toBeDefined()
      expect(result.totalPages).toBeGreaterThanOrEqual(1)
      expect(result.pages).toBeDefined()
      expect(Array.isArray(result.pages)).toBe(true)
    })

    it('should compute layout with multiple pages', () => {
      // Create enough content to overflow a single page
      const blocks = Array.from({ length: 100 }, (_, i) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: `Paragraph ${i + 1}: ${'x'.repeat(100)}` }],
      }))

      const pageOptions = {
        size: { width: 21, height: 29.7 },
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      }

      const result = engine.compute(blocks, pageOptions)

      expect(result.totalPages).toBeGreaterThan(1)
    })

    it('should handle empty content', () => {
      const blocks = []

      const pageOptions = {
        size: { width: 21, height: 29.7 },
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      }

      const result = engine.compute(blocks, pageOptions)

      expect(result.totalPages).toBe(1)
      expect(result.pages).toHaveLength(1)
    })

    it('should compute page dimensions correctly', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Test' }],
        },
      ]

      const pageOptions = {
        size: { width: 21, height: 29.7 },
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      }

      const result = engine.compute(blocks, pageOptions)
      const page = result.pages[0]

      expect(page.contentWidth).toBeGreaterThan(0)
      expect(page.contentHeight).toBeGreaterThanOrEqual(0)
    })

    it('should handle landscape orientation', () => {
      const blocks = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Test' }],
        },
      ]

      const pageOptions = {
        size: { width: 21, height: 29.7 },
        orientation: 'landscape',
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      }

      const result = engine.compute(blocks, pageOptions)
      const page = result.pages[0]

      expect(page.contentWidth).toBeGreaterThan(0)
    })
  })

  describe('Text Measurement', () => {
    it('should export measureText function', () => {
      expect(typeof measureText).toBe('function')
    })
  })

  describe('Compute Layout', () => {
    it('should export computeLayout function', () => {
      expect(typeof computeLayout).toBe('function')
    })
  })
})
