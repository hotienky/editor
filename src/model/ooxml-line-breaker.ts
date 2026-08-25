/**
 * OOXML Line Breaker
 *
 * Breaks text into lines following Word-compatible rules.
 * Supports:
 * - Word-level breaking (space, hyphen boundaries)
 * - CJK character-level breaking
 * - Justification (distribute extra space)
 * - Run-aware breaking (respecting run boundaries)
 */

import type { TextFragment, LayoutLine } from './ooxml-layout-types'

// ─── Break Opportunity Detection ──────────────────────────────────────────────

/** Unicode ranges for CJK characters */
const CJK_RANGES = [
  [0x4e00, 0x9fff],   // CJK Unified Ideographs
  [0x3400, 0x4dbf],   // CJK Unified Ideographs Extension A
  [0x3040, 0x309f],   // Hiragana
  [0x30a0, 0x30ff],   // Katakana
  [0x31f0, 0x31ff],   // Katakana Phonetic Extensions
  [0xf900, 0xfaff],   // CJK Compatibility Ideographs
  [0x2e80, 0x2eff],   // CJK Radicals Supplement
  [0x3000, 0x303f],   // CJK Symbols and Punctuation
  [0xff00, 0xffef],   // Fullwidth Forms
  [0xac00, 0xd7af],   // Hangul Syllables
  [0x1100, 0x11ff],   // Hangul Jamo
  [0x3200, 0x32ff],   // Enclosed CJK Letters and Months
  [0x3300, 0x33ff],   // CJK Compatibility
] as const

function isCJK(code: number): boolean {
  return CJK_RANGES.some(([min, max]) => code >= min && code <= max)
}

function isSpace(code: number): boolean {
  return code === 0x0020 || code === 0x00a0 || code === 0x2002 || code === 0x2003 || code === 0x2009
}

function isHyphen(code: number): boolean {
  return code === 0x002d || code === 0x2010 || code === 0x2012 || code === 0x2013 || code === 0x2014
}

function isZeroWidthSpace(code: number): boolean {
  return code === 0x200b || code === 0xfeff
}

// ─── Fragment Stream ──────────────────────────────────────────────────────────

/** A single character with its run index and width */
interface CharInfo {
  char: string
  code: number
  width: number
  runIndex: number
  charIndex: number
}

/** Flatten fragments into a character stream */
function flattenFragments(fragments: TextFragment[]): CharInfo[] {
  const chars: CharInfo[] = []
  for (let ri = 0; ri < fragments.length; ri++) {
    const frag = fragments[ri]
    if (frag.kind === 'tab') {
      // Tab: use \t with full width
      chars.push({
        char: '\t',
        code: 9,
        width: frag.width,
        runIndex: ri,
        charIndex: 0,
      })
    } else if (frag.kind === 'footnoteRef' || frag.kind === 'endnoteRef') {
      // Reference marker: use special char with width
      chars.push({
        char: '\u200B', // zero-width space as marker
        code: 0x200B,
        width: frag.width,
        runIndex: ri,
        charIndex: 0,
      })
    } else if (frag.text.length > 0) {
      const charWidth = frag.width / frag.text.length
      for (let ci = 0; ci < frag.text.length; ci++) {
        const char = frag.text[ci]
        chars.push({
          char,
          code: char.charCodeAt(0),
          width: Math.round(charWidth),
          runIndex: ri,
          charIndex: ci,
        })
      }
    }
  }
  return chars
}

// ─── Break Opportunity ────────────────────────────────────────────────────────

interface BreakOpportunity {
  /** Index into the char stream (position after the break) */
  index: number
  /** Type of break */
  type: 'space' | 'hyphen' | 'cjk' | 'zeroWidth'
  /** Width of the break character (0 for zero-width) */
  width: number
}

/**
 * Find all break opportunities in a character stream.
 */
function findBreakOpportunities(chars: CharInfo[]): BreakOpportunity[] {
  const opportunities: BreakOpportunity[] = []

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]

    if (isSpace(c.code)) {
      opportunities.push({ index: i + 1, type: 'space', width: c.width })
    } else if (isHyphen(c.code)) {
      opportunities.push({ index: i + 1, type: 'hyphen', width: c.width })
    } else if (isZeroWidthSpace(c.code)) {
      opportunities.push({ index: i + 1, type: 'zeroWidth', width: 0 })
    } else if (isCJK(c.code) && i < chars.length - 1) {
      // CJK break after each character (but not at end of text)
      opportunities.push({ index: i + 1, type: 'cjk', width: 0 })
    }
  }

  return opportunities
}

// ─── Line Breaking Algorithm ──────────────────────────────────────────────────

export interface LineBreakInput {
  /** Text fragments to break */
  fragments: TextFragment[]
  /** Available width in twips */
  availableWidth: number
  /** Whether to apply justification (jc='both') */
  justify?: boolean
}

export interface LineBreakResult {
  /** Lines produced */
  lines: LayoutLine[]
  /** Total width of all content in twips */
  totalWidth: number
}

/**
 * Break fragments into lines that fit within availableWidth.
 *
 * Algorithm:
 * 1. Flatten fragments into character stream
 * 2. Find break opportunities
 * 3. Greedily fill lines using last-fit strategy
 * 4. Justify lines if requested (except last line)
 */
