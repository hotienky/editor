/**
 * Layout Web Worker
 *
 * Offloads layout computation to a web worker for better performance.
 * Runs layout calculations in a separate thread to avoid blocking the main UI.
 *
 * Architecture: Layer 3 — Layout Engine
 */

// ─── Worker Initialization ─────────────────────────────────────────────────

let initialized = false
let config = null

// ─── Message Handler ───────────────────────────────────────────────────────

self.onmessage = async function(e) {
  const { type, payload, id } = e.data

  try {
    switch (type) {
      case 'INIT':
        await handleInit(payload)
        self.postMessage({ type: 'INIT_COMPLETE', id })
        break

      case 'LAYOUT':
        await handleLayout(payload, id)
        break

      case 'MEASURE':
        await handleMeasure(payload, id)
        break

      case 'RESIZE':
        await handleResize(payload, id)
        break

      default:
        self.postMessage({ type: 'ERROR', error: `Unknown message type: ${type}`, id })
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message, id })
  }
}

// ─── Handlers ──────────────────────────────────────────────────────────────

async function handleInit(payload) {
  config = payload.config
  initialized = true
}

async function handleLayout(payload, id) {
  if (!initialized) {
    self.postMessage({ type: 'ERROR', error: 'Worker not initialized', id })
    return
  }

  const { doc, options } = payload

  // Compute layout
  const result = computeLayout(doc, options)

  self.postMessage({ type: 'LAYOUT_COMPLETE', result, id })
}

async function handleMeasure(payload, id) {
  if (!initialized) {
    self.postMessage({ type: 'ERROR', error: 'Worker not initialized', id })
    return
  }

  const { nodes, width, defaults } = payload

  // Measure nodes
  const result = measureNodes(nodes, width, defaults)

  self.postMessage({ type: 'MEASURE_COMPLETE', result, id })
}

async function handleResize(payload, id) {
  if (!initialized) {
    self.postMessage({ type: 'ERROR', error: 'Worker not initialized', id })
    return
  }

  const { newConfig } = payload
  config = newConfig

  self.postMessage({ type: 'RESIZE_COMPLETE', id })
}

// ─── Layout Computation ────────────────────────────────────────────────────

function computeLayout(doc, options) {
  const { nodes, pageConfig, defaults } = doc
  const contentArea = getContentArea(pageConfig)

  // Compute block heights
  const blocks = nodes.map((node, index) => ({
    height: estimateBlockHeight(node, contentArea.widthPx, defaults),
    pos: index,
    type: node.type || 'unknown',
  }))

  // Compute page breaks
  const pageBreaks = computePageBreaks(blocks, pageConfig)

  // Compute final layout
  const layout = {
    contentArea,
    blocks,
    pages: pageBreaks.pages,
    breaks: pageBreaks.breaks,
    totalHeight: pageBreaks.totalHeight,
    totalPages: pageBreaks.totalPages,
  }

  return layout
}

function measureNodes(nodes, width, defaults) {
  return nodes.map(node => ({
    height: estimateBlockHeight(node, width, defaults),
    type: node.type || 'unknown',
  }))
}

// ─── Helper Functions (duplicated from main thread for worker) ──────────────

function cmToPx(cm) {
  const DPI = 96
  const CM_PER_INCH = 2.54
  return (cm / CM_PER_INCH) * DPI
}

function getContentArea(config) {
  const { pageWidth, pageHeight, margin, header, footer } = config

  const widthCm = pageWidth - margin.left - margin.right
  const heightCm = pageHeight - margin.top - margin.bottom -
    (header.enable ? header.height : 0) -
    (footer.enable ? footer.height : 0)

  return {
    widthCm,
    heightCm,
    widthPx: cmToPx(widthCm),
    heightPx: cmToPx(heightCm),
  }
}

function estimateBlockHeight(node, contentWidth, defaults) {
  // Simplified estimation - in real implementation, this would use the full text measurer
  const lineHeight = 24 // Default line height in px

  if (node.type === 'heading') {
    const headingLevel = node.level || 1
    return lineHeight * (3 - headingLevel * 0.3)
  }

  if (node.type === 'paragraph') {
    const textLength = node.textContent?.length || 0
    const charsPerLine = contentWidth / 8 // Approximate characters per line
    const lines = Math.ceil(textLength / charsPerLine)
    return lines * lineHeight
  }

  if (node.type === 'image') {
    return node.height || 200
  }

  if (node.type === 'table') {
    const rows = node.content?.length || 1
    return rows * lineHeight * 1.5
  }

  return lineHeight * 2
}

function computePageBreaks(blocks, config) {
  const contentArea = getContentArea(config)
  const availableHeight = contentArea.heightPx

  if (!blocks || blocks.length === 0) {
    return {
      breaks: [],
      pages: [{
        pageNumber: 1,
        blockStart: 0,
        blockEnd: -1,
        startY: 0,
        height: 0,
      }],
      totalHeight: 0,
      totalPages: 1,
    }
  }

  const breaks = []
  const pages = []
  let currentPageStart = 0
  let currentY = 0
  let totalPages = 1

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const blockHeight = block.height || 0

    if (currentY + blockHeight > availableHeight && currentPageStart < i) {
      breaks.push({
        blockIndex: i,
        blockPos: block.pos,
        prevBlockPos: blocks[i - 1]?.pos || 0,
      })

      pages.push({
        pageNumber: totalPages,
        blockStart: currentPageStart,
        blockEnd: i - 1,
        startY: pages.length > 0
          ? pages[pages.length - 1].startY + pages[pages.length - 1].height
          : 0,
        height: currentY,
      })

      totalPages++
      currentPageStart = i
      currentY = blockHeight
    } else {
      currentY += blockHeight
    }
  }

  pages.push({
    pageNumber: totalPages,
    blockStart: currentPageStart,
    blockEnd: blocks.length - 1,
    startY: pages.length > 0
      ? pages[pages.length - 1].startY + pages[pages.length - 1].height
      : 0,
    height: currentY,
  })

  return {
    breaks,
    pages,
    totalHeight: currentY,
    totalPages,
  }
}
