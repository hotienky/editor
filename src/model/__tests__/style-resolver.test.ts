import { describe, expect, it } from 'vitest'
import { StyleResolver } from '../style-resolver'
import type { StylesPart, ThemePart, ParagraphProperties, RunProperties } from '../ooxml-types'

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const createBaseStylesPart = (overrides?: Partial<StylesPart>): StylesPart => ({
  docDefaults: {
    rPrDefault: {
      rFonts: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: 'SimSun' },
      sz: 24, // 12pt
      color: '000000',
    },
    pPrDefault: {
      spacing: { after: 0, line: 240 },
    },
  },
  styles: new Map(),
  ...overrides,
})

const createTheme = (overrides?: Partial<ThemePart>): ThemePart => ({
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
        eastAsia: { typeface: '微软雅黑' },
      },
      minorFont: {
        latin: { typeface: 'Calibri' },
        eastAsia: { typeface: '微软雅黑' },
      },
    },
    fmtScheme: { name: 'Office' },
  },
  ...overrides,
})

// ─── Tests: Paragraph Style Cascade ─────────────────────────────────────────

describe('StyleResolver — paragraph styles', () => {
  it('resolves docDefaults when no style specified', () => {
    const stylesPart = createBaseStylesPart()
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveParagraph(undefined)

    expect(result.pPr.spacing?.after).toBe(0)
    expect(result.rPr.rFonts?.ascii).toBe('Times New Roman')
    expect(result.rPr.sz).toBe(24)
  })

  it('resolves paragraph style with basedOn chain', () => {
    const styles = new Map<string, any>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      pPr: { spacing: { after: 200, line: 276 } },
      rPr: { rFonts: { ascii: 'Calibri', hAnsi: 'Calibri' }, sz: 22 },
    })
    styles.set('Heading1', {
      id: 'Heading1',
      type: 'paragraph',
      basedOn: 'Normal',
      pPr: { spacing: { before: 480, after: 0 }, outlineLevel: 0 },
      rPr: { b: true, sz: 44, color: '2F5496' },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveParagraph('Heading1')

    // From Normal (via basedOn)
    expect(result.pPr.spacing?.after).toBe(0)  // overridden by Heading1
    expect(result.pPr.spacing?.line).toBe(276)  // inherited from Normal
    expect(result.rPr.rFonts?.ascii).toBe('Calibri')  // from Normal
    expect(result.rPr.sz).toBe(44)  // overridden by Heading1

    // From Heading1
    expect(result.pPr.spacing?.before).toBe(480)
    expect(result.pPr.outlineLevel).toBe(0)
    expect(result.rPr.b).toBe(true)
    expect(result.rPr.color).toBe('2F5496')
  })

  it('handles circular basedOn without infinite loop', () => {
    const styles = new Map<string, any>()
    styles.set('StyleA', {
      id: 'StyleA',
      type: 'paragraph',
      basedOn: 'StyleB',
      pPr: { spacing: { after: 100 } },
    })
    styles.set('StyleB', {
      id: 'StyleB',
      type: 'paragraph',
      basedOn: 'StyleA',
      pPr: { spacing: { after: 200 } },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    // Should not throw, should resolve to one of them
    const result = resolver.resolveParagraph('StyleA')
    expect(result.pPr.spacing).toBeDefined()
  })

  it('direct formatting overrides style properties', () => {
    const styles = new Map<string, any>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      pPr: { spacing: { after: 200 } },
      rPr: { b: false },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const directPPr: ParagraphProperties = {
      spacing: { after: 400 },
      jc: 'center',
    }

    const result = resolver.resolveParagraph('Normal', directPPr)

    // Direct formatting wins
    expect(result.pPr.spacing?.after).toBe(400)
    expect(result.pPr.jc).toBe('center')
  })

  it('merges tab stops by position', () => {
    const styles = new Map<string, any>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      pPr: {
        tabs: [
          { val: 'left', pos: 720 },
          { val: 'left', pos: 1440 },
        ],
      },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const directPPr: ParagraphProperties = {
      tabs: [
        { val: 'right', pos: 720 },  // Override existing tab at 720
        { val: 'clear', pos: 2160 },  // Clear tab at 2160 (should be removed)
      ],
    }

    const result = resolver.resolveParagraph('Normal', directPPr)

    expect(result.pPr.tabs).toHaveLength(2)
    expect(result.pPr.tabs![0].pos).toBe(720)
    expect(result.pPr.tabs![0].val).toBe('right')  // overridden
    expect(result.pPr.tabs![1].pos).toBe(1440)  // inherited
  })
})

// ─── Tests: Character Style Resolution ──────────────────────────────────────

describe('StyleResolver — character styles', () => {
  it('resolves character style with rStyle reference', () => {
    const styles = new Map<string, any>()
    styles.set('Hyperlink', {
      id: 'Hyperlink',
      type: 'character',
      rPr: {
        color: '0563C1',
        u: 'single',
      },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveCharacter('Hyperlink')

    expect(result.color).toBe('0563C1')
    expect(result.u).toBe('single')
  })

  it('resolves character style with basedOn chain', () => {
    const styles = new Map<string, any>()
    styles.set('Strong', {
      id: 'Strong',
      type: 'character',
      rPr: { b: true },
    })
    styles.set('IntenseReference', {
      id: 'IntenseReference',
      type: 'character',
      basedOn: 'Strong',
      rPr: { color: 'C00000', i: true },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveCharacter('IntenseReference')

    // From Strong (via basedOn)
    expect(result.b).toBe(true)

    // From IntenseReference
    expect(result.color).toBe('C00000')
    expect(result.i).toBe(true)
  })

  it('direct rPr overrides character style', () => {
    const styles = new Map<string, any>()
    styles.set('Hyperlink', {
      id: 'Hyperlink',
      type: 'character',
      rPr: { color: '0563C1', u: 'single' },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const directRPr: RunProperties = {
      color: 'FF0000',  // Override hyperlink color
    }

    const result = resolver.resolveCharacter('Hyperlink', directRPr)

    expect(result.color).toBe('FF0000')  // direct wins
    expect(result.u).toBe('single')       // inherited from style
  })

  it('merges rFonts from character style', () => {
    const styles = new Map<string, any>()
    styles.set('Code', {
      id: 'Code',
      type: 'character',
      rPr: { rFonts: { ascii: 'Consolas', hAnsi: 'Consolas' }, sz: 20 },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const directRPr: RunProperties = {
      rFonts: { eastAsia: 'SimSun' },  // Add eastAsia font
    }

    const result = resolver.resolveCharacter('Code', directRPr)

    expect(result.rFonts?.ascii).toBe('Consolas')  // from style
    expect(result.rFonts?.hAnsi).toBe('Consolas')  // from style
    expect(result.rFonts?.eastAsia).toBe('SimSun')  // from direct
    expect(result.sz).toBe(20)  // from style
  })
})

// ─── Tests: Theme Font Resolution ───────────────────────────────────────────

describe('StyleResolver — theme fonts', () => {
  it('resolves majorHAnsi theme font reference', () => {
    const styles = new Map<string, any>()
    styles.set('Heading1', {
      id: 'Heading1',
      type: 'paragraph',
      rPr: {
        rFonts: { ascii: 'majorHAnsi', hAnsi: 'majorHAnsi' },
      },
    })

    const theme = createTheme()
    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart, theme)

    const result = resolver.resolveParagraph('Heading1')

    expect(result.rPr.rFonts?.ascii).toBe('Calibri Light')
    expect(result.rPr.rFonts?.hAnsi).toBe('Calibri Light')
  })

  it('resolves minorHAnsi theme font reference', () => {
    const styles = new Map<string, any>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      rPr: {
        rFonts: { ascii: 'minorHAnsi', hAnsi: 'minorHAnsi' },
      },
    })

    const theme = createTheme()
    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart, theme)

    const result = resolver.resolveParagraph('Normal')

    expect(result.rPr.rFonts?.ascii).toBe('Calibri')
    expect(result.rPr.rFonts?.hAnsi).toBe('Calibri')
  })

  it('resolves eastAsia theme font references', () => {
    const styles = new Map<string, any>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      rPr: {
        rFonts: { eastAsia: 'minorEastAsia' },
      },
    })

    const theme = createTheme()
    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart, theme)

    const result = resolver.resolveParagraph('Normal')

    expect(result.rPr.rFonts?.eastAsia).toBe('微软雅黑')
  })

  it('resolves theme fonts in direct formatting', () => {
    const theme = createTheme()
    const stylesPart = createBaseStylesPart()
    const resolver = new StyleResolver(stylesPart, theme)

    const directRPr: RunProperties = {
      rFonts: { ascii: 'majorHAnsi', hAnsi: 'majorHAnsi' },
    }

    const result = resolver.resolveCharacter(undefined, directRPr)

    expect(result.rFonts?.ascii).toBe('Calibri Light')
    expect(result.rFonts?.hAnsi).toBe('Calibri Light')
  })

  it('returns original font name when theme not available', () => {
    const stylesPart = createBaseStylesPart()
    const resolver = new StyleResolver(stylesPart, null)

    const result = resolver.resolveCharacter(undefined, {
      rFonts: { ascii: 'majorHAnsi' },
    })

    expect(result.rFonts?.ascii).toBe('majorHAnsi')  // unchanged
  })

  it('returns original font name when theme has no font scheme', () => {
    const theme: ThemePart = {
      themeElements: {
        clrScheme: { name: 'Office' },
        fontScheme: { name: 'Office', majorFont: {} as any, minorFont: {} as any },
        fmtScheme: { name: 'Office' },
      },
    }

    const stylesPart = createBaseStylesPart()
    const resolver = new StyleResolver(stylesPart, theme)

    const result = resolver.resolveCharacter(undefined, {
      rFonts: { ascii: 'majorHAnsi' },
    })

    expect(result.rFonts?.ascii).toBe('majorHAnsi')  // unchanged (no typeface defined)
  })
})

// ─── Tests: Table Style Resolution ──────────────────────────────────────────

describe('StyleResolver — table styles', () => {
  it('resolves table style with tblPr', () => {
    const styles = new Map<string, any>()
    styles.set('TableGrid', {
      id: 'TableGrid',
      type: 'table',
      tblPr: {
        tblW: { w: 0, type: 'auto' },
        tblBorders: {
          top: { val: 'single', sz: 4, color: 'auto' },
          bottom: { val: 'single', sz: 4, color: 'auto' },
        },
      },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveTable('TableGrid')

    expect(result.tblPr?.tblW?.type).toBe('auto')
    expect(result.tblPr?.tblBorders?.top?.val).toBe('single')
  })

  it('resolves table style with basedOn', () => {
    const styles = new Map<string, any>()
    styles.set('TableNormal', {
      id: 'TableNormal',
      type: 'table',
      tblPr: {
        tblCellMar: { top: 0, start: 0, bottom: 0, end: 0 },
      },
    })
    styles.set('TableGrid', {
      id: 'TableGrid',
      type: 'table',
      basedOn: 'TableNormal',
      tblPr: {
        tblBorders: {
          top: { val: 'single', sz: 4, color: 'auto' },
        },
      },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveTable('TableGrid')

    // From TableNormal (via basedOn)
    expect(result.tblPr?.tblCellMar?.top).toBe(0)

    // From TableGrid
    expect(result.tblPr?.tblBorders?.top?.val).toBe('single')
  })

  it('direct tblPr overrides table style', () => {
    const styles = new Map<string, any>()
    styles.set('TableGrid', {
      id: 'TableGrid',
      type: 'table',
      tblPr: {
        tblW: { w: 0, type: 'auto' },
      },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result = resolver.resolveTable('TableGrid', {
      tblW: { w: 5000, type: 'dxa' },
    })

    expect(result.tblPr?.tblW?.w).toBe(5000)  // direct wins
    expect(result.tblPr?.tblW?.type).toBe('dxa')
  })
})

// ─── Tests: Caching ─────────────────────────────────────────────────────────

describe('StyleResolver — caching', () => {
  it('caches resolved paragraph styles', () => {
    const styles = new Map<string, any>()
    styles.set('Normal', {
      id: 'Normal',
      type: 'paragraph',
      pPr: { spacing: { after: 200 } },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result1 = resolver.resolveParagraph('Normal')
    const result2 = resolver.resolveParagraph('Normal')

    // Should return equivalent objects (style resolved from cache)
    expect(result1).toStrictEqual(result2)
  })

  it('caches resolved character styles', () => {
    const styles = new Map<string, any>()
    styles.set('Hyperlink', {
      id: 'Hyperlink',
      type: 'character',
      rPr: { color: '0563C1' },
    })

    const stylesPart = createBaseStylesPart({ styles })
    const resolver = new StyleResolver(stylesPart)

    const result1 = resolver.resolveCharacter('Hyperlink')
    const result2 = resolver.resolveCharacter('Hyperlink')

    expect(result1).toStrictEqual(result2)
  })
})
