import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const PaginationPluginKey = new PluginKey('pagination')

const CM_TO_PX = 96 / 2.54

function getCmToPx() {
  if (typeof window === 'undefined') return CM_TO_PX
  const test = document.createElement('div')
  test.style.width = '1cm'
  test.style.position = 'absolute'
  test.style.left = '-9999px'
  document.body.appendChild(test)
  const px = test.offsetWidth
  document.body.removeChild(test)
  return px || CM_TO_PX
}

function isPageBreakNode(node) {
  return node?.type?.name === 'pageBreak'
}

function isBlockNode(node) {
  if (!node || !node.type) return false
  const {name} = node.type
  return (
    name === 'paragraph' ||
    name === 'heading' ||
    name === 'blockquote' ||
    name === 'codeBlock' ||
    name === 'bulletList' ||
    name === 'orderedList' ||
    name === 'taskList' ||
    name === 'table' ||
    name === 'image' ||
    name === 'video' ||
    name === 'audio' ||
    name === 'file' ||
    name === 'iframe' ||
    name === 'callout' ||
    name === 'horizontalRule' ||
    name === 'toc' ||
    name === 'tag' ||
    name === 'columnBlock' ||
    name === 'textBox' ||
    name === 'datetime' ||
    name === 'optionBox' ||
    name === 'echarts' ||
    name === 'footnotes'
  )
}

function findAncestorBlock(pmNode) {
  let node = pmNode
  while (node) {
    if (isBlockNode(node) && !isPageBreakNode(node)) {
      return node
    }
    node = node.parent
  }
  return null
}

function findPreviousBlock(editor, pos) {
  let found = null
  editor.state.doc.nodesBetween(0, pos, (node) => {
    if (isBlockNode(node) && !isPageBreakNode(node)) {
      found = node
    }
  })
  return found
}

