/**
 * OOXML Text Measurer
 *
 * Measures text in twips using Canvas 2D API.
 * Font resolution follows ECMA-376 §2.8.4 with theme fallback.
 * Uses actual Canvas font metrics for ascent/descent/leading.
 *
 * Reference: ECMA-376 §2.8.4 (Run Properties)
 */

import type { RunProperties, RunFonts, ThemePart, Shading } from './ooxml-types'
import type { TextFragment } from './ooxml-layout-types'
import type { FontLoader } from './font-loader'

// ─── OOXML Unit Constants ─────────────────────────────────────────────────────

const TWIPS_PER_PT = 20
const TWIPS_PER_PX = 20 / (96 / 72) // ~15 twips per CSS pixel at 96 DPI
const PT_PER_HALF_PT = 0.5
const PTS_PER_EMU = 1 / 12700

// ─── Font Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the effective font family from run properties and theme.
 * Follows ECMA-376 §2.8.4: hint-based font selection with theme fallback.
 *
 * Priority:
 *   1. rFonts attribute based on hint (ascii → hAnsi → eastAsia → cs)
 *   2. Theme major/minor font
 *   3. System fallback
 */
function resolveFontFamily(
  rFonts: RunFonts | undefined,
  theme: ThemePart | undefined,
  preference: 'ascii' | 'hAnsi' | 'eastAsia' = 'hAnsi',
): string {
  // Determine which attribute to prefer based on hint
  let hintPreference: 'ascii' | 'hAnsi' | 'eastAsia' | 'cs' = preference
  if (rFonts?.hint) {
    switch (rFonts.hint) {
      case 'eastAsia':
        hintPreference = 'eastAsia'
        break
      case 'cs':
        hintPreference = 'cs'
        break
      case 'hAnsi':
        hintPreference = 'hAnsi'
        break
      case 'default':
      default:
        // Keep the original preference
        break
    }
  }

  // 1. Direct run font — try hint-preferred attribute first, then fallback chain
  if (rFonts) {
    const direct = rFonts[hintPreference]
    if (direct) return direct

    // Fallback chain within rFonts
    if (rFonts.ascii) return rFonts.ascii
    if (rFonts.hAnsi) return rFonts.hAnsi
    if (rFonts.eastAsia) return rFonts.eastAsia
    if (rFonts.cs) return rFonts.cs
  }

  // 2. Theme font — try major font first (headings), then minor font (body)
  if (theme?.themeElements?.fontScheme) {
    const fontScheme = theme.themeElements.fontScheme
    const minorFont = fontScheme.minorFont
    const majorFont = fontScheme.majorFont

    // For eastAsia, check eastAsia font face specifically
    if (hintPreference === 'eastAsia') {
      if (minorFont.eastAsia?.typeface) return minorFont.eastAsia.typeface
      if (majorFont.eastAsia?.typeface) return majorFont.eastAsia.typeface
    }

    // For cs (complex script), check cs font face
    if (hintPreference === 'cs') {
      if (minorFont.cs?.typeface) return minorFont.cs.typeface
      if (majorFont.cs?.typeface) return majorFont.cs.typeface
    }

    // For latin, try minor then major
    if (minorFont.latin?.typeface) return minorFont.latin.typeface
    if (majorFont.latin?.typeface) return majorFont.latin.typeface
  }

  // 3. System fallback
  return hintPreference === 'eastAsia' ? 'SimSun' : 'Times New Roman'
}

/**
 * Resolve theme color to hex.
 */
function resolveThemeColor(
  color: string | undefined,
  theme: ThemePart | undefined,
): string | undefined {
  if (!color) return undefined
  if (!color.startsWith('theme')) return color

  const scheme = theme?.themeElements?.clrScheme
  if (!scheme) return undefined

  switch (color) {
    case 'dk1': return scheme.dark1
    case 'lt1': return scheme.light1
    case 'dk2': return scheme.dark2
    case 'lt2': return scheme.light2
    case 'accent1': return scheme.accent1
    case 'accent2': return scheme.accent2
    case 'accent3': return scheme.accent3
    case 'accent4': return scheme.accent4
    case 'accent5': return scheme.accent5
    case 'accent6': return scheme.accent6
    case 'hlink': return scheme.hyperlink
    case 'folHlink': return scheme.followedHyperlink
    default: return undefined
  }
}

/**
 * Build a CSS font string from resolved properties.
 */
