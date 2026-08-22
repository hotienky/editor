import { describe, expect, it } from 'vitest'
import { defaultOptions } from '@/options'
import { getOptions } from '../options'

describe('editor options', () => {
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