export function breakIntoLines(input: LineBreakInput): LineBreakResult {
  const { fragments, availableWidth, justify = false } = input

  if (fragments.length === 0) {
    return { lines: [], totalWidth: 0 }
  }

  // Handle single empty fragment
  if (fragments.length === 1 && fragments[0].text === '' && !fragments[0].kind) {
    return {
      lines: [{
        fragments: [{ ...fragments[0], width: 0, widthPx: 0 }],
        width: 0,
        height: 0,
        ascent: 0,
        descent: 0,
        leading: 0,
        justified: false,
        justifyGap: 0,
      }],
      totalWidth: 0,
    }
  }

  // Split on explicit breaks (page, column, line)
  const segments: TextFragment[][] = []
  let currentSeg: TextFragment[] = []
  for (const frag of fragments) {
    if (frag.kind === 'break') {
      // End current segment (even if empty)
      segments.push(currentSeg)
      // The break fragment itself doesn't produce text on a line
      currentSeg = []
    } else if (frag.kind === 'tab') {
      // Tab is a single fragment with width — include in current segment
      currentSeg.push(frag)
    } else {
      currentSeg.push(frag)
    }
  }
  segments.push(currentSeg)

  const allLines: LayoutLine[] = []
  let totalWidth = 0

  for (const seg of segments) {
    if (seg.length === 0) {
      // Empty line from a break
      const metrics = getLineMetrics(fragments)
      allLines.push({
        fragments: [],
        width: 0,
        height: metrics.height,
        ascent: metrics.ascent,
        descent: metrics.descent,
        leading: metrics.leading,
        justified: false,
        justifyGap: 0,
      })
      continue
    }

    const chars = flattenFragments(seg)
    const breakOps = findBreakOpportunities(chars)

    let pos = 0
    while (pos < chars.length) {
      let breakPos = -1
      let breakType: BreakOpportunity['type'] = 'cjk'
      let lineWidth = 0

      let testWidth = 0
      let lastBreakPos = pos
      let lastBreakWidth = 0
      let lastBreakType: BreakOpportunity['type'] = 'cjk'

      for (let i = pos; i < chars.length; i++) {
        testWidth += chars[i].width

        const breakAt = breakOps.find((b) => b.index === i + 1)
        if (breakAt) {
          lastBreakPos = i + 1
          lastBreakWidth = testWidth
          lastBreakType = breakAt.type
        }

        if (testWidth > availableWidth) {
          if (lastBreakPos > pos) {
            breakPos = lastBreakPos
            breakType = lastBreakType
            lineWidth = lastBreakWidth
            break
          }
          breakPos = i + 1
          breakType = 'cjk'
          lineWidth = testWidth
          break
        }
      }

      if (breakPos === -1) {
        breakPos = chars.length
        lineWidth = testWidth
      }

      const lineChars = chars.slice(pos, breakPos)
      const lineFragments = buildLineFragments(lineChars, seg)

      const metrics = getLineMetrics(fragments)
      const isLastLine = breakPos >= chars.length
      const shouldJustify = justify && !isLastLine && lineWidth < availableWidth

      let justifyGap = 0
      if (shouldJustify) {
        const spaceCount = lineChars.filter((c) => isSpace(c.code)).length
        if (spaceCount > 0) {
          justifyGap = Math.round((availableWidth - lineWidth) / spaceCount)
        }
      }

      allLines.push({
        fragments: lineFragments,
        width: lineWidth,
        height: metrics.height,
        ascent: metrics.ascent,
        descent: metrics.descent,
        leading: metrics.leading,
        justified: shouldJustify,
        justifyGap,
      })

      totalWidth += lineWidth
      pos = breakPos
    }
  }

  return { lines: allLines, totalWidth }
}

function getLineMetrics(fragments: TextFragment[]): { height: number; ascent: number; descent: number; leading: number } {
  let maxAscent = 0
  let maxDescent = 0
  let maxLeading = 0
  for (const f of fragments) {
    if (f.sz > 0) {
      const sizePt = f.sz * 0.5
      const lineH = Math.round(sizePt * 20 * 1.15)
      const a = Math.round(lineH * 0.8)
      const d = Math.round(lineH * 0.2)
      const l = Math.round(lineH * 0.15)
      if (a > maxAscent) maxAscent = a
      if (d > maxDescent) maxDescent = d
      if (l > maxLeading) maxLeading = l
    }
  }
  return {
    height: maxAscent + maxDescent + maxLeading,
    ascent: maxAscent,
    descent: maxDescent,
    leading: maxLeading,
  }
}

/**
 * Build line fragments from a character range.
 * Groups consecutive characters from the same run into fragments.
 */
function buildLineFragments(lineChars: CharInfo[], originalFragments: TextFragment[]): TextFragment[] {
  if (lineChars.length === 0) return []

  const result: TextFragment[] = []
  let currentRunIndex = lineChars[0].runIndex
  let currentText = ''
  let currentWidth = 0

  for (const c of lineChars) {
    if (c.runIndex !== currentRunIndex) {
      // Flush current fragment
      if (currentText.length > 0) {
        const orig = originalFragments[currentRunIndex]
        result.push({
          ...orig,
          text: currentText,
          width: currentWidth,
          widthPx: currentWidth / (20 / (96 / 72)),
        })
      }
      currentRunIndex = c.runIndex
      currentText = ''
      currentWidth = 0
    }
    currentText += c.char
    currentWidth += c.width
  }

  // Flush last fragment
  if (currentText.length > 0) {
    const orig = originalFragments[currentRunIndex]
    result.push({
      ...orig,
      text: currentText,
      width: currentWidth,
      widthPx: currentWidth / (20 / (96 / 72)),
    })
  }

  return result
}

export { isCJK, isSpace, isHyphen, flattenFragments }
