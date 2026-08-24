/**
 * Canonical paper-size catalogue used by layout, UI and print/export code.
 * Dimensions are ISO 216 portrait dimensions in centimetres.
 */

export const ISOAPageSizes = Object.freeze({
  A0: Object.freeze({ width: 84.1, height: 118.9 }),
  A1: Object.freeze({ width: 59.4, height: 84.1 }),
  A2: Object.freeze({ width: 42, height: 59.4 }),
  A3: Object.freeze({ width: 29.7, height: 42 }),
  A4: Object.freeze({ width: 21, height: 29.7 }),
  A5: Object.freeze({ width: 14.8, height: 21 }),
  A6: Object.freeze({ width: 10.5, height: 14.8 }),
})

export const PageSizes = Object.freeze({
  ...ISOAPageSizes,
  B5: Object.freeze({ width: 17.6, height: 25 }),
  LETTER: Object.freeze({ width: 21.59, height: 27.94 }),
  LEGAL: Object.freeze({ width: 21.59, height: 35.56 }),
})

export function getOrientedPageSize(size = PageSizes.A4, orientation = 'portrait') {
  const width = Number(size?.width) || PageSizes.A4.width
  const height = Number(size?.height) || PageSizes.A4.height
  return orientation === 'landscape'
    ? { width: height, height: width }
    : { width, height }
}
