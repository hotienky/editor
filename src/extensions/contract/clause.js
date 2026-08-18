import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import NodeView from './clause-node-view.vue'

export default Node.create({
  name: 'contractClause',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  selectable: true,

  addAttributes() {
    return {
      clauseId: {
        default: '',
      },
      clauseName: {
        default: '',
      },
      category: {
        default: 'general', // general, payment, liability, termination, ip, confidentiality
      },
      isCustom: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="contract-clause"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'contract-clause',
        class: 'kindy-contract-clause',
      }),
      0,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },

  addCommands() {
    return {
      insertClause:
        (options) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                clauseId: options.id || '',
                clauseName: options.name || 'Untitled Clause',
                category: options.category || 'general',
                isCustom: options.isCustom || false,
              },
              content: options.content || [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Enter clause content here...' }],
                },
              ],
            })
            .run()
        },
    }
  },
})
