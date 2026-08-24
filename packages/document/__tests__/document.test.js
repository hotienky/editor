/**
 * @kindy/document Tests
 *
 * Architecture: Test Layer — Document Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDocument,
  createEmptyDocument,
  getSerializer,
  getValidator,
} from '../src/index'

describe('Document Package', () => {
  describe('createDocument', () => {
    it('should create a document from content', () => {
      const doc = createDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello World' }],
          },
        ],
      })

      expect(doc).toBeDefined()
      expect(doc.ast.type).toBe('document')
      expect(doc.children).toHaveLength(1)
    })

    it('should create document with blocks', () => {
      const doc = createDocument({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            children: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Paragraph' }],
          },
        ],
      })

      expect(doc.children).toHaveLength(2)
      expect(doc.children[0].type).toBe('heading')
      expect(doc.children[1].type).toBe('paragraph')
    })
  })

  describe('createEmptyDocument', () => {
    it('should create an empty document', () => {
      const doc = createEmptyDocument()

      expect(doc).toBeDefined()
      expect(doc.ast.type).toBe('document')
      expect(doc.children).toHaveLength(1)
      expect(doc.children[0].type).toBe('paragraph')
    })
  })

  describe('Serializer', () => {
    it('should serialize document to JSON', () => {
      const doc = createDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })

      const serializer = getSerializer()
      const json = serializer.toJSON(doc)

      expect(json).toBeDefined()
      expect(json.type).toBe('document')
    })

    it('should serialize document to HTML', () => {
      const doc = createDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })

      const serializer = getSerializer()
      const html = serializer.toHTML(doc)

      expect(html).toContain('Hello')
    })
  })

  describe('Validator', () => {
    it('should validate valid document', () => {
      const doc = createDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })

      const validator = getValidator()
      const result = validator.validate(doc.ast)

      expect(result.isValid).toBe(true)
    })

    it('should detect invalid document structure', () => {
      const invalidDoc = {
        type: 'invalid',
        content: [],
      }

      const validator = getValidator()
      const result = validator.validate(invalidDoc)

      expect(result.isValid).toBe(false)
    })
  })
})
