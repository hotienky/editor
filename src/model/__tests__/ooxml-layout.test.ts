import { describe, expect, it } from 'vitest'
import { OoxmlTextMeasurer, resolveFontFamily, buildFontString } from '../ooxml-text-measurer'
import {
  breakIntoLines,
  isCJK,
  isSpace,
  isHyphen,
  flattenFragments,
} from '../ooxml-line-breaker'
import { OoxmlLayoutEngine } from '../ooxml-layout-engine'
import type { TextFragment } from '../ooxml-layout-types'
import type { ThemePart } from '../ooxml-types'
import type { OoxmlPackage } from '../ooxml-types'

// ─── Test Theme Fixture ──────────────────────────────────────────────────────

const testTheme: ThemePart = {
  themeElements: {
    clrScheme: {
      name: 'Office',
      dark1: '000000',
      light1: 'FFFFFF',
      dark2: '44546A',
      light2: 'E7E6E6',
      accent1: '4472C4',
      accent2: 'ED7D31',
      accent3: 'A5A5A5',
      accent4: 'FFC000',
      accent5: '5B9BD5',
      accent6: '70AD47',
      hyperlink: '0563C1',
      followedHyperlink: '954F72',
    },
    fontScheme: {
      name: 'Office',
      majorFont: {
        latin: { typeface: 'Calibri Light' },
        eastAsia: { typeface: 'Microsoft YaHei' },
      },
      minorFont: {
        latin: { typeface: 'Calibri' },
        eastAsia: { typeface: 'Microsoft YaHei' },
      },
    },
    fmtScheme: { name: 'Office' },
  },
}

// ─── Tests: Font Resolution ───────────────────────────────────────────────────

describe('resolveFontFamily', () => {
  it('resolves direct font', () => {
    const result = resolveFontFamily(
      { ascii: 'Arial', hAnsi: 'Arial' },
      undefined,
    )
    expect(result).toBe('Arial')
  })

  it('resolves from hAnsi when ascii missing', () => {
    const result = resolveFontFamily({ hAnsi: 'Helvetica' }, undefined)
    expect(result).toBe('Helvetica')
  })

  it('resolves eastAsia font', () => {
    const result = resolveFontFamily(
      { ascii: 'Arial', eastAsia: 'SimSun' },
      undefined,
      'eastAsia',
    )
    expect(result).toBe('SimSun')
  })

  it('falls back to theme font', () => {
    const result = resolveFontFamily(undefined, testTheme)
    expect(result).toBe('Calibri')
  })

  it('falls back to system default', () => {
    const result = resolveFontFamily(undefined, undefined)
    expect(result).toBe('Times New Roman')
  })

  it('falls back to system default for eastAsia', () => {
    const result = resolveFontFamily(undefined, undefined, 'eastAsia')
    expect(result).toBe('SimSun')
  })
})

describe('buildFontString', () => {
  it('builds basic font string', () => {
    expect(buildFontString('Arial', 24)).toBe('12pt "Arial"')
  })

  it('builds bold font string', () => {
    expect(buildFontString('Arial', 24, true)).toBe('bold 12pt "Arial"')
  })

  it('builds italic font string', () => {
    expect(buildFontString('Arial', 24, false, true)).toBe('italic 12pt "Arial"')
  })

  it('builds bold italic font string', () => {
    expect(buildFontString('Arial', 24, true, true)).toBe('italic bold 12pt "Arial"')
  })
})

// ─── Tests: Text Measurer ─────────────────────────────────────────────────────

describe('OoxmlTextMeasurer', () => {
  it('creates measurer', () => {
    const measurer = new OoxmlTextMeasurer()
    expect(measurer).toBeDefined()
  })

  it('measures a text run', () => {
    const measurer = new OoxmlTextMeasurer()
    const fragment = measurer.measureRun(
      'Hello World',
      { sz: 24 }, // 12pt
      testTheme,
    )

    expect(fragment.text).toBe('Hello World')
    expect(fragment.sz).toBe(24)
    expect(fragment.width).toBeGreaterThan(0)
    expect(fragment.widthPx).toBeGreaterThan(0)
    expect(fragment.fontFamily).toBe('Calibri')
  })

  it('measures with bold', () => {
    const measurer = new OoxmlTextMeasurer()
    const fragment = measurer.measureRun(
      'Bold',
      { sz: 24, b: true },
      testTheme,
    )

    expect(fragment.bold).toBe(true)
  })

  it('measures with italic', () => {
    const measurer = new OoxmlTextMeasurer()
    const fragment = measurer.measureRun(
      'Italic',
      { sz: 24, i: true },
      testTheme,
    )

    expect(fragment.italic).toBe(true)
  })

  it('uses default sz when not provided', () => {
    const measurer = new OoxmlTextMeasurer()
    const fragment = measurer.measureRun('Text', undefined, testTheme)

    expect(fragment.sz).toBe(24) // default 12pt
  })

  it('clears cache', () => {
    const measurer = new OoxmlTextMeasurer()
    measurer.measureRun('Test', undefined, testTheme)
    measurer.clearCache()
    // No error should occur
  })
})