function buildFontString(
  fontFamily: string,
  sz: number, // half-points
  bold?: boolean,
  italic?: boolean,
): string {
  const sizePt = sz * PT_PER_HALF_PT
  const weight = bold ? 'bold ' : ''
  const style = italic ? 'italic ' : ''
  return `${style}${weight}${sizePt}pt "${fontFamily}"`
}

/**
 * Classify a character into its script group.
 */
function charScript(ch: string): 'latin' | 'eastAsia' | 'cs' | 'other' {
  const code = ch.codePointAt(0) ?? 0

  // CJK Unified Ideographs and extensions
  if (
    (code >= 0x4e00 && code <= 0x9fff) ||    // CJK Unified
    (code >= 0x3400 && code <= 0x4dbf) ||    // CJK Extension A
    (code >= 0xf900 && code <= 0xfaff) ||    // CJK Compatibility
    (code >= 0x20000 && code <= 0x2a6df) ||  // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) ||  // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) ||  // CJK Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) ||  // CJK Extension E
    (code >= 0x2ceb0 && code <= 0x2ebef) ||  // CJK Extension F
    (code >= 0x30000 && code <= 0x3134f)     // CJK Extension G
  ) return 'eastAsia'

  // CJK punctuation and symbols
  if (
    (code >= 0x3000 && code <= 0x303f) ||    // CJK Symbols
    (code >= 0xff00 && code <= 0xffef) ||    // Fullwidth Forms
    (code >= 0x3040 && code <= 0x309f) ||    // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) ||    // Katakana
    (code >= 0x31f0 && code <= 0x31ff) ||    // Katakana Extension
    (code >= 0xac00 && code <= 0xd7af)       // Hangul Syllables
  ) return 'eastAsia'

  // Complex scripts (Arabic, Hebrew, Thai, Devanagari, etc.)
  if (
    (code >= 0x0600 && code <= 0x06ff) ||    // Arabic
    (code >= 0x0590 && code <= 0x05ff) ||    // Hebrew
    (code >= 0x0e00 && code <= 0x0e7f) ||    // Thai
    (code >= 0x0900 && code <= 0x097f) ||    // Devanagari
    (code >= 0x0980 && code <= 0x09ff) ||    // Bengali
    (code >= 0x0a00 && code <= 0x0a7f) ||    // Gurmukhi
    (code >= 0x0a80 && code <= 0x0aff) ||    // Gujarati
    (code >= 0x0b00 && code <= 0x0b7f) ||    // Oriya
    (code >= 0x0b80 && code <= 0x0bff) ||    // Tamil
    (code >= 0x0c00 && code <= 0x0c7f) ||    // Telugu
    (code >= 0x0c80 && code <= 0x0cff) ||    // Kannada
    (code >= 0x0d00 && code <= 0x0d7f) ||    // Malayalam
    (code >= 0x0d80 && code <= 0x0dff) ||    // Sinhala
    (code >= 0x1000 && code <= 0x109f) ||    // Myanmar
    (code >= 0x10a0 && code <= 0x10ff) ||    // Georgian
    (code >= 0x1100 && code <= 0x11ff) ||    // Hangul Jamo
    (code >= 0x1700 && code <= 0x171f) ||    // Tagalog
    (code >= 0x1720 && code <= 0x173f) ||    // Hanunoo
    (code >= 0x1740 && code <= 0x175f) ||    // Buhid
    (code >= 0x1760 && code <= 0x177f) ||    // Tagbanwa
    (code >= 0x1780 && code <= 0x17ff) ||    // Khmer
    (code >= 0x19e0 && code <= 0x19ff)       // Khmer Symbols
  ) return 'cs'

  // Latin (Basic Latin + Latin-1 Supplement + Latin Extended)
  if (
    (code >= 0x0020 && code <= 0x007f) ||    // Basic Latin
    (code >= 0x00a0 && code <= 0x00ff) ||    // Latin-1 Supplement
    (code >= 0x0100 && code <= 0x024f) ||    // Latin Extended-A + B
    (code >= 0x1e00 && code <= 0x1eff)       // Latin Extended Additional
  ) return 'latin'

  return 'other'
}

// ─── Measurement Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  widthPx: number
  heightPx: number
  ascentPx: number
  descentPx: number
}

function cacheKey(text: string, font: string): string {
  return `${text}\0${font}`
}

// ─── TextMeasurer ─────────────────────────────────────────────────────────────

export class OoxmlTextMeasurer {
  private _canvas: HTMLCanvasElement | null = null
  private _ctx: CanvasRenderingContext2D | null = null
  private _cache = new Map<string, CacheEntry>()
  private _maxCacheSize = 10000
  private _fontLoader: FontLoader | null = null

