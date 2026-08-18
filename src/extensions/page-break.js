import { mergeAttributes, Node } from '@tiptap/core'

export default Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: false,
  draggable: false,
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
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
            })
            .insertContent({
              type: 'paragraph',
            })
            .scrollIntoView()
            .focus('end')
            .run()
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    }
  },
})
