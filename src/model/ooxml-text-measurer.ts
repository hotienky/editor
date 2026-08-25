/**
 * OOXML Text Measurer
 *
 * Measures text in twips using Canvas 2D API.
 * Font resolution follows OOXML priority: ascii -> hAnsi -> eastAsia -> cs
 * with theme font fallback.
 */

import type { RunProperties, RunFonts, ThemePart, FontGroup } from './ooxml-types'
import type { TextFragment } from './ooxml-layout-types'

// ─── OOXML Unit Constants ─────────────────────────────────────────────────────

const TWIPS_PER_PT = 20
const TWIPS_PER_PX = 20 / (96 / 72) // ~15 twips per CSS pixel at 96 DPI
const PT_PER_EMU = 1 / 12700 // 1pt = 12700 EMU
const PT_PER_HALF_PT = 0.5

// ─── Font Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the effective font family from run properties and theme.
 * Priority: rFonts.ascii -> rFonts.hAnsi -> rFonts.eastAsia -> theme minorFont
 */
function resolveFontFamily(
  rFonts: RunFonts | undefined,
  theme: ThemePart | undefined,
  preference: 'ascii' | 'hAnsi' | 'eastAsia' = 'hAnsi',
): string {
  // 1. Direct run font
  if (rFonts) {
    const direct = rFonts[preference]
    if (direct) return direct
    // Fallback within rFonts
    if (rFonts.ascii) return rFonts.ascii
    if (rFonts.hAnsi) return rFonts.hAnsi
    if (rFonts.eastAsia) return rFonts.eastAsia
  }

  // 2. Theme font
  if (theme?.themeElements?.fontScheme) {
    const minorFont: FontGroup = theme.themeElements.fontScheme.minorFont
    if (preference === 'eastAsia' && minorFont.eastAsia?.typeface) {
      return minorFont.eastAsia.typeface
    }
    if (minorFont.latin?.typeface) {
      return minorFont.latin.typeface
    }
  }

  // 3. System fallback
  return preference === 'eastAsia' ? 'SimSun' : 'Times New Roman'
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

// ─── Measurement Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  widthPx: number
  heightPx: number
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

  constructor() {
    // Lazy-init: canvas created on first measurement
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
   * @returns TextFragment with width in twips and pixels
   */
  measureRun(
    text: string,
    rPr: RunProperties | undefined,
    theme: ThemePart | undefined,
  ): TextFragment {
    const sz = rPr?.sz ?? 24 // default 12pt
    const fontFamily = resolveFontFamily(rPr?.rFonts, theme)
    const bold = rPr?.b
    const italic = rPr?.i

    const font = buildFontString(fontFamily, sz, bold, italic)
    const { widthPx, heightPx } = this._measureText(text, font)

    return {
      text,
      width: Math.round(widthPx * TWIPS_PER_PX),
      widthPx,
      sz,
      fontFamily,
      bold,
      italic,
      color: rPr?.color,
      underline: rPr?.u,
      vertAlign: rPr?.vertAlign,
      rPr: rPr as unknown as Record<string, unknown>,
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
   */
  getLineMetrics(
    sz: number,
    fontFamily: string,
    theme: ThemePart | undefined,
  ): { ascent: number; descent: number; leading: number; height: number } {
    const resolvedFont = resolveFontFamily(undefined, theme)
    const font = buildFontString(resolvedFont || fontFamily, sz)
    const { heightPx } = this._measureText('M', font)

    const sizePt = sz * PT_PER_HALF_PT
    const heightTwip = Math.round(heightPx * TWIPS_PER_PX)

    // Word-like metrics: ascent ~80% of height, descent ~20%
    const ascent = Math.round(heightTwip * 0.8)
    const descent = heightTwip - ascent
    // Leading: extra space between lines (usually 15-20% of font size for single spacing)
    const leading = Math.round(sizePt * TWIPS_PER_PT * 0.15)

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

  private _measureText(text: string, font: string): { widthPx: number; heightPx: number } {
    const key = cacheKey(text, font)
    const cached = this._cache.get(key)
    if (cached) return cached

    this._ensureCanvas()

    let widthPx: number
    let heightPx: number

    if (this._ctx) {
      this._ctx.font = font
      const metrics = this._ctx.measureText(text)
      widthPx = metrics.width
      // Use fontBoundingBox metrics when available
      heightPx = (metrics.fontBoundingBoxAscent ?? 0) + (metrics.fontBoundingBoxDescent ?? 0)
      if (heightPx === 0) {
        // Fallback: use actualBoundingBox
        heightPx = (metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0)
      }
      if (heightPx === 0) {
        // Final fallback: estimate from font size
        const sizeMatch = font.match(/([\d.]+)pt/)
        const sizePt = sizeMatch ? parseFloat(sizeMatch[1]) : 12
        heightPx = sizePt * (96 / 72) * 1.2
      }
    } else {
      // Headless fallback: estimate character width
      const sizeMatch = font.match(/([\d.]+)pt/)
      const sizePt = sizeMatch ? parseFloat(sizeMatch[1]) : 12
      widthPx = text.length * sizePt * 0.6 * (96 / 72)
      heightPx = sizePt * (96 / 72) * 1.2
    }

    // Cache eviction (simple: clear half when full)
    if (this._cache.size >= this._maxCacheSize) {
      const entries = Array.from(this._cache.keys())
      for (let i = 0; i < entries.length / 2; i++) {
        this._cache.delete(entries[i])
      }
    }

    const result = { widthPx, heightPx }
    this._cache.set(key, result)
    return result
  }
}

export { resolveFontFamily, buildFontString }
