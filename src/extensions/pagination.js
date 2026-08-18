import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Pagination Extension
 *
 * Implements A4 Multi-page pagination:
 * 1. Handles Page Breaks: calculates the exact distance needed to push the next
 *    element to the top of the next A4 sheet (accounting for bottom margin, page gap, and top margin).
 * 2. Handles Auto-overflow: pushes blocks that cross the page bottom boundary
 *    to the top of the next page.
 * 3. Updates total page count reactively in `editor.storage.pagination.pageCount`.
 */

const PAGINATION_PLUGIN_KEY = new PluginKey('pagination')

// 1cm in pixels (standard 96 DPI CSS reference pixel: 96 / 2.54 ≈ 37.79527559)
const CM_TO_PX = 37.79527559

export default Extension.create({
  name: 'pagination',

  addOptions() {
    return {
      // Page dimensions in cm (default A4: 21.0 x 29.7 cm)
      pageWidth: 21.0,
      pageHeight: 29.7,
      // Margins in cm
      marginTop: 2.5,
      marginBottom: 2.5,
      marginLeft: 3.0,
      marginRight: 2.0,
      // Gap between visual page sheets (in px)
      pageGap: 24,
      // Whether pagination is enabled
      enabled: true,
    }
  },

  addStorage() {
    return {
      pageCount: 1,
      totalHeight: 0,
      contentHeightPerPage: 0,
      fullPageHeight: 0,
      _updateFn: null,
      _raf: 0,
      _observer: null,
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: PAGINATION_PLUGIN_KEY,

        view(editorView) {
          const storage = extension.storage

          const recalculate = () => {
            const opts = extension.options
            const editorEl = editorView.dom
            if (!editorEl) return

            if (!opts.enabled) {
              clearPaginationSpacers(editorEl)
              storage.pageCount = 1
              storage.totalHeight = 0
              return
            }

            const fullPageHeightPx = opts.pageHeight * CM_TO_PX
            const marginTopPx = opts.marginTop * CM_TO_PX
            const marginBottomPx = opts.marginBottom * CM_TO_PX
            const gap = opts.pageGap
            const contentHPx = fullPageHeightPx - marginTopPx - marginBottomPx

            storage.contentHeightPerPage = contentHPx
            storage.fullPageHeight = fullPageHeightPx

            // Step 1: Reset existing dynamic spacers on page breaks and overflow blocks
            clearPaginationSpacers(editorEl)

            const children = Array.from(editorEl.children).filter(
              (el) => el.nodeType === Node.ELEMENT_NODE && el.offsetHeight >= 0,
            )

            if (children.length === 0) {
              storage.pageCount = 1
              storage.totalHeight = fullPageHeightPx
              return
            }

            const editorRect = editorEl.getBoundingClientRect()
            const editorTop = editorRect.top

            let currentPageIndex = 0

            // Helper to get the top/bottom of a page in editor coordinate space
            const getPageContentTop = (pageIdx) =>
              pageIdx * (fullPageHeightPx + gap) + marginTopPx
            const getPageContentBottom = (pageIdx) =>
              pageIdx * (fullPageHeightPx + gap) + fullPageHeightPx - marginBottomPx

            for (let i = 0; i < children.length; i++) {
              const child = children[i]
              const isPageBreak = child.classList.contains('kindy-page-break')

              const childRect = child.getBoundingClientRect()
              const childTop = childRect.top - editorTop
              const childBottom = childRect.bottom - editorTop

              // Determine current page of this child based on childTop
              while (childTop > getPageContentBottom(currentPageIndex)) {
                currentPageIndex++
              }

              if (isPageBreak) {
                // When a Page Break is encountered:
                // Push the next element to the start of the next page!
                const nextPageContentTop = getPageContentTop(currentPageIndex + 1)
                const spacer = Math.max(30, nextPageContentTop - childTop)

                child.style.height = `${spacer}px`
                child.style.marginBottom = '0px'
                child.dataset.paginationPageBreak = 'true'

                // Advance to next page for subsequent elements
                currentPageIndex++
              } else {
                // Check if this regular block overflows the bottom margin of the current page
                const currentContentBottom = getPageContentBottom(currentPageIndex)

                // If the block crosses the bottom boundary (and didn't start at the very top of the page)
                if (
                  childBottom > currentContentBottom &&
                  childTop < currentContentBottom &&
                  childTop > getPageContentTop(currentPageIndex) + 20
                ) {
                  // Push this block to the top of next page
                  const nextPageContentTop = getPageContentTop(currentPageIndex + 1)
                  const spacer = nextPageContentTop - childTop

                  child.style.marginTop = `${spacer}px`
                  child.dataset.paginationSpacer = 'true'

                  currentPageIndex++
                }
              }
            }

            const finalPageCount = Math.max(1, currentPageIndex + 1)
            storage.pageCount = finalPageCount
            storage.totalHeight =
              finalPageCount * fullPageHeightPx + (finalPageCount - 1) * gap
          }

          const scheduleRecalculate = () => {
            if (storage._raf) {
              cancelAnimationFrame(storage._raf)
            }
            storage._raf = requestAnimationFrame(() => {
              storage._raf = 0
              recalculate()
            })
          }

          storage._updateFn = scheduleRecalculate

          // Initial run after DOM is ready
          setTimeout(scheduleRecalculate, 100)

          // Observe DOM changes (content addition, resizing, etc.)
          if (typeof ResizeObserver !== 'undefined') {
            storage._observer = new ResizeObserver(() => {
              scheduleRecalculate()
            })
            storage._observer.observe(editorView.dom)
          }

          return {
            update() {
              scheduleRecalculate()
            },
            destroy() {
              if (storage._raf) {
                cancelAnimationFrame(storage._raf)
              }
              if (storage._observer) {
                storage._observer.disconnect()
                storage._observer = null
              }
            },
          }
        },
      }),
    ]
  },
})

function clearPaginationSpacers(editorEl) {
  const breaks = editorEl.querySelectorAll('[data-pagination-page-break]')
  for (const el of breaks) {
    el.style.height = ''
    el.style.marginBottom = ''
    delete el.dataset.paginationPageBreak
  }

  const spacered = editorEl.querySelectorAll('[data-pagination-spacer]')
  for (const el of spacered) {
    el.style.marginTop = ''
    delete el.dataset.paginationSpacer
  }
}
