import { describe, expect, it } from 'vitest'
import { countFixtureNodes, createLongDocumentFixture } from '../long-document'

describe('long document performance fixture', () => {
  it('creates stable 100-page semantic content with explicit boundaries', () => {
    const state = createLongDocumentFixture({ pages: 100 })
    expect(state.content.content.filter((node) => node.type === 'pageBreak')).toHaveLength(99)
    expect(state.content.content.filter((node) => node.type === 'paragraph')).toHaveLength(800)
    expect(countFixtureNodes(state)).toBeGreaterThan(1_800)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it.each(['table', 'image', 'review', 'mixed', 'section'])('creates the %s stress variant', (variant) => {
    const state = createLongDocumentFixture({ pages: 3, paragraphsPerPage: 2, variant })
    const automaticBreaks = state.content.content.filter((node) => node.type === 'pageBreak').length
    const sectionBreaks = state.content.content.filter((node) => node.type === 'sectionBreak').length
    expect(automaticBreaks + sectionBreaks).toBe(2)
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    if (variant === 'table') expect(JSON.stringify(state.content)).toContain('tableCell')
    if (variant === 'image') expect(JSON.stringify(state.content)).toContain('inlineImage')
    if (variant === 'review') expect(JSON.stringify(state.content)).toContain('trackChange')
    if (variant === 'section') {
      expect(state.content.content.some((node) => node.type === 'sectionBreak')).toBe(true)
      expect(state.page.sections).toHaveLength(2)
    }
  })
})
