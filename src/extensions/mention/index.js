import Mention from '@tiptap/extension-mention'

const CustomMention = Mention.extend({
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

// 配置并导出扩展
export default CustomMention.configure({
  HTMLAttributes: {
    class: 'umo-node-mention',
  },
})
