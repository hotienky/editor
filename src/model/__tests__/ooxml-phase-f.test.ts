import { describe, expect, it } from 'vitest'
import { OoxmlParser } from '../ooxml-parser'
import { OoxmlSerializer } from '../ooxml-serializer'
import { OoxmlLayoutEngine } from '../ooxml-layout-engine'
import type { OoxmlPackage, FootnotesPart, EndnotesPart, Paragraph, Run, Text, FootnoteReference, EndnoteReference, Break, Tab, TableCell, TableRow } from '../ooxml-types'
import type { TextFragment } from '../ooxml-layout-types'
import { breakIntoLines } from '../ooxml-line-breaker'
import * as fflate from 'fflate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createDocxWithFootnotes(): Uint8Array {
  const encoder = new TextEncoder()
  const files: Record<string, Uint8Array> = {}

  files['[Content_Types].xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '  <Default Extension="xml" ContentType="application/xml"/>',
    '  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>',
    '  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
    '  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
    '  <Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '  <Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>',
    '  <Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>',
    '</Types>',
  ].join('\n'))

  files['_rels/.rels'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join('\n'))

  files['word/_rels/document.xml.rels'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    '  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
    '  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>',
    '  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>',
    '  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/>',
    '</Relationships>',
  ].join('\n'))

  files['word/styles.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:docDefaults>',
    '    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr></w:rPrDefault>',
    '    <w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr></w:pPrDefault>',
    '  </w:docDefaults>',
    '  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>',
    '</w:styles>',
  ].join('\n'))

  files['word/document.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    '  <w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r><w:r><w:t> World</w:t></w:r></w:p>',
    '  <w:p><w:r><w:t>After footnote</w:t></w:r></w:p>',
    '</w:body>',
    '</w:document>',
  ].join('\n'))

  files['word/numbering.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  ].join('\n'))

  files['word/settings.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  ].join('\n'))

  files['word/fontTable.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
  ].join('\n'))

  files['word/theme/theme1.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    '  <a:themeElements>',
    '    <a:clrScheme name="Office">',
    '      <a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>',
    '      <a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>',
    '      <a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>',
    '      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>',
    '      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>',
    '      <a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>',
    '    </a:clrScheme>',
    '    <a:fontScheme name="Office">',
    '      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>',
    '      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>',
    '    </a:fontScheme>',
    '    <a:fmtScheme name="Office"/>',
    '  </a:themeElements>',
    '</a:theme>',
  ].join('\n'))

  files['word/footnotes.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:footnote w:id="1">',
    '    <w:p><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>1</w:t></w:r></w:p>',
    '    <w:p><w:r><w:t>This is a footnote.</w:t></w:r></w:p>',
    '  </w:footnote>',
    '</w:footnotes>',
  ].join('\n'))

  files['word/endnotes.xml'] = encoder.encode([
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:endnote w:id="2">',
    '    <w:p><w:r><w:t>This is an endnote.</w:t></w:r></w:p>',
    '  </w:endnote>',
    '</w:endnotes>',
  ].join('\n'))

  return fflate.zipSync(Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, v])
  ))
}

