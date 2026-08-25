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
import { createDomDocumentLayoutService } from '@/layout/document-layout-service'
import {
  getPageGeometry,
  getTopLevelBlockElements,
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

const buildPaginationDecorations = (doc, storage) => {
  const { layoutTree, visualBreaks, manualBreaks } = storage
  if (!layoutTree?.pages || layoutTree.pages.length <= 1) {
    return DecorationSet.empty
  }

  const breakAtBlock = new Map((visualBreaks || []).map((item) => [item.blockIndex, item]))
  const manualAtBlock = new Map((manualBreaks || []).map((item) => [item.blockIndex, item]))

  const decos = []
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
      decos.push(
        Decoration.widget(
          offset,
          () => {
            const div = document.createElement('div')
            div.className = 'kindy-page-break-decoration kindy-manual-page-break-decoration'
            div.setAttribute('data-page-number', String(manualBreak.pageNumber))
            div.setAttribute('aria-label', `Trang ${manualBreak.pageNumber}`)
            div.setAttribute('data-section', manualBreak.sectionId || '')
            div.setAttribute('data-decoration', 'true')
            div.setAttribute('contenteditable', 'false')
            div.style.setProperty('--kindy-page-spacer-height', `${manualBreak.spacerHeight}px`)
            div.style.setProperty('--kindy-page-separator-offset', `${manualBreak.separatorOffset}px`)
            div.style.setProperty('--kindy-page-gap', `${manualBreak.pageGap}px`)
            if (manualBreak.geometry?.pageWidthCm) div.style.setProperty('--kindy-next-page-width', `${manualBreak.geometry.pageWidthCm}cm`)
            if (manualBreak.geometry?.pageHeightCm) div.style.setProperty('--kindy-next-page-height', `${manualBreak.geometry.pageHeightCm}cm`)
            appendRepeatedHeaderFooter(div, manualBreak.footer, 'footer', manualBreak.pageNumber - 1)
            appendRepeatedHeaderFooter(div, manualBreak.header, 'header', manualBreak.pageNumber)
            return div
          },
          { side: -1, key: `manual-page-sep-${manualBreak.pageNumber}-${blockIndex}`, ignoreSelection: true },
        ),
      )
    }
    blockIndex++
  })

  if (decos.length === 0) return DecorationSet.empty
  return DecorationSet.create(doc, decos)
}

