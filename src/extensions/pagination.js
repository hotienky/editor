/**
 * Pagination Extension
 *
 * Integrates the Layout Engine with ProseMirror.
 * Computes page layout from document AST, tracks current page,
 * and provides layout data to the Render Engine.
 *
 * Page breaks are NOT stored in the document — they are computed layout metadata.
 *
 * Architecture: Layer 2 ↔ Layer 3 Bridge
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getLayoutEngine } from '@umo/layout'
import { getPageFromScroll } from '@umo/layout'

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
       * Recompute page layout using the Layout Engine.
       * This does NOT modify the document — it computes layout metadata only.
       */
      repaginate:
        () =>
        ({ editor }) => {
          if (!editor || !editor.view) return false

          // Prevent re-entrant computation
          if (this.storage.isComputing) return true
          this.storage.isComputing = true

          try {
            const layoutEngine = getLayoutEngine()

            // Get document nodes (top-level blocks)
            const nodes = []
            editor.state.doc.forEach((node) => {
              nodes.push(node.toJSON())
            })

            // Get page options from editor storage or options
            const pageOptions = editor.storage.page || {}

            // Compute layout using the Layout Engine
            const layoutTree = layoutEngine.computeAndCache(nodes, pageOptions)

            // Update storage with layout results
            this.storage.totalPages = layoutTree.totalPages
            this.storage.layoutTree = layoutTree

            // Update pages metadata
            this.storage.pages = layoutTree.pages.map((page) => ({
              index: page.pageNumber - 1,
              pageNumber: page.pageNumber,
              isFirst: page.pageNumber === 1,
              isLast: page.pageNumber === layoutTree.totalPages,
              isOdd: page.pageNumber % 2 !== 0,
              contentHeight: page.contentHeight,
              contentWidth: page.contentWidth,
              header: page.header,
              footer: page.footer,
              pageNumberDisplay: page.pageNumberDisplay,
            }))

            // Notify callbacks
            if (this.options.onPageCountChange) {
              this.options.onPageCountChange(layoutTree.totalPages)
            }
            if (this.options.onLayoutChange) {
              this.options.onLayoutChange(layoutTree)
            }

            return true
          } finally {
            this.storage.isComputing = false
          }
        },

      /**
       * Get the current page number based on cursor position
       */
      getCurrentPage:
        () =>
        ({ editor }) => {
          if (!editor?.state) return 1

          const { from } = editor.state.selection
          let blockIndex = 0

          editor.state.doc.forEach((node, offset) => {
            if (offset < from) {
              blockIndex++
            }
          })

          const {layoutTree} = this.storage
          if (!layoutTree?.pages) return 1

          // Find which page this block belongs to
          for (const page of layoutTree.pages) {
            if (blockIndex >= page.blockStart && blockIndex <= page.blockEnd) {
              return page.pageNumber
            }
          }

          return 1
        },

      /**
       * Navigate to a specific page
       */
      goToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.state) return false

          const {layoutTree} = this.storage
          if (!layoutTree?.pages) return false

          const targetPage = layoutTree.pages.find(
            (p) => p.pageNumber === pageNumber,
          )
          if (!targetPage) return false

          // Find the first block on the target page
          let targetPos = 0
          let blockIndex = 0

          editor.state.doc.forEach((node, offset) => {
            if (blockIndex === targetPage.blockStart) {
              targetPos = offset
            }
            blockIndex++
          })

          // Focus and set cursor to the target position
          editor.commands.focus('end')
          const resolvedPos = editor.state.doc.resolve(
            Math.min(targetPos, editor.state.doc.content.size - 1),
          )
          editor.view.dispatch(
            editor.state.tr.setSelection(
              editor.state.Selection.near(resolvedPos, 1),
            ),
          )

          return true
        },

      /**
       * Get layout tree for a specific page
       */
      getPageLayout:
        (pageNumber) =>
        ({ editor }) => {
          const {layoutTree} = this.storage
          if (!layoutTree?.pages) return null
          return layoutTree.pages.find((p) => p.pageNumber === pageNumber) || null
        },

      /**
       * Scroll to bring a page into view
       */
      scrollToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.view) return false

          const container = editor.view.dom.closest('.kindy-zoomable-container')
          if (!container) return false

          const {layoutTree} = this.storage
          if (!layoutTree?.pages) return false

          const pageOptions = editor.storage.page || {}
          const zoomLevel = pageOptions.zoomLevel || 100

          // Calculate scroll position
          const { scrollToPage } = require('@/layout/page-calculator')
          const scrollTop = scrollToPage(pageNumber, layoutTree.pages, zoomLevel)

          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          })

          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const extension = this
    let repaginateTimer = null

    return [
      new Plugin({
        key: PaginationPluginKey,

        // Watch for document changes and trigger re-layout
        appendTransaction(transactions, oldState, newState) {
          if (transactions.some((tr) => tr.docChanged)) {
            if (repaginateTimer) clearTimeout(repaginateTimer)
            repaginateTimer = setTimeout(() => {
              if (extension.editor && !extension.storage.isComputing) {
                extension.editor.commands.repaginate()
              }
            }, 150)
          }
        },

        // Track current page from cursor position
        state: {
          init() {
            return { page: 1 }
          },
          apply(tr, value) {
            if (tr.selection) {
              const { doc } = tr
              const { from } = tr.selection
              let blockIndex = 0

              doc.forEach((node, offset) => {
                if (offset < from) {
                  blockIndex++
                }
              })

              const {layoutTree} = extension.storage
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
            }
            return value
          },
        },

        // Provide layout decorations (page separators, etc.)
        props: {
          decorations(state) {
            const {layoutTree} = extension.storage
            if (!layoutTree?.pages || layoutTree.pages.length <= 1) {
              return DecorationSet.empty
            }

            // Find block-level positions where page breaks should occur
            const decos = []
            const {doc} = state
            let blockIndex = 0

            doc.forEach((node, offset) => {
              // Check if this block starts a new page
              for (const page of layoutTree.pages) {
                if (page.blockStart === blockIndex && page.pageNumber > 1) {
                  // Insert a page break decoration before this block
                  decos.push(
                    Decoration.widget(offset, (view) => {
                      const div = document.createElement('div')
                      div.className = 'kindy-page-break-decoration'
                      div.setAttribute('data-page', `Page ${page.pageNumber}`)
                      return div
                    }, { side: -1, key: `page-break-${page.pageNumber}` })
                  )
                }
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
