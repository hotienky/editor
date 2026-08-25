/**
 * OOXML Style Resolver
 *
 * Resolves the full OOXML style cascade:
 *   docDefaults → basedOn chain → style properties → direct formatting
 *
 * Supports:
 *   - Paragraph styles with basedOn inheritance (cycle detection)
 *   - Character styles (w:rStyle) — previously missing
 *   - Table styles (w:tblStyle) — previously missing
 *   - Theme font resolution (majorHAnsi, minorEastAsia) — previously missing
 */

import type {
  OoxmlPackage,
  StylesPart,
  StyleDefinition,
  StyleType,
  DocDefaults,
  ParagraphProperties,
  RunProperties,
  RunFonts,
  TableProperties,
  ThemePart,
  ColorScheme,
} from './ooxml-types'

// ─── Resolved Styles ────────────────────────────────────────────────────────

export interface ResolvedParagraphStyle {
  pPr: ParagraphProperties
  rPr: RunProperties        // default run properties from paragraph style
}

export interface ResolvedCharacterStyle {
  rPr: RunProperties
}

export interface ResolvedTableStyle {
  tblPr?: TableProperties
  pPr?: ParagraphProperties
  rPr?: RunProperties
}

// ─── Style Resolver ─────────────────────────────────────────────────────────

export class StyleResolver {
  private _stylesPart: StylesPart
  private _theme: ThemePart | null

  // Cache resolved styles to avoid recomputation
  private _resolvedParagraphStyles: Map<string, ResolvedParagraphStyle>
  private _resolvedCharacterStyles: Map<string, ResolvedCharacterStyle>
  private _resolvedTableStyles: Map<string, ResolvedTableStyle>

  constructor(stylesPart: StylesPart, theme: ThemePart | null = null) {
    this._stylesPart = stylesPart
    this._theme = theme
    this._resolvedParagraphStyles = new Map()
    this._resolvedCharacterStyles = new Map()
    this._resolvedTableStyles = new Map()
  }

  /**
   * Resolve paragraph properties for a paragraph.
   *
   * Cascade: docDefaults → basedOn chain → style pPr → direct pPr
   *
   * @param pStyleId - Style ID from w:pPr/w:pStyle
   * @param directPPr - Direct paragraph properties from the paragraph
   * @returns Resolved paragraph properties
   */
  resolveParagraph(
    pStyleId: string | undefined,
    directPPr?: ParagraphProperties,
  ): ResolvedParagraphStyle {
    // 1. Start with docDefaults
    const result: ResolvedParagraphStyle = {
      pPr: { ...this._stylesPart.docDefaults.pPrDefault },
      rPr: { ...this._stylesPart.docDefaults.rPrDefault },
    }

    // 2. Resolve style cascade (if style ID provided)
    if (pStyleId) {
      const styleOverride = this._resolveParagraphStyle(pStyleId)
      if (styleOverride) {
        this._mergeParagraphProperties(result.pPr, styleOverride.pPr)
        this._mergeRunProperties(result.rPr, styleOverride.rPr)
      }
    }

    // 3. Apply direct formatting (highest priority)
    if (directPPr) {
      const { rPr: directRPr, ...directPPrWithoutRPr } = directPPr
      this._mergeParagraphProperties(result.pPr, directPPrWithoutRPr)
      if (directRPr) {
        this._mergeRunProperties(result.rPr, directRPr)
      }
    }

    // 4. Resolve theme fonts in the final run properties
    if (result.rPr.rFonts) {
      result.rPr.rFonts = this._resolveThemeFonts(result.rPr.rFonts)
    }

    return result
  }

  /**
   * Resolve character properties for a run.
   *
   * Cascade: docDefaults → character style → direct rPr
   *
   * @param rStyleId - Style ID from w:rPr/w:rStyle
   * @param directRPr - Direct run properties from the run
   * @returns Resolved run properties
   */
  resolveCharacter(
    rStyleId: string | undefined,
    directRPr?: RunProperties,
  ): RunProperties {
    // 1. Start with docDefaults
    const result: RunProperties = { ...this._stylesPart.docDefaults.rPrDefault }

    // 2. Resolve character style (if provided)
    if (rStyleId) {
      const styleOverride = this._resolveCharacterStyle(rStyleId)
      if (styleOverride) {
        this._mergeRunProperties(result, styleOverride.rPr)
      }
    }

    // 3. Apply direct formatting (highest priority)
    if (directRPr) {
      this._mergeRunProperties(result, directRPr)
    }

    // 4. Resolve theme fonts
    if (result.rFonts) {
      result.rFonts = this._resolveThemeFonts(result.rFonts)
    }

    return result
  }