// ─── Tests: Unicode Detection ─────────────────────────────────────────────────

describe('isCJK', () => {
  it('detects CJK characters', () => {
    expect(isCJK(0x4e2d)).toBe(true) // 中
    expect(isCJK(0x3042)).toBe(true) // あ (Hiragana)
    expect(isCJK(0x30a2)).toBe(true) // ア (Katakana)
    expect(isCJK(0xac00)).toBe(true) // 가 (Hangul)
  })

  it('rejects non-CJK characters', () => {
    expect(isCJK(0x0041)).toBe(false) // A
    expect(isCJK(0x0030)).toBe(false) // 0
    expect(isCJK(0x0020)).toBe(false) // space
  })
})

describe('isSpace', () => {
  it('detects spaces', () => {
    expect(isSpace(0x0020)).toBe(true)
    expect(isSpace(0x00a0)).toBe(true)
    expect(isSpace(0x2009)).toBe(true)
  })

  it('rejects non-spaces', () => {
    expect(isSpace(0x0041)).toBe(false)
    expect(isSpace(0x000d)).toBe(false)
  })
})

describe('isHyphen', () => {
  it('detects hyphens', () => {
    expect(isHyphen(0x002d)).toBe(true) // -
    expect(isHyphen(0x2010)).toBe(true) // ‐
    expect(isHyphen(0x2013)).toBe(true) // –
    expect(isHyphen(0x2014)).toBe(true) // —
  })

  it('rejects non-hyphens', () => {
    expect(isHyphen(0x0041)).toBe(false)
    expect(isHyphen(0x0020)).toBe(false)
  })
})

// ─── Tests: Fragment Flattening ───────────────────────────────────────────────

describe('flattenFragments', () => {
  it('flattens fragments into character stream', () => {
    const fragments: TextFragment[] = [
      {
        text: 'Hi',
        width: 100,
        widthPx: 10,
        sz: 24,
        fontFamily: 'Arial',
      },
      {
        text: ' There',
        width: 300,
        widthPx: 30,
        sz: 24,
        fontFamily: 'Arial',
      },
    ]

    const chars = flattenFragments(fragments)
    expect(chars).toHaveLength(8) // "Hi There"
    expect(chars[0].char).toBe('H')
    expect(chars[0].runIndex).toBe(0)
    expect(chars[2].char).toBe(' ')
    expect(chars[2].runIndex).toBe(1)
  })
})

// ─── Tests: Line Breaking ─────────────────────────────────────────────────────

describe('breakIntoLines', () => {
  it('returns empty for empty input', () => {
    const result = breakIntoLines({
      fragments: [],
      availableWidth: 10000,
    })
    expect(result.lines).toHaveLength(0)
  })

  it('breaks text at spaces', () => {
    const fragments: TextFragment[] = [
      {
        text: 'Hello World Foo Bar',
        width: 900,
        widthPx: 90,
        sz: 24,
        fontFamily: 'Arial',
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 500,
    })

    // Should break into multiple lines
    expect(result.lines.length).toBeGreaterThanOrEqual(2)
  })

  it('breaks long words at character boundaries', () => {
    const fragments: TextFragment[] = [
      {
        text: 'VeryLongWord',
        width: 720,
        widthPx: 72,
        sz: 24,
        fontFamily: 'Arial',
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 400,
    })

    // 720 twips / 400 per line = 2 lines
    expect(result.lines.length).toBeGreaterThanOrEqual(2)
  })

  it('breaks CJK text at character boundaries', () => {
    const fragments: TextFragment[] = [
      {
        text: '中文文字测试',
        width: 600,
        widthPx: 60,
        sz: 24,
        fontFamily: 'SimSun',
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 300,
    })

    // CJK should break at character boundaries
    expect(result.lines.length).toBeGreaterThanOrEqual(2)
  })

  it('does not justify last line', () => {
    const fragments: TextFragment[] = [
      {
        text: 'short',
        width: 300,
        widthPx: 30,
        sz: 24,
        fontFamily: 'Arial',
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 1000,
      justify: true,
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].justified).toBe(false)
  })

  it('justifies lines when requested', () => {
    const fragments: TextFragment[] = [
      {
        text: 'Hello World',
        width: 550,
        widthPx: 55,
        sz: 24,
        fontFamily: 'Arial',
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 1000,
      justify: true,
    })

    expect(result.lines.length).toBeGreaterThanOrEqual(1)
    // If there are multiple lines, the first should be justified
    if (result.lines.length > 1) {
      expect(result.lines[0].justified).toBe(true)
      expect(result.lines[0].justifyGap).toBeGreaterThan(0)
    }
  })

  it('handles single empty fragment', () => {
    const fragments: TextFragment[] = [
      {
        text: '',
        width: 0,
        widthPx: 0,
        sz: 24,
        fontFamily: 'Arial',
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 1000,
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].width).toBe(0)
  })

  it('preserves run information in fragments', () => {
    const fragments: TextFragment[] = [
      {
        text: 'Hello ',
        width: 300,
        widthPx: 30,
        sz: 24,
        fontFamily: 'Arial',
        bold: true,
      },
      {
        text: 'World',
        width: 300,
        widthPx: 30,
        sz: 24,
        fontFamily: 'Arial',
        italic: true,
      },
    ]

    const result = breakIntoLines({
      fragments,
      availableWidth: 10000, // no breaking needed
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].fragments).toHaveLength(2)
    expect(result.lines[0].fragments[0].bold).toBe(true)
    expect(result.lines[0].fragments[1].italic).toBe(true)
  })
})

