import { mergeAttributes } from '@tiptap/core'
import { ListItem } from '@tiptap/extension-list'

export default ListItem.extend({
  name: 'footnote',
  content() {
    return this.options.content
  },
  isolating: true,
  defining: true,
  draggable: false,
  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: 'bulletList',
      orderedListTypeName: 'orderedList',
      ...this.parent?.(),
      content: 'paragraph+',
    }
  },
  addAttributes() {
    return {
      id: {
        isRequired: true,
      },
      'data-fn-id': {
        isRequired: true,
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'li',
        getAttrs(node) {
          const id = node.getAttribute('data-fn-id')
          if (id) {
            return {
              'data-fn-id': node.getAttribute('data-fn-id'),
            }
          }
          return false
        },
        priority: 1000,
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ]
  },
  addCommands() {
    return {
      focusFootnote:
        (id) =>
        ({ editor, chain }) => {
          const matchedFootnote = editor.$node('footnote', {
            'data-fn-id': id,
          })
          if (matchedFootnote) {
            chain()
              .focus()
              .setTextSelection(
                matchedFootnote.from + matchedFootnote.content.size,
              )
              .run()

            matchedFootnote.element.scrollIntoView()
            return true
          }
          return false
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-a': ({ editor }) => {
        try {
          const { selection } = editor.state
          const { $from } = selection

          for (let { depth } = $from; depth >= 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'footnote') {
              const start = $from.start(depth)
              const end = $from.end(depth)

              editor.commands.setTextSelection({
                from: start + 1,
                to: end - 1,
              })
              return true
            }
          }

          return false
        } catch (e) {
          return false
        }
      },
      Tab: ({ editor }) => {
        try {
          const { selection } = editor.state
          const pos = editor.$pos(selection.anchor)
          if (!pos.after) return false
          if (pos.after.node.type.name === 'footnotes') {
            const firstChild = pos.after.node.child(0)
            editor
              .chain()
              .setTextSelection(pos.after.from + firstChild.content.size)
              .scrollIntoView()
              .run()
            return true
          } else {
            const startPos = selection.$from.start(2)
            if (Number.isNaN(startPos)) return false
            const parent = editor.$pos(startPos)
            if (parent.node.type.name !== 'footnote' || !parent.after) {
              return false
            }
            editor
              .chain()
              .setTextSelection(parent.after.to - 1)
              .scrollIntoView()
              .run()
            return true
          }
        } catch {
          return false
        }
      },
      'Shift-Tab': ({ editor }) => {
        const { selection } = editor.state
        const startPos = selection.$from.start(2)
        if (Number.isNaN(startPos)) return false
        const parent = editor.$pos(startPos)
        if (parent.node.type.name !== 'footnote' || !parent.before) {
          return false
        }
        editor
          .chain()
          .setTextSelection(parent.before.to - 1)
          .scrollIntoView()
          .run()
        return true
      },
    }
  },
})
