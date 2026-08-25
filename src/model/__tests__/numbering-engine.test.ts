import { describe, expect, it } from 'vitest'
import { NumberingEngine, formatNumber, toRoman } from '../numbering-engine'
import type { NumberingPart, AbstractNumbering, NumberingInstance } from '../ooxml-types'

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeNumberingPart(
  abstractNums: AbstractNumbering[],
  nums: NumberingInstance[],
): NumberingPart {
  const abstractMap = new Map<number, AbstractNumbering>()
  for (const a of abstractNums) abstractMap.set(a.abstractNumId, a)

  const numMap = new Map<number, NumberingInstance>()
  for (const n of nums) numMap.set(n.numId, n)

  return { abstractNums: abstractMap, nums: numMap }
}

function makeAbstractNum(abstractNumId: number, levels: Array<{ ilvl: number; start?: number; numFmt?: string; lvlText?: string }>): AbstractNumbering {
  return {
    abstractNumId,
    levels: levels.map((l) => ({
      ilvl: l.ilvl,
      start: l.start ?? 1,
      numFmt: l.numFmt ?? 'decimal',
      lvlText: l.lvlText,
    })),
  }
}

function makeNum(numId: number, abstractNumId: number, levelOverride?: Array<{ ilvl: number; startOverride?: number }>): NumberingInstance {
  return {
    numId,
    abstractNumId,
    levelOverride: levelOverride?.map((o) => ({
      ilvl: o.ilvl,
      startOverride: o.startOverride,
    })),
  }
}

// ─── Tests: formatNumber ─────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats decimal', () => {
    expect(formatNumber(1, 'decimal')).toBe('1')
    expect(formatNumber(42, 'decimal')).toBe('42')
  })

  it('formats decimalZero', () => {
    expect(formatNumber(1, 'decimalZero')).toBe('01')
    expect(formatNumber(10, 'decimalZero')).toBe('10')
  })

  it('formats lowerLetter (a-z)', () => {
    expect(formatNumber(1, 'lowerLetter')).toBe('a')
    expect(formatNumber(26, 'lowerLetter')).toBe('z')
    expect(formatNumber(27, 'lowerLetter')).toBe('a') // wraps
  })

  it('formats upperLetter (A-Z)', () => {
    expect(formatNumber(1, 'upperLetter')).toBe('A')
    expect(formatNumber(26, 'upperLetter')).toBe('Z')
    expect(formatNumber(27, 'upperLetter')).toBe('A') // wraps
  })

  it('formats lowerRoman', () => {
    expect(formatNumber(1, 'lowerRoman')).toBe('i')
    expect(formatNumber(5, 'lowerRoman')).toBe('v')
    expect(formatNumber(10, 'lowerRoman')).toBe('x')
    expect(formatNumber(19, 'lowerRoman')).toBe('xix')
    expect(formatNumber(24, 'lowerRoman')).toBe('xxiv')
  })

  it('formats upperRoman', () => {
    expect(formatNumber(1, 'upperRoman')).toBe('I')
    expect(formatNumber(5, 'upperRoman')).toBe('V')
    expect(formatNumber(10, 'upperRoman')).toBe('X')
  })

  it('formats bullet', () => {
    expect(formatNumber(1, 'bullet')).toBe('\u2022')
  })

  it('formats none', () => {
    expect(formatNumber(1, 'none')).toBe('')
  })
})

// ─── Tests: toRoman ──────────────────────────────────────────────────────────

describe('toRoman', () => {
  it('converts to lowerRoman', () => {
    expect(toRoman(4, false)).toBe('iv')
    expect(toRoman(9, false)).toBe('ix')
    expect(toRoman(14, false)).toBe('xiv')
  })

  it('converts to upperRoman', () => {
    expect(toRoman(4, true)).toBe('IV')
    expect(toRoman(9, true)).toBe('IX')
    expect(toRoman(14, true)).toBe('XIV')
  })
})

// ─── Tests: NumberingEngine Basic ────────────────────────────────────────────

describe('NumberingEngine — basic', () => {
  it('resolves simple decimal numbering', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, start: 1, numFmt: 'decimal' }])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    const r1 = engine.resolve(1, 0)
    expect(r1?.text).toBe('1')
    expect(r1?.numFmt).toBe('decimal')

    const r2 = engine.resolve(1, 0)
    expect(r2?.text).toBe('2')

    const r3 = engine.resolve(1, 0)
    expect(r3?.text).toBe('3')
  })

  it('resolves with default start of 1', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0 }])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    expect(engine.resolve(1, 0)?.text).toBe('1')
    expect(engine.resolve(1, 0)?.text).toBe('2')
  })

  it('returns null for unknown numId', () => {
    const part = makeNumberingPart([], [])
    const engine = new NumberingEngine(part)

    expect(engine.resolve(999, 0)).toBeNull()
  })
})

// ─── Tests: NumberingEngine lvlText ──────────────────────────────────────────

