import { describe, expect, it } from 'vitest'
import { defaultOptions } from '@/options'
import { getOptions } from '../options'

describe('editor options', () => {
  it('offers the complete ISO A-series used by contract page settings', () => {
    const paperSizes = Object.fromEntries(defaultOptions.dicts.pageSizes.map((size) => [size.label, size]))
    expect(Object.keys(paperSizes)).toEqual(expect.arrayContaining(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6']))
    expect(paperSizes.A4).toMatchObject({ width: 21, height: 29.7, default: true })
  })

  it('keeps v2 section metadata in page options', () => {
    const sections = [{
      id: 'section-1',
      size: { width: 21, height: 29.7 },
      orientation: 'portrait',
      margin: { top: 2, right: 2, bottom: 2, left: 2 },
    }]
    const options = getOptions({ page: { ...defaultOptions.page, sections } }, {})
    expect(options.page.sections).toEqual(sections)
    expect(options.editorKey).toBe('default')
  })
})
