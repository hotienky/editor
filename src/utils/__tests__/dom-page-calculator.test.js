import { describe, expect, it } from 'vitest'
import {
  computePagesFromHeights,
  createBlockMeasurementCache,
  getBlockHeightsFromDOM,
} from '../dom-page-calculator'

const block = (height, options = {}) => ({ height, forceBreak: false, avoidBreak: false, ...options })

describe('DOM page calculator', () => {
  it('moves a whole block to the next page and reports the remaining page space', () => {
    const pages = computePagesFromHeights([block(600), block(400)], 900)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ blockStart: 0, blockEnd: 0, remainingHeight: 292, pageSpan: 1 })
    expect(pages[1]).toMatchObject({ pageNumber: 2, blockStart: 1, blockEnd: 1 })
  })

  it('counts oversized tables across virtual pages without inserting a break inside the table', () => {
    const pages = computePagesFromHeights([
      block(1_850, { avoidBreak: true, type: 'table' }),
      block(850),
    ], 900)
    expect(pages[0]).toMatchObject({ pageNumber: 1, pageSpan: 3, blockStart: 0, blockEnd: 0 })
    expect(pages[1]).toMatchObject({ pageNumber: 4, blockStart: 1 })
  })

  it('turns a manual page break into a full page boundary, including at document end', () => {
    const pages = computePagesFromHeights([block(200), block(0, { forceBreak: true })], 900)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ endedByManualBreak: true, manualBreakBlock: 1, remainingHeight: 692 })
    expect(pages[1]).toMatchObject({ pageNumber: 2, height: 0, remainingHeight: 900 })
  })

  it('switches page geometry and numbering at a section break', () => {
    const pages = computePagesFromHeights([
      block(400),
      block(0, {
        forceBreak: true,
        nextPageGeometry: { contentHeight: 500, marginTop: 20, marginBottom: 20, pageGap: 24 },
        nextSection: { index: 1, id: 'landscape', pageNumberStart: 5 },
      }),
      block(400),
      block(200),
    ], 900, {
      initialGeometry: { contentHeight: 900, marginTop: 40, marginBottom: 40, pageGap: 24 },
      initialSection: { index: 0, id: 'portrait', pageNumberStart: 1 },
    })

    expect(pages).toHaveLength(3)
    expect(pages[0]).toMatchObject({ sectionId: 'portrait', sectionPageNumber: 1 })
    expect(pages[1]).toMatchObject({ sectionId: 'landscape', sectionPageNumber: 5, blockStart: 2, blockEnd: 2 })
    expect(pages[2]).toMatchObject({ sectionId: 'landscape', sectionPageNumber: 6, blockStart: 3, blockEnd: 3 })
  })

  it('reuses DOM measurements until the edited block is invalidated', () => {
    const editor = document.createElement('div')
    const paragraph = document.createElement('p')
    let height = 40
    let reads = 0
    Object.defineProperty(paragraph, 'offsetHeight', {
      configurable: true,
      get() { reads += 1; return height },
    })
    editor.append(paragraph)
    const cache = createBlockMeasurementCache()

    expect(getBlockHeightsFromDOM(editor, cache)[0].height).toBe(40)
    height = 80
    expect(getBlockHeightsFromDOM(editor, cache)[0].height).toBe(40)
    expect(reads).toBe(1)

    cache.invalidate(paragraph)
    expect(getBlockHeightsFromDOM(editor, cache)[0].height).toBe(80)
    expect(reads).toBe(2)
    expect(cache.stats()).toEqual({ hits: 1, misses: 2 })
  })

  it('keeps logical block measurements independent from visual page zoom', () => {
    const surface = document.createElement('div')
    surface.className = 'kindy-page-editor-wrap'
    surface.style.setProperty('--page-zoom', '0.5')
    const editor = document.createElement('div')
    const paragraph = document.createElement('p')
    Object.defineProperty(paragraph, 'offsetHeight', { value: 40 })
    editor.append(paragraph)
    surface.append(editor)

    expect(getBlockHeightsFromDOM(editor)[0].height).toBe(40)
  })
})