describe('NumberingEngine — lvlText', () => {
  it('resolves lvlText with single placeholder', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, numFmt: 'decimal', lvlText: 'Item %1' }])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    expect(engine.resolve(1, 0)?.text).toBe('Item 1')
    expect(engine.resolve(1, 0)?.text).toBe('Item 2')
  })

  it('resolves lvlText with dot suffix', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, numFmt: 'decimal', lvlText: '%1.' }])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    expect(engine.resolve(1, 0)?.text).toBe('1.')
    expect(engine.resolve(1, 0)?.text).toBe('2.')
  })

  it('resolves multi-level lvlText (parent references)', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [
        { ilvl: 0, numFmt: 'decimal', lvlText: '%1' },
        { ilvl: 1, numFmt: 'decimal', lvlText: '%1.%2' },
      ])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    // Level 0: items 1, 2, 3
    expect(engine.resolve(1, 0)?.text).toBe('1')
    expect(engine.resolve(1, 1)?.text).toBe('1.1')
    expect(engine.resolve(1, 1)?.text).toBe('1.2')
    expect(engine.resolve(1, 0)?.text).toBe('2')
    expect(engine.resolve(1, 1)?.text).toBe('2.1')
  })

  it('resolves lvlText with letter format', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [
        { ilvl: 0, numFmt: 'decimal', lvlText: '%1' },
        { ilvl: 1, numFmt: 'lowerLetter', lvlText: '%2' },
      ])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    expect(engine.resolve(1, 0)?.text).toBe('1')
    expect(engine.resolve(1, 1)?.text).toBe('a')
    expect(engine.resolve(1, 1)?.text).toBe('b')
    expect(engine.resolve(1, 1)?.text).toBe('c')
  })
})

// ─── Tests: NumberingEngine Start Override ───────────────────────────────────

describe('NumberingEngine — startOverride', () => {
  it('applies startOverride at a specific level', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, start: 1 }])],
      [makeNum(1, 0, [{ ilvl: 0, startOverride: 5 }])],
    )
    const engine = new NumberingEngine(part)

    // First call starts at 5 (from override)
    expect(engine.resolve(1, 0)?.text).toBe('5')
    expect(engine.resolve(1, 0)?.text).toBe('6')
  })

  it('startOverride on level 1 does not affect level 0', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [
        { ilvl: 0, start: 1 },
        { ilvl: 1, start: 1 },
      ])],
      [makeNum(1, 0, [{ ilvl: 1, startOverride: 10 }])],
    )
    const engine = new NumberingEngine(part)

    expect(engine.resolve(1, 0)?.text).toBe('1')
    expect(engine.resolve(1, 1)?.text).toBe('10') // starts at 10
    expect(engine.resolve(1, 1)?.text).toBe('11')
  })
})

// ─── Tests: NumberingEngine reset/restart ────────────────────────────────────

describe('NumberingEngine — reset', () => {
  it('reset() clears all counters', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, start: 1 }])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    engine.resolve(1, 0) // 1
    engine.resolve(1, 0) // 2
    engine.resolve(1, 0) // 3

    engine.reset()

    expect(engine.resolve(1, 0)?.text).toBe('1') // starts over
  })

  it('restart() resets a specific numId/ilvl', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [
        { ilvl: 0, start: 1 },
        { ilvl: 1, start: 1 },
      ])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    engine.resolve(1, 0) // 1
    engine.resolve(1, 0) // 2
    engine.resolve(1, 1) // 1
    engine.resolve(1, 1) // 2

    engine.restart(1, 1) // restart level 1

    expect(engine.resolve(1, 0)?.text).toBe('3') // continues
    expect(engine.resolve(1, 1)?.text).toBe('1') // restarted
  })
})

// ─── Tests: NumberingEngine Multiple Lists ───────────────────────────────────

describe('NumberingEngine — multiple lists', () => {
  it('tracks separate counters for different numIds', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, start: 1, numFmt: 'decimal' }])],
      [makeNum(1, 0), makeNum(2, 0)],
    )
    const engine = new NumberingEngine(part)

    expect(engine.resolve(1, 0)?.text).toBe('1')
    expect(engine.resolve(2, 0)?.text).toBe('1')
    expect(engine.resolve(1, 0)?.text).toBe('2')
    expect(engine.resolve(2, 0)?.text).toBe('2')
  })
})

// ─── Tests: NumberingEngine peek ─────────────────────────────────────────────

describe('NumberingEngine — peek', () => {
  it('peek returns current value without incrementing', () => {
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{ ilvl: 0, start: 1 }])],
      [makeNum(1, 0)],
    )
    const engine = new NumberingEngine(part)

    expect(engine.peek(1, 0)).toBe(1)
    expect(engine.peek(1, 0)).toBe(1) // same — not incremented
    engine.resolve(1, 0) // increment
    expect(engine.peek(1, 0)).toBe(2)
  })

  it('peek returns 0 for unknown numId', () => {
    const part = makeNumberingPart([], [])
    const engine = new NumberingEngine(part)

    expect(engine.peek(999, 0)).toBe(0)
  })
})

// ─── Tests: NumberingEngine Properties ───────────────────────────────────────

describe('NumberingEngine — level properties', () => {
  it('returns pPr and rPr from level', () => {
    const pPr = { spacing: { before: 100 } }
    const rPr = { bold: true }
    const part = makeNumberingPart(
      [makeAbstractNum(0, [{
        ilvl: 0,
        start: 1,
        numFmt: 'decimal',
        lvlText: '%1',
      }])],
      [makeNum(1, 0)],
    )
    // Manually inject pPr/rPr since makeAbstractNum doesn't support them
    part.abstractNums.get(0)!.levels[0].pPr = pPr as any
    part.abstractNums.get(0)!.levels[0].rPr = rPr as any

    const engine = new NumberingEngine(part)
    const result = engine.resolve(1, 0)

    expect(result?.pPr).toBe(pPr)
    expect(result?.rPr).toBe(rPr)
  })
})
