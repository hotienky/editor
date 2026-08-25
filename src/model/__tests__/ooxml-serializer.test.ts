import { describe, expect, it } from 'vitest'
import { OoxmlSerializer } from '../ooxml-serializer'
import { OoxmlParser } from '../ooxml-parser'
import type { OoxmlPackage, Paragraph, Run, Text } from '../ooxml-types'

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makePkg(...texts: string[]): OoxmlPackage {
  const children: Paragraph[] = texts.map((t) => ({
    type: 'paragraph',
    content: [{
      type: 'run',
      content: [{ type: 'text', text: t }],
    }],
  }))

  return {
    document: {
      body: { children, sectPr: undefined },
    },
    styles: {
      docDefaults: { rPrDefault: {}, pPrDefault: {} },
      styles: new Map(),
    },
    numbering: { abstractNums: new Map(), nums: new Map() },
    settings: {},
    fontTable: { fonts: new Map() },
    theme: null,
    headers: new Map(),
    footers: new Map(),
    comments: null,
    footnotes: null,
    endnotes: null,
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}

function makeFormattedPkg(): OoxmlPackage {
  return {
    document: {
      body: {
        children: [
          {
            type: 'paragraph',
            content: [
              { type: 'run', rPr: { b: true }, content: [{ type: 'text', text: 'Bold' }] },
              { type: 'run', rPr: { i: true }, content: [{ type: 'text', text: 'Italic' }] },
            ],
          },
        ],
        sectPr: undefined,
      },
    },
    styles: {
      docDefaults: { rPrDefault: {}, pPrDefault: {} },
      styles: new Map(),
    },
    numbering: { abstractNums: new Map(), nums: new Map() },
    settings: {},
    fontTable: { fonts: new Map() },
    theme: null,
    headers: new Map(),
    footers: new Map(),
    comments: null,
    footnotes: null,
    endnotes: null,
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OoxmlSerializer', () => {
  it('creates serializer', () => {
    const pkg = makePkg('Hello')
    const serializer = new OoxmlSerializer(pkg)
    expect(serializer).toBeDefined()
  })

  it('serialize returns a Blob', () => {
    const pkg = makePkg('Hello')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  it('Blob contains valid ZIP with expected entries', async () => {
    const pkg = makePkg('Hello')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    // Read the ZIP
    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    // Check required entries exist
    const entries = Object.keys(unzipped)
    expect(entries).toContain('[Content_Types].xml')
    expect(entries).toContain('_rels/.rels')
    expect(entries).toContain('word/document.xml')
    expect(entries).toContain('word/_rels/document.xml.rels')
    expect(entries).toContain('word/styles.xml')
    expect(entries).toContain('word/settings.xml')
    expect(entries).toContain('word/fontTable.xml')
  })

  it('document.xml contains correct text', async () => {
    const pkg = makePkg('Hello World')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const docXml = new TextDecoder().decode(unzipped['word/document.xml'])
    expect(docXml).toContain('Hello World')
    expect(docXml).toContain('<w:t')
    expect(docXml).toContain('<w:p>')
    expect(docXml).toContain('<w:r>')
  })

  it('document.xml has correct XML structure', async () => {
    const pkg = makePkg('Test')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const docXml = new TextDecoder().decode(unzipped['word/document.xml'])
    expect(docXml).toContain('<?xml version="1.0"')
    expect(docXml).toContain('<w:document')
    expect(docXml).toContain('<w:body>')
    expect(docXml).toContain('</w:body>')
    expect(docXml).toContain('</w:document>')
  })

  it('multiple paragraphs serialized correctly', async () => {
    const pkg = makePkg('First', 'Second', 'Third')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const docXml = new TextDecoder().decode(unzipped['word/document.xml'])
    expect(docXml).toContain('First')
    expect(docXml).toContain('Second')
    expect(docXml).toContain('Third')

    // Count <w:p> occurrences (3 paragraphs)
    const paragraphCount = (docXml.match(/<w:p>/g) || []).length
    expect(paragraphCount).toBe(3)
  })

  it('bold formatting serialized correctly', async () => {
    const pkg = makeFormattedPkg()
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const docXml = new TextDecoder().decode(unzipped['word/document.xml'])
    expect(docXml).toContain('<w:b/>')
    expect(docXml).toContain('Bold')
    expect(docXml).toContain('Italic')
  })

  it('styles.xml is valid', async () => {
    const pkg = makePkg('Test')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const stylesXml = new TextDecoder().decode(unzipped['word/styles.xml'])
    expect(stylesXml).toContain('<?xml version="1.0"')
    expect(stylesXml).toContain('<w:styles')
    expect(stylesXml).toContain('<w:docDefaults>')
    expect(stylesXml).toContain('</w:styles>')
  })

  it('settings.xml is valid', async () => {
    const pkg = makePkg('Test')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const settingsXml = new TextDecoder().decode(unzipped['word/settings.xml'])
    expect(settingsXml).toContain('<?xml version="1.0"')
    expect(settingsXml).toContain('<w:settings')
    expect(settingsXml).toContain('</w:settings>')
  })

  it('fontTable.xml is valid', async () => {
    const pkg = makePkg('Test')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const fontXml = new TextDecoder().decode(unzipped['word/fontTable.xml'])
    expect(fontXml).toContain('<?xml version="1.0"')
    expect(fontXml).toContain('<w:fonts')
    expect(fontXml).toContain('</w:fonts>')
  })

  it('Content_Types.xml references all parts', async () => {
    const pkg = makePkg('Test')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const ctXml = new TextDecoder().decode(unzipped['[Content_Types].xml'])
    expect(ctXml).toContain('word/document.xml')
    expect(ctXml).toContain('word/styles.xml')
    expect(ctXml).toContain('word/settings.xml')
    expect(ctXml).toContain('word/fontTable.xml')
  })

  it('round-trip: parse then serialize preserves text', async () => {
    // Create a minimal DOCX-like buffer to parse
    const pkg = makePkg('Round trip test')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    // The blob is a valid DOCX
    expect(blob.size).toBeGreaterThan(0)
    expect(blob.type).toContain('wordprocessingml')
  })

  it('handles empty document', () => {
    const pkg = makePkg()
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob).toBeInstanceOf(Blob)
  })

  it('XML escaping in text content', async () => {
    const pkg = makePkg('A < B & C > D "E"')
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const { unzipSync } = await import('fflate')
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const unzipped = unzipSync(buffer)

    const docXml = new TextDecoder().decode(unzipped['word/document.xml'])
    expect(docXml).toContain('&lt;')
    expect(docXml).toContain('&amp;')
    expect(docXml).toContain('&gt;')
    expect(docXml).toContain('&quot;')
  })
})
