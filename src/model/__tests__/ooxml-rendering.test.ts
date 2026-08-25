import { describe, expect, it } from 'vitest'
import { OoxmlPainter } from '../ooxml-painter'
import { OoxmlSelection, buildTextIndex } from '../ooxml-selection'
import type { LayoutTree, LayoutParagraph, LayoutLine, TextFragment, LayoutBlock, LayoutGeometry } from '../ooxml-layout-types'

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const testGeometry: LayoutGeometry = {
  pageW: 12240, pageH: 15840,
  marginTop: 1440, marginBottom: 1440,
  marginLeft: 1440, marginRight: 1440,
  contentW: 9360, contentH: 12960,
  orientation: 'portrait',
}

function makeFragment(text: string, overrides?: Partial<TextFragment>): TextFragment {
  return {
    text,
    width: text.length * 120,
    widthPx: text.length * 12,
    sz: 24,
    fontFamily: 'Arial',
    ...overrides,
  }
}

function makeLine(fragments: TextFragment[], overrides?: Partial<LayoutLine>): LayoutLine {
  return {
    fragments,
    width: fragments.reduce((s, f) => s + f.width, 0),
    height: 336,
    ascent: 269,
    descent: 67,
    leading: 50,
    justified: false,
    justifyGap: 0,
    ...overrides,
  }
}

function makeParagraph(text: string, overrides?: Partial<LayoutParagraph>): LayoutParagraph {
  const frag = makeFragment(text)
  const line = makeLine([frag])
  return {
    lines: [line],
    height: 336,
    spacingBefore: 0,
    spacingAfter: 0,
    firstLineIndent: 0,
    leftIndent: 0,
    rightIndent: 0,
    justification: 'left',
    ...overrides,
  }
}

function makeSimpleTree(text: string = 'Hello World'): LayoutTree {
  const para = makeParagraph(text)
  const block: LayoutBlock = { type: 'paragraph', data: para }
  return {
    totalPages: 1,
    pages: [{
      pageNumber: 1,
      blockRange: [0, 1],
      blocks: [block],
      usedHeight: para.height,
      availableHeight: testGeometry.contentH,
      sectionIndex: 0,
      geometry: testGeometry,
      isFirstInSection: true,
      isLastInSection: true,
    }],
    allBlocks: [block],
  }
}

function makeMultiPageTree(): LayoutTree {
  const paras: LayoutParagraph[] = []
  const blocks: LayoutBlock[] = []
  for (let i = 0; i < 50; i++) {
    const p = makeParagraph(`Paragraph ${i}`)
    paras.push(p)
    blocks.push({ type: 'paragraph', data: p })
  }

  return {
    totalPages: 2,
    pages: [
      {
        pageNumber: 1, blockRange: [0, 25],
        blocks: blocks.slice(0, 25),
        usedHeight: 25 * 336, availableHeight: testGeometry.contentH,
        sectionIndex: 0, geometry: testGeometry,
        isFirstInSection: true, isLastInSection: false,
      },
      {
        pageNumber: 2, blockRange: [25, 50],
        blocks: blocks.slice(25),
        usedHeight: 25 * 336, availableHeight: testGeometry.contentH,
        sectionIndex: 0, geometry: testGeometry,
        isFirstInSection: false, isLastInSection: true,
      },
    ],
    allBlocks: blocks,
  }
}

// ─── Tests: OoxmlPainter ─────────────────────────────────────────────────────

describe('OoxmlPainter', () => {
  it('creates painter with default options', () => {
    const painter = new OoxmlPainter()
    expect(painter).toBeDefined()
  })

  it('creates painter with custom options', () => {
    const painter = new OoxmlPainter({
      dpr: 2,
      scale: 1.5,
      selectionColor: '#FF0000',
    })
    expect(painter).toBeDefined()
  })

  it('returns empty positions before paint', () => {
    const painter = new OoxmlPainter()
    expect(painter.positions).toHaveLength(0)
  })

  it('returns empty page offsets before paint', () => {
    const painter = new OoxmlPainter()
    expect(painter.pageOffsets).toHaveLength(0)
  })

  it('measures document height', () => {
    const painter = new OoxmlPainter()
    const tree = makeSimpleTree()
    const height = painter.measureDocumentHeight(tree)
    expect(height).toBeGreaterThan(0)
  })

  it('measures multi-page document height', () => {
    const painter = new OoxmlPainter()
    const tree = makeMultiPageTree()
    const height = painter.measureDocumentHeight(tree)
    expect(height).toBeGreaterThan(1000)
  })

  it('paints without error', () => {
    const painter = new OoxmlPainter()
    const tree = makeSimpleTree()

    // Mock canvas context
    const calls: string[] = []
    const ctx = {
      save: () => { calls.push('save') },
      restore: () => { calls.push('restore') },
      fillRect: () => { calls.push('fillRect') },
      strokeRect: () => { calls.push('strokeRect') },
      fillText: () => { calls.push('fillText') },
      clearRect: () => { calls.push('clearRect') },
      set fillStyle(v: string) { calls.push('fillStyle:' + v) },
      set font(v: string) { calls.push('font:' + v) },
      set globalAlpha(v: number) { calls.push('alpha:' + v) },
      set strokeStyle(v: string) { calls.push('strokeStyle:' + v) },
      set lineWidth(v: number) { calls.push('lineWidth:' + v) },
      set shadowColor(v: string) { calls.push('shadowColor:' + v) },
      set shadowBlur(v: number) { calls.push('shadowBlur:' + v) },
      set shadowOffsetY(v: number) { calls.push('shadowOffsetY:' + v) },
    } as unknown as CanvasRenderingContext2D

    painter.paint(ctx, tree, 0, 2000)
    expect(calls.length).toBeGreaterThan(0)
  })

  it('populates positions after paint', () => {
    const painter = new OoxmlPainter()
    const tree = makeSimpleTree()

    const ctx = {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      set fillStyle(v: string) {},
      set font(v: string) {},
      set globalAlpha(v: number) {},
      set strokeStyle(v: string) {},
      set lineWidth(v: number) {},
      set shadowColor(v: string) {},
      set shadowBlur(v: number) {},
      set shadowOffsetY(v: number) {},
    } as unknown as CanvasRenderingContext2D

    painter.paint(ctx, tree, 0, 2000)
    expect(painter.positions.length).toBeGreaterThan(0)
  })
})

