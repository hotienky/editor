/**
 * @kindy/render Tests
 *
 * Architecture: Test Layer — Render Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PageRenderer, ViewportVirtualizer } from '../src/index'

describe('Render Package', () => {
  describe('PageRenderer', () => {
    it('should create page renderer instance', () => {
      const renderer = new PageRenderer()
      expect(renderer).toBeDefined()
    })

    it('should render page to HTML string', () => {
      const renderer = new PageRenderer()

      const page = {
        pageNumber: 1,
        width: 21,
        height: 29.7,
        contentHeight: 100,
        contentWidth: 500,
      }

      const html = renderer.renderPage(page, '<p>Hello World</p>')

      expect(html).toBeDefined()
      expect(typeof html).toBe('string')
      expect(html).toContain('Hello World')
    })

    it('should render different block types', () => {
      const renderer = new PageRenderer()

      const blocks = [
        {
          type: 'heading',
          attrs: { level: 1 },
          children: [{ type: 'text', text: 'Heading' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Paragraph' }],
        },
        {
          type: 'bulletList',
          children: [
            {
              type: 'listItem',
              children: [{ type: 'text', text: 'List Item' }],
            },
          ],
        },
      ]

      blocks.forEach((block) => {
        const html = renderer.renderBlock(block, 'test content')
        expect(html).toBeDefined()
        expect(typeof html).toBe('string')
      })
    })
  })

  describe('ViewportVirtualizer', () => {
    it('should create viewport instance', () => {
      const viewport = new ViewportVirtualizer()
      expect(viewport).toBeDefined()
    })

    it('should have shouldRender method', () => {
      const viewport = new ViewportVirtualizer()
      expect(typeof viewport.shouldRender).toBe('function')
    })

    it('should have getVisibleRange method', () => {
      const viewport = new ViewportVirtualizer()
      expect(typeof viewport.getVisibleRange).toBe('function')
    })
  })
})
