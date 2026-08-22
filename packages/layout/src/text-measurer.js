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

// ─── CJK Detection ─────────────────────────────────────────────────────────

/**
 * Check if a character is CJK (Chinese, Japanese, Korean)
 * @param {string} char
 * @returns {boolean}
 */
function isCJK(char) {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
    (code >= 0x20000 && code <= 0x2A6DF) || // CJK Extension B
    (code >= 0x2A700 && code <= 0x2B73F) || // CJK Extension C
    (code >= 0x2B740 && code <= 0x2B81F) || // CJK Extension D
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (code >= 0x2F800 && code <= 0x2FA1F) || // CJK Compatibility Supplement
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols and Punctuation
    (code >= 0x3040 && code <= 0x309F) ||   // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) ||   // Katakana
    (code >= 0x31F0 && code <= 0x31FF) ||   // Katakana Phonetic Extensions
    (code >= 0xAC00 && code <= 0xD7AF) ||   // Hangul Syllables
    (code >= 0x1100 && code <= 0x11FF) ||   // Hangul Jamo
    (code >= 0x3130 && code <= 0x318F) ||   // Hangul Compatibility Jamo
    (code >= 0xA960 && code <= 0xA97F) ||   // Hangul Jamo Extended-A
    (code >= 0xD7B0 && code <= 0xD7FF)      // Hangul Jamo Extended-B
  )
}

/**
 * Check if text contains CJK characters
 * @param {string} text
 * @returns {boolean}
 */
