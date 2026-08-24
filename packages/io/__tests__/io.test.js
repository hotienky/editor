/**
 * @kindy/io Tests
 *
 * Architecture: Test Layer — IO Package
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DocxImporter,
  HtmlImporter,
  MarkdownImporter,
  JsonImporter,
  DocxExporter,
  HtmlExporter,
  MarkdownExporter,
  JsonExporter,
  PlainTextExporter,
} from '../src/index'

describe('IO Package', () => {
  describe('Importers', () => {
    describe('HtmlImporter', () => {
      it('should create HTML importer instance', () => {
        const importer = new HtmlImporter()

        expect(importer).toBeDefined()
      })

      it('should import HTML content', async () => {
        const importer = new HtmlImporter()

        const html = '<h1>Hello</h1><p>World</p>'

        const result = await importer.import(html)

        expect(result).toBeDefined()
        expect(result.type).toBe('document')
      })
    })

    describe('MarkdownImporter', () => {
      it('should create Markdown importer instance', () => {
        const importer = new MarkdownImporter()

        expect(importer).toBeDefined()
      })

      it('should import Markdown content', async () => {
        const importer = new MarkdownImporter()

        const markdown = '# Hello\n\nWorld'

        const result = await importer.import(markdown)

        expect(result).toBeDefined()
        expect(result.type).toBe('document')
      })
    })

    describe('JsonImporter', () => {
      it('should create JSON importer instance', () => {
        const importer = new JsonImporter()

        expect(importer).toBeDefined()
      })

      it('should import JSON content', async () => {
        const importer = new JsonImporter()

        const json = JSON.stringify({
          type: 'document',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Hello' }],
            },
          ],
        })

        const result = await importer.import(json)

        expect(result).toBeDefined()
        expect(result.type).toBe('document')
      })
    })
  })

  describe('Exporters', () => {
    const sampleDoc = {
      children: [
        {
          type: 'heading',
          attrs: { level: 1 },
          children: [{ type: 'text', text: 'Hello' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'World' }],
        },
      ],
    }

    describe('HtmlExporter', () => {
      it('should create HTML exporter instance', () => {
        const exporter = new HtmlExporter()

        expect(exporter).toBeDefined()
      })

      it('should export to HTML', async () => {
        const exporter = new HtmlExporter()

        const result = await exporter.export(sampleDoc)

        expect(result).toContain('<h1>')
        expect(result).toContain('Hello')
        expect(result).toContain('World')
      })
    })

    describe('MarkdownExporter', () => {
      it('should create Markdown exporter instance', () => {
        const exporter = new MarkdownExporter()

        expect(exporter).toBeDefined()
      })

      it('should export to Markdown', async () => {
        const exporter = new MarkdownExporter()

        const result = await exporter.export(sampleDoc)

        expect(result).toContain('# Hello')
        expect(result).toContain('World')
      })
    })

    describe('JsonExporter', () => {
      it('should create JSON exporter instance', () => {
        const exporter = new JsonExporter()

        expect(exporter).toBeDefined()
      })

      it('should export to JSON', async () => {
        const exporter = new JsonExporter()

        const result = await exporter.export(sampleDoc)

        expect(typeof result).toBe('string')

        const parsed = JSON.parse(result)
        expect(parsed.type).toBe('document')
      })
    })

    describe('PlainTextExporter', () => {
      it('should create PlainText exporter instance', () => {
        const exporter = new PlainTextExporter()

        expect(exporter).toBeDefined()
      })

      it('should export to plain text', async () => {
        const exporter = new PlainTextExporter()

        const result = await exporter.export(sampleDoc)

        expect(result).toContain('Hello')
        expect(result).toContain('World')
      })
    })
  })
})