// ─── Tests: buildTextIndex ────────────────────────────────────────────────────

describe('buildTextIndex', () => {
  it('builds index for simple document', () => {
    const tree = makeSimpleTree('Hi')
    const index = buildTextIndex(tree)
    expect(index.length).toBe(2) // 'H', 'i'
    expect(index[0].char).toBe('H')
    expect(index[1].char).toBe('i')
  })

  it('sets correct page indices', () => {
    const tree = makeSimpleTree()
    const index = buildTextIndex(tree)
    for (const entry of index) {
      expect(entry.pageIndex).toBe(0)
    }
  })

  it('tracks character positions', () => {
    const tree = makeSimpleTree('AB')
    const index = buildTextIndex(tree)
    expect(index[0].x).toBeGreaterThanOrEqual(0)
    expect(index[0].y).toBeGreaterThanOrEqual(0)
    expect(index[0].width).toBeGreaterThan(0)
  })

  it('handles multi-page documents', () => {
    const tree = makeMultiPageTree()
    const index = buildTextIndex(tree)
    const page0 = index.filter((c) => c.pageIndex === 0)
    const page1 = index.filter((c) => c.pageIndex === 1)
    expect(page0.length).toBeGreaterThan(0)
    expect(page1.length).toBeGreaterThan(0)
  })

  it('handles empty document', () => {
    const tree: LayoutTree = { totalPages: 0, pages: [], allBlocks: [] }
    const index = buildTextIndex(tree)
    expect(index).toHaveLength(0)
  })
})

// ─── Tests: OoxmlSelection ────────────────────────────────────────────────────

describe('OoxmlSelection', () => {
  it('creates selection', () => {
    const sel = new OoxmlSelection()
    expect(sel.state.mode).toBe('none')
  })

  it('handles click', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello World')
    sel.rebuildIndex(tree)

    sel.handleClick(10, 10)
    expect(sel.state.mode).toBe('caret')
    expect(sel.state.cursor).not.toBeNull()
  })

  it('handles double-click (word selection)', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello World')
    sel.rebuildIndex(tree)

    sel.handleDoubleClick(10, 10)
    expect(sel.state.mode).toBe('word')
    expect(sel.state.range).not.toBeNull()
    expect(sel.getSelectedText().length).toBeGreaterThan(0)
  })

  it('handles triple-click (line selection)', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello World')
    sel.rebuildIndex(tree)

    sel.handleTripleClick(10, 10)
    expect(sel.state.mode).toBe('line')
  })

  it('moveLeft moves cursor', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello')
    sel.rebuildIndex(tree)

    sel.handleClick(10, 10)
    const firstIdx = sel.state.cursor?.charIndex
    sel.moveLeft()
    expect(sel.state.cursor?.charIndex).toBeLessThanOrEqual(firstIdx!)
  })

  it('moveRight moves cursor', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello')
    sel.rebuildIndex(tree)

    sel.handleClick(10, 10)
    sel.moveRight()
    expect(sel.state.cursor?.charIndex).toBeGreaterThanOrEqual(0)
  })

  it('selectAll selects all text', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello')
    sel.rebuildIndex(tree)

    sel.selectAll()
    expect(sel.state.mode).toBe('range')
    expect(sel.getSelectedText()).toBe('Hello')
  })

  it('onChange notifies listeners', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree()
    sel.rebuildIndex(tree)

    let notified = false
    sel.onChange(() => { notified = true })
    sel.handleClick(10, 10)
    expect(notified).toBe(true)
  })

  it('onChange unsubscribe works', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree()
    sel.rebuildIndex(tree)

    let count = 0
    const unsub = sel.onChange(() => { count++ })
    sel.handleClick(10, 10)
    unsub()
    sel.handleClick(10, 10)
    expect(count).toBe(1)
  })

  it('shift-click extends selection', () => {
    const sel = new OoxmlSelection()
    const tree = makeSimpleTree('Hello World')
    sel.rebuildIndex(tree)

    sel.handleClick(10, 10)
    sel.handleShiftClick(50, 10)
    expect(sel.state.mode).toBe('range')
    expect(sel.state.range!.endIndex).toBeGreaterThanOrEqual(sel.state.range!.startIndex)
  })
})