  /**
   * Resolve table properties for a table.
   *
   * Cascade: docDefaults → table style → direct tblPr
   *
   * @param tblStyleId - Style ID from w:tblPr/w:tblStyle
   * @param directTblPr - Direct table properties
   * @returns Resolved table properties
   */
  resolveTable(
    tblStyleId: string | undefined,
    directTblPr?: TableProperties,
  ): ResolvedTableStyle {
    // 1. Start with defaults
    const result: ResolvedTableStyle = {}

    // 2. Resolve table style (if provided)
    if (tblStyleId) {
      const styleOverride = this._resolveTableStyle(tblStyleId)
      if (styleOverride) {
        if (styleOverride.tblPr) {
          result.tblPr = { ...styleOverride.tblPr }
        }
        if (styleOverride.pPr) {
          result.pPr = { ...styleOverride.pPr }
        }
        if (styleOverride.rPr) {
          result.rPr = { ...styleOverride.rPr }
        }
      }
    }

    // 3. Apply direct formatting
    if (directTblPr) {
      if (!result.tblPr) result.tblPr = {}
      Object.assign(result.tblPr, directTblPr)
    }

    return result
  }

  // ─── Internal: Paragraph Style Resolution ───────────────────────────────

  private _resolveParagraphStyle(styleId: string): ResolvedParagraphStyle | undefined {
    // Check cache
    if (this._resolvedParagraphStyles.has(styleId)) {
      return this._resolvedParagraphStyles.get(styleId)
    }

    const styleDef = this._stylesPart.styles.get(styleId)
    if (!styleDef) return undefined

    // Detect circular basedOn (cycle detection)
    const chain = new Set<string>()
    chain.add(styleId)

    // Build the resolved style by following basedOn chain
    const resolved: ResolvedParagraphStyle = {
      pPr: {},
      rPr: {},
    }

    let current: StyleDefinition | undefined = styleDef
    const inheritanceChain: StyleDefinition[] = []

    // Walk the basedOn chain
    while (current) {
      inheritanceChain.push(current)
      if (current.basedOn && !chain.has(current.basedOn)) {
        chain.add(current.basedOn)
        current = this._stylesPart.styles.get(current.basedOn)
      } else {
        break
      }
    }

    // Apply in reverse order (base first, then override)
    for (let i = inheritanceChain.length - 1; i >= 0; i--) {
      const s = inheritanceChain[i]
      if (s.pPr) {
        this._mergeParagraphProperties(resolved.pPr, s.pPr)
      }
      if (s.rPr) {
        this._mergeRunProperties(resolved.rPr, s.rPr)
      }
    }

    // Cache result
    this._resolvedParagraphStyles.set(styleId, resolved)
    return resolved
  }

  // ─── Internal: Character Style Resolution ───────────────────────────────

  private _resolveCharacterStyle(styleId: string): ResolvedCharacterStyle | undefined {
    // Check cache
    if (this._resolvedCharacterStyles.has(styleId)) {
      return this._resolvedCharacterStyles.get(styleId)
    }

    const styleDef = this._stylesPart.styles.get(styleId)
    if (!styleDef) return undefined

    // Detect circular basedOn
    const chain = new Set<string>()
    chain.add(styleId)

    const resolved: ResolvedCharacterStyle = { rPr: {} }

    let current: StyleDefinition | undefined = styleDef
    const inheritanceChain: StyleDefinition[] = []

    while (current) {
      inheritanceChain.push(current)
      if (current.basedOn && !chain.has(current.basedOn)) {
        chain.add(current.basedOn)
        current = this._stylesPart.styles.get(current.basedOn)
      } else {
        break
      }
    }

    // Apply in reverse order (base first, then override)
    for (let i = inheritanceChain.length - 1; i >= 0; i--) {
      const s = inheritanceChain[i]
      if (s.rPr) {
        this._mergeRunProperties(resolved.rPr, s.rPr)
      }
    }

    // Cache result
    this._resolvedCharacterStyles.set(styleId, resolved)
    return resolved
  }