export const Pagination = Extension.create({
  name: 'pagination',

  addOptions() {
    return {
      pageHeight: 29.7,
      marginTop: 2.54,
      marginBottom: 2.54,
      marginLeft: 3.18,
      marginRight: 3.18,
      headerHeight: 1.5,
      footerHeight: 1.5,
      onPageCountChange: null,
      onCurrentPageChange: null,
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
      blockPositions: [],
      isPaginating: false,
    }
  },

  addCommands() {
    return {
      repaginate:
        () =>
        ({ editor }) => {
          if (!editor || !editor.view) return false
          const { dom } = editor.view
          if (!dom) return false

          const cmToPx = getCmToPx()
          const {
            pageHeight,
            marginTop,
            marginBottom,
            headerHeight,
            footerHeight,
          } = this.options

          const contentHeight =
            (pageHeight - marginTop - marginBottom - headerHeight - footerHeight) *
            cmToPx

          const blocks = []
          const { doc } = editor.state

          doc.descendants((node, pos) => {
            if (isPageBreakNode(node)) {
              return false
            }
            if (isBlockNode(node)) {
              const { node: domNode } = editor.view.domAtPos(
                Math.min(pos + 1, doc.content.size),
              )
              let el = domNode
              if (el.nodeType === Node.TEXT_NODE) {
                el = el.parentElement
              }
              if (el && el.nodeType === Node.ELEMENT_NODE) {
                const rect = el.getBoundingClientRect()
                blocks.push({
                  pos,
                  node,
                  height: rect.height || 0,
                })
              }
            }
            return true
          })

          const breakPositions = []
          let cumulativeHeight = 0
          let pageStart = 0

          for (const block of blocks) {
            if (cumulativeHeight + block.height > contentHeight && pageStart < block.pos) {
              breakPositions.push(block.pos)
              pageStart = block.pos
              cumulativeHeight = block.height
            } else {
              cumulativeHeight += block.height
            }
          }

          const existingBreaks = []
          doc.descendants((node, pos) => {
            if (isPageBreakNode(node)) {
              existingBreaks.push(pos)
            }
          })

          const needsChange =
            breakPositions.length !== existingBreaks.length ||
            breakPositions.some((pos, i) => pos !== existingBreaks[i])

          if (!needsChange) {
            this.updatePageMetadata(editor, blocks, breakPositions)
            return true
          }

          if (this.storage.isPaginating) return true
          this.storage.isPaginating = true

          const sortedPositions = [...breakPositions].sort((a, b) => b - a)
          let {tr} = editor.state

          for (const pos of sortedPositions) {
            const adjustedPos = Math.min(pos, tr.doc.content.size - 1)
            const nodeType = editor.state.schema.nodes.pageBreak
            if (nodeType) {
              tr = tr.insert(adjustedPos, nodeType.create())
            }
          }

          if (tr.docChanged) {
            editor.view.dispatch(tr)
          }

          setTimeout(() => {
            this.storage.isPaginating = false
            this.updatePageMetadata(editor, blocks, breakPositions)
          }, 100)

          return true
        },

      getCurrentPage:
        () =>
        ({ editor }) => {
          if (!editor?.state) return 1
          const { from } = editor.state.selection
          let breakCount = 0
          editor.state.doc.nodesBetween(0, from, (node) => {
            if (isPageBreakNode(node)) {
              breakCount++
            }
          })
          return breakCount + 1
        },

      goToPage:
        (pageNumber) =>
        ({ editor }) => {
          if (!editor?.state) return false
          const { doc } = editor.state
          let breakCount = 0
          let targetPos = 0

          doc.descendants((node, pos) => {
            if (isPageBreakNode(node)) {
              breakCount++
              if (breakCount === pageNumber - 1) {
                targetPos = pos + 1
              }
            }
          })

          if (breakCount >= pageNumber - 1) {
            editor.commands.focus('end')
            const resolvedPos = editor.state.doc.resolve(
              Math.min(targetPos, editor.state.doc.content.size - 1),
            )
            editor.view.dispatch(
              editor.state.tr.setSelection(
                editor.state.Selection.near(resolvedPos, 1),
              ),
            )
          }

          return true
        },
    }
  },

  updatePageMetadata(editor, blocks, breakPositions) {
    const totalPages = breakPositions.length + 1
    const { from } = editor.state.selection
    let currentPage = 1
    let breakIdx = 0

    for (let i = 0; i < breakPositions.length; i++) {
      if (from > breakPositions[i]) {
        breakIdx = i + 1
      }
    }
    currentPage = breakIdx + 1

    this.storage.totalPages = totalPages
    this.storage.currentPage = currentPage

    const pages = []
    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1
      pages.push({
        index: i,
        pageNumber: pageNum,
        isFirst: i === 0,
        isLast: i === totalPages - 1,
        isOdd: pageNum % 2 !== 0,
      })
    }
    this.storage.pages = pages

    if (this.options.onPageCountChange) {
      this.options.onPageCountChange(totalPages)
    }
    if (this.options.onCurrentPageChange) {
      this.options.onCurrentPageChange(currentPage)
    }
  },

  addProseMirrorPlugins() {
    const extension = this
    let repaginateTimer = null

    return [
      new Plugin({
        key: PaginationPluginKey,
        appendTransaction(transactions, oldState, newState) {
          if (transactions.some((tr) => tr.docChanged)) {
            if (repaginateTimer) clearTimeout(repaginateTimer)
            repaginateTimer = setTimeout(() => {
              if (extension.editor && !extension.storage.isPaginating) {
                extension.editor.commands.repaginate()
              }
            }, 150)
          }
        },
        state: {
          init() {
            return { page: 1 }
          },
          apply(tr, value) {
            if (tr.selection) {
              const { doc } = tr
              const { from } = tr.selection
              let breakCount = 0
              doc.nodesBetween(0, from, (node) => {
                if (isPageBreakNode(node)) {
                  breakCount++
                }
              })
              const newPage = breakCount + 1
              if (newPage !== value.page) {
                extension.storage.currentPage = newPage
                if (extension.options.onCurrentPageChange) {
                  extension.options.onCurrentPageChange(newPage)
                }
                return { page: newPage }
              }
            }
            return value
          },
        },
      }),
    ]
  },
})

export default Pagination
