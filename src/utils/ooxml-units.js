export const TWIPS_PER_INCH = 1440
export const CENTIMETERS_PER_INCH = 2.54
export const TWIPS_PER_CENTIMETER = TWIPS_PER_INCH / CENTIMETERS_PER_INCH

export const centimetersToTwips = (value) => {
  const centimeters = Number(value)
  return Number.isFinite(centimeters)
    ? Math.round(centimeters * TWIPS_PER_CENTIMETER)
    : 0
}

export const twipsToCentimeters = (value) => {
  const twips = Number(value)
  return Number.isFinite(twips) ? twips / TWIPS_PER_CENTIMETER : 0
}

export const getDocxLayoutTwips = (layout, name) => {
  if (!layout || typeof layout !== 'object') return 0
  const canonical = Number(layout[`${name}Twip`])
  if (Number.isFinite(canonical)) return Math.round(canonical)
  const legacyCentimeters = Number(layout[name])
  return Number.isFinite(legacyCentimeters)
    ? centimetersToTwips(legacyCentimeters)
    : 0
}

export const getDocxLayoutCentimeters = (layout, name) =>
  twipsToCentimeters(getDocxLayoutTwips(layout, name))