  // ─── Internal: Table Style Resolution ───────────────────────────────────

  private _resolveTableStyle(styleId: string): ResolvedTableStyle | undefined {
    // Check cache
    if (this._resolvedTableStyles.has(styleId)) {
      return this._resolvedTableStyles.get(styleId)
    }

    const styleDef = this._stylesPart.styles.get(styleId)
    if (!styleDef) return undefined

    // Detect circular basedOn
    const chain = new Set<string>()
    chain.add(styleId)

    const resolved: ResolvedTableStyle = {}

    let current: StyleDefinition | undefined = styleDef
    const inheritanceChain: StyleDefinition[] = []

    while (current) {
      inheritanceChain.push(current)
      if (current.basedOn && !chain.has(current.basedOn)) {
        chain.add(current.basedOn)
        current = this._stylesPart.styles.get(current.basedOn)
      } else {
        break
      }
    }

    // Apply in reverse order
    for (let i = inheritanceChain.length - 1; i >= 0; i--) {
      const s = inheritanceChain[i]
      if (s.tblPr) {
        if (!resolved.tblPr) resolved.tblPr = {}
        this._mergeTableProperties(resolved.tblPr, s.tblPr)
      }
      if (s.pPr) {
        if (!resolved.pPr) resolved.pPr = {}
        this._mergeParagraphProperties(resolved.pPr, s.pPr)
      }
      if (s.rPr) {
        if (!resolved.rPr) resolved.rPr = {}
        this._mergeRunProperties(resolved.rPr, s.rPr)
      }
    }

    // Cache result
    this._resolvedTableStyles.set(styleId, resolved)
    return resolved
  }

  // ─── Internal: Theme Font Resolution ────────────────────────────────────

  /**
   * Resolve theme font references in rFonts.
   *
   * Theme font values like "majorHAnsi" are replaced with actual font names
   * from the document's theme part.
   */
  private _resolveThemeFonts(rFonts: RunFonts): RunFonts {
    if (!this._theme) return rFonts

    const resolved = { ...rFonts }
    const fontScheme = this._theme.themeElements?.fontScheme
    if (!fontScheme) return resolved

    // Resolve major font (headings)
    const majorLatin = fontScheme.majorFont?.latin?.typeface
    const majorEastAsia = fontScheme.majorFont?.eastAsia?.typeface
    const majorCs = fontScheme.majorFont?.cs?.typeface

    // Resolve minor font (body text)
    const minorLatin = fontScheme.minorFont?.latin?.typeface
    const minorEastAsia = fontScheme.minorFont?.eastAsia?.typeface
    const minorCs = fontScheme.minorFont?.cs?.typeface

    // Resolve ascii/hAnsi
    if (resolved.ascii) {
      resolved.ascii = this._resolveFontReference(resolved.ascii, majorLatin, minorLatin)
    }
    if (resolved.hAnsi) {
      resolved.hAnsi = this._resolveFontReference(resolved.hAnsi, majorLatin, minorLatin)
    }
    if (resolved.eastAsia) {
      resolved.eastAsia = this._resolveFontReference(resolved.eastAsia, majorEastAsia, minorEastAsia)
    }
    if (resolved.cs) {
      resolved.cs = this._resolveFontReference(resolved.cs, majorCs, minorCs)
    }

    return resolved
  }

  /**
   * Resolve a single font reference.
   *
   * OOXML theme font values:
   *   majorHAnsi → majorFont.latin.typeface (e.g., "Calibri Light")
   *   minorHAnsi → minorFont.latin.typeface (e.g., "Calibri")
   *   majorEastAsia → majorFont.eastAsia.typeface
   *   minorEastAsia → minorFont.eastAsia.typeface
   */
  private _resolveFontReference(
    value: string,
    majorFont: string | undefined,
    minorFont: string | undefined,
  ): string {
    const lower = value.toLowerCase()

    // Major font references
    if (lower === 'majorhansi' || lower === 'majorlatin') {
      return majorFont || value
    }
    if (lower === 'majoreastasia') {
      return majorFont || value
    }
    if (lower === 'majorcs') {
      return majorFont || value
    }

    // Minor font references
    if (lower === 'minorhansi' || lower === 'minorlatin') {
      return minorFont || value
    }
    if (lower === 'minoreastasia') {
      return minorFont || value
    }
    if (lower === 'minorcs') {
      return minorFont || value
    }

    // Not a theme reference — return as-is
    return value
  }

