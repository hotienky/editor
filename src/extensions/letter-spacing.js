import { Mark, mergeAttributes } from '@tiptap/core'

export default Mark.create({
  name: 'letterSpacing',

  // 默认配置
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  // 定义属性如何映射到 HTML 样式
  addAttributes() {
    return {
      spacing: {
        default: null,
        parseHTML: (element) =>
          element.style.letterSpacing?.replace(/['"]+/g, ''),
        renderHTML: (attributes) => {
          if (!attributes.spacing) {
            return {}
          }
          return {
            style: `letter-spacing: ${attributes.spacing}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) => {
          const hasSpacing = element.style.letterSpacing
          if (!hasSpacing) return false
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ]
  },
  addCommands() {
    return {
      setLetterSpacing:
        (spacing) =>
        ({ chain }) => {
          return chain().setMark(this.name, { spacing }).run()
        },
      unsetLetterSpacing:
        () =>
        ({ chain }) => {
          return chain().unsetMark(this.name).run()
        },
    }
  },
})
