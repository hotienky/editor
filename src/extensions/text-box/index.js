import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import NodeView from './node-view.vue'

export default Node.create({
  name: 'textBox',
  group: 'block',
  content: 'inline*',
  draggable: false,
  addAttributes() {
    return {
      vnode: {
        default: true,
      },
      width: {
        default: 200,
      },
      height: {
        default: 30,
      },
      angle: {
        default: null,
      },
      left: {
        default: 0,
      },
      top: {
        default: 0,
      },
      rotatable: {
        default: true,
      },
      borderWidth: {
        default: 1,
      },
      borderColor: {
        default: '#000',
      },
      borderStyle: {
        default: 'solid',
      },
      backgroundColor: {
        default: 'transparent',
      },
      writingMode: {
        default: 'horizontal-tb',
        parseHTML: (element) => {
          return element.style.writingMode || this.options.writingMode
        },
        renderHTML: ({ writingMode }) => {
          return { style: `writing-mode: ${writingMode}` }
        },
      },
    }
  },
  parseHTML() {
    return [{ tag: 'text-box' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['text-box', mergeAttributes(HTMLAttributes), 0]
  },
  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },
  addCommands() {
    return {
      setTextBox:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
