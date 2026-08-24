/**
 * Keep ruler labels readable while the physical page is visually scaled.
 * Tick geometry still follows the document centimetre grid; only labels are
 * thinned out when there is not enough screen space for every number.
 */
export function getRulerLabelInterval(pxPerCentimeter, minimumLabelSpacing = 18) {
  const density = Number(pxPerCentimeter)
  if (!Number.isFinite(density) || density <= 0) return 1
  return Math.max(1, Math.ceil(minimumLabelSpacing / density))
}

export function shouldShowRulerLabel(centimeter, interval) {
  const value = Number(centimeter)
  const step = Math.max(1, Math.floor(Number(interval) || 1))
  return Number.isInteger(value) && value > 0 && value % step === 0
}
