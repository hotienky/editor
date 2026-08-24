import { mergeAttributes, Node } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { canSplit } from '@tiptap/pm/transform'
import { t } from '@/composables/i18n'

export default Node.create({
  name: 'pageBreak',
  // StarterKit's hardBreak also registers Mod-Enter. A manual DOCX page break
  // is the explicit editor command and must win that keymap conflict.
  priority: 1000,
  group: 'block',
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'kindy-page-break',
        'data-line-number': false,
      },
      getContentLabel: () => t('page.break'),
    }
  },
  parseHTML() {
    return [{ tag: 'div[class*="kindy-page-break"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-content': this.options.getContentLabel(),
      }),
    ]
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ state, dispatch }) => {
          const pageBreak = state.schema.nodes[this.name]
          const { paragraph } = state.schema.nodes
          if (!pageBreak || !paragraph) return false

          const tr = state.tr.deleteSelection()
          const $cursor = tr.doc.resolve(tr.selection.from)
          const { depth: cursorDepth } = $cursor
          const activeMarks = state.storedMarks || $cursor.marks()
          const atTextblockEnd = $cursor.parent.isTextblock
            && $cursor.parentOffset === $cursor.parent.content.size
          let orderedListContinuation = null
          for (let depth = cursorDepth; depth > 0; depth -= 1) {
            const ancestor = $cursor.node(depth)
            if (ancestor.type.name !== 'orderedList') continue
            orderedListContinuation = {
              start: Number(ancestor.attrs.start) || 1,
              itemIndex: $cursor.index(depth),
            }
            break
          }
          let insertionPos

          // A manual page break must remain a top-level document node. Splitting
          // through every ancestor also handles paragraphs nested in lists:
          //
          //   list(before) | list(after)
          //                ^ pageBreak is inserted here
          //
          // The old implementation inserted the break after the nearest
          // textblock, which left it inside a listItem. Pagination only measures
          // top-level blocks, so that nested break rendered as a small grey bar.
          if ($cursor.parent.isTextblock && canSplit(tr.doc, $cursor.pos, cursorDepth)) {
            tr.split($cursor.pos, cursorDepth)
            insertionPos = $cursor.pos + cursorDepth

            const rightTopLevel = tr.doc.nodeAt(insertionPos)
            const isList = ['orderedList', 'bulletList'].includes(rightTopLevel?.type?.name)
            const emptyContinuation = isList && rightTopLevel.childCount > 1
              && rightTopLevel.firstChild?.textContent === ''
            if (atTextblockEnd && emptyContinuation) {
              tr.delete(
                insertionPos + 1,
                insertionPos + 1 + rightTopLevel.firstChild.nodeSize,
              )
            }

            const normalizedRight = tr.doc.nodeAt(insertionPos)
            if (normalizedRight?.type?.name === 'orderedList' && orderedListContinuation) {
              tr.setNodeMarkup(insertionPos, undefined, {
                ...normalizedRight.attrs,
                start: orderedListContinuation.start
                  + orderedListContinuation.itemIndex
                  + (atTextblockEnd ? 1 : 0),
              })
            }
          } else if (cursorDepth > 0) {
            // Tables and other isolating nodes cannot be split through safely.
            // Put the page break immediately after the top-level container.
            insertionPos = $cursor.after(1)
          } else {
            insertionPos = $cursor.pos
          }

          const $insertion = tr.doc.resolve(insertionPos)
          if (!$insertion.parent.canReplaceWith($insertion.index(), $insertion.index(), pageBreak)) {
            return false
          }

          const breakNode = pageBreak.create()
          const hasEditableContentAfter = TextSelection.findFrom($insertion, 1, true)

          if ($cursor.parent.isTextblock && insertionPos !== $cursor.pos) {
            // split() already created the editable block on the next page.
            tr.insert(insertionPos, breakNode)
          } else {
            // A boundary or isolating-node insertion needs an explicit paragraph
            // so the next page is immediately editable.
            tr.insert(insertionPos, Fragment.fromArray([breakNode, paragraph.create()]))
          }

          const nextPageStart = insertionPos + breakNode.nodeSize
          const nextSelection = TextSelection.findFrom(tr.doc.resolve(nextPageStart), 1, true)
            || hasEditableContentAfter
            || TextSelection.near(tr.doc.resolve(nextPageStart), 1)
          tr.setSelection(nextSelection)
          if (activeMarks?.length) tr.setStoredMarks(activeMarks)
          if (dispatch) dispatch(tr.scrollIntoView())
          return true
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    }
  },
})
