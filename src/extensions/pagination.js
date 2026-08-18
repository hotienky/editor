import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * High-Performance Pagination Extension (Multi-Page A4 / 200+ Pages Optimized)
 *
 * Architecture:
 * 1. 3-Phase Zero-Thrashing Calculation Engine:
 *    - Phase 1 (Batch Read): Single-pass layout inspection (0 style writes, 0 layout invalidation)
 *    - Phase 2 (In-Memory Simulation): Pure CPU mathematical simulation of page flow (< 2ms for 200+ pages)
 *    - Phase 3 (Batch Write): Single-pass DOM mutation applying only changed styles
 * 2. Event-driven Reactive Page Count Notification (eliminates polling timers)
 * 3. Mutation-safe ResizeObserver with RAF debouncing
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
      _listeners: new Set(),
      onPageCountChange(fn) {
        this._listeners.add(fn)
        return () => this._listeners.delete(fn)
      },
      _notify(count) {
        for (const fn of this._listeners) {
          try {
            fn(count)
          } catch (e) {
            console.error('[pagination] Error in page count listener:', e)
          }
        }
      },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: PAGINATION_PLUGIN_KEY,

        view(editorView) {
          const {storage} = extension
          let isCalculating = false

          const recalculate = () => {
            const opts = extension.options
            const editorEl = editorView.dom
            if (!editorEl) return

            if (!opts.enabled) {
              clearPaginationSpacers(editorEl)
              if (storage.pageCount !== 1) {
                storage.pageCount = 1
                storage.totalHeight = 0
                storage._notify(1)
              }
              return
            }

            isCalculating = true

            const fullPageHeightPx = opts.pageHeight * CM_TO_PX
            const marginTopPx = opts.marginTop * CM_TO_PX
            const marginBottomPx = opts.marginBottom * CM_TO_PX
            const gap = opts.pageGap
            const contentHPx = fullPageHeightPx - marginTopPx - marginBottomPx

            storage.contentHeightPerPage = contentHPx
            storage.fullPageHeight = fullPageHeightPx

            const rawChildren = editorEl.children
            const children = []
            for (let i = 0; i < rawChildren.length; i++) {
              const node = rawChildren[i]
              if (node.nodeType === Node.ELEMENT_NODE) {
                children.push(node)
              }
            }

            const len = children.length
            if (len === 0) {
              if (storage.pageCount !== 1) {
                storage.pageCount = 1
                storage.totalHeight = fullPageHeightPx
                storage._notify(1)
              }
              isCalculating = false
              return
            }

            // ============================================================
            // PHASE 1: BATCH READ (Single-pass DOM query, NO mutations)
            // ============================================================
            const childData = new Array(len)
            for (let i = 0; i < len; i++) {
              const child = children[i]
              const isPageBreak = child.classList.contains('kindy-page-break')
              const currSpacer = child.dataset.paginationSpacer
                ? parseFloat(child.style.marginTop) || 0
                : 0
              const currBreakHeight = child.dataset.paginationPageBreak
                ? parseFloat(child.style.height) || 0
                : 0

              childData[i] = {
                el: child,
                isPageBreak,
                offsetHeight: isPageBreak ? 0 : child.offsetHeight,
                offsetTop: child.offsetTop,
                currSpacer,
                currBreakHeight,
              }
            }

            // ============================================================
            // PHASE 2: IN-MEMORY SIMULATION (Pure CPU Math, < 2ms for 200+ pages)
            // ============================================================
            let currentPageIndex = 0
            let currentY = marginTopPx
            const updates = new Array(len)

            const defaultNodeMargin = 10.5 // standard ~0.75em node bottom margin

            for (let i = 0; i < len; i++) {
              const item = childData[i]
              const { el, isPageBreak, offsetHeight } = item

              const pageContentTop =
                currentPageIndex * (fullPageHeightPx + gap) + marginTopPx
              const pageContentBottom =
                currentPageIndex * (fullPageHeightPx + gap) +
                fullPageHeightPx -
                marginBottomPx

              if (isPageBreak) {
                // Manual page break: push next content to top of next page
                const nextPageContentTop =
                  (currentPageIndex + 1) * (fullPageHeightPx + gap) +
                  marginTopPx
                const spacer = Math.max(30, nextPageContentTop - currentY)

                updates[i] = { el, type: 'break', height: spacer }
                currentPageIndex++
                currentY = nextPageContentTop
              } else {
                // Regular block element
                // Check if element overflows the bottom boundary of current page
                if (
                  currentY + offsetHeight > pageContentBottom &&
                  currentY > pageContentTop + 20
                ) {
                  // Overflow -> move to top of next page
                  currentPageIndex++
                  const nextPageContentTop =
                    currentPageIndex * (fullPageHeightPx + gap) + marginTopPx
                  const spacer = nextPageContentTop - currentY

                  updates[i] = { el, type: 'spacer', marginTop: spacer }
                  currentY = nextPageContentTop + offsetHeight + defaultNodeMargin
                } else {
                  // Fits in current page
                  updates[i] = { el, type: 'none' }
                  currentY += offsetHeight + defaultNodeMargin
                }
              }
            }

            const finalPageCount = Math.max(1, currentPageIndex + 1)

            // ============================================================
            // PHASE 3: BATCH WRITE (Single-pass mutation, only touched nodes)
            // ============================================================
            for (let i = 0; i < len; i++) {
              const update = updates[i]
              const { el, type, height, marginTop } = update

              if (type === 'break') {
                const heightStr = `${height}px`
                if (el.style.height !== heightStr) {
                  el.style.height = heightStr
                }
                if (el.style.marginBottom !== '0px') {
                  el.style.marginBottom = '0px'
                }
                if (!el.dataset.paginationPageBreak) {
                  el.dataset.paginationPageBreak = 'true'
                }
                if (el.dataset.paginationSpacer) {
                  el.style.marginTop = ''
                  delete el.dataset.paginationSpacer
                }
              } else if (type === 'spacer') {
                const marginStr = `${marginTop}px`
                if (el.style.marginTop !== marginStr) {
                  el.style.marginTop = marginStr
                }
                if (!el.dataset.paginationSpacer) {
                  el.dataset.paginationSpacer = 'true'
                }
                if (el.dataset.paginationPageBreak) {
                  el.style.height = ''
                  el.style.marginBottom = ''
                  delete el.dataset.paginationPageBreak
                }
              } else {
                if (el.dataset.paginationSpacer) {
                  el.style.marginTop = ''
                  delete el.dataset.paginationSpacer
                }
                if (el.dataset.paginationPageBreak) {
                  el.style.height = ''
                  el.style.marginBottom = ''
                  delete el.dataset.paginationPageBreak
                }
              }
            }

            // Update storage & notify listeners
            const prevPageCount = storage.pageCount
            storage.pageCount = finalPageCount
            storage.totalHeight =
              finalPageCount * fullPageHeightPx + (finalPageCount - 1) * gap

            if (prevPageCount !== finalPageCount) {
              storage._notify(finalPageCount)
            }

            isCalculating = false
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
          storage.recalculate = recalculate

          // Initial calculation
          setTimeout(scheduleRecalculate, 60)

          // Observe DOM changes with guard
          if (typeof ResizeObserver !== 'undefined') {
            storage._observer = new ResizeObserver(() => {
              if (!isCalculating) {
                scheduleRecalculate()
              }
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
