import { mergeAttributes, Node } from '@tiptap/core'

export const Column = Node.create({
  name: 'column',
  group: 'column',
  content: '(paragraph|block)*',
  isolating: true,
  selectable: false,

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(HTMLAttributes, {
      'data-type': this.name,
      class: 'umo-column',
    })
    return ['div', attrs, 0]
  },
})
