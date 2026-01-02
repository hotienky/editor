import CodeBlock from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { common, createLowlight } from 'lowlight'

import NodeView from './node-view.vue'

const customCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'plaintext',
      },
      theme: {
        default: 'light',
      },
      wordWrap: {
        default: true,
      },
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },
})

export default customCodeBlock.configure({
  lowlight: createLowlight(common),
  enableTabIndentation: true,
  tabSize: 2,
  defaultLanguage: 'plaintext',
})
