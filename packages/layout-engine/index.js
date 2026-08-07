/**
 * UMO Editor 2.0 - Layout Engine
 * CPU Text Measurement, Line Breaking, and Physical Page Layout
 */

export class LayoutEngine {
  constructor(options = {}) {
    this.defaultPageSize = options.pageSize || { width: 794, height: 1123 } // A4 at 96 DPI
    this.margins = options.margins || { top: 96, bottom: 96, left: 96, right: 96 }
  }

  computeLayout(documentModel) {
    const pages = []
    let currentPage = this.createPage(1)

    for (const section of documentModel.sections) {
      for (const block of section.blocks) {
        // Measure block height
        const blockHeight = this.measureBlock(block)

        if (currentPage.currentHeight + blockHeight > currentPage.maxHeight) {
          pages.push(currentPage)
          currentPage = this.createPage(pages.length + 1)
        }

        currentPage.blocks.push({
          ...block,
          layoutTop: currentPage.currentHeight,
        })
        currentPage.currentHeight += blockHeight
      }
    }

    if (currentPage.blocks.length > 0 || pages.length === 0) {
      pages.push(currentPage)
    }

    return {
      totalPages: pages.length,
      pages,
    }
  }

  createPage(pageNumber) {
    const printableHeight = this.defaultPageSize.height - this.margins.top - this.margins.bottom
    return {
      pageNumber,
      blocks: [],
      currentHeight: 0,
      maxHeight: printableHeight,
    }
  }

  measureBlock(block) {
    // Basic CPU layout height estimator (to be connected to OffscreenCanvas font metrics)
    const textLength = block.inlines?.reduce((acc, curr) => acc + (curr.value?.length || 0), 0) || 0
    const estimatedLines = Math.max(1, Math.ceil(textLength / 65))
    return estimatedLines * 24 + 16 // line-height + block margins
  }
}