// ─── Tests: Layout Engine ─────────────────────────────────────────────────────

const createMinimalPkg = (overrides?: Partial<OoxmlPackage>): OoxmlPackage => ({
  document: {
    body: {
      children: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'run',
              content: [{ type: 'text', text: 'Hello World' }],
            },
          ],
        },
      ],
    },
  },
  styles: {
    docDefaults: {
      rPrDefault: { rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman' } },
      pPrDefault: {},
    },
    styles: new Map(),
  },
  numbering: {
    abstractNums: new Map(),
    nums: new Map(),
  },
  settings: {},
  fontTable: { fonts: new Map() },
  theme: testTheme,
  headers: new Map(),
  footers: new Map(),
  comments: null,
  footnotes: null,
  endnotes: null,
  contentTypes: { defaults: new Map(), overrides: new Map() },
  relationships: [],
  media: new Map(),
  ...overrides,
})

describe('OoxmlLayoutEngine', () => {
  it('creates engine', () => {
    const engine = new OoxmlLayoutEngine()
    expect(engine).toBeDefined()
  })

  it('layouts a simple document', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createMinimalPkg()
    const tree = engine.layout(pkg)

    expect(tree.totalPages).toBeGreaterThanOrEqual(1)
    expect(tree.pages).toHaveLength(tree.totalPages)
    expect(tree.allBlocks.length).toBeGreaterThan(0)
  })

  it('layouts multiple paragraphs', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createMinimalPkg({
      document: {
        body: {
          children: [
            {
              type: 'paragraph',
              content: [{ type: 'run', content: [{ type: 'text', text: 'Para 1' }] }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'run', content: [{ type: 'text', text: 'Para 2' }] }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'run', content: [{ type: 'text', text: 'Para 3' }] }],
            },
          ],
        },
      },
    })
    const tree = engine.layout(pkg)

    expect(tree.allBlocks).toHaveLength(3)
  })

  it('handles section properties', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createMinimalPkg({
      document: {
        body: {
          children: [
            {
              type: 'paragraph',
              content: [{ type: 'run', content: [{ type: 'text', text: 'Content' }] }],
            },
          ],
          sectPr: {
            pgSz: { w: 12240, h: 15840 },
            pgMar: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 720, footer: 720, gutter: 0 },
          },
        },
      },
    })
    const tree = engine.layout(pkg)

    expect(tree.pages[0].geometry.pageW).toBe(12240)
    expect(tree.pages[0].geometry.pageH).toBe(15840)
  })

  it('handles tables', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createMinimalPkg({
      document: {
        body: {
          children: [
            {
              type: 'table',
              tblGrid: [{ width: 4000 }, { width: 4000 }],
              content: [
                {
                  content: [
                    {
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'run', content: [{ type: 'text', text: 'Cell 1' }] }],
                        },
                      ],
                    },
                    {
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'run', content: [{ type: 'text', text: 'Cell 2' }] }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    })
    const tree = engine.layout(pkg)

    expect(tree.allBlocks).toHaveLength(1)
    expect(tree.allBlocks[0].type).toBe('table')
  })

  it('handles empty document', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createMinimalPkg({
      document: {
        body: {
          children: [],
        },
      },
    })
    const tree = engine.layout(pkg)

    expect(tree.totalPages).toBe(0)
    expect(tree.pages).toHaveLength(0)
  })

  it('handles multiple sections', () => {
    const engine = new OoxmlLayoutEngine()
    const pkg = createMinimalPkg({
      document: {
        body: {
          children: [
            {
              type: 'paragraph',
              pPr: {
                sectPr: {
                  pgSz: { w: 12240, h: 15840 },
                  pgMar: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 720, footer: 720, gutter: 0 },
                },
              },
              content: [{ type: 'run', content: [{ type: 'text', text: 'Section 1' }] }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'run', content: [{ type: 'text', text: 'Section 2' }] }],
            },
          ],
          sectPr: {
            pgSz: { w: 12240, h: 15840 },
            pgMar: { top: 720, bottom: 720, left: 720, right: 720, header: 360, footer: 360, gutter: 0 },
          },
        },
      },
    })
    const tree = engine.layout(pkg)

    expect(tree.totalPages).toBeGreaterThanOrEqual(2)
  })
})
