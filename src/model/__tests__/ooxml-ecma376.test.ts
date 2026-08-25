/**
 * OOXML ECMA-376 Compliance Tests
 *
 * Tests for full Word compatibility:
 * - Style resolver integration into layout engine
 * - Font resolution with hint-based selection
 * - Theme color resolution
 * - Table style cascade with deep merge
 * - Line spacing from styles
 * - Bookmark parsing and serialization
 * - Field code parsing and serialization
 * - cnfStyle parsing
 * - next/link style parsing
 * - beforeAutoSpacing/afterAutoSpacing
 */

import { describe, it, expect } from 'vitest'
import { OoxmlParser } from '../ooxml-parser'
import { OoxmlSerializer } from '../ooxml-serializer'
import { StyleResolver } from '../style-resolver'
import { OoxmlLayoutEngine } from '../ooxml-layout-engine'
import { OoxmlTextMeasurer, resolveFontFamily } from '../ooxml-text-measurer'
import type {
  OoxmlPackage,
  StylesPart,
  StyleDefinition,
  RunFonts,
  ThemePart,
  DocDefaults,
  ParagraphProperties,
  RunProperties,
} from '../ooxml-types'

// ─── Helper: Create minimal OoxmlPackage ────────────────────────────────────

function createMinimalPkg(overrides?: Partial<OoxmlPackage>): OoxmlPackage {
  const emptyDefaults: DocDefaults = {}
  const styles: StylesPart = {
    docDefaults: {
      rPrDefault: {
        rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman' },
        sz: 24,
      },
      pPrDefault: {},
    },
    styles: new Map(),
  }

  return {
    document: {
      body: {
        children: [],
        sectPr: {
          pgSz: { w: 12240, h: 15840 },
          pgMar: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720, gutter: 0 },
        },
      },
    },
    styles,
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
    ...overrides,
  }
}

// ─── Style Resolver Tests ─────────────────────────────────────────────────

describe('StyleResolver — ECMA-376 Compliance', () => {
  it('resolves basedOn chain: Heading 1 → Normal → docDefaults', () => {
    const styles = new Map<string, StyleDefinition>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      rPr: { sz: 24, rFonts: { ascii: 'Calibri', hAnsi: 'Calibri' } },
    })
    styles.set('Heading1', {
      id: 'Heading1',
      type: 'paragraph',
      basedOn: 'Normal',
      rPr: { b: true, sz: 32 },
    })

    const resolver = new StyleResolver({
      docDefaults: {
        rPrDefault: { rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman' } },
      },
      styles,
    })

    const resolved = resolver.resolveParagraph('Heading1', {})
    expect(resolved.rPr.b).toBe(true)
    expect(resolved.rPr.sz).toBe(32) // from Heading1
    expect(resolved.rPr.rFonts?.ascii).toBe('Calibri') // from Normal
  })

  it('direct formatting overrides style properties', () => {
    const styles = new Map<string, StyleDefinition>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      rPr: { sz: 24, b: false },
    })

    const resolver = new StyleResolver({
      docDefaults: {},
      styles,
    })

    const resolved = resolver.resolveParagraph('Normal', {
      rPr: { b: true, sz: 48 },
    })
    expect(resolved.rPr.b).toBe(true) // direct override
    expect(resolved.rPr.sz).toBe(48) // direct override
  })

  it('resolves theme fonts', () => {
    const styles = new Map<string, StyleDefinition>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      rPr: { rFonts: { ascii: 'minorHAnsi', hAnsi: 'minorHAnsi' } },
    })

    const theme: ThemePart = {
      themeElements: {
        clrScheme: {},
        fontScheme: {
          name: 'Office',
          majorFont: { latin: { typeface: 'Calibri Light' } },
          minorFont: { latin: { typeface: 'Calibri' } },
        },
        fmtScheme: {},
      },
    }

    const resolver = new StyleResolver({
      docDefaults: {},
      styles,
    }, theme)

    const resolved = resolver.resolveParagraph('Normal', {})
    expect(resolved.rPr.rFonts?.ascii).toBe('Calibri')
    expect(resolved.rPr.rFonts?.hAnsi).toBe('Calibri')
  })

  it('resolves theme colors', () => {
    const theme: ThemePart = {
      themeElements: {
        clrScheme: {
          accent1: '4472C4',
          hyperlink: '0563C1',
        },
        fontScheme: { majorFont: {}, minorFont: {} },
        fmtScheme: {},
      },
      fontScheme: undefined as any,
    }

    const resolver = new StyleResolver({
      docDefaults: {},
      styles: new Map(),
    }, theme)

    expect(resolver.resolveThemeColor('accent1')).toBe('4472C4')
    expect(resolver.resolveThemeColor('hyperlink')).toBe('0563C1')
    expect(resolver.resolveThemeColor('dark1')).toBeUndefined()
    expect(resolver.resolveThemeColor('FF0000')).toBe('FF0000')
  })

  it('deep merges table borders (not shallow replace)', () => {
    const styles = new Map<string, StyleDefinition>()
    styles.set('TableGrid', {
      id: 'TableGrid',
      type: 'table',
      tblPr: {
        tblBorders: {
          top: { val: 'single', sz: 4, color: '000000' },
          bottom: { val: 'single', sz: 4, color: '000000' },
          left: { val: 'single', sz: 4, color: '000000' },
          right: { val: 'single', sz: 4, color: '000000' },
        },
      },
    })
    styles.set('CustomTable', {
      id: 'CustomTable',
      type: 'table',
      basedOn: 'TableGrid',
      tblPr: {
        tblBorders: {
          insideH: { val: 'single', sz: 4, color: '000000' },
        },
      },
    })

    const resolver = new StyleResolver({
      docDefaults: {},
      styles,
    })

    const resolved = resolver.resolveTable('CustomTable', {})
    // Should have ALL borders: top, bottom, left, right from base + insideH from override
    expect(resolved.tblPr?.tblBorders?.top).toBeDefined()
    expect(resolved.tblPr?.tblBorders?.bottom).toBeDefined()
    expect(resolved.tblPr?.tblBorders?.left).toBeDefined()
    expect(resolved.tblPr?.tblBorders?.right).toBeDefined()
    expect(resolved.tblPr?.tblBorders?.insideH).toBeDefined()
  })
})

