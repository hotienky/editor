/**
 * FontLoader
 *
 * Loads and registers fonts for accurate text measurement.
 * Extracts embedded fonts from DOCX, resolves system fonts,
 * and gates layout on font readiness.
 *
 * Reference: ECMA-376 §2.8.17 (Embedded Font Support)
 */

import type { FontTablePart, ThemePart, FontGroup } from './ooxml-types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FontLoaderResult {
  /** All font families that were loaded/verified */
  loaded: Set<string>
  /** Font families that fell back to system defaults */
  fallbacks: Set<string>
  /** Font families that could not be resolved */
  missing: Set<string>
}

export interface ResolvedFonts {
  /** Latin/ASCII font (from minor or major theme font) */
  latin: string
  /** East Asian font */
  eastAsia: string
  /** Complex script font */
  cs: string
}

// ─── FontLoader ─────────────────────────────────────────────────────────────

export class FontLoader {
  private _loaded = new Set<string>()
  private _fallbacks = new Set<string>()
  private _missing = new Set<string>()
  private _pending = new Map<string, Promise<void>>()
  private _ready: Promise<FontLoaderResult> | null = null

  /**
   * Load all fonts referenced in the document.
   * Must be called before layout to ensure accurate measurement.
   */
  async loadFonts(
    fontTable: FontTablePart,
    theme: ThemePart | null,
  ): Promise<FontLoaderResult> {
    if (this._ready) return this._ready

    this._ready = this._doLoad(fontTable, theme)
    return this._ready
  }

  /**
   * Wait for all fonts to be ready.
   * Uses document.fonts.ready if available.
   */
  async waitForReady(): Promise<void> {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready
    }
  }

  /**
   * Get the set of loaded fonts.
   */
  get loaded(): Set<string> {
    return this._loaded
  }

  /**
   * Get the set of fallback fonts.
   */
  get fallbacks(): Set<string> {
    return this._fallbacks
  }

  /**
   * Get the set of missing fonts.
   */
  get missing(): Set<string> {
    return this._missing
  }

  /**
   * Register a font face with the browser.
   */
  private _registerFontFace(
    family: string,
    data?: ArrayBuffer,
    source?: string,
  ): void {
    if (typeof FontFace === 'undefined') return

    try {
      const face = new FontFace(family, data ? data : `local("${family}")`)
      ;(document.fonts as any).add(face)
    } catch {
      // Font registration failed — will use system fallback
    }
  }

  /**
   * Check if a font is available in the system.
   */
  private _isFontAvailable(family: string): boolean {
    if (typeof document === 'undefined') return true // headless: assume available

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return true

    // Measure with the target font, then with a known fallback
    ctx.font = `16px "${family}"`
    const targetWidth = ctx.measureText('mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm').width

    ctx.font = '16px "monospace"'
    const monoWidth = ctx.measureText('mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm').width

    // If widths differ significantly, the font is available
    return Math.abs(targetWidth - monoWidth) > 1
  }

  /**
   * Load fonts from the font table.
   */
  private async _doLoad(
    fontTable: FontTablePart,
    theme: ThemePart | null,
  ): Promise<FontLoaderResult> {
    const families = new Set<string>()

    // Collect all font families from font table
    for (const [name, face] of fontTable.fonts) {
      families.add(name)
    }

    // Add theme fonts
    if (theme?.themeElements?.fontScheme) {
      const scheme = theme.themeElements.fontScheme
      this._addFontGroup(scheme.majorFont, families)
      this._addFontGroup(scheme.minorFont, families)
    }

    // Try to register and verify each font
    for (const family of families) {
      if (this._isFontAvailable(family)) {
        this._loaded.add(family)
      } else {
        // Check if it's an embedded font in the DOCX
        const face = fontTable.fonts.get(family)
        if (face?.data) {
          this._registerFontFace(family, face.data)
          this._loaded.add(family)
        } else {
          // Font not available — will fall back to system default
          this._fallbacks.add(family)
        }
      }
    }

    // Wait for any pending font loads
    await this.waitForReady()

    return {
      loaded: this._loaded,
      fallbacks: this._fallbacks,
      missing: this._missing,
    }
  }

  /**
   * Add font families from a font group.
   */
  private _addFontGroup(group: FontGroup, families: Set<string>): void {
    if (group.latin?.typeface) families.add(group.latin.typeface)
    if (group.eastAsia?.typeface) families.add(group.eastAsia.typeface)
    if (group.cs?.typeface) families.add(group.cs.typeface)
    if (group.hAnsi?.typeface) families.add(group.hAnsi.typeface)
  }
}

// ─── Font Resolution Helpers ────────────────────────────────────────────────

/**
 * Resolve theme fonts from the font scheme.
 * Returns the actual font family names for major (heading) and minor (body) fonts.
 */
export function resolveThemeFonts(
  theme: ThemePart | null,
): ResolvedFonts | null {
  const scheme = theme?.themeElements?.fontScheme
  if (!scheme) return null

  const minor = scheme.minorFont
  const major = scheme.majorFont

  return {
    latin: minor.latin?.typeface || major.latin?.typeface || 'Times New Roman',
    eastAsia: minor.eastAsia?.typeface || major.eastAsia?.typeface || 'SimSun',
    cs: minor.cs?.typeface || major.cs?.typeface || 'Times New Roman',
  }
}

/**
 * Check if a font is loaded by the FontLoader.
 */
export function isFontLoaded(
  family: string,
  loader: FontLoader | null,
): boolean {
  if (!loader) return true // no loader = assume all fonts available
  return loader.loaded.has(family)
}

/**
 * Get the fallback font for a given family.
 */
export function getFallbackFont(
  family: string,
  script: 'latin' | 'eastAsia' | 'cs' = 'latin',
): string {
  const fallbacks: Record<string, string[]> = {
    latin: ['Arial', 'Helvetica', 'Times New Roman', 'sans-serif'],
    eastAsia: ['SimSun', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
    cs: ['Arial', 'Times New Roman', 'sans-serif'],
  }

  const options = fallbacks[script] || fallbacks.latin
  return options[0]
}

/**
 * Extract all font families required by the document.
 */
export function extractRequiredFonts(
  fontTable: FontTablePart,
  theme: ThemePart | null,
): string[] {
  const families = new Set<string>()

  for (const [name] of fontTable.fonts) {
    families.add(name)
  }

  if (theme?.themeElements?.fontScheme) {
    const scheme = theme.themeElements.fontScheme
    if (scheme.majorFont.latin?.typeface) families.add(scheme.majorFont.latin.typeface)
    if (scheme.majorFont.eastAsia?.typeface) families.add(scheme.majorFont.eastAsia.typeface)
    if (scheme.majorFont.cs?.typeface) families.add(scheme.majorFont.cs.typeface)
    if (scheme.minorFont.latin?.typeface) families.add(scheme.minorFont.latin.typeface)
    if (scheme.minorFont.eastAsia?.typeface) families.add(scheme.minorFont.eastAsia.typeface)
    if (scheme.minorFont.cs?.typeface) families.add(scheme.minorFont.cs.typeface)
  }

  return Array.from(families)
}
