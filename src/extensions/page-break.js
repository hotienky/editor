import { mergeAttributes, Node } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
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
          let insertionPos = tr.selection.from
          const { depth: cursorDepth } = $cursor
          for (let depth = cursorDepth; depth > 0; depth -= 1) {
            if ($cursor.node(depth).isTextblock) {
              insertionPos = $cursor.after(depth)
              break
            }
          }
          const $insertion = tr.doc.resolve(insertionPos)
          if (!$insertion.parent.canReplaceWith($insertion.index(), $insertion.index(), pageBreak)) {
            return false
          }

          const breakNode = pageBreak.create()
          const paragraphNode = paragraph.create()
          tr.insert(insertionPos, Fragment.fromArray([breakNode, paragraphNode]))
          tr.setSelection(TextSelection.near(tr.doc.resolve(insertionPos + breakNode.nodeSize + 1)))
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
