/**
 * Text Measurer
 *
 * Measures text dimensions using Canvas API (headless, no DOM dependency).
 * Foundation of the Layout Engine — computes line breaks and overflow.
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Measurement Cache ─────────────────────────────────────────────────────

const _cache = new Map()
const MAX_CACHE_SIZE = 10_000

// ─── Canvas Context (singleton) ────────────────────────────────────────────

let _canvas = null
let _ctx = null

function getCanvasContext() {
  if (typeof document === 'undefined') {
    // Headless (Node.js) — return mock
    return null
  }
  if (!_ctx) {
    _canvas = document.createElement('canvas')
    _canvas.width = 1
    _canvas.height = 1
    _ctx = _canvas.getContext('2d')
  }
  return _ctx
}

// ─── Unit Conversion ───────────────────────────────────────────────────────

const CM_TO_PX = 96 / 2.54
const PT_TO_PX = 96 / 72
const INCH_TO_PX = 96

let _cmToPx = null

/**
 * Get accurate cm-to-px conversion factor
 * @returns {number}
 */
export function getCmToPx() {
  if (_cmToPx !== null) return _cmToPx

  if (typeof document === 'undefined') {
    _cmToPx = CM_TO_PX
    return _cmToPx
  }

  const test = document.createElement('div')
  test.style.width = '1cm'
  test.style.position = 'absolute'
  test.style.left = '-9999px'
  test.style.visibility = 'hidden'
  document.body.appendChild(test)
  _cmToPx = test.offsetWidth || CM_TO_PX
  document.body.removeChild(test)
  return _cmToPx
}

/**
 * Convert cm to pixels
 * @param {number} cm
 * @returns {number}
 */
export function cmToPx(cm) {
  return cm * getCmToPx()
}

/**
 * Convert pixels to cm
 * @param {number} px
 * @returns {number}
 */
export function pxToCm(px) {
  return px / getCmToPx()
}

/**
 * Convert pt to pixels
 * @param {number} pt
 * @returns {number}
 */
export function ptToPx(pt) {
  return pt * PT_TO_PX
}

// ─── Font String Builder ───────────────────────────────────────────────────

/**
 * Build a Canvas font string from style properties
 * @param {Object} style
 * @returns {string}
 */