  constructor(fontLoader?: FontLoader) {
    this._fontLoader = fontLoader ?? null
  }

  /**
   * Set the font loader for font readiness gating.
   */
  setFontLoader(loader: FontLoader): void {
    this._fontLoader = loader
  }

  private _ensureCanvas(): void {
    if (this._canvas) return
    if (typeof document === 'undefined') return // headless

    this._canvas = document.createElement('canvas')
    this._canvas.width = 1
    this._canvas.height = 1
    this._ctx = this._canvas.getContext('2d')
  }

  /**
   * Measure a text run and return a TextFragment.
   *
   * @param text - The text to measure
   * @param rPr - Run properties (font, size, bold, etc.)
   * @param theme - Theme part for font resolution
   * @param kind - Fragment kind (default: 'text')
   * @param refId - Reference ID for footnote/endnote
   * @returns TextFragment with width in twips and pixels
   */
  measureRun(
    text: string,
    rPr: RunProperties | undefined,
    theme: ThemePart | undefined,
    kind?: TextFragment['kind'],
    refId?: number,
  ): TextFragment {
    const sz = rPr?.sz ?? 24 // default 12pt
    const fontFamily = resolveFontFamily(rPr?.rFonts, theme)
    const bold = rPr?.b
    const italic = rPr?.i

    // Resolve theme colors
    const textColor = resolveThemeColor(rPr?.color, theme)
    const underlineColor = resolveThemeColor(
      (rPr as any)?.uClr,
      theme,
    )

    // Handle caps
    let displayText = text
    if (rPr?.caps) {
      displayText = text.toUpperCase()
    }

    const font = buildFontString(fontFamily, sz, bold, italic)
    const { widthPx, heightPx, ascentPx, descentPx } = this._measureText(displayText, font)

    // Apply character spacing (hundredths of a point → twips)
    let charSpacingWidth = 0
    if (rPr?.spacing) {
      const spacingTwips = Math.round(rPr.spacing * 0.2) // hundredths of pt → twips
      charSpacingWidth = spacingTwips * text.length
    }

    // Compute baseline offset for superscript/subscript
    let baselineOffset = 0
    if (rPr?.vertAlign === 'superscript') {
      baselineOffset = -Math.round(sz * TWIPS_PER_PT * 0.33)
    } else if (rPr?.vertAlign === 'subscript') {
      baselineOffset = Math.round(sz * TWIPS_PER_PT * 0.15)
    }

    return {
      kind: kind ?? 'text',
      text: displayText,
      width: Math.round(widthPx * TWIPS_PER_PX) + charSpacingWidth,
      widthPx,
      sz,
      fontFamily,
      bold,
      italic,
      color: textColor,
      underline: rPr?.u,
      underlineColor: underlineColor ?? textColor,
      vertAlign: rPr?.vertAlign,
      baselineOffset,
      strike: rPr?.strike,
      dstrike: rPr?.dstrike,
      highlight: rPr?.highlight,
      shd: rPr?.shd as Shading | undefined,
      caps: rPr?.caps,
      charSpacing: rPr?.spacing,
      rPr: rPr as unknown as Record<string, unknown>,
      refId,
    }
  }

  /**
   * Measure multiple runs and return fragments.
   */
  measureRuns(
    runs: Array<{ text: string; rPr?: RunProperties }>,
    theme: ThemePart | undefined,
  ): TextFragment[] {
    return runs.map((run) => this.measureRun(run.text, run.rPr, theme))
  }

  /**
   * Get line metrics (ascent, descent, leading) for a font size.
   * Uses actual Canvas font metrics when available.
   */
  getLineMetrics(
    sz: number,
    fontFamily: string,
    theme: ThemePart | undefined,
  ): { ascent: number; descent: number; leading: number; height: number } {
    const resolvedFont = resolveFontFamily(undefined, theme)
    const font = buildFontString(resolvedFont || fontFamily, sz)
    const metrics = this._getFontMetrics(font)

    const sizePt = sz * PT_PER_HALF_PT

    // Use actual font metrics when available
    let ascent: number
    let descent: number
    let leading: number

    if (metrics.ascentPx > 0 && metrics.descentPx > 0) {
      // Use actual Canvas fontBoundingBox metrics
      ascent = Math.round(metrics.ascentPx * TWIPS_PER_PX)
      descent = Math.round(metrics.descentPx * TWIPS_PER_PX)
      // Leading: extra space between lines (from font metrics or fallback)
      leading = Math.round(sizePt * TWIPS_PER_PT * 0.15)
    } else {
      // Fallback: estimate from height
      const heightTwip = Math.round(metrics.heightPx * TWIPS_PER_PX)
      ascent = Math.round(heightTwip * 0.8)
      descent = heightTwip - ascent
      leading = Math.round(sizePt * TWIPS_PER_PT * 0.15)
    }

    return {
      ascent,
      descent,
      leading,
      height: ascent + descent + leading,
    }
  }

