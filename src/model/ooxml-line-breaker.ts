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
    const charWidth = frag.text.length > 0 ? frag.width / frag.text.length : 0
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
  if (fragments.length === 1 && fragments[0].text === '') {
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

  const chars = flattenFragments(fragments)
  const breakOps = findBreakOpportunities(chars)

  const lines: LayoutLine[] = []
  let pos = 0 // current position in char stream
  let totalWidth = 0

  while (pos < chars.length) {
    // Find the best break point that fits within availableWidth
    let breakPos = -1
    let breakType: BreakOpportunity['type'] = 'cjk'
    let lineWidth = 0

    // Try to fit as much as possible
    let testWidth = 0
    let lastBreakPos = pos
    let lastBreakWidth = 0
    let lastBreakType: BreakOpportunity['type'] = 'cjk'

    for (let i = pos; i < chars.length; i++) {
      testWidth += chars[i].width

      // Check for break opportunity at this position
      const breakAt = breakOps.find((b) => b.index === i + 1)
      if (breakAt) {
        lastBreakPos = i + 1
        lastBreakWidth = testWidth
        lastBreakType = breakAt.type
      }

      if (testWidth > availableWidth) {
        if (lastBreakPos > pos) {
          // We've exceeded width and have a previous break — use it
          breakPos = lastBreakPos
          breakType = lastBreakType
          lineWidth = lastBreakWidth
          break
        }

        // No break opportunity found — force break at current position
        breakPos = i + 1
        breakType = 'cjk'
        lineWidth = testWidth
        break
      }
    }

    // If no break found, take everything
    if (breakPos === -1) {
      breakPos = chars.length
      lineWidth = testWidth
    }

    // Extract characters for this line
    const lineChars = chars.slice(pos, breakPos)

    // Build line fragments by grouping consecutive characters from same run
    const lineFragments = buildLineFragments(lineChars, fragments)

    // Calculate line metrics
    const lineHeight = fragments.reduce((max, f) => {
      const sizePt = f.sz * 0.5
      return Math.max(max, Math.round(sizePt * 20 * 1.15))
    }, 0)

    const isLastLine = breakPos >= chars.length
    const shouldJustify = justify && !isLastLine && lineWidth < availableWidth

    let justifyGap = 0
    if (shouldJustify) {
      const spaceCount = lineChars.filter((c) => isSpace(c.code)).length
      if (spaceCount > 0) {
        justifyGap = Math.round((availableWidth - lineWidth) / spaceCount)
      }
    }

    const line: LayoutLine = {
      fragments: lineFragments,
      width: lineWidth,
      height: lineHeight,
      ascent: Math.round(lineHeight * 0.8),
      descent: Math.round(lineHeight * 0.2),
      leading: Math.round(lineHeight * 0.15),
      justified: shouldJustify,
      justifyGap,
    }

    lines.push(line)
    totalWidth += lineWidth
    pos = breakPos
  }

  return { lines, totalWidth }
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
