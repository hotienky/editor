import { Extension, mergeAttributes, Node } from '@tiptap/core'

import { columnsKeymap } from './keymap'
import { gridResizingPlugin } from './resize'

const Column = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',
  addAttributes() {
    return {
      colWidth: {
        default: 200,
        parseHTML: (element) => {
          const width = element.style.width.replace('px', '')
          return Number(width) || 200
        },
        renderHTML: (attributes) => {
          const style = attributes.colWidth
            ? `width: ${attributes.colWidth}px;`
            : ''
          return { style }
        },
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div.umo-node-column',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: 'umo-node-column' }),
      0,
    ]
  },
})

const ColumnContainer = Node.create({
  name: 'columnContainer',
  group: 'block',
  content: 'column+',
  parseHTML() {
    return [
      {
        tag: 'div.umo-node-column-container',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'umo-node-column-container',
      }),
      0,
    ]
  },
})

export default Extension.create({
  name: 'columns',
  addExtensions() {
    return [Column, ColumnContainer]
  },
  addCommands() {},
  addProseMirrorPlugins() {
    return [
      gridResizingPlugin({ handleWidth: 2, columnMinWidth: 50 }),
      columnsKeymap,
    ]
  },
})
