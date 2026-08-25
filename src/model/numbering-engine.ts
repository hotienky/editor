/**
 * NumberingEngine
 *
 * Resolves OOXML numbering definitions into display text for each numbered paragraph.
 * Handles abstract numbering, level overrides, and lvlText patterns.
 *
 * Reference: ECMA-376 §17.9 (Numbering)
 */

import type {
  NumberingPart,
  AbstractNumbering,
  NumberingInstance,
  NumberingLevel,
  LevelOverride,
} from './ooxml-types'

// ─── Number Format Helpers ──────────────────────────────────────────────────

const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

function toRoman(num: number, upper: boolean): string {
  if (num <= 0) return String(num)
  const table = upper ? ROMAN_UPPER : ROMAN_LOWER
  let result = ''
  let remaining = num
  // Handle values > 10 with subtractive notation
  const thousands = Math.floor(remaining / 1000)
  remaining %= 1000
  const hundreds = Math.floor(remaining / 100)
  remaining %= 100
  const tens = Math.floor(remaining / 10)
  remaining %= 10

  const m = upper ? 'M' : 'm'
  const cm = upper ? 'CM' : 'cm'
  const cd = upper ? 'CD' : 'cd'
  const d = upper ? 'D' : 'd'
  const c = upper ? 'C' : 'c'
  const xc = upper ? 'XC' : 'xc'
  const xl = upper ? 'XL' : 'xl'
  const l = upper ? 'L' : 'l'
  const x = upper ? 'X' : 'x'
  const ix = upper ? 'IX' : 'ix'
  const iv = upper ? 'IV' : 'iv'
  const v = upper ? 'V' : 'v'
  const i = upper ? 'I' : 'i'

  if (thousands > 0) result += m.repeat(thousands)
  if (hundreds === 9) result += cm
  else if (hundreds === 4) result += cd
  else if (hundreds >= 5) result += d + c.repeat(hundreds - 5)
  else if (hundreds > 0) result += c.repeat(hundreds)

  if (tens === 9) result += xc
  else if (tens === 4) result += xl
  else if (tens >= 5) result += l + x.repeat(tens - 5)
  else if (tens > 0) result += x.repeat(tens)

  if (remaining === 9) result += ix
  else if (remaining === 4) result += iv
  else if (remaining >= 5) result += v + i.repeat(remaining - 5)
  else if (remaining > 0) result += i.repeat(remaining)

  return result
}

function formatNumber(num: number, numFmt: string): string {
  switch (numFmt) {
    case "decimal":
      return String(num)
    case "decimalZero":
      return num < 10 ? "0" + num : String(num)
    case "lowerLetter":
    case "lowerAlpha":
      return String.fromCharCode(96 + ((num - 1) % 26) + 1) // a-z
    case "upperLetter":
    case "upperAlpha":
      return String.fromCharCode(64 + ((num - 1) % 26) + 1) // A-Z
    case "lowerRoman":
      return toRoman(num, false)
    case "upperRoman":
      return toRoman(num, true)
    case "bullet":
      return "\u2022" // •
    case "decimalEnclosedCircle":
      return num >= 1 && num <= 20 ? String.fromCharCode(0x2460 + num - 1) : String(num)
    case "decimalEnclosedParen":
      return "(" + num + ")"
    case "ordinal": {
      const s = ["th", "st", "nd", "rd"]
      const v = num % 100
      return num + (s[(v - 20) % 10] || s[v] || s[0])
    }
    case "none":
      return ""
    default:
      return String(num)
  }
}

// ─── Numbering Engine ───────────────────────────────────────────────────────

export interface NumberingState {
  /** Current count for each numId/ilvl combination */
  counters: Map<string, number>
  /** Last displayed value for each numId/ilvl combination (for parent references in lvlText) */
  lastDisplayed: Map<string, number>
}

export interface ResolvedNumbering {
  /** The formatted text to display (e.g., "1.", "a)", "I.") */
  text: string
  /** Number format for rendering (bullet, decimal, etc.) */
  numFmt: string
  /** Level justification */
  lvlJc?: string
  /** Paragraph properties for this level */
  pPr?: NumberingLevel['pPr']
  /** Run properties for this level */
  rPr?: NumberingLevel['rPr']
  /** Whether to suppress numbering text (isLgl) */
  isLgl?: boolean
}

export class NumberingEngine {
  private _numberingPart: NumberingPart
  private _state: NumberingState

  constructor(numberingPart: NumberingPart) {
    this._numberingPart = numberingPart
    this._state = { counters: new Map(), lastDisplayed: new Map() }
  }

  /** Reset all counters (e.g., on document reload) */
  reset(): void {
    this._state.counters.clear()
    this._state.lastDisplayed.clear()
  }

