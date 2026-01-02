import Mention from '@tiptap/extension-mention'

export default Mention.extend({
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