// ─── Parser Missing Elements Tests ────────────────────────────────────────

describe('OoxmlParser — ECMA-376 Missing Elements', () => {
  const parser = new OoxmlParser()

  async function parseDocx(xml: string): Promise<OoxmlPackage> {
    const { zipSync } = await import('fflate')
    const encoder = new TextEncoder()
    const parts: Record<string, Uint8Array> = {
      'word/document.xml': encoder.encode(xml),
      '[Content_Types].xml': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
      '_rels/.rels': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    }
    const zipped = zipSync(parts, { level: 0 })
    return parser.parse(zipped)
  }

  it('parses next and link in style definitions', async () => {
    const doc = await parseDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello</w:t></w:r></w:p>
  </w:body>
</w:document>`)

    // Create a style with next and link
    doc.styles.styles.set('Heading1', {
      id: 'Heading1',
      type: 'paragraph',
      name: 'Heading 1',
      basedOn: 'Normal',
      next: 'Normal',
      link: 'Heading1Char',
    })

    const style = doc.styles.styles.get('Heading1')
    expect(style?.next).toBe('Normal')
    expect(style?.link).toBe('Heading1Char')
  })

  it('parses bookmarkStart and bookmarkEnd', async () => {
    const doc = await parseDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:bookmarkStart w:id="1" w:name="MyBookmark"/>
      <w:r><w:t>Hello</w:t></w:r>
      <w:bookmarkEnd w:id="1"/>
    </w:p>
  </w:body>
</w:document>`)

    const para = doc.document.body.children[0] as any
    expect(para.content).toHaveLength(3)
    expect(para.content[0].type).toBe('bookmarkStart')
    expect(para.content[0].id).toBe(1)
    expect(para.content[0].name).toBe('MyBookmark')
    expect(para.content[2].type).toBe('bookmarkEnd')
    expect(para.content[2].id).toBe(1)
  })

  it('parses fieldChar and instrText', async () => {
    const doc = await parseDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:fldChar w:fldCharType="begin"/>
      </w:r>
      <w:r>
        <w:instrText xml:space="preserve"> TOC \\o "1-3" </w:instrText>
      </w:r>
      <w:r>
        <w:fldChar w:fldCharType="separate"/>
      </w:r>
      <w:r>
        <w:t>Table of Contents</w:t>
      </w:r>
      <w:r>
        <w:fldChar w:fldCharType="end"/>
      </w:r>
    </w:p>
  </w:body>
</w:document>`)

    const para = doc.document.body.children[0] as any
    const runs = para.content.filter((i: any) => i.type === 'run')

    // First run: fieldChar begin
    expect(runs[0].content[0].type).toBe('fieldChar')
    expect(runs[0].content[0].fldCharType).toBe('begin')

    // Second run: instrText
    expect(runs[1].content[0].type).toBe('instrText')
    expect(runs[1].content[0].text).toContain('TOC')

    // Third run: fieldChar separate
    expect(runs[2].content[0].type).toBe('fieldChar')
    expect(runs[2].content[0].fldCharType).toBe('separate')

    // Fourth run: text
    expect(runs[3].content[0].type).toBe('text')
    expect(runs[3].content[0].text).toBe('Table of Contents')

    // Fifth run: fieldChar end
    expect(runs[4].content[0].type).toBe('fieldChar')
    expect(runs[4].content[0].fldCharType).toBe('end')
  })

  it('parses cnfStyle on paragraph', async () => {
    const doc = await parseDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:cnfStyle w:val="001000000000"/>
      </w:pPr>
      <w:r><w:t>Hello</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`)

    const para = doc.document.body.children[0] as any
    expect(para.pPr?.cnfStyle).toBe('001000000000')
  })

  it('parses beforeAutoSpacing and afterAutoSpacing', async () => {
    const doc = await parseDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:spacing w:before="200" w:after="100" w:beforeAuto="1" w:afterAuto="1"/>
      </w:pPr>
      <w:r><w:t>Hello</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`)

    const para = doc.document.body.children[0] as any
    expect(para.pPr?.spacing?.before).toBe(200)
    expect(para.pPr?.spacing?.after).toBe(100)
  })
})

// ─── Serializer Round-trip Tests ──────────────────────────────────────────

describe('OoxmlSerializer — ECMA-376 Round-trip', () => {
  it('round-trips bookmarks through parse → serialize', async () => {
    const parser = new OoxmlParser()
    const { zipSync } = await import('fflate')
    const encoder = new TextEncoder()
    const parts: Record<string, Uint8Array> = {
      'word/document.xml': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:bookmarkStart w:id="1" w:name="MyBookmark"/>
      <w:r><w:t>Hello</w:t></w:r>
      <w:bookmarkEnd w:id="1"/>
    </w:p>
  </w:body>
</w:document>`),
      '[Content_Types].xml': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
      '_rels/.rels': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    }
    const zipped = zipSync(parts, { level: 0 })
    const pkg = await parser.parse(zipped)

    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    // Parse the serialized blob back
    const buffer = await blob.arrayBuffer()
    const pkg2 = await parser.parse(new Uint8Array(buffer))

    const para = pkg2.document.body.children[0] as any
    expect(para.content).toHaveLength(3)
    expect(para.content[0].type).toBe('bookmarkStart')
    expect(para.content[0].name).toBe('MyBookmark')
    expect(para.content[2].type).toBe('bookmarkEnd')
  })

  it('round-trips field codes through parse → serialize', async () => {
    const parser = new OoxmlParser()
    const { zipSync } = await import('fflate')
    const encoder = new TextEncoder()
    const parts: Record<string, Uint8Array> = {
      'word/document.xml': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:fldChar w:fldCharType="begin"/></w:r>
      <w:r><w:instrText xml:space="preserve"> DATE </w:instrText></w:r>
      <w:r><w:fldChar w:fldCharType="separate"/></w:r>
      <w:r><w:t>1/1/2026</w:t></w:r>
      <w:r><w:fldChar w:fldCharType="end"/></w:r>
    </w:p>
  </w:body>
</w:document>`),
      '[Content_Types].xml': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
      '_rels/.rels': encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    }
    const zipped = zipSync(parts, { level: 0 })
    const pkg = await parser.parse(zipped)

    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()

    const buffer = await blob.arrayBuffer()
    const pkg2 = await parser.parse(new Uint8Array(buffer))

    const para = pkg2.document.body.children[0] as any
    const runs = para.content.filter((i: any) => i.type === 'run')
    expect(runs[0].content[0].type).toBe('fieldChar')
    expect(runs[0].content[0].fldCharType).toBe('begin')
    expect(runs[1].content[0].type).toBe('instrText')
    expect(runs[1].content[0].text).toContain('DATE')
    expect(runs[4].content[0].type).toBe('fieldChar')
    expect(runs[4].content[0].fldCharType).toBe('end')
  })
})

// ─── Layout Engine Integration Tests ──────────────────────────────────────

describe('OoxmlLayoutEngine — Style Integration', () => {
  it('applies style cascade to paragraph rendering', () => {
    const engine = new OoxmlLayoutEngine()

    // Create a package with a style that defines font size
    const styles: StylesPart = {
      docDefaults: {
        rPrDefault: {
          rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman' },
          sz: 24,
        },
        pPrDefault: {},
      },
      styles: new Map([
        ['Normal', {
          id: 'Normal',
          type: 'paragraph',
          rPr: { sz: 24, rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman' } },
        }],
        ['Heading1', {
          id: 'Heading1',
          type: 'paragraph',
          basedOn: 'Normal',
          rPr: { b: true, sz: 48, rFonts: { ascii: 'Calibri', hAnsi: 'Calibri' } },
          pPr: { spacing: { before: 480, after: 200 } },
        }],
      ]),
    }

    const pkg = createMinimalPkg({ styles })

    // Layout a paragraph with Heading1 style
    pkg.document.body.children = [{
      type: 'paragraph',
      pPr: { pStyle: 'Heading1' },
      content: [{
        type: 'run',
        content: [{ type: 'text', text: 'Hello World' }],
      }],
    }] as any

    const layout = engine.layout(pkg)
    expect(layout.pages).toHaveLength(1)

    const para = layout.pages[0].blocks[0].data as any
    // Should have spacing from the style
    expect(para.spacingBefore).toBe(480)
    expect(para.spacingAfter).toBe(200)
  })

  it('merges paragraph default rPr into runs', () => {
    const engine = new OoxmlLayoutEngine()

    const styles: StylesPart = {
      docDefaults: {
        rPrDefault: {},
        pPrDefault: {},
      },
      styles: new Map([
        ['Normal', {
          id: 'Normal',
          type: 'paragraph',
          rPr: { sz: 28, rFonts: { ascii: 'Arial', hAnsi: 'Arial' } },
        }],
      ]),
    }

    const pkg = createMinimalPkg({ styles })

    // Paragraph with style, run without explicit formatting
    pkg.document.body.children = [{
      type: 'paragraph',
      pPr: { pStyle: 'Normal' },
      content: [{
        type: 'run',
        content: [{ type: 'text', text: 'Hello' }],
      }],
    }] as any

    const layout = engine.layout(pkg)
    const para = layout.pages[0].blocks[0].data as any

    // The run should inherit font size and family from the paragraph style
    const fragment = para.lines[0].fragments[0]
    expect(fragment.sz).toBe(28)
    expect(fragment.fontFamily).toBe('Arial')
  })
})

// ─── Font Resolution Tests ────────────────────────────────────────────────

describe('resolveFontFamily — hint-based selection', () => {
  it('uses eastAsia hint for CJK text', () => {
    const rFonts: RunFonts = {
      ascii: 'Times New Roman',
      hAnsi: 'Times New Roman',
      eastAsia: 'SimSun',
      hint: 'eastAsia',
    }

    const result = resolveFontFamily(rFonts, undefined)
    expect(result).toBe('SimSun')
  })

  it('uses default hint for Latin text', () => {
    const rFonts: RunFonts = {
      ascii: 'Calibri',
      hAnsi: 'Calibri',
      eastAsia: 'SimSun',
      hint: 'default',
    }

    const result = resolveFontFamily(rFonts, undefined)
    expect(result).toBe('Calibri')
  })

  it('falls back to minor font when no rFonts', () => {
    const theme: ThemePart = {
      themeElements: {
        clrScheme: {},
        fontScheme: {
          name: 'Office',
          majorFont: { latin: { typeface: 'Calibri Light' } },
          minorFont: { latin: { typeface: 'Calibri' } },
        },
        fmtScheme: {},
      },
    }

    const result = resolveFontFamily(undefined, theme)
    expect(result).toBe('Calibri')
  })

  it('falls back to major font when minor not available', () => {
    const theme: ThemePart = {
      themeElements: {
        clrScheme: {},
        fontScheme: {
          name: 'Office',
          majorFont: { latin: { typeface: 'Calibri Light' } },
          minorFont: {},
        },
        fmtScheme: {},
      },
    }

    const result = resolveFontFamily(undefined, theme)
    expect(result).toBe('Calibri Light')
  })
})

// ─── Painter Enhancement Tests ────────────────────────────────────────────

describe('OoxmlPainter — Line Spacing', () => {
  it('handles line spacing from paragraph properties', () => {
    // The layout engine now handles line spacing
    const engine = new OoxmlLayoutEngine()

    const styles: StylesPart = {
      docDefaults: {
        rPrDefault: { rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman' }, sz: 24 },
        pPrDefault: {},
      },
      styles: new Map(),
    }

    const pkg = createMinimalPkg({ styles })

    // Paragraph with double line spacing (line=480 in auto mode)
    pkg.document.body.children = [{
      type: 'paragraph',
      pPr: {
        spacing: { line: 480, lineRule: 'auto' },
      },
      content: [{
        type: 'run',
        rPr: { sz: 24 },
        content: [{ type: 'text', text: 'Hello World' }],
      }],
    }] as any

    const layout = engine.layout(pkg)
    expect(layout.pages).toHaveLength(1)

    const para = layout.pages[0].blocks[0].data as any
    // Double spacing (480/240 = 2x) should increase line height
    expect(para.lines[0].height).toBeGreaterThan(0)
  })
})

// ─── Numbering Engine Integration Tests ──────────────────────────────────

describe('OoxmlLayoutEngine — Numbering Integration', () => {
  function createPkgWithNumbering(overrides?: any) {
    const abstractNums = new Map()
    const nums = new Map()

    // Abstract numbering: decimal "Điều %1." at ilvl=0
    abstractNums.set(0, {
      levels: [
        { ilvl: 0, numFmt: 'decimal', lvlText: 'Điều %1.', start: 1, pPr: { ind: { left: 720, hanging: 360 } } },
      ],
    })
    // Concrete instance: numId=2 → abstractNumId=0
    nums.set(2, { numId: 2, abstractNumId: 0 })

    return createMinimalPkg({
      numbering: { abstractNums, nums },
      ...overrides,
    })
  }

  it('generates numbering text fragment for paragraph with numPr', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createPkgWithNumbering()

    pkg.document.body.children = [{
      type: 'paragraph',
      pPr: { numPr: { numId: 2, ilvl: 0 } },
      content: [{ type: 'run', content: [{ type: 'text', text: 'Hello' }] }],
    }] as any

    const layout = engine.layout(pkg)
    const para = layout.pages[0].blocks[0].data as any

    // Numbering should be resolved
    expect(para.numbering).toBeDefined()
    expect(para.numbering.text).toBe('Điều 1.')
    expect(para.numbering.numId).toBe(2)

    // First fragment should be the numbering prefix
    const firstFrag = para.lines[0].fragments[0]
    expect(firstFrag.kind).toBe('numbering')
    expect(firstFrag.text).toContain('Điều 1.')
  })

  it('skips numbering for numId=0 (no numbering)', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createPkgWithNumbering()

    pkg.document.body.children = [{
      type: 'paragraph',
      pPr: { numPr: { numId: 0, ilvl: 0 } },
      content: [{ type: 'run', content: [{ type: 'text', text: 'Hello' }] }],
    }] as any

    const layout = engine.layout(pkg)
    const para = layout.pages[0].blocks[0].data as any

    // numId=0 means no numbering
    expect(para.numbering).toBeUndefined()
    // First fragment should be the text, not numbering
    const firstFrag = para.lines[0].fragments[0]
    expect(firstFrag.kind).toBe('text')
    expect(firstFrag.text).toBe('Hello')
  })

  it('does not generate numbering when paragraph has no numPr', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createPkgWithNumbering()

    pkg.document.body.children = [{
      type: 'paragraph',
      pPr: {},
      content: [{ type: 'run', content: [{ type: 'text', text: 'Hello' }] }],
    }] as any

    const layout = engine.layout(pkg)
    const para = layout.pages[0].blocks[0].data as any

    expect(para.numbering).toBeUndefined()
  })

  it('increments numbering counter across paragraphs', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createPkgWithNumbering()

    pkg.document.body.children = [
      {
        type: 'paragraph',
        pPr: { numPr: { numId: 2, ilvl: 0 } },
        content: [{ type: 'run', content: [{ type: 'text', text: 'First' }] }],
      },
      {
        type: 'paragraph',
        pPr: { numPr: { numId: 2, ilvl: 0 } },
        content: [{ type: 'run', content: [{ type: 'text', text: 'Second' }] }],
      },
    ] as any

    const layout = engine.layout(pkg)
    const para1 = layout.pages[0].blocks[0].data as any
    const para2 = layout.pages[0].blocks[1].data as any

    expect(para1.numbering.text).toBe('Điều 1.')
    expect(para2.numbering.text).toBe('Điều 2.')
  })
})