  /**
   * Clear the measurement cache.
   */
  clearCache(): void {
    this._cache.clear()
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private _measureText(
    text: string,
    font: string,
  ): { widthPx: number; heightPx: number; ascentPx: number; descentPx: number } {
    const key = cacheKey(text, font)
    const cached = this._cache.get(key)
    if (cached) return cached

    this._ensureCanvas()

    let widthPx: number
    let heightPx: number
    let ascentPx: number
    let descentPx: number

    if (this._ctx) {
      this._ctx.font = font
      const metrics = this._ctx.measureText(text)
      widthPx = metrics.width

      // Use fontBoundingBox metrics when available (actual font ascent/descent)
      if (metrics.fontBoundingBoxAscent && metrics.fontBoundingBoxDescent) {
        ascentPx = metrics.fontBoundingBoxAscent
        descentPx = metrics.fontBoundingBoxDescent
        heightPx = ascentPx + descentPx
      } else if (metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent) {
        // Fallback: actual bounding box (includes glyphs that extend beyond font metrics)
        ascentPx = metrics.actualBoundingBoxAscent
        descentPx = metrics.actualBoundingBoxDescent
        heightPx = ascentPx + descentPx
      } else {
        // Final fallback: estimate from font size
        const sizeMatch = font.match(/([\d.]+)pt/)
        const sizePt = sizeMatch ? parseFloat(sizeMatch[1]) : 12
        heightPx = sizePt * (96 / 72) * 1.2
        ascentPx = heightPx * 0.8
        descentPx = heightPx * 0.2
      }
    } else {
      // Headless fallback: estimate character width
      const sizeMatch = font.match(/([\d.]+)pt/)
      const sizePt = sizeMatch ? parseFloat(sizeMatch[1]) : 12
      widthPx = text.length * sizePt * 0.6 * (96 / 72)
      heightPx = sizePt * (96 / 72) * 1.2
      ascentPx = heightPx * 0.8
      descentPx = heightPx * 0.2
    }

    // Cache eviction (simple: clear half when full)
    if (this._cache.size >= this._maxCacheSize) {
      const entries = Array.from(this._cache.keys())
      for (let i = 0; i < entries.length / 2; i++) {
        this._cache.delete(entries[i])
      }
    }

    const result = { widthPx, heightPx, ascentPx, descentPx }
    this._cache.set(key, result)
    return result
  }

  /**
   * Get font metrics from Canvas.
   */
  private _getFontMetrics(
    font: string,
  ): { heightPx: number; ascentPx: number; descentPx: number } {
    this._ensureCanvas()

    if (this._ctx) {
      this._ctx.font = font
      const metrics = this._ctx.measureText('M')

      let ascentPx = metrics.fontBoundingBoxAscent ?? 0
      let descentPx = metrics.fontBoundingBoxDescent ?? 0
      let heightPx = ascentPx + descentPx

      if (heightPx === 0) {
        ascentPx = metrics.actualBoundingBoxAscent ?? 0
        descentPx = metrics.actualBoundingBoxDescent ?? 0
        heightPx = ascentPx + descentPx
      }

      if (heightPx === 0) {
        const sizeMatch = font.match(/([\d.]+)pt/)
        const sizePt = sizeMatch ? parseFloat(sizeMatch[1]) : 12
        heightPx = sizePt * (96 / 72) * 1.2
        ascentPx = heightPx * 0.8
        descentPx = heightPx * 0.2
      }

      return { heightPx, ascentPx, descentPx }
    }

    // Headless fallback
    const sizeMatch = font.match(/([\d.]+)pt/)
    const sizePt = sizeMatch ? parseFloat(sizeMatch[1]) : 12
    const heightPx = sizePt * (96 / 72) * 1.2
    return { heightPx, ascentPx: heightPx * 0.8, descentPx: heightPx * 0.2 }
  }
}

export { resolveFontFamily, buildFontString, resolveThemeColor, charScript }
