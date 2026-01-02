import { Extension } from '@tiptap/core'

import { Column } from './column'
import { ColumnBlock } from './column-block'

export default Extension.create({
  name: 'columns',

  addExtensions() {
    const extensions = []

    if (this.options.column !== false) {
      extensions.push(Column)
    }

    if (this.options.columnBlock !== false) {
      extensions.push(ColumnBlock)
    }

    return extensions
  },
})

export { Column, ColumnBlock }