function buildFontString(style = {}) {
  const {
    fontSize = 16,
    fontFamily = 'Arial',
    fontWeight = 'normal',
    fontStyle = 'normal',
    fontVariant = 'normal',
  } = style

  return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}px ${fontFamily}`
}

// ─── Cache Key Builder ─────────────────────────────────────────────────────

function getCacheKey(text, style) {
  return `${text}|${style.fontSize || 16}|${style.fontFamily || 'Arial'}|${style.fontWeight || 'normal'}|${style.fontStyle || 'normal'}`
}

// ─── Text Measurement ──────────────────────────────────────────────────────

/**
 * Measure a single text string
 * @param {string} text - Text to measure
 * @param {Object} style - Font style properties
 * @returns {{ width: number, height: number }}
 */
export function measureText(text, style = {}) {
  if (!text && text !== '') return { width: 0, height: 0 }

  const cacheKey = getCacheKey(text, style)
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey)
  }

  const ctx = getCanvasContext()
  if (!ctx) {
    // Headless fallback: estimate based on character count
    const avgCharWidth = (style.fontSize || 16) * 0.6
    return {
      width: text.length * avgCharWidth,
      height: (style.fontSize || 16) * 1.2,
    }
  }

  ctx.font = buildFontString(style)
  const metrics = ctx.measureText(text)

  const result = {
    width: Math.ceil(metrics.width),
    height: Math.ceil(
      (metrics.fontBoundingBoxAscent || 0) +
      (metrics.fontBoundingBoxDescent || 0) ||
      (style.fontSize || 16) * 1.2,
    ),
  }

  // Cache management
  if (_cache.size >= MAX_CACHE_SIZE) {
    const firstKey = _cache.keys().next().value
    _cache.delete(firstKey)
  }
  _cache.set(cacheKey, result)

  return result
}

/**
 * Measure text with word-level granularity
 * @param {string} text - Text to measure
 * @param {Object} style - Font style properties
 * @returns {{ words: Array<{text: string, width: number}>, totalWidth: number }}
 */
export function measureWords(text, style = {}) {
  if (!text) return { words: [], totalWidth: 0 }

  const words = text.split(/(\s+)/)
  let totalWidth = 0
  const wordMetrics = []

  for (const word of words) {
    const { width } = measureText(word, style)
    wordMetrics.push({ text: word, width })
    totalWidth += width
  }

  return { words: wordMetrics, totalWidth }
}

// ─── Line Breaking ─────────────────────────────────────────────────────────

/**
 * Break text into lines that fit within a given width
 * @param {string} text - Text to break
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {Object} style - Font style properties
 * @returns {Array<{text: string, width: number, words: string[]}>}
 */
export function breakTextIntoLines(text, maxWidth, style = {}) {
  if (!text || maxWidth <= 0) return []

  const { words } = measureWords(text, style)
  const lines = []
  let currentLine = []
  let currentWidth = 0

  for (const word of words) {
    const testWidth = currentWidth + word.width

    if (testWidth > maxWidth && currentLine.length > 0) {
      // Flush current line
      lines.push({
        text: currentLine.join(''),
        width: currentWidth,
        words: [...currentLine],
      })
      currentLine = []
      currentWidth = 0
    }

    // Skip leading whitespace on new line
    if (currentLine.length === 0 && /^s+$/.test(word.text)) {
      continue
    }

    currentLine.push(word.text)
    currentWidth += word.width
  }

  // Flush remaining
  if (currentLine.length > 0) {
    lines.push({
      text: currentLine.join(''),
      width: currentWidth,
      words: currentLine,
    })
  }

  return lines
}

/**
 * Calculate the number of lines needed for text
 * @param {string} text - Text to measure
 * @param {number} maxWidth - Maximum line width
 * @param {Object} style - Font style properties
 * @param {number} lineHeight - Line height multiplier
 * @returns {{ lineCount: number, totalHeight: number, lines: Array }}
 */
export function calculateLineMetrics(text, maxWidth, style = {}, lineHeight = 1.5) {
  const lines = breakTextIntoLines(text, maxWidth, style)
  const fontSize = style.fontSize || 16
  const lineHeightPx = fontSize * lineHeight

  return {
    lineCount: lines.length,
    totalHeight: lines.length * lineHeightPx,
    lineHeightPx,
    lines,
  }
}

// ─── Block Measurement ─────────────────────────────────────────────────────

/**
 * Estimate block node height based on content and style
 * @param {Object} node - AST node
 * @param {number} contentWidth - Available content width in pixels
 * @param {Object} defaults - Default style properties
 * @returns {number} Estimated height in pixels
 */
export function estimateBlockHeight(node, contentWidth, defaults = {}) {
  if (!node) return 0

  const fontSize = defaults.fontSize || 16
  const lineHeight = defaults.lineHeight || 1.5
  const lineHeightPx = fontSize * lineHeight

  // Base height depends on node type
  const {type} = node
  const attrs = node.attrs || {}

  switch (type) {
    case 'paragraph':
    case 'heading': {
      const text = extractTextFromNode(node)
      if (!text.trim()) return lineHeightPx // Empty paragraph

      const level = attrs.level || 1
      const headingFontSize = fontSize * (1 + (6 - level) * 0.1)
      const headingLineHeight = headingFontSize * (lineHeight + 0.1)
      const { lineCount } = calculateLineMetrics(
        text,
        contentWidth,
        { fontSize: headingFontSize, fontFamily: defaults.fontFamily },
        lineHeight + 0.1,
      )
      return lineCount * headingLineHeight
    }

    case 'codeBlock': {
      const text = extractTextFromNode(node)
      const lines = text.split('\n').length || 1
      return lines * lineHeightPx + 32 // padding
    }

    case 'blockquote': {
      const children = node.children || []
      let height = 32 // padding
      for (const child of children) {
        height += estimateBlockHeight(child, contentWidth - 32, defaults)
      }
      return height
    }

    case 'image': {
      return (attrs.height || 200) + 40 // image + caption space
    }

    case 'video': {
      return (attrs.height || 200) + 16
    }

    case 'audio': {
      return 64
    }

    case 'file': {
      return 64
    }

    case 'iframe': {
      return (attrs.height || 200) + 16
    }

    case 'echarts': {
      return (attrs.height || 300) + 16
    }

    case 'horizontalRule': {
      return 24
    }

    case 'table': {
      const rows = node.children?.length || 1
      return rows * 40 + 2 // borders
    }

    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      const items = node.children?.length || 1
      return items * lineHeightPx + 16
    }

    case 'callout': {
      const children = node.children || []
      let height = 24 // padding
      for (const child of children) {
        height += estimateBlockHeight(child, contentWidth - 32, defaults)
      }
      return height
    }

    case 'columnContainer': {
      const columns = node.children || []
      let maxHeight = 0
      for (const col of columns) {
        const colHeight = estimateColumnHeight(col, contentWidth, defaults)
        maxHeight = Math.max(maxHeight, colHeight)
      }
      return maxHeight
    }

    case 'toc': {
      return 120 // placeholder
    }

    case 'blockMath': {
      return 60
    }

    default: {
      // Generic block
      const text = extractTextFromNode(node)
      if (text) {
        const { lineCount } = calculateLineMetrics(text, contentWidth, {
          fontSize,
          fontFamily: defaults.fontFamily,
        }, lineHeight)
        return lineCount * lineHeightPx
      }
      return lineHeightPx
    }
  }
}

/**
 * Estimate column height
 * @param {Object} columnNode - Column node
 * @param {number} totalWidth - Total container width
 * @param {Object} defaults - Default styles
 * @returns {number}
 */
function estimateColumnHeight(columnNode, totalWidth, defaults) {
  const colWidth = columnNode.attrs?.colWidth || totalWidth / 2
  const children = columnNode.children || []
  let height = 16 // padding

  for (const child of children) {
    height += estimateBlockHeight(child, colWidth - 32, defaults)
  }

  return height
}

/**
 * Extract plain text from a node tree
 * @param {Object} node
 * @returns {string}
 */
function extractTextFromNode(node) {
  if (!node) return ''
  if (node.text !== undefined) return node.text
  if (!node.children) return ''
  return node.children.map(extractTextFromNode).join('')
}

// ─── Cache Management ──────────────────────────────────────────────────────

/**
 * Clear measurement cache
 */
export function clearCache() {
  _cache.clear()
}

/**
 * Get cache size
 * @returns {number}
 */
export function getCacheSize() {
  return _cache.size
}

export default {
  cmToPx,
  pxToCm,
  ptToPx,
  getCmToPx,
  measureText,
  measureWords,
  breakTextIntoLines,
  calculateLineMetrics,
  estimateBlockHeight,
  clearCache,
  getCacheSize,
}
