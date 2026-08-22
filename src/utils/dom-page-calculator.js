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
export function getPageGeometry(editorDom, cmToPxFn) {
  const wrap = editorDom?.closest?.('.kindy-page-editor-wrap')

  if (wrap) {
    const style = getComputedStyle(wrap)
    const pageH   = readCssVarPx(style, '--kindy-page-height',         29.7, cmToPxFn)
    const marginT = readCssVarPx(style, '--kindy-page-margin-top',      2.54, cmToPxFn)
    const marginB = readCssVarPx(style, '--kindy-page-margin-bottom',   2.54, cmToPxFn)
    const headerH = readCssVarPx(style, '--kindy-header-height',        0,    cmToPxFn)
    const footerH = readCssVarPx(style, '--kindy-footer-height',        0,    cmToPxFn)

    const contentHeight = pageH - marginT - marginB - headerH - footerH
    if (contentHeight > 200) {
      return { pageHeight: pageH, contentHeight, marginTop: marginT, marginBottom: marginB, pageGap: 24 }
    }
  }

  // Fallback: standard A4 (29.7cm - 2.54cm * 2) ≈ 930px
  const pageHeight = cmToPxFn(29.7)
  const marginTop = cmToPxFn(2.54)
  const marginBottom = cmToPxFn(2.54)
  return { pageHeight, contentHeight: pageHeight - marginTop - marginBottom, marginTop, marginBottom, pageGap: 24 }
}

export function getPageContentHeight(editorDom, cmToPxFn) {
  return getPageGeometry(editorDom, cmToPxFn).contentHeight
}

/** Return the DOM elements that map one-to-one to top-level document nodes. */
export function getTopLevelBlockElements(editorDom) {
  if (!editorDom) return []
  return Array.from(editorDom.children).filter((child) => !(
    child.classList.contains('kindy-page-break-decoration') ||
    child.classList.contains('ProseMirror-separator') ||
    child.classList.contains('ProseMirror-widget') ||
    child.hasAttribute('data-decoration')
  ))
}

/** Per-editor DOM measurement cache which does not retain detached nodes. */
export function createBlockMeasurementCache() {
  let values = new WeakMap()
  let hits = 0
  let misses = 0

  return {
    get(element, layoutKey) {
      const entry = values.get(element)
      if (entry?.layoutKey === layoutKey) {
        hits += 1
        return entry.value
      }
      misses += 1
      return undefined
    },
    set(element, layoutKey, value) {
      values.set(element, { layoutKey, value })
    },
    invalidate(element) {
      if (element) values.delete(element)
    },
    invalidateAll() {
      values = new WeakMap()
    },
    stats() {
      return { hits, misses }
    },
  }
}

// ─── Block Height Reader ──────────────────────────────────────────────────

/**
 * Read actual pixel heights of all top-level blocks from the editor DOM.
 * GUARANTEES 1-to-1 correspondence with top-level nodes of the ProseMirror doc.
 *
 * @param {HTMLElement} editorDom - The ProseMirror .ProseMirror element
 * @returns {Array<{height: number, marginBefore: number, type: string, forceBreak: boolean, avoidBreak: boolean}>}
 */
export function getBlockHeightsFromDOM(editorDom, measurementCache) {
  if (!editorDom) return []

  // The page surface always lays out at 100%. View zoom is a parent transform,
  // so offsetHeight is already the canonical logical measurement.
  const layoutKey = 'logical-a4'
  const children = getTopLevelBlockElements(editorDom)
  const result = []

  for (const child of children) {
    const cached = measurementCache?.get(child, layoutKey)
    if (cached) {
      result.push(cached)
      continue
    }

    // Layout height (unaffected by parent CSS transforms)
    let logicalHeight = child.offsetHeight

    // Crucial: Fallback for empty lines (<p><br></p>) or unmeasured blocks.
    // NEVER skip a block, otherwise the array indices desynchronize with doc.child(i)!
    if (!logicalHeight || logicalHeight <= 0) {
      logicalHeight = 24 // standard single-line height fallback
    }

    const tagName = child.tagName?.toLowerCase() || ''
    const isManualPageBreak = child.classList.contains('kindy-page-break') || child.classList.contains('kindy-section-break')

    const isTable = tagName === 'table' || child.classList.contains('tableWrapper')
    const isImage =
      child.classList.contains('kindy-node-image') ||
      child.classList.contains('kindy-node-file') ||
      tagName === 'img'
    const isCodeBlock = child.classList.contains('kindy-code-block')
    const marginBefore = Number.parseFloat(getComputedStyle(child).marginTop) || 0

    const measurement = {
      height: logicalHeight,
      marginBefore,
      type: child.getAttribute('data-node-type') || tagName || 'block',
      forceBreak: isManualPageBreak,
      avoidBreak: (isTable || isImage || isCodeBlock) && !isManualPageBreak,
    }
    measurementCache?.set(child, layoutKey, measurement)
    result.push(measurement)
  }

  return result
}

// ─── High-Performance Page Calculator ─────────────────────────────────────

