import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import NodeView from './signature-node-view.vue'

export default Node.create({
  name: 'signatureBlock',
  group: 'block',
  content: 'paragraph*',
  atom: false,
  defining: true,
  selectable: true,

  addAttributes() {
    return {
      partyName: {
        default: '',
      },
      partyTitle: {
        default: '',
      },
      signedDate: {
        default: '',
      },
      signatureType: {
        default: 'signature', // signature, initials, digital
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="signature-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'signature-block',
        class: 'kindy-signature-block',
      }),
      0,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },

  addCommands() {
    return {
      insertSignatureBlock:
        (options = {}) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                partyName: options.partyName || '',
                partyTitle: options.partyTitle || '',
                signatureType: options.signatureType || 'signature',
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: options.placeholder || '___________________________________________',
                    },
                  ],
                },
              ],
            })
            .run()
        },
    }
  },
})
