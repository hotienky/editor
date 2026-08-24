export type MarginUnit = 'mm' | 'cm' | 'inch' | 'pt'

export interface MarginPreset {
  label: string
  desc: string
  top: number // in mm
  right: number
  bottom: number
  left: number
}

export const MARGIN_PRESETS: MarginPreset[] = [
  {
    label: 'Normal',
    desc: '25.4 mm (1.00 in) các cạnh',
    top: 25.4,
    right: 25.4,
    bottom: 25.4,
    left: 25.4
  },
  {
    label: 'Narrow',
    desc: '12.7 mm (0.50 in) các cạnh',
    top: 12.7,
    right: 12.7,
    bottom: 12.7,
    left: 12.7
  },
  {
    label: 'Moderate',
    desc: 'Trên/Dưới 25.4 mm, Trái/Phải 19.1 mm',
    top: 25.4,
    right: 19.1,
    bottom: 25.4,
    left: 19.1
  },
  {
    label: 'Wide',
    desc: 'Trên/Dưới 25.4 mm, Trái/Phải 50.8 mm',
    top: 25.4,
    right: 50.8,
    bottom: 25.4,
    left: 50.8
  }
]

export const PAPER_PRESETS: Record<
  string,
  { label: string; width: number; height: number }
> = {
  a4: { label: 'A4 (210 × 297 mm)', width: 794, height: 1123 },
  a3: { label: 'A3 (297 × 420 mm)', width: 1125, height: 1593 },
  a5: { label: 'A5 (148 × 210 mm)', width: 565, height: 796 },
  letter: { label: 'Letter (8.5 × 11 in)', width: 813, height: 1054 },
  legal: { label: 'Legal (8.5 × 14 in)', width: 813, height: 1266 },
  custom: { label: 'Tùy chỉnh (Custom)', width: 794, height: 1123 }
}

// 1 inch = 25.4 mm = 2.54 cm = 72 pt = 96 px
export const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4)
export const pxToMm = (px: number) => (px * 25.4) / 96

/** Convert any unit to canonical mm */
export const toMm = (val: number, unit: MarginUnit): number => {
  const num = Number(val) || 0
  switch (unit) {
    case 'mm':
      return num
    case 'cm':
      return num * 10
    case 'inch':
      return num * 25.4
    case 'pt':
      return (num * 25.4) / 72
    default:
      return num
  }
}

/** Convert canonical mm to target unit with appropriate precision */
export const fromMm = (mm: number, toUnit: MarginUnit): number => {
  const num = Number(mm) || 0
  switch (toUnit) {
    case 'mm':
      return Number(num.toFixed(1))
    case 'cm':
      return Number((num / 10).toFixed(2))
    case 'inch':
      return Number((num / 25.4).toFixed(2))
    case 'pt':
      return Number(((num * 72) / 25.4).toFixed(1))
    default:
      return num
  }
}

/** Convert directly between two units */
export const convertUnit = (
  val: number,
  fromUnit: MarginUnit,
  toUnit: MarginUnit
): number => {
  if (fromUnit === toUnit) return Number(val) || 0
  const inMm = toMm(val, fromUnit)
  return fromMm(inMm, toUnit)
}

export const UNIT_CONFIG: Record<
  MarginUnit,
  { label: string; addon: string; step: number; precision: number; max: number }
> = {
  inch: { label: 'Inches (in)', addon: 'in', step: 0.1, precision: 2, max: 10 },
  mm: { label: 'Milimét (mm)', addon: 'mm', step: 1, precision: 1, max: 200 },
  cm: { label: 'Centimét (cm)', addon: 'cm', step: 0.1, precision: 2, max: 20 },
  pt: { label: 'Points (pt)', addon: 'pt', step: 1, precision: 1, max: 600 }
}

export interface PreviewValues {
  topMm: number
  rightMm: number
  bottomMm: number
  leftMm: number
  gutterMm: number
  gutterPosition: 'left' | 'top'
  headerMm: number
  footerMm: number
  columnCount: number
  columnSpacingMm: number
  columnSeparator: boolean
  width: number
  height: number
}
