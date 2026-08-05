import { OrderedList } from '@tiptap/extension-list'

import FootnoteRules from './rules'

export default OrderedList.extend({
  name: 'footnotes',
  group: '',
  isolating: true,
  defining: true,
  draggable: false,
  content() {
    return 'footnote*'
  },
  addAttributes() {
    return {
      class: {
        default: 'kindy-node-footnotes',
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'ol.kindy-node-footnotes',
        priority: 1000,
      },
    ]
  },
  addKeyboardShortcuts() {
    return {}
  },
  addCommands() {
    return {}
  },
  addInputRules() {
    return []
  },
  addExtensions() {
    return [FootnoteRules]
  },
})