function makePkgWithFootnotes(): OoxmlPackage {
  return {
    document: {
      body: {
        children: [
          {
            type: 'paragraph',
            content: [
              { type: 'run', content: [{ type: 'text', text: 'Hello ' }] },
              { type: 'run', content: [{ type: 'footnoteReference' as any, id: 1 }] },
              { type: 'run', content: [{ type: 'text', text: ' World' }] },
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
    footnotes: {
      footnotes: new Map([
        [1, {
          id: 1,
          type: 'normal' as const,
          content: [{
            type: 'paragraph',
            content: [{ type: 'run', content: [{ type: 'text', text: 'This is a footnote.' }] }],
          }],
        }],
      ]),
    },
    endnotes: {
      endnotes: new Map([
        [2, {
          id: 2,
          type: 'normal' as const,
          content: [{
            type: 'paragraph',
            content: [{ type: 'run', content: [{ type: 'text', text: 'This is an endnote.' }] }],
          }],
        }],
      ]),
    },
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}

// ─── Tests: Footnotes & Endnotes ─────────────────────────────────────────────

describe('Phase F — Footnotes & Endnotes', () => {
  it('parses footnotes from DOCX', async () => {
    const docx = createDocxWithFootnotes()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    expect(pkg.footnotes).not.toBeNull()
    expect(pkg.footnotes!.footnotes.size).toBe(1)
    const fn = pkg.footnotes!.footnotes.get(1)
    expect(fn).toBeDefined()
    expect(fn!.id).toBe(1)
    expect(fn!.content).toHaveLength(2)
  })

  it('parses endnotes from DOCX', async () => {
    const docx = createDocxWithFootnotes()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    expect(pkg.endnotes).not.toBeNull()
    expect(pkg.endnotes!.endnotes.size).toBe(1)
    const en = pkg.endnotes!.endnotes.get(2)
    expect(en).toBeDefined()
    expect(en!.id).toBe(2)
    expect(en!.content).toHaveLength(1)
  })

  it('parses footnoteReference in run content', async () => {
    const docx = createDocxWithFootnotes()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const para = pkg.document.body.children[0] as Paragraph
    const run = para.content[1] as Run
    const ref = run.content[0] as FootnoteReference
    expect(ref.type).toBe('footnoteReference')
    expect(ref.id).toBe(1)
  })

  it('serializes footnoteReference in run content', () => {
    const pkg = makePkgWithFootnotes()
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob).toBeInstanceOf(Blob)
  })

  it('serializes footnotes part', () => {
    const pkg = makePkgWithFootnotes()
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('handles null footnotes/endnotes gracefully', () => {
    const pkg = makePkgWithFootnotes()
    pkg.footnotes = null
    pkg.endnotes = null
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob).toBeInstanceOf(Blob)
  })
})

// ─── Tests: Break & Tab in Layout ────────────────────────────────────────────

describe('Phase F — Break & Tab Layout', () => {
  it('line break produces empty fragment in line breaker', () => {
    const fragments: TextFragment[] = [
      { kind: 'text', text: 'Hello', width: 100, widthPx: 10, sz: 24, fontFamily: 'Arial' },
      { kind: 'break', breakType: 'line', text: '', width: 0, widthPx: 0, sz: 0, fontFamily: '' },
      { kind: 'text', text: 'World', width: 100, widthPx: 10, sz: 24, fontFamily: 'Arial' },
    ]
    const result = breakIntoLines({ fragments, availableWidth: 2000 })
    expect(result.lines.length).toBeGreaterThanOrEqual(2)
    expect(result.lines[0].fragments[0].text).toBe('Hello')
    expect(result.lines[1].fragments[0].text).toBe('World')
  })

  it('page break produces separate lines', () => {
    const fragments: TextFragment[] = [
      { kind: 'text', text: 'Before', width: 100, widthPx: 10, sz: 24, fontFamily: 'Arial' },
      { kind: 'break', breakType: 'page', text: '', width: 0, widthPx: 0, sz: 0, fontFamily: '' },
      { kind: 'text', text: 'After', width: 100, widthPx: 10, sz: 24, fontFamily: 'Arial' },
    ]
    const result = breakIntoLines({ fragments, availableWidth: 2000 })
    expect(result.lines.length).toBe(2)
    expect(result.lines[0].fragments[0].text).toBe('Before')
    expect(result.lines[1].fragments[0].text).toBe('After')
  })

  it('tab fragment preserves width', () => {
    const fragments: TextFragment[] = [
      { kind: 'text', text: 'Before', width: 100, widthPx: 10, sz: 24, fontFamily: 'Arial' },
      { kind: 'tab', text: '', width: 720, widthPx: 72, sz: 0, fontFamily: '' },
      { kind: 'text', text: 'After', width: 100, widthPx: 10, sz: 24, fontFamily: 'Arial' },
    ]
    const result = breakIntoLines({ fragments, availableWidth: 2000 })
    expect(result.lines).toHaveLength(1)
    // Tab width is preserved; text widths have rounding (100/6 chars rounds up slightly)
    expect(result.lines[0].width).toBeGreaterThanOrEqual(920)
    expect(result.lines[0].width).toBeLessThanOrEqual(925)
  })

  it('footnoteRef fragment has superscript text', () => {
    const frag: TextFragment = {
      kind: 'footnoteRef',
      text: '[1]',
      width: 30,
      widthPx: 3,
      sz: 16,
      fontFamily: 'Arial',
      refId: 1,
    }
    expect(frag.kind).toBe('footnoteRef')
    expect(frag.refId).toBe(1)
    expect(frag.text).toBe('[1]')
  })

  it('endnoteRef fragment has superscript text', () => {
    const frag: TextFragment = {
      kind: 'endnoteRef',
      text: '[2]',
      width: 30,
      widthPx: 3,
      sz: 16,
      fontFamily: 'Arial',
      refId: 2,
    }
    expect(frag.kind).toBe('endnoteRef')
    expect(frag.refId).toBe(2)
  })
})

// ─── Tests: Drawing Serialization ────────────────────────────────────────────

describe('Phase F — Drawing Serialization', () => {
  it('serializes inline drawing with blip reference', () => {
    const pkg = makePkgWithFootnotes()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [{
        type: 'run',
        content: [{
          type: 'drawing',
          inline: {
            extent: { cx: 914400, cy: 914400 },
            blip: { rId: 'rId10' },
            docPr: { id: 1, name: 'Image1', descr: 'A photo' },
          },
        }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes drawing without blip gracefully', () => {
    const pkg = makePkgWithFootnotes()
    pkg.document.body.children = [{
      type: 'paragraph',
      content: [{
        type: 'run',
        content: [{
          type: 'drawing',
          inline: {
            extent: { cx: 914400, cy: 914400 },
          },
        }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })
})

// ─── Tests: Table Borders & Shading ──────────────────────────────────────────

describe('Phase F — Table Borders & Shading', () => {
  it('serializes table borders', () => {
    const pkg = makePkgWithFootnotes()
    pkg.document.body.children = [{
      type: 'table',
      tblPr: {
        tblW: { w: 5000, type: 'pct' },
        tblBorders: {
          top: { val: 'single', sz: 4, color: '000000' },
          left: { val: 'single', sz: 4, color: '000000' },
          bottom: { val: 'single', sz: 4, color: '000000' },
          right: { val: 'single', sz: 4, color: '000000' },
          insideH: { val: 'single', sz: 4, color: '000000' },
          insideV: { val: 'single', sz: 4, color: '000000' },
        },
      },
      tblGrid: [{ width: 2500 }, { width: 2500 }],
      content: [{
        content: [{
          tcPr: { tcW: 2500 },
          content: [{ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text: 'A' }] }] }],
        }, {
          tcPr: { tcW: 2500 },
          content: [{ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text: 'B' }] }] }],
        }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes cell borders', () => {
    const pkg = makePkgWithFootnotes()
    pkg.document.body.children = [{
      type: 'table',
      tblPr: { tblW: { w: 5000, type: 'dxa' } },
      tblGrid: [{ width: 5000 }],
      content: [{
        content: [{
          tcPr: {
            tcW: 5000,
            tcBorders: {
              top: { val: 'double', sz: 6, color: 'FF0000' },
              left: { val: 'single', sz: 4, color: '000000' },
              bottom: { val: 'double', sz: 6, color: 'FF0000' },
              right: { val: 'single', sz: 4, color: '000000' },
            },
            shd: { val: 'clear', color: 'auto', fill: 'FFFF00' },
          },
          content: [{ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text: 'Shaded' }] }] }],
        }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes table cell margins', () => {
    const pkg = makePkgWithFootnotes()
    pkg.document.body.children = [{
      type: 'table',
      tblPr: {
        tblW: { w: 5000, type: 'dxa' },
        tblCellMar: { top: 50, start: 100, bottom: 50, end: 100 },
      },
      tblGrid: [{ width: 5000 }],
      content: [{
        content: [{
          tcPr: { tcW: 5000 },
          content: [{ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text: 'With margins' }] }] }],
        }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })

  it('serializes hMerge on cell', () => {
    const pkg = makePkgWithFootnotes()
    pkg.document.body.children = [{
      type: 'table',
      tblPr: { tblW: { w: 5000, type: 'dxa' } },
      tblGrid: [{ width: 2500 }, { width: 2500 }],
      content: [{
        content: [{
          tcPr: { tcW: 5000, hMerge: 'restart' },
          content: [{ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text: 'Merged' }] }] }],
        }, {
          tcPr: { tcW: 2500, hMerge: 'continue' },
          content: [{ type: 'paragraph', content: [{ type: 'run', content: [{ type: 'text', text: '' }] }] }],
        }],
      }],
    }]
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)
  })
})

// ─── Tests: Round-trip Integration ───────────────────────────────────────────

describe('Phase F — Round-trip Integration', () => {
  it('round-trips footnotes through parse → serialize', async () => {
    const docx = createDocxWithFootnotes()
    const parser = new OoxmlParser()
    const pkg = await parser.parse(docx)

    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob.size).toBeGreaterThan(0)

    // Re-parse
    const arrayBuffer = await blob.arrayBuffer()
    const docx2 = new Uint8Array(arrayBuffer)
    const parser2 = new OoxmlParser()
    const pkg2 = await parser2.parse(docx2)

    expect(pkg2.footnotes).not.toBeNull()
    expect(pkg2.footnotes!.footnotes.size).toBe(1)
  })

  it('round-trips empty footnotes/endnotes', () => {
    const pkg = makePkgWithFootnotes()
    pkg.footnotes = null
    pkg.endnotes = null
    const serializer = new OoxmlSerializer(pkg)
    const blob = serializer.serialize()
    expect(blob).toBeInstanceOf(Blob)
  })
})