/**
 * Compute page assignments from block heights.
 *
 * @param {Array<{height: number, forceBreak: boolean, avoidBreak: boolean}>} blockHeights
 * @param {number} contentHeightPx - Available content height per page (px)
 * @returns {Array<{pageNumber: number, pageSpan: number, blockStart: number, blockEnd: number, height: number, remainingHeight: number, endedByManualBreak: boolean, manualBreakBlock: number|null}>}
 */
export function computePagesFromHeights(blockHeights, contentHeightPx, options = {}) {
  if (!blockHeights || blockHeights.length === 0) {
    return [{
      pageNumber: 1,
      pageSpan: 1,
      blockStart: 0,
      blockEnd: 0,
      height: 0,
      remainingHeight: contentHeightPx,
      endedByManualBreak: false,
      manualBreakBlock: null,
      geometry: options.initialGeometry || { contentHeight: contentHeightPx },
      sectionIndex: options.initialSection?.index || 0,
      sectionId: options.initialSection?.id || null,
      section: options.initialSection || null,
    }]
  }

  const pages = []
  let currentPageStart = 0
  let currentPageHeight = 0
  let pageNumber = 1
  let activeGeometry = options.initialGeometry || { contentHeight: contentHeightPx }
  let activeSection = options.initialSection || { index: 0, id: null, pageNumberStart: undefined }

  const closePage = (blockEnd, endedByManualBreak = false, manualBreakBlock = null) => {
    const activeContentHeight = activeGeometry.contentHeight || contentHeightPx
    const pageSpan = Math.max(1, Math.ceil(currentPageHeight / activeContentHeight))
    const usedOnLastPage = currentPageHeight > 0 ? currentPageHeight % activeContentHeight : 0
    const remainingHeight = usedOnLastPage === 0 && currentPageHeight > 0
      ? 0
      : Math.max(0, activeContentHeight - usedOnLastPage)
    const page = {
      pageNumber,
      pageSpan,
      blockStart: currentPageStart,
      blockEnd,
      height: currentPageHeight,
      remainingHeight,
      endedByManualBreak,
      manualBreakBlock,
      geometry: activeGeometry,
      sectionIndex: activeSection.index || 0,
      sectionId: activeSection.id || null,
      section: activeSection,
      sectionPageNumber: (activeSection.pageNumberStart || 1) + pages
        .filter((page) => page.sectionIndex === (activeSection.index || 0))
        .reduce((total, page) => total + page.pageSpan, 0),
    }
    pages.push(page)
    pageNumber += pageSpan
    return page
  }

  for (let i = 0; i < blockHeights.length; i++) {
    const block = blockHeights[i]
    const blockH = block.height + (Number.isFinite(block.marginBefore) ? block.marginBefore : 8)

    // ── 1. Manual Page Break Node ──────────────────────────────────────────
    if (block.forceBreak) {
      const closedPage = closePage(i - 1, true, i)
      closedPage.nextPageGeometry = block.nextPageGeometry || activeGeometry
      closedPage.nextSection = block.nextSection || activeSection
      if (block.nextPageGeometry) activeGeometry = block.nextPageGeometry
      if (block.nextSection) activeSection = block.nextSection
      currentPageStart = i + 1
      currentPageHeight = 0
      continue
    }

    // ── 2. Automatic Overflow Page Break ───────────────────────────────────
    const activeContentHeight = activeGeometry.contentHeight || contentHeightPx
    const usedOnLastPage = currentPageHeight > 0
      ? currentPageHeight % activeContentHeight || activeContentHeight
      : 0
    const wouldOverflow = usedOnLastPage + blockH > activeContentHeight && i > currentPageStart

    if (wouldOverflow) {
      closePage(i - 1)
      currentPageStart = i
      currentPageHeight = blockH
    } else {
      currentPageHeight += blockH
    }
  }

  // ── 3. Close the Final Page ──────────────────────────────────────────────
  const lastIndex = blockHeights.length - 1
  if (currentPageStart <= lastIndex || blockHeights[lastIndex]?.forceBreak) closePage(lastIndex)

  return pages
}

/**
 * All-in-one helper: read DOM heights, compute page content height, paginate.
 *
 * @param {HTMLElement} editorDom  - The .ProseMirror element
 * @param {Function}    cmToPxFn  - from @umo/layout
 * @returns {Array<{pageNumber: number, blockStart: number, blockEnd: number, height: number, endedByManualBreak: boolean}>}
 */
export function paginateFromDOM(editorDom, cmToPxFn, measurementCache, sectionLayout = {}) {
  const blockHeights = getBlockHeightsFromDOM(editorDom, measurementCache).map((block, index) => {
    const transition = sectionLayout.transitions?.get?.(index)
    return transition ? {
      ...block,
      nextPageGeometry: transition.geometry,
      nextSection: transition.section,
    } : block
  })
  const geometry = sectionLayout.initialGeometry || getPageGeometry(editorDom, cmToPxFn)
  return computePagesFromHeights(blockHeights, geometry.contentHeight, {
    initialGeometry: geometry,
    initialSection: sectionLayout.initialSection,
  }).map((page) => ({
    ...page,
    separatorOffset: page.remainingHeight + (page.geometry.marginBottom || 0),
    spacerHeight: page.remainingHeight + (page.geometry.marginBottom || 0) + (page.geometry.pageGap || 24) + (page.geometry.marginTop || 0),
    pageGap: page.geometry.pageGap || 24,
  }))
}
