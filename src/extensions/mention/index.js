import Mention from '@tiptap/extension-mention'

export default Mention.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'umo-node-mention',
      },
    }
  },
  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
    }
  },
  addCommands() {
    return {
      insertMention:
        () =>
        ({ commands }) => {
          return commands.insertContent(
            ` ${this.options?.suggestion?.char ?? '@'}`,
          )
        },
    }
  },
})
