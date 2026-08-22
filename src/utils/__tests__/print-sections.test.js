import { describe, expect, it } from 'vitest'
import { resolvePrintPageConfig } from '../print-sections'

describe('section-aware print config', () => {
  const fallback = {
    orientation: 'portrait',
    size: { width: 21, height: 29.7 },
    margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
    background: '#fff',
    header: { enable: false },
    footer: { enable: false },
  }

  it('uses landscape geometry, restarted numbering and first/even variants', () => {
    const section = {
      id: 'landscape',
      orientation: 'landscape',
      size: { width: 21, height: 29.7 },
      margin: { top: 1, right: 1, bottom: 1, left: 1 },
      header: {
        enable: true,
        text: 'Default',
        differentFirstPage: true,
        differentOddEven: true,
        variants: { first: { text: 'First' }, even: { text: 'Even' } },
      },
    }
    const entries = [
      { layout: { sectionId: 'portrait', sectionIndex: 0, sectionPageNumber: 1 } },
      { layout: { sectionId: 'landscape', sectionIndex: 1, sectionPageNumber: 5, section: { config: section } } },
      { layout: { sectionId: 'landscape', sectionIndex: 1, sectionPageNumber: 6, section: { config: section } } },
    ]

    expect(resolvePrintPageConfig(entries[1], 1, entries, fallback)).toMatchObject({
      sectionId: 'landscape', sectionPageNumber: 5, pageWidth: 29.7, pageHeight: 21,
      margin: section.margin, header: { text: 'First' },
    })
    expect(resolvePrintPageConfig(entries[2], 2, entries, fallback).header.text).toBe('Even')
  })
})