  /**
   * Resolve the numbering for a paragraph.
   * Call this once per paragraph, in document order, to correctly increment counters.
   */
  resolve(numId: number, ilvl: number = 0): ResolvedNumbering | null {
    const instance = this._numberingPart.nums.get(numId)
    if (!instance) return null

    const abstractNum = this._numberingPart.abstractNums.get(instance.abstractNumId)
    if (!abstractNum) return null

    const level = abstractNum.levels.find((l) => l.ilvl === ilvl)
    if (!level) return null

    const start = this._getStart(instance, level, ilvl)

    // Get or initialize counter
    const key = `${numId}:${ilvl}`
    let current = this._state.counters.get(key)
    if (current === undefined) {
      current = start

      // Check for restart at this level (only on first call)
      const override = instance.levelOverride?.find((o) => o.ilvl === ilvl)
      if (override?.startOverride !== undefined) {
        current = override.startOverride
      }
    }

    // Format the display text
    const text = this._resolveLvlText(level.lvlText, numId, ilvl, current)

    // Track last displayed value and increment counter for next call
    this._state.lastDisplayed.set(key, current)
    this._state.counters.set(key, current + 1)

    // Reset child level counters when this level advances
    this._resetChildCounters(numId, ilvl)

    return {
      text,
      numFmt: level.numFmt || 'decimal',
      lvlJc: level.lvlJc,
      pPr: level.pPr,
      rPr: level.rPr,
      isLgl: level.isLgl,
    }
  }

  /**
   * Peek at the current counter value without incrementing.
   * Useful for previewing what the next number will be.
   */
  peek(numId: number, ilvl: number = 0): number {
    const instance = this._numberingPart.nums.get(numId)
    if (!instance) return 0

    const abstractNum = this._numberingPart.abstractNums.get(instance.abstractNumId)
    if (!abstractNum) return 0

    const level = abstractNum.levels.find((l) => l.ilvl === ilvl)
    if (!level) return 0

    const start = this._getStart(instance, level, ilvl)
    const key = `${numId}:${ilvl}`
    const current = this._state.counters.get(key) ?? start

    const override = instance.levelOverride?.find((o) => o.ilvl === ilvl)
    if (override?.startOverride !== undefined) {
      return override.startOverride
    }

    return current
  }

  /**
   * Reset counter for a specific numId/ilvl combination.
   * Used when a list item has w:numRestart or explicit restart.
   */
  restart(numId: number, ilvl: number = 0): void {
    const instance = this._numberingPart.nums.get(numId)
    if (!instance) return

    const abstractNum = this._numberingPart.abstractNums.get(instance.abstractNumId)
    if (!abstractNum) return

    const level = abstractNum.levels.find((l) => l.ilvl === ilvl)
    if (!level) return

    const start = this._getStart(instance, level, ilvl)
    this._state.counters.set(`${numId}:${ilvl}`, start)
  }

  /**
   * Get the start value for a level, considering overrides.
   */
  private _getStart(
    instance: NumberingInstance,
    level: NumberingLevel,
    ilvl: number,
  ): number {
    const override = instance.levelOverride?.find((o) => o.ilvl === ilvl)
    if (override?.startOverride !== undefined) {
      return override.startOverride
    }
    return level.start ?? 1
  }

  /**
   * Reset counters for all child levels (ilvl > parentIlvl) when parent advances.
   * In Word, child numbering resets when a parent item changes.
   */
  private _resetChildCounters(numId: number, parentIlvl: number): void {
    const keyPrefix = `${numId}:`
    for (const key of this._state.counters.keys()) {
      if (key.startsWith(keyPrefix)) {
        const childIlvl = parseInt(key.slice(keyPrefix.length), 10)
        if (childIlvl > parentIlvl) {
          this._state.counters.delete(key)
          this._state.lastDisplayed.delete(key)
        }
      }
    }
  }

  /**
   * Resolve lvlText pattern to actual display text.
   *
   * lvlText patterns:
   *   %1 → current counter for ilvl=0
   *   %2 → current counter for ilvl=1
   *   etc.
   *
   * Example: "%1.%2." with counters [3, 1] → "3.1"
   */
  private _resolveLvlText(
    lvlText: string | undefined,
    numId: number,
    ilvl: number,
    currentCount: number,
  ): string {
    if (!lvlText) return formatNumber(currentCount, 'decimal')

    // Replace %N placeholders with formatted numbers
    return lvlText.replace(/%(\d+)/g, (_, levelStr) => {
      const targetLevel = parseInt(levelStr, 10) - 1 // %1 = ilvl 0, %2 = ilvl 1, etc.

      if (targetLevel === ilvl) {
        // Current level — use the current counter
        return formatNumber(currentCount, this._getNumFmt(numId, ilvl))
      }

      // Parent level — use last displayed value if available, otherwise peek
      const parentKey = `${numId}:${targetLevel}`
      const parentCount = this._state.lastDisplayed.get(parentKey) ?? this.peek(numId, targetLevel)
      return formatNumber(parentCount, this._getNumFmt(numId, targetLevel))
    })
  }

  /**
   * Get the number format for a given level.
   */
  private _getNumFmt(numId: number, ilvl: number): string {
    const instance = this._numberingPart.nums.get(numId)
    if (!instance) return 'decimal'

    const abstractNum = this._numberingPart.abstractNums.get(instance.abstractNumId)
    if (!abstractNum) return 'decimal'

    const level = abstractNum.levels.find((l) => l.ilvl === ilvl)
    return level?.numFmt ?? 'decimal'
  }

  /** Get the underlying numbering part (for testing/debugging) */
  get numberingPart(): NumberingPart {
    return this._numberingPart
  }
}

export { formatNumber, toRoman }
