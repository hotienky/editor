/**
 * DOM Block Height Reader & Page Calculator (High-Performance Engine)
 *
 * Reads REAL pixel heights of each top-level block directly from the
 * ProseMirror DOM (using offsetHeight — unaffected by parent transforms/zoom).
 *
 * Ensures 1-to-1 mapping with ProseMirror top-level document nodes.
 *
 * Architecture: Layer 2 — ProseMirror Integration
 */

// ─── CSS Variable & Geometry Reader ────────────────────────────────────────

/**
 * Read a CSS custom property that holds a cm value (e.g. "2.54cm")
 * and convert it to pixels using the provided cm→px function.
 *
 * @param {CSSStyleDeclaration} style
 * @param {string} varName
 * @param {number} defaultCm
 * @param {Function} cmToPxFn
 * @returns {number} value in px
 */
function readCssVarPx(style, varName, defaultCm, cmToPxFn) {
  const raw = style?.getPropertyValue(varName)?.trim()
  if (raw) {
    const cm = parseFloat(raw)
    if (!isNaN(cm) && cm > 0) return cmToPxFn(cm)
  }
  return cmToPxFn(defaultCm)
}

/**
 * Calculate the available content height (px) for one page.
 * Reads CSS variables from the .kindy-page-editor-wrap element.
 *
 * @param {HTMLElement} editorDom   - The ProseMirror .ProseMirror element
 * @param {Function}   cmToPxFn    - cm-to-px converter from @umo/layout
 * @returns {number}  Content area height in pixels (logical, before zoom)
 */
export function getPageContentHeight(editorDom, cmToPxFn) {
  const wrap = editorDom?.closest?.('.kindy-page-editor-wrap')

  if (wrap) {
    const style = getComputedStyle(wrap)
    const pageH   = readCssVarPx(style, '--kindy-page-height',         29.7, cmToPxFn)
    const marginT = readCssVarPx(style, '--kindy-page-margin-top',      2.54, cmToPxFn)
    const marginB = readCssVarPx(style, '--kindy-page-margin-bottom',   2.54, cmToPxFn)
    const headerH = readCssVarPx(style, '--kindy-header-height',        0,    cmToPxFn)
    const footerH = readCssVarPx(style, '--kindy-footer-height',        0,    cmToPxFn)

    const contentH = pageH - marginT - marginB - headerH - footerH
    if (contentH > 200) return contentH
  }

  // Fallback: standard A4 (29.7cm - 2.54cm * 2) ≈ 930px
  return cmToPxFn(29.7) - cmToPxFn(2.54) * 2
}

/**
 * Read the zoom factor from CSS variable --page-zoom on the wrapper.
 *
 * @param {HTMLElement} editorDom
 * @returns {number} zoom factor (1 = 100%)
 */
function getEditorZoom(editorDom) {
  const wrap = editorDom?.closest?.('.kindy-page-editor-wrap')
  if (!wrap) return 1
  const raw = getComputedStyle(wrap).getPropertyValue('--page-zoom')?.trim()
  const z = parseFloat(raw)
  return (!isNaN(z) && z > 0) ? z : 1
}

// ─── Block Height Reader ──────────────────────────────────────────────────

/**
 * Read actual pixel heights of all top-level blocks from the editor DOM.
 * GUARANTEES 1-to-1 correspondence with top-level nodes of the ProseMirror doc.
 *
 * @param {HTMLElement} editorDom - The ProseMirror .ProseMirror element
 * @returns {Array<{height: number, type: string, forceBreak: boolean, avoidBreak: boolean}>}
 */