  // ─── Internal: Theme Color Resolution ───────────────────────────────────

  /**
   * Resolve theme color references in a color value.
   * Theme color values like "accent1", "hyperlink", "dark1" are replaced with actual hex values.
   */
  resolveThemeColor(colorValue: string | undefined): string | undefined {
    if (!colorValue || !this._theme) return colorValue

    const colorScheme = this._theme.themeElements?.clrScheme
    if (!colorScheme) return colorValue

    const lower = colorValue.toLowerCase()

    switch (lower) {
      case 'dark1': return colorScheme.dark1
      case 'light1': return colorScheme.light1
      case 'dark2': return colorScheme.dark2
      case 'light2': return colorScheme.light2
      case 'accent1': return colorScheme.accent1
      case 'accent2': return colorScheme.accent2
      case 'accent3': return colorScheme.accent3
      case 'accent4': return colorScheme.accent4
      case 'accent5': return colorScheme.accent5
      case 'accent6': return colorScheme.accent6
      case 'hyperlink': return colorScheme.hyperlink
      case 'followedhyperlink': return colorScheme.followedHyperlink
      default: return colorValue
    }
  }

  // ─── Internal: Property Merging ─────────────────────────────────────────

  /**
   * Merge paragraph properties. Later values override earlier ones.
   * For arrays (tabs, borders), later values replace matching entries.
   */
  private _mergeParagraphProperties(
    target: ParagraphProperties,
    source: ParagraphProperties,
  ): void {
    if (!source) return

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue

      if (key === 'tabs' && Array.isArray(value)) {
        // Tab stops: merge by position, remove 'clear' entries
        const existing = target.tabs || []
        const merged = [...existing]
        for (const stop of value) {
          const idx = merged.findIndex((s) => Math.abs(s.pos - stop.pos) < 1)
          if (idx >= 0) merged.splice(idx, 1)
          if (stop.val !== 'clear') merged.push(stop)
        }
        target.tabs = merged.sort((a, b) => a.pos - b.pos)
      } else if (key === 'spacing' || key === 'ind') {
        // Merge nested objects
        if (!target[key]) {
          (target as any)[key] = { ...value }
        } else {
          Object.assign(target[key], value)
        }
      } else {
        // Simple override
        ;(target as any)[key] = value
      }
    }
  }

  /**
   * Merge table properties with deep merge for nested objects.
   * Later values override earlier ones. For nested objects like tblBorders,
   * tblCellMar, individual properties are merged rather than replaced.
   */
  private _mergeTableProperties(
    target: TableProperties,
    source: TableProperties,
  ): void {
    if (!source) return

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue

      if (key === 'tblBorders' && typeof value === 'object' && value !== null) {
        // Deep merge borders
        if (!target.tblBorders) {
          target.tblBorders = { ...value }
        } else {
          for (const [borderKey, borderVal] of Object.entries(value)) {
            if (borderVal !== undefined) {
              ;(target.tblBorders as any)[borderKey] = borderVal
            }
          }
        }
      } else if (key === 'tblCellMar' && typeof value === 'object' && value !== null) {
        // Deep merge cell margins
        if (!target.tblCellMar) {
          target.tblCellMar = { ...value }
        } else {
          for (const [marKey, marVal] of Object.entries(value)) {
            if (marVal !== undefined) {
              ;(target.tblCellMar as any)[marKey] = marVal
            }
          }
        }
      } else {
        // Simple override for scalars and other objects
        ;(target as any)[key] = value
      }
    }
  }

  /**
   * Merge run properties. Later values override earlier ones.
   * For rFonts, merge individual font attributes.
   */
  private _mergeRunProperties(
    target: RunProperties,
    source: RunProperties,
  ): void {
    if (!source) return

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue

      if (key === 'rFonts' && typeof value === 'object') {
        // Merge individual font attributes (ascii, hAnsi, eastAsia, cs)
        if (!target.rFonts) {
          target.rFonts = { ...value }
        } else {
          for (const [attr, fontName] of Object.entries(value)) {
            if (fontName !== undefined) {
              ;(target.rFonts as any)[attr] = fontName
            }
          }
        }
      } else {
        // Simple override
        ;(target as any)[key] = value
      }
    }
  }
}
