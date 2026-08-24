import { cmToPx } from './text-measurer'
import { PageSizes } from './page-sizes'

export const DEFAULT_PAGE_GAP = 24

const positiveNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const resolvePageHeight = (page, fallbackPageSize) => {
  const geometry = page?.geometry || {}
  return positiveNumber(geometry.pageHeight)
    || (positiveNumber(geometry.pageHeightCm) && cmToPx(Number(geometry.pageHeightCm)))
    || cmToPx(positiveNumber(fallbackPageSize?.height) || PageSizes.A4.height)
}

/**
 * Calculate the logical height of the complete paginated paper surface.
 * Content height is intentionally ignored: every page always contributes one
 * full physical sheet and only the inter-page gap is added between sheets.
 */
export function getDocumentSurfaceHeight(
  layoutPages,
  fallbackPageSize = PageSizes.A4,
  fallbackPageGap = DEFAULT_PAGE_GAP,
) {
  const pages = Array.isArray(layoutPages) && layoutPages.length > 0
    ? layoutPages
    : [null]

  return pages.reduce((total, page, index) => {
    const pageHeight = resolvePageHeight(page, fallbackPageSize)
    if (index === pages.length - 1) return total + pageHeight
    const pageGap = positiveNumber(page?.geometry?.pageGap) || fallbackPageGap
    return total + pageHeight + pageGap
  }, 0)
}

