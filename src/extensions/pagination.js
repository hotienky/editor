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
import {
  createBlockMeasurementCache,
  getPageGeometry,
  getTopLevelBlockElements,
  paginateFromDOM,
} from '@/utils/dom-page-calculator'

export const PaginationPluginKey = new PluginKey('pagination')

const sectionGeometry = (section, convert, fallback) => {
  if (!section?.size || !section?.margin) return fallback
  const landscape = section.orientation === 'landscape'
  const pageWidthCm = landscape ? section.size.height : section.size.width
  const pageHeightCm = landscape ? section.size.width : section.size.height
  const configuredTopCm = Number(section.margin.top) || 0
  const configuredBottomCm = Number(section.margin.bottom) || 0
  const effectiveTopCm = section.header?.enable
    ? Math.max(configuredTopCm, section.header.layout === 'banner' ? 1.8 : 1.5)
    : configuredTopCm
  const effectiveBottomCm = section.footer?.enable
    ? Math.max(configuredBottomCm, 1.5)
    : configuredBottomCm
  const marginTop = convert(effectiveTopCm)
  const marginBottom = convert(effectiveBottomCm)
  const pageHeight = convert(pageHeightCm)
  return {
    pageWidth: convert(pageWidthCm),
    pageHeight,
    pageWidthCm,
    pageHeightCm,
    contentHeight: Math.max(200, pageHeight - marginTop - marginBottom),
    marginTop,
    marginBottom,
    marginLeft: convert(section.margin.left),
    marginRight: convert(section.margin.right),
    marginTopCm: effectiveTopCm,
    marginBottomCm: effectiveBottomCm,
    marginLeftCm: section.margin.left,
    marginRightCm: section.margin.right,
    orientation: section.orientation || 'portrait',
    pageGap: fallback?.pageGap || 24,
  }
}

const buildSectionLayout = (editor, editorDom) => {
  const fallback = getPageGeometry(editorDom, cmToPx)
  const configured = editor.storage?.options?.page?.sections || []
  const [first] = configured
  const initialSection = {
    index: 0,
    id: first?.id || 'section-1',
    pageNumberStart: first?.pageNumberStart,
    config: first || null,
  }
  const transitions = new Map()
  let sectionIndex = 0
  editor.state.doc.forEach((node, _offset, blockIndex) => {
    if (node.type.name !== 'sectionBreak') return
    sectionIndex += 1
    const configuredSection = configured[sectionIndex]
    const section = node.attrs.page || configuredSection || null
    transitions.set(blockIndex, {
      geometry: sectionGeometry(section, cmToPx, fallback),
      section: {
        index: sectionIndex,
        id: section?.id || configuredSection?.id || node.attrs.id || `section-${sectionIndex + 1}`,
        pageNumberStart: section?.pageNumberStart || configuredSection?.pageNumberStart,
        config: section || configuredSection || null,
      },
    })
  })
  return {
    initialGeometry: sectionGeometry(first, cmToPx, fallback),
    initialSection,
    transitions,
  }
}

