import { describe, expect, it } from 'vitest'
import {
  ISOAPageSizes,
  PageSizes,
  getDocumentSurfaceHeight,
  getOrientedPageSize,
} from '../src/index'

describe('paper geometry', () => {
  it('ships the ISO A0-A6 portrait catalogue with exact centimetre dimensions', () => {
    expect(Object.keys(ISOAPageSizes)).toEqual(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
    expect(PageSizes).toMatchObject({
      A1: { width: 59.4, height: 84.1 },
      A2: { width: 42, height: 59.4 },
      A3: { width: 29.7, height: 42 },
      A4: { width: 21, height: 29.7 },
      A5: { width: 14.8, height: 21 },
    })
  })

  it('swaps physical dimensions only for landscape orientation', () => {
    expect(getOrientedPageSize(PageSizes.A3, 'portrait')).toEqual({ width: 29.7, height: 42 })
    expect(getOrientedPageSize(PageSizes.A3, 'landscape')).toEqual({ width: 42, height: 29.7 })
  })

  it('reserves one complete physical sheet for every page, including the final page', () => {
    const pages = Array.from({ length: 3 }, (_, index) => ({
      pageNumber: index + 1,
      contentHeight: index === 2 ? 12 : 800,
      geometry: { pageHeight: 1_000, pageGap: 24 },
    }))

    expect(getDocumentSurfaceHeight(pages, PageSizes.A4)).toBe(3_048)
  })

  it('supports mixed section geometry without using content height as paper height', () => {
    const pages = [
      { contentHeight: 900, geometry: { pageHeight: 1_100, pageGap: 30 } },
      { contentHeight: 1, geometry: { pageHeight: 800, pageGap: 24 } },
    ]

    expect(getDocumentSurfaceHeight(pages, PageSizes.A4)).toBe(1_930)
  })
})

