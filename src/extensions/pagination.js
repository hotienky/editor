/**
 * Pagination Extension (High-Performance & Stable UI Engine)
 *
 * Integrates the Layout Engine with ProseMirror.
 * Computes page layout from REAL DOM block heights, tracks current page in O(1),
 * and injects non-intrusive page break decorations.
 *
 * Page breaks are NOT stored in the document — they are computed layout metadata.
 *
 * Architecture: Layer 2 ↔ Layer 3 Bridge
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { cmToPx } from '@umo/layout'
import { paginateFromDOM } from '@/utils/dom-page-calculator'

export const PaginationPluginKey = new PluginKey('pagination')

export const Pagination = Extension.create({
  name: 'pagination',

  addOptions() {
    return {
      onPageCountChange: null,
      onCurrentPageChange: null,
      onLayoutChange: null,
    }
  },

  addStorage() {
    return {
      totalPages: 1,
      currentPage: 1,
      pages: [
        {
          index: 0,
          pageNumber: 1,
          isFirst: true,
          isLast: true,
          isOdd: true,
        },
      ],
      layoutTree: null,
      isComputing: false,
    }
  },

  addCommands() {
    return {
      /**
       * Recompute page layout using REAL DOM block heights.
       * Runs asynchronously and safely updates decorations.
       */
      repaginate:
        () =>
        ({ editor }) => {
          if (!editor || !editor.view || !editor.state) return false

          // Prevent re-entrant computation
          if (this.storage.isComputing) return true
          this.storage.isComputing = true

          try {
            const editorDom = editor.view.dom
            if (!editorDom || !editorDom.isConnected) return false

            // Read actual DOM block heights and compute page assignments
            const pageAssignments = paginateFromDOM(editorDom, cmToPx)
            const totalPages = Math.max(1, pageAssignments.length)

            // Build layout tree structure
            const layoutPages = pageAssignments.map((p) => ({
              pageNumber: p.pageNumber,
              blockStart: p.blockStart,
              blockEnd: p.blockEnd,
              contentHeight: p.height,
              contentWidth: 0,
              isFirst: p.pageNumber === 1,
              isLast: p.pageNumber === totalPages,
              isOdd: p.pageNumber % 2 !== 0,
              endedByManualBreak: !!p.endedByManualBreak,
              header: {},
              footer: {},
              pageNumberDisplay: { text: String(p.pageNumber) },
            }))

            const layoutTree = {
              totalPages,
              pages: layoutPages,
              version: (this.storage.layoutTree?.version || 0) + 1,
            }

            // Update storage
            this.storage.totalPages = totalPages
            this.storage.layoutTree = layoutTree

            // Flat pages metadata
            this.storage.pages = layoutPages.map((page) => ({
              index: page.pageNumber - 1,
              pageNumber: page.pageNumber,
              isFirst: page.isFirst,
              isLast: page.isLast,
              isOdd: page.isOdd,
              contentHeight: page.contentHeight,
              contentWidth: page.contentWidth,
              header: page.header,
              footer: page.footer,
              pageNumberDisplay: page.pageNumberDisplay,
            }))

            // Notify callbacks
            if (this.options.onPageCountChange) {
              this.options.onPageCountChange(totalPages)
            }
            if (this.options.onLayoutChange) {
              this.options.onLayoutChange(layoutTree)
            }

            // Dispatch meta transaction to re-render decorations cleanly
            if (editor.view && editor.state) {
              const tr = editor.state.tr.setMeta(PaginationPluginKey, { repaginated: true })
              editor.view.dispatch(tr)
            }

            return true
          } catch (err) {
            console.warn('[Pagination] repaginate error:', err)
            return false
          } finally {
            this.storage.isComputing = false
          }
        },

      /**
       * Get current page number in O(1) time
       */
      getCurrentPage:
        () =>
        ({ editor }) => {
          if (!editor?.state) return 1

          const { from } = editor.state.selection
          const blockIndex = editor.state.doc.resolve(from).index(0)

          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return 1

          for (const page of layoutTree.pages) {
            if (blockIndex >= page.blockStart && blockIndex <= page.blockEnd) {
              return page.pageNumber
            }
          }

          return 1
        },

      /**
       * Navigate cursor to a specific page
       */
      goToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.state) return false

          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return false

          const targetPage = layoutTree.pages.find((p) => p.pageNumber === pageNumber)
          if (!targetPage) return false

          let targetPos = 0
          let blockIndex = 0

          editor.state.doc.forEach((node, offset) => {
            if (blockIndex === targetPage.blockStart) {
              targetPos = offset
            }
            blockIndex++
          })

          editor.commands.focus('end')
          const safePos = Math.min(targetPos + 1, editor.state.doc.content.size - 1)
          const resolvedPos = editor.state.doc.resolve(Math.max(0, safePos))
          editor.view.dispatch(
            editor.state.tr.setSelection(
              editor.state.selection.constructor.near(resolvedPos, 1),
            ),
          )

          return true
        },

      /**
       * Get layout tree for a specific page
       */
      getPageLayout:
        (pageNumber) =>
        () => {
          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return null
          return layoutTree.pages.find((p) => p.pageNumber === pageNumber) || null
        },

      /**
       * Scroll smoothly to a specific page
       */
      scrollToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.view) return false

          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return false

          const targetPage = layoutTree.pages.find((p) => p.pageNumber === pageNumber)
          if (!targetPage) return false

          const editorDom = editor.view.dom
          const topLevelChildren = Array.from(editorDom.children).filter(
            (el) =>
              !el.classList.contains('kindy-page-break-decoration') &&
              !el.classList.contains('ProseMirror-separator') &&
              !el.classList.contains('ProseMirror-widget'),
          )

          const targetBlock = topLevelChildren[targetPage.blockStart]
          if (targetBlock) {
            targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }

          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const extension = this
    let repaginateTimer = null
    let rafId = null

    // Debounced and RAF-batched repaginate for buttery-smooth typing
    const scheduleRepaginate = (delay = 200) => {
      if (repaginateTimer) clearTimeout(repaginateTimer)
      repaginateTimer = setTimeout(() => {
        repaginateTimer = null
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          rafId = null
          if (extension.editor && !extension.storage.isComputing) {
            extension.editor.commands.repaginate()
          }
        })
      }, delay)
    }

    return [
      new Plugin({
        key: PaginationPluginKey,

        view() {
          let initialDone = false
          return {
            update() {
              if (!initialDone) {
                initialDone = true
                // Initial pagination once DOM is fully rendered
                scheduleRepaginate(300)
              }
            },
            destroy() {
              if (repaginateTimer) clearTimeout(repaginateTimer)
              if (rafId) cancelAnimationFrame(rafId)
            },
          }
        },

        // Trigger layout recalculation on document content edits
        appendTransaction(transactions, _oldState, _newState) {
          const hasMeta = transactions.some(
            (tr) => tr.getMeta(PaginationPluginKey)?.repaginated,
          )
          if (hasMeta) return null

          if (transactions.some((tr) => tr.docChanged)) {
            scheduleRepaginate(200)
          }
          return null
        },

        // Fast O(1) cursor page tracking
        state: {
          init() {
            return { page: 1 }
          },
          apply(tr, value) {
            if (tr.selectionSet || tr.getMeta(PaginationPluginKey)?.repaginated) {
              try {
                const { from } = tr.selection
                const blockIndex = tr.doc.resolve(from).index(0)

                const { layoutTree } = extension.storage
                if (layoutTree?.pages) {
                  for (const page of layoutTree.pages) {
                    if (blockIndex >= page.blockStart && blockIndex <= page.blockEnd) {
                      if (page.pageNumber !== value.page) {
                        extension.storage.currentPage = page.pageNumber
                        if (extension.options.onCurrentPageChange) {
                          extension.options.onCurrentPageChange(page.pageNumber)
                        }
                        return { page: page.pageNumber }
                      }
                      return value
                    }
                  }
                }
              } catch (e) {
                // Ignore transient selection resolve errors during transactions
              }
            }
            return value
          },
        },

        // Provide layout decorations (subtle page separators between pages)
        props: {
          decorations(state) {
            const { layoutTree } = extension.storage
            if (!layoutTree?.pages || layoutTree.pages.length <= 1) {
              return DecorationSet.empty
            }

            // Build fast lookup: blockIndex → pageNumber
            // Skip pages that started right after a manual pageBreak node
            const breakAtBlock = new Map()
            for (let i = 1; i < layoutTree.pages.length; i++) {
              const page = layoutTree.pages[i]
              const prevPage = layoutTree.pages[i - 1]

              // If previous page was closed by a manual page break, the manual node
              // itself already serves as the visual divider. Don't add a duplicate bar!
              if (page.blockStart >= 0 && !prevPage?.endedByManualBreak) {
                breakAtBlock.set(page.blockStart, page.pageNumber)
              }
            }

            if (breakAtBlock.size === 0) return DecorationSet.empty

            const decos = []
            const { doc } = state
            let blockIndex = 0

            doc.forEach((_node, offset) => {
              const pageNum = breakAtBlock.get(blockIndex)
              if (pageNum !== undefined) {
                decos.push(
                  Decoration.widget(
                    offset,
                    () => {
                      const div = document.createElement('div')
                      div.className = 'kindy-page-break-decoration'
                      div.setAttribute('data-page', `Trang ${pageNum}`)
                      div.setAttribute('data-decoration', 'true')
                      div.setAttribute('contenteditable', 'false')
                      return div
                    },
                    { side: -1, key: `page-sep-${pageNum}`, ignoreSelection: true },
                  ),
                )
              }
              blockIndex++
            })

            if (decos.length === 0) return DecorationSet.empty
            return DecorationSet.create(doc, decos)
          },
        },
      }),
    ]
  },
})

export default Pagination
