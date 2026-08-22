/**
 * Page Number Computation
 *
 * Computes page numbers and provides formatting for display.
 * Supports various numbering formats (arabic, roman, etc.)
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Number Formats ────────────────────────────────────────────────────────

export const NumberFormat = {
  ARABIC: 'arabic',       // 1, 2, 3, ...
  ROMAN_LOWER: 'roman_lower', // i, ii, iii, ...
  ROMAN_UPPER: 'roman_upper', // I, II, III, ...
  LETTER_LOWER: 'letter_lower', // a, b, c, ...
  LETTER_UPPER: 'letter_upper', // A, B, C, ...
}

// ─── Roman Numerals ────────────────────────────────────────────────────────

const ROMAN_MAP = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

function toRoman(num, lowercase = false) {
  if (num <= 0 || num > 3999) return String(num)
  let result = ''
  for (const [value, symbol] of ROMAN_MAP) {
    while (num >= value) {
      result += symbol
      num -= value
    }
  }
  return lowercase ? result.toLowerCase() : result
}

// ─── Letter Numerals ───────────────────────────────────────────────────────

function toLetter(num, uppercase = false) {
  if (num <= 0) return String(num)
  let result = ''
  let n = num
  while (n > 0) {
    n--
    result = String.fromCharCode(97 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return uppercase ? result.toUpperCase() : result
}

// ─── Number Formatting ─────────────────────────────────────────────────────

/**
 * Format a page number
 * @param {number} num - Page number
 * @param {string} format - Number format
 * @returns {string}
 */
export function formatPageNumber(num, format = NumberFormat.ARABIC) {
  switch (format) {
    case NumberFormat.ROMAN_LOWER:
      return toRoman(num, true)
    case NumberFormat.ROMAN_UPPER:
      return toRoman(num, false)
    case NumberFormat.LETTER_LOWER:
      return toLetter(num, false)
    case NumberFormat.LETTER_UPPER:
      return toLetter(num, true)
    case NumberFormat.ARABIC:
    default:
      return String(num)
  }
}

// ─── Page Number Templates ─────────────────────────────────────────────────

/**
 * Available page number display templates
 */
export const PageNumberTemplate = {
  /** Page X */
  PAGE_X: (num, total, fmt) => `Page ${formatPageNumber(num, fmt)}`,

  /** Page X of Y */
  PAGE_X_OF_Y: (num, total, fmt) =>
    `Page ${formatPageNumber(num, fmt)} of ${formatPageNumber(total, fmt)}`,

  /** X / Y */
  SLASH: (num, total, fmt) =>
    `${formatPageNumber(num, fmt)} / ${formatPageNumber(total, fmt)}`,

  /** - X - */
  DASHES: (num, total, fmt) =>
    `- ${formatPageNumber(num, fmt)} -`,

  /** X */
  SIMPLE: (num, total, fmt) => formatPageNumber(num, fmt),
}

/**
 * Get formatted page number text
 * @param {number} pageNumber - Current page number
 * @param {number} totalPages - Total pages
 * @param {Object} options - Formatting options
 * @returns {string}
 */
export function getPageNumberText(pageNumber, totalPages, options = {}) {
  const {
    template = PageNumberTemplate.SLASH,
    format = NumberFormat.ARABIC,
    prefix = '',
    suffix = '',
  } = options

  const text = template(pageNumber, totalPages, format)
  return `${prefix}${text}${suffix}`
}

// ─── Page Number Positioning ───────────────────────────────────────────────

/**
 * Page number alignment options
 */
export const PageNumberAlign = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

/**
 * Get page number display configuration for a specific page
 * @param {number} pageNumber
 * @param {number} totalPages
 * @param {Object} options - Display options
 * @returns {{ text: string, align: string, visible: boolean }}
 */
export function getPageNumberDisplay(pageNumber, totalPages, options = {}) {
  const {
    showOnFirstPage = true,
    showOnLastPage = true,
    template = PageNumberTemplate.SLASH,
    format = NumberFormat.ARABIC,
    align = PageNumberAlign.CENTER,
    prefix = '',
    suffix = '',
  } = options

  // Check visibility
  if (!showOnFirstPage && pageNumber === 1) {
    return { text: '', align, visible: false }
  }
  if (!showOnLastPage && pageNumber === totalPages) {
    return { text: '', align, visible: false }
  }

  const text = getPageNumberText(pageNumber, totalPages, {
    template,
    format,
    prefix,
    suffix,
  })

  return { text, align, visible: true }
}

/**
 * Build page numbers for all pages
 * @param {number} totalPages
 * @param {Object} options
 * @param {Array<Object>} sectionConfigs - Array of section configs with pageNumberStart
 * @returns {Array<{page: number, text: string, align: string, visible: boolean}>}
 */
export function buildPageNumbers(totalPages, options = {}, sectionConfigs = []) {
  const numbers = []

  // Precompute section boundaries with restart offsets
  const sectionBoundaries = []
  let accumulatedOffset = 0
  for (let i = 0; i < sectionConfigs.length; i++) {
    const section = sectionConfigs[i]
    if (section.pageNumberRestart) {
      accumulatedOffset = (section.pageNumberStart || 1) - section.pageNumber
    }
    sectionBoundaries.push({
      pageNumber: section.pageNumber,
      offset: accumulatedOffset,
    })
  }

  for (let i = 1; i <= totalPages; i++) {
    // Find which section this page belongs to and get its offset
    let sectionOffset = 0
    for (const boundary of sectionBoundaries) {
      if (i >= boundary.pageNumber) {
        sectionOffset = boundary.offset
      }
    }

    const displayNumber = i + sectionOffset

    numbers.push({
      page: i,
      ...getPageNumberDisplay(displayNumber, totalPages, options),
    })
  }
  return numbers
}

export default {
  NumberFormat,
  PageNumberTemplate,
  PageNumberAlign,
  formatPageNumber,
  getPageNumberText,
  getPageNumberDisplay,
  buildPageNumbers,
}