function containsCJK(text) {
  for (const char of text) {
    if (isCJK(char)) return true
  }
  return false
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
    const result = {
      width: text.length * avgCharWidth,
      height: (style.fontSize || 16) * 1.2,
    }
    // Cache the result even in headless mode
    if (_cache.size >= MAX_CACHE_SIZE) {
      const firstKey = _cache.keys().next().value
      _cache.delete(firstKey)
    }
    _cache.set(cacheKey, result)
    return result
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

// ─── Line Breaking (Greedy Algorithm) ──────────────────────────────────────

/**
 * Break text into lines that fit within a given width (greedy algorithm)
 * @param {string} text - Text to break
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {Object} style - Font style properties
 * @returns {Array<{text: string, width: number, words: string[]}>}
 */
export function breakTextIntoLines(text, maxWidth, style = {}) {
  if (!text || maxWidth <= 0) return []

  // For CJK text, break at character level
  if (containsCJK(text)) {
    return breakCJKTextIntoLines(text, maxWidth, style)
  }

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
    if (currentLine.length === 0 && /^\s+$/.test(word.text)) {
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
 * Break CJK text into lines (character-level breaking)
 * @param {string} text - CJK text to break
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {Object} style - Font style properties
 * @returns {Array<{text: string, width: number, words: string[]}>}
 */
function breakCJKTextIntoLines(text, maxWidth, style = {}) {
  const lines = []
  let currentLine = ''
  let currentWidth = 0

  for (const char of text) {
    const { width } = measureText(char, style)
    const testWidth = currentWidth + width

    if (testWidth > maxWidth && currentLine.length > 0) {
      lines.push({
        text: currentLine,
        width: currentWidth,
        words: [currentLine],
      })
      currentLine = ''
      currentWidth = 0
    }

    currentLine += char
    currentWidth += width
  }

  // Flush remaining
  if (currentLine.length > 0) {
    lines.push({
      text: currentLine,
      width: currentWidth,
      words: [currentLine],
    })
  }

  return lines
}

// ─── Knuth-Plass Line Breaking Algorithm ───────────────────────────────────

/**
 * Knuth-Plass optimal line breaking algorithm
 * Produces more aesthetically pleasing line breaks by considering the
 * entire paragraph at once, minimizing the sum of squared raggedness.
 *
 * @param {string} text - Text to break
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {Object} style - Font style properties
 * @param {Object} options - Algorithm options
 * @param {number} options.raggedPenalty - Penalty for ragged lines (default: 10)
 * @param {number} options.hyphenPenalty - Penalty for hyphenated lines (default: 50)
 * @param {number} options.excessPenalty - Penalty for lines exceeding maxWidth (default: 10000)
 * @returns {Array<{text: string, width: number, words: string[], isHyphenated: boolean}>}
 */
export function breakTextOptimal(text, maxWidth, style = {}, options = {}) {
  if (!text || maxWidth <= 0) return []

  const {
    raggedPenalty = 10,
    hyphenPenalty = 50,
    excessPenalty = 10000,
  } = options

  // Split text into words (tokens)
  const tokens = text.split(/(\s+)/)
  const n = tokens.length

  if (n === 0) return []

  // Calculate width of each token
  const tokenWidths = tokens.map(token => measureText(token, style).width)

  // Calculate natural breaks (positions where we can break)
  const breakpoints = []
  for (let i = 0; i < n; i++) {
    if (i === 0 || /^\s+$/.test(tokens[i])) {
      breakpoints.push(i)
    }
  }
  breakpoints.push(n) // End position

  // Calculate prefix sums for efficient width calculation
  const prefixWidths = new Array(n + 1).fill(0)
  for (let i = 0; i < n; i++) {
    prefixWidths[i + 1] = prefixWidths[i] + tokenWidths[i]
  }

  // Helper function to calculate line width between two breakpoints
  function lineWidth(start, end) {
    return prefixWidths[end] - prefixWidths[start]
  }

  // Helper function to calculate fitness class (0-4)
  function fitnessClass(lineWidth) {
    const ratio = lineWidth / maxWidth
    if (ratio < 0.5) return 0
    if (ratio < 0.75) return 1
    if (ratio < 1.0) return 2
    if (ratio <= 1.0) return 3
    return 4
  }

  // Dynamic programming to find optimal breakpoints
  const m = breakpoints.length
  const dp = new Array(m).fill(Infinity)
  const parent = new Array(m).fill(-1)
  const fitness = new Array(m).fill(0)

  dp[0] = 0

  for (let i = 1; i < m; i++) {
    for (let j = 0; j < i; j++) {
      const breakPos = breakpoints[i]
      const prevBreak = breakpoints[j]

      if (breakPos > n) continue

      const width = lineWidth(prevBreak, breakPos)

      // Skip if line is too short and there's more content
      if (width < maxWidth * 0.5 && i < m - 1) continue

      // Calculate cost
      let cost = 0

      if (width > maxWidth) {
        // Line exceeds maximum width
        cost += excessPenalty
      } else {
        // Calculate raggedness (squared slack)
        const slack = maxWidth - width
        cost += slack * slack

        // Add penalty for ragged lines
        if (i < m - 1) { // Not the last line
          cost += raggedPenalty
        }
      }

      // Add fitness class change penalty
      const currentFitness = fitnessClass(width)
      if (j > 0 && Math.abs(currentFitness - fitness[j]) > 1) {
        cost += 100 // Penalty for drastic fitness change
      }

      const totalCost = dp[j] + cost

      if (totalCost < dp[i]) {
        dp[i] = totalCost
        parent[i] = j
        fitness[i] = currentFitness
      }
    }
  }

  // Reconstruct optimal line breaks
  const optimalBreaks = []
  let current = m - 1
  while (current > 0) {
    optimalBreaks.unshift(breakpoints[current])
    current = parent[current]
  }

  // Build result lines
  const lines = []
  let startPos = 0

  for (const endPos of optimalBreaks) {
    const lineTokens = tokens.slice(startPos, endPos)
    const lineText = lineTokens.join('')
    const lineW = lineWidth(startPos, endPos)

    lines.push({
      text: lineText,
      width: lineW,
      words: lineTokens,
      isHyphenated: false,
    })

    startPos = endPos
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
  const { type } = node
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
      // Estimate based on heading count (approximate)
      const headingCount = (node.children?.length) || 5
      return Math.max(40, headingCount * 24 + 40)
    }

    case 'blockMath': {
      // Estimate based on content length
      const mathText = extractTextFromNode(node) || ''
      const mathLines = Math.max(1, Math.ceil(mathText.length / 60))
      return mathLines * lineHeightPx + 32
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
  breakTextOptimal,
  calculateLineMetrics,
  estimateBlockHeight,
  clearCache,
  getCacheSize,
}
