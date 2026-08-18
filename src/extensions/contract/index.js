import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import NodeView from './node-view.vue'

export default Node.create({
  name: 'contractVariable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      label: {
        default: 'Variable',
      },
      placeholder: {
        default: '',
      },
      required: {
        default: false,
      },
      type: {
        default: 'text', // text, date, number, money, party
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="contract-variable"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'contract-variable',
        class: 'kindy-contract-variable',
      }),
      `{{${HTMLAttributes.label}}}`,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },

  addCommands() {
    return {
      insertContractVariable:
        (options) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: options,
            })
            .run()
        },
      setContractVariable:
        (options) =>
        ({ tr, dispatch }) => {
          const { node } = tr.selection
          if (node && node.type.name === this.name) {
            if (dispatch) {
              tr.setNodeMarkup(tr.selection.from, undefined, options)
            }
            return true
          }
          return false
        },
    }
  },

  addInputRules() {
    return []
  },
})