const appendRepeatedHeaderFooter = (container, config, type, pageNumber) => {
  if (!config?.enable) return
  const element = document.createElement('div')
  element.className = `kindy-page-repeated-${type}`
  element.setAttribute('data-layout', config.layout || 'single')
  element.setAttribute('aria-hidden', 'true')

  if (config.logo && typeof config.logo === 'string') {
    const image = document.createElement('img')
    image.src = config.logo
    image.alt = ''
    image.draggable = false
    const width = Number(config.logoWidth)
    const height = Number(config.logoHeight)
    if (Number.isFinite(width) && width > 0) image.style.setProperty('--kindy-imported-image-width', `${width}px`)
    if (Number.isFinite(height) && height > 0) image.style.setProperty('--kindy-imported-image-height', `${height}px`)
    element.append(image)
  }

  const rawText = String(config.text || config.leftText || config.rightText || '').trim()
  if (rawText) {
    const text = document.createElement('span')
    text.textContent = rawText.replace(/\{\{\s*page(Number)?\s*\}\}/gi, String(pageNumber))
    element.append(text)
  }

  if (element.childNodes.length) container.append(element)
}

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
      visualBreaks: [],
      manualBreaks: [],
      isComputing: false,
      measurementCache: createBlockMeasurementCache(),
      lastDurationMs: 0,
      lastCompletedAt: 0,
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
          const startedAt = performance.now()

          try {
            const editorDom = editor.view.dom
            if (!editorDom || !editorDom.isConnected) return false

            // Read actual DOM block heights and compute page assignments
            const pageAssignments = paginateFromDOM(
              editorDom,
              cmToPx,
              this.storage.measurementCache,
              buildSectionLayout(editor, editorDom),
            )
            const totalPages = Math.max(1, pageAssignments.reduce(
              (total, page) => Math.max(total, page.pageNumber + page.pageSpan - 1),
              1,
            ))

            // Build layout tree structure
            const layoutPages = pageAssignments.flatMap((p) =>
              Array.from({ length: p.pageSpan }, (_, offset) => {
                const pageNumber = p.pageNumber + offset
                return {
                  pageNumber,
                  sectionPageNumber: p.sectionPageNumber + offset,
                  blockStart: p.blockStart,
                  blockEnd: p.blockEnd,
                  contentHeight: offset < p.pageSpan - 1
                    ? p.height / p.pageSpan
                    : p.height - (p.pageSpan - 1) * (p.height / p.pageSpan),
                  contentWidth: 0,
                  isFirst: pageNumber === 1,
                  isLast: pageNumber === totalPages,
                  isOdd: pageNumber % 2 !== 0,
                  startsInsideBlock: offset > 0,
                  endedByManualBreak: offset === p.pageSpan - 1 && !!p.endedByManualBreak,
                  sectionIndex: p.sectionIndex,
                  sectionId: p.sectionId,
                  section: p.section,
                  geometry: p.geometry,
                  header: p.section?.config?.header || {},
                  footer: p.section?.config?.footer || {},
                  pageNumberDisplay: { text: String(p.sectionPageNumber + offset) },
                }
              }),
            )

            const visualBreaks = []
            for (let index = 1; index < pageAssignments.length; index++) {
              const current = pageAssignments[index]
              const previous = pageAssignments[index - 1]
              if (!previous.endedByManualBreak) {
                visualBreaks.push({
                  blockIndex: current.blockStart,
                  pageNumber: current.pageNumber,
                  spacerHeight: previous.spacerHeight,
                  separatorOffset: previous.separatorOffset,
                  pageGap: previous.pageGap,
                  sectionIndex: current.sectionIndex,
                  sectionId: current.sectionId,
                  geometry: current.geometry,
                  header: current.section?.config?.header || {},
                  footer: previous.section?.config?.footer || {},
                })
              }
            }
            const manualBreaks = pageAssignments
              .filter((page) => page.endedByManualBreak && page.manualBreakBlock !== null)
              .map((page) => ({
                blockIndex: page.manualBreakBlock,
                pageNumber: page.pageNumber + page.pageSpan,
                spacerHeight: page.spacerHeight,
                separatorOffset: page.separatorOffset,
                pageGap: page.pageGap,
                sectionIndex: page.nextSection?.index ?? page.sectionIndex,
                sectionId: page.nextSection?.id || page.sectionId,
                geometry: page.nextPageGeometry || page.geometry,
                header: page.nextSection?.config?.header || page.section?.config?.header || {},
                footer: page.section?.config?.footer || {},
              }))

            const layoutTree = {
              totalPages,
              pages: layoutPages,
              version: (this.storage.layoutTree?.version || 0) + 1,
            }

            // Update storage
            this.storage.totalPages = totalPages
            this.storage.layoutTree = layoutTree
            this.storage.visualBreaks = visualBreaks
            this.storage.manualBreaks = manualBreaks

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
              sectionPageNumber: page.sectionPageNumber,
              sectionIndex: page.sectionIndex,
              sectionId: page.sectionId,
              section: page.section,
              geometry: page.geometry,
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
            this.storage.lastDurationMs = performance.now() - startedAt
            this.storage.lastCompletedAt = performance.now()
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
          const topLevelChildren = getTopLevelBlockElements(editorDom)

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
    let resizeObserver = null
    let observedBlocks = new Set()

    const syncObservedBlocks = (view) => {
      if (!resizeObserver || !view?.dom) return
      const nextBlocks = new Set(getTopLevelBlockElements(view.dom))
      for (const block of observedBlocks) {
        if (!nextBlocks.has(block)) resizeObserver.unobserve(block)
      }
      for (const block of nextBlocks) {
        if (!observedBlocks.has(block)) resizeObserver.observe(block)
      }
      observedBlocks = nextBlocks
    }

    // ProseMirror structurally shares untouched nodes. Comparing the common
    // prefix and suffix keeps a normal keystroke to one invalidated DOM block.
    const invalidateChangedBlocks = (view, previousState) => {
      if (!view?.dom || !previousState || previousState.doc === view.state.doc) return
      const oldDoc = previousState.doc
      const newDoc = view.state.doc
      let start = 0
      const sharedLength = Math.min(oldDoc.childCount, newDoc.childCount)
      while (start < sharedLength && oldDoc.child(start) === newDoc.child(start)) start += 1

      let oldEnd = oldDoc.childCount - 1
      let newEnd = newDoc.childCount - 1
      while (oldEnd >= start && newEnd >= start && oldDoc.child(oldEnd) === newDoc.child(newEnd)) {
        oldEnd -= 1
        newEnd -= 1
      }

      const blocks = getTopLevelBlockElements(view.dom)
      for (let index = start; index <= newEnd; index += 1) {
        extension.storage.measurementCache.invalidate(blocks[index])
      }
    }

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

        view(view) {
          let initialDone = false
          if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver((entries) => {
              for (const entry of entries) {
                extension.storage.measurementCache.invalidate(entry.target)
              }
              scheduleRepaginate(80)
            })
            syncObservedBlocks(view)
          }

          const onFontsLoaded = () => {
            extension.storage.measurementCache.invalidateAll()
            scheduleRepaginate(80)
          }
          document.fonts?.addEventListener?.('loadingdone', onFontsLoaded)

          return {
            update(nextView, previousState) {
              invalidateChangedBlocks(nextView, previousState)
              syncObservedBlocks(nextView)
              if (!initialDone) {
                initialDone = true
                // Initial pagination once DOM is fully rendered
                scheduleRepaginate(300)
              }
            },
            destroy() {
              if (repaginateTimer) clearTimeout(repaginateTimer)
              if (rafId) cancelAnimationFrame(rafId)
              resizeObserver?.disconnect()
              resizeObserver = null
              observedBlocks.clear()
              document.fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
              extension.storage.measurementCache.invalidateAll()
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
            const { layoutTree, visualBreaks, manualBreaks } = extension.storage
            if (!layoutTree?.pages || layoutTree.pages.length <= 1) {
              return DecorationSet.empty
            }

            const breakAtBlock = new Map((visualBreaks || []).map((item) => [item.blockIndex, item]))
            const manualAtBlock = new Map((manualBreaks || []).map((item) => [item.blockIndex, item]))

            const decos = []
            const { doc } = state
            let blockIndex = 0

            doc.forEach((node, offset) => {
              const visualBreak = breakAtBlock.get(blockIndex)
              if (visualBreak) {
                decos.push(
                  Decoration.widget(
                    offset,
                    () => {
                      const div = document.createElement('div')
                      div.className = 'kindy-page-break-decoration'
                      div.setAttribute('data-page-number', String(visualBreak.pageNumber))
                      div.setAttribute('aria-label', `Trang ${visualBreak.pageNumber}`)
                      div.setAttribute('data-section', visualBreak.sectionId || '')
                      div.setAttribute('data-decoration', 'true')
                      div.setAttribute('contenteditable', 'false')
                      div.style.setProperty('--kindy-page-spacer-height', `${visualBreak.spacerHeight}px`)
                      div.style.setProperty('--kindy-page-separator-offset', `${visualBreak.separatorOffset}px`)
                      div.style.setProperty('--kindy-page-gap', `${visualBreak.pageGap}px`)
                      if (visualBreak.geometry?.pageWidthCm) div.style.setProperty('--kindy-next-page-width', `${visualBreak.geometry.pageWidthCm}cm`)
                      if (visualBreak.geometry?.pageHeightCm) div.style.setProperty('--kindy-next-page-height', `${visualBreak.geometry.pageHeightCm}cm`)
                      appendRepeatedHeaderFooter(div, visualBreak.footer, 'footer', visualBreak.pageNumber - 1)
                      appendRepeatedHeaderFooter(div, visualBreak.header, 'header', visualBreak.pageNumber)
                      return div
                    },
                    { side: -1, key: `page-sep-${visualBreak.pageNumber}-${blockIndex}`, ignoreSelection: true },
                  ),
                )
              }
              const manualBreak = manualAtBlock.get(blockIndex)
              if (manualBreak && (node.type.name === 'pageBreak' || node.type.name === 'sectionBreak')) {
                decos.push(Decoration.node(offset, offset + node.nodeSize, {
                  'data-page-number': String(manualBreak.pageNumber),
                  'aria-label': `Trang ${manualBreak.pageNumber}`,
                  'data-section': manualBreak.sectionId || '',
                  style: [
                    `--kindy-page-spacer-height:${manualBreak.spacerHeight}px`,
                    `--kindy-page-separator-offset:${manualBreak.separatorOffset}px`,
                    `--kindy-page-gap:${manualBreak.pageGap}px`,
                    ...(manualBreak.geometry?.pageWidthCm ? [`--kindy-next-page-width:${manualBreak.geometry.pageWidthCm}cm`] : []),
                    ...(manualBreak.geometry?.pageHeightCm ? [`--kindy-next-page-height:${manualBreak.geometry.pageHeightCm}cm`] : []),
                  ].join(';'),
                }))
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