export const Pagination = Extension.create({
  name: 'pagination',

  addOptions() {
    return {
      onPageCountChange: null,
      onCurrentPageChange: null,
      onLayoutChange: null,
      createLayoutService: () => createDomDocumentLayoutService({ cmToPx }),
    }
  },

  addStorage() {
    const layoutService = this.options.createLayoutService()
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
      layoutService,
      // Backwards-compatible internal alias. The service remains the sole
      // owner of this cache and all invalidation must go through the service.
      measurementCache: layoutService.measurementCache,
      documentRevision: 0,
      lastTelemetry: null,
      lastDurationMs: 0,
      lastCompletedAt: 0,
    }
  },

  addCommands() {
    return {
      /**
       * Recompute page layout using REAL DOM block heights.
       * The service owns measurement, page projection and telemetry; this
       * command only commits the resulting registry and decorations.
       */
      repaginate:
        (reason = 'manual') =>
        ({ editor }) => {
          if (this.storage.isComputing) return false
          this.storage.isComputing = true
          const startedAt = performance.now()

          try {
            const editorDom = editor.view.dom
            if (!editorDom || !editorDom.isConnected) return false

            const result = this.storage.layoutService.layout({
              editorDom,
              sectionLayout: buildSectionLayout(editor, editorDom),
              documentRevision: this.storage.documentRevision,
              reason,
            })
            const {
              layoutTree,
              visualBreaks,
              manualBreaks,
              telemetry,
            } = result
            const { totalPages } = layoutTree
            const layoutPages = layoutTree.pages

            this.storage.totalPages = totalPages
            this.storage.layoutTree = layoutTree
            this.storage.visualBreaks = visualBreaks
            this.storage.manualBreaks = manualBreaks
            this.storage.lastTelemetry = telemetry
            this.storage.lastDurationMs = telemetry.totalMs

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

            if (this.options.onPageCountChange) {
              this.options.onPageCountChange(totalPages)
            }
            if (this.options.onLayoutChange) {
              this.options.onLayoutChange(layoutTree)
            }

            if (editor.view && editor.state) {
              const tr = editor.state.tr.setMeta(PaginationPluginKey, { repaginated: true })
              editor.view.dispatch(tr)
            }

            return true
          } catch (err) {
            console.warn('[Pagination] repaginate error:', err)
            return false
          } finally {
            if (!this.storage.lastTelemetry) {
              this.storage.lastDurationMs = performance.now() - startedAt
            }
            this.storage.lastCompletedAt = performance.now()
            this.storage.isComputing = false
          }
        },

      getCurrentPage:
        () =>
        ({ editor }) => {
          if (!editor?.state) return 1
          const { from } = editor.state.selection
          const blockIndex = editor.state.doc.resolve(from).index(0)
          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return 1

          return this.storage.layoutService.getPageAtPosition(
            { blockIndex },
            layoutTree,
          )?.pageNumber || 1
        },

      goToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.state) return false
          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return false

          const targetPage = this.storage.layoutService.getPage(pageNumber, layoutTree)
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

      getPageLayout:
        (pageNumber) =>
        () => {
          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return null
          return this.storage.layoutService.getPage(pageNumber, layoutTree)
        },

      scrollToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.view) return false
          const { layoutTree } = this.storage
          if (!layoutTree?.pages) return false

          const targetPage = this.storage.layoutService.getPage(pageNumber, layoutTree)
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

  onDestroy() {
    this.storage.layoutService.destroy()
  },

  addProseMirrorPlugins() {
    const extension = this
    let repaginateTimer = null
    let rafId = null
    let rootResizeObserver = null
    let pendingReason = 'manual'

    const invalidateChangedBlocks = (view, previousState) => {
      if (!view?.dom || !previousState || previousState.doc === view.state.doc) return
      extension.storage.documentRevision += 1
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
        if (blocks[index]) {
          extension.storage.layoutService.invalidate({
            scope: 'block',
            element: blocks[index],
            blockIndex: index,
            reason: 'transaction',
          })
        }
      }
    }

    const scheduleRepaginate = (delay = 250, reason = 'transaction') => {
      pendingReason = reason
      if (repaginateTimer) clearTimeout(repaginateTimer)
      repaginateTimer = setTimeout(() => {
        repaginateTimer = null
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          rafId = null
          if (extension.editor && !extension.storage.isComputing) {
            const layoutReason = pendingReason
            pendingReason = 'manual'
            extension.editor.commands.repaginate(layoutReason)
          }
        })
      }, delay)
    }

    return [
      new Plugin({
        key: PaginationPluginKey,

        view(view) {
          let initialDone = false
          if (typeof ResizeObserver !== 'undefined' && view.dom) {
            rootResizeObserver = new ResizeObserver(() => {
              extension.storage.layoutService.invalidate({ scope: 'all', reason: 'resize' })
              scheduleRepaginate(150, 'resize')
            })
            rootResizeObserver.observe(view.dom)
          }

          const onFontsLoaded = () => {
            extension.storage.layoutService.invalidate({ scope: 'all', reason: 'font' })
            scheduleRepaginate(80, 'font')
          }
          document.fonts?.addEventListener?.('loadingdone', onFontsLoaded)

          return {
            update(nextView, previousState) {
              invalidateChangedBlocks(nextView, previousState)
              if (!initialDone) {
                initialDone = true
                scheduleRepaginate(120, 'open')
              }
            },
            destroy() {
              if (repaginateTimer) clearTimeout(repaginateTimer)
              if (rafId) cancelAnimationFrame(rafId)
              rootResizeObserver?.disconnect()
              rootResizeObserver = null
              document.fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
            },
          }
        },

        appendTransaction(transactions, _oldState, _newState) {
          const hasMeta = transactions.some(
            (tr) => tr.getMeta(PaginationPluginKey)?.repaginated,
          )
          if (hasMeta) return null

          if (transactions.some((tr) => tr.docChanged)) {
            scheduleRepaginate(300, 'transaction')
          }
          return null
        },

        state: {
          init() {
            return { page: 1, decorations: DecorationSet.empty }
          },
          apply(tr, value) {
            let nextDecorations = value.decorations || DecorationSet.empty
            if (tr.getMeta(PaginationPluginKey)?.repaginated) {
              nextDecorations = buildPaginationDecorations(tr.doc, extension.storage)
            } else if (tr.docChanged && nextDecorations) {
              nextDecorations = nextDecorations.map(tr.mapping, tr.doc)
            }

            let currentPage = value.page
            if (tr.selectionSet || tr.getMeta(PaginationPluginKey)?.repaginated) {
              try {
                const { from } = tr.selection
                const blockIndex = tr.doc.resolve(from).index(0)

                const { layoutTree } = extension.storage
                if (layoutTree?.pages) {
                  const page = extension.storage.layoutService.getPageAtPosition(
                    { blockIndex },
                    layoutTree,
                  )
                  if (page && page.pageNumber !== value.page) {
                    currentPage = page.pageNumber
                    extension.storage.currentPage = page.pageNumber
                    if (extension.options.onCurrentPageChange) {
                      extension.options.onCurrentPageChange(page.pageNumber)
                    }
                  }
                }
              } catch (e) {}
            }
            return { page: currentPage, decorations: nextDecorations }
          },
        },

        props: {
          decorations(state) {
            return PaginationPluginKey.getState(state)?.decorations || DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export default Pagination