export function getBlockHeightsFromDOM(editorDom) {
  if (!editorDom) return []

  const zoom = getEditorZoom(editorDom)
  const children = Array.from(editorDom.children)
  const result = []

  for (const child of children) {
    // Skip ProseMirror injected widgets and decorations
    if (
      child.classList.contains('kindy-page-break-decoration') ||
      child.classList.contains('ProseMirror-separator') ||
      child.classList.contains('ProseMirror-widget') ||
      child.hasAttribute('data-decoration')
    ) {
      continue
    }

    // Layout height (unaffected by parent CSS transforms)
    let logicalHeight = child.offsetHeight
    if (zoom !== 1 && logicalHeight > 0) {
      logicalHeight = logicalHeight / zoom
    }

    // Crucial: Fallback for empty lines (<p><br></p>) or unmeasured blocks.
    // NEVER skip a block, otherwise the array indices desynchronize with doc.child(i)!
    if (!logicalHeight || logicalHeight <= 0) {
      logicalHeight = 24 // standard single-line height fallback
    }

    const tagName = child.tagName?.toLowerCase() || ''
    const isManualPageBreak = child.classList.contains('kindy-page-break')

    const isTable = tagName === 'table' || child.classList.contains('tableWrapper')
    const isImage =
      child.classList.contains('kindy-node-image') ||
      child.classList.contains('kindy-node-file') ||
      tagName === 'img'
    const isCodeBlock = child.classList.contains('kindy-code-block')

    result.push({
      height: logicalHeight,
      type: child.getAttribute('data-node-type') || tagName || 'block',
      forceBreak: isManualPageBreak,
      avoidBreak: (isTable || isImage || isCodeBlock) && !isManualPageBreak,
    })
  }

  return result
}

// ─── High-Performance Page Calculator ─────────────────────────────────────

/**
 * Compute page assignments from block heights.
 *
 * @param {Array<{height: number, forceBreak: boolean, avoidBreak: boolean}>} blockHeights
 * @param {number} contentHeightPx - Available content height per page (px)
 * @returns {Array<{pageNumber: number, blockStart: number, blockEnd: number, height: number, endedByManualBreak: boolean}>}
 */
export function computePagesFromHeights(blockHeights, contentHeightPx) {
  if (!blockHeights || blockHeights.length === 0) {
    return [{
      pageNumber: 1,
      blockStart: 0,
      blockEnd: 0,
      height: 0,
      endedByManualBreak: false,
    }]
  }

  // Inter-block gap (margin-bottom between top-level blocks in editor)
  const NODE_GAP_PX = 8

  const pages = []
  let currentPageStart = 0
  let currentPageHeight = 0
  let pageNumber = 1

  for (let i = 0; i < blockHeights.length; i++) {
    const block = blockHeights[i]
    const blockH = block.height + NODE_GAP_PX

    // ── 1. Manual Page Break Node ──────────────────────────────────────────
    if (block.forceBreak) {
      // If we have blocks before this break on the current page, close it
      if (i > currentPageStart) {
        pages.push({
          pageNumber,
          blockStart: currentPageStart,
          blockEnd: i - 1,
          height: currentPageHeight,
          endedByManualBreak: true,
        })
        pageNumber++
      }
      // The manual break node itself acts as the divider. Next page starts at i + 1.
      currentPageStart = i + 1
      currentPageHeight = 0
      continue
    }

    // ── 2. Automatic Overflow Page Break ───────────────────────────────────
    const wouldOverflow =
      currentPageHeight + blockH > contentHeightPx && i > currentPageStart

    if (wouldOverflow) {
      pages.push({
        pageNumber,
        blockStart: currentPageStart,
        blockEnd: i - 1,
        height: currentPageHeight,
        endedByManualBreak: false,
      })
      pageNumber++
      currentPageStart = i
      currentPageHeight = blockH
    } else {
      currentPageHeight += blockH
    }
  }

  // ── 3. Close the Final Page ──────────────────────────────────────────────
  const lastIndex = blockHeights.length - 1
  if (currentPageStart <= lastIndex) {
    pages.push({
      pageNumber,
      blockStart: currentPageStart,
      blockEnd: lastIndex,
      height: currentPageHeight,
      endedByManualBreak: false,
    })
  } else if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      blockStart: 0,
      blockEnd: lastIndex >= 0 ? lastIndex : 0,
      height: 0,
      endedByManualBreak: false,
    })
  }

  return pages
}

/**
 * All-in-one helper: read DOM heights, compute page content height, paginate.
 *
 * @param {HTMLElement} editorDom  - The .ProseMirror element
 * @param {Function}    cmToPxFn  - from @umo/layout
 * @returns {Array<{pageNumber: number, blockStart: number, blockEnd: number, height: number, endedByManualBreak: boolean}>}
 */
export function paginateFromDOM(editorDom, cmToPxFn) {
  const blockHeights = getBlockHeightsFromDOM(editorDom)
  const contentHeightPx = getPageContentHeight(editorDom, cmToPxFn)
  return computePagesFromHeights(blockHeights, contentHeightPx)
}
