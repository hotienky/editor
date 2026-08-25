import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table/cell'
import { TableHeader } from '@tiptap/extension-table/header'
import { TableRow } from '@tiptap/extension-table/row'
import { mergeCells, splitCell } from '@tiptap/pm/tables'

// 扩展表格能力
const CustomTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'kindy-node-table',
      },
      allowTableNodeSelection: true,
      resizable: true,
      mergeCells: true,
      splitCell: true,
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      alignment: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alignment') || null,
        renderHTML: ({ alignment }) => {
          if (!alignment) return {}
          return { 'data-alignment': alignment, style: `margin-left: auto; margin-right: auto;` }
        },
      },
      borders: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') || ''
          const match = style.match(/width:\s*(\d+(?:\.\d+)?%?)/i)
          return match ? match[1] : null
        },
        renderHTML: ({ width }) => {
          if (!width) return {}
          if (typeof width === 'object') {
            if (width.pct) return { style: `width: ${width.pct / 50}%` }
            if (width.twips) return { style: `width: ${Math.round(width.twips / 15 * 100) / 100}px` }
          }
          return { style: `width: ${width}` }
        },
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const { alignment, ...rest } = HTMLAttributes
    const style = alignment
      ? `margin-left: auto; margin-right: auto;${rest.style ? ` ${rest.style}` : ''}`
      : rest.style
    return ['table', { ...rest, ...(style ? { style } : {}), ...(alignment ? { 'data-alignment': alignment } : {}) }, ['tbody', 0]]
  },

  addCommands() {
    return {
      ...this.parent?.(),

      mergeCells:
        () =>
        ({ state, dispatch }) => {
          return mergeCells(state, dispatch)
        },

      splitCell:
        () =>
        ({ state, dispatch }) => {
          return splitCell(state, dispatch)
        },

      distributeTableColumns:
        () =>
        ({ state, dispatch, tr }) => {
          const { selection } = state
          const table = state.doc.nodeAt(selection.from)
          if (!table || table.type.name !== 'table') return false
          const colCount = table.content?.content?.[0]?.content?.content?.length || 0
          if (colCount === 0) return false
          const totalWidth = table.attrs.width || state.doc.content.size
          const colWidth = Math.floor(totalWidth / colCount)
          const newTable = table.type.create(
            table.attrs,
            table.content.content.map(row => {
              const newRow = row.type.create(
                row.attrs,
                row.content.content.map(cell =>
                  cell.type.create({ ...cell.attrs, width: colWidth }, cell.content)
                )
              )
              return newRow
            }),
          )
          if (dispatch) {
            dispatch(state.tr.replaceWith(selection.from, selection.from + table.nodeSize, newTable))
          }
          return true
        },

      setTableColumnWidth:
        (columnIndex, width) =>
        ({ state, dispatch }) => {
          const { selection } = state
          const table = state.doc.nodeAt(selection.from)
          if (!table || table.type.name !== 'table') return false
          const newTable = table.type.create(
            table.attrs,
            table.content.content.map(row => {
              const cells = row.content.content.map((cell, i) => {
                if (i === columnIndex) {
                  return cell.type.create({ ...cell.attrs, width }, cell.content)
                }
                return cell
              })
              return row.type.create(row.attrs, cells)
            }),
          )
          if (dispatch) {
            dispatch(state.tr.replaceWith(selection.from, selection.from + table.nodeSize, newTable))
          }
          return true
        },

      insertTableColumn:
        (position = 'after') =>
        ({ chain }) => {
          return position === 'before' ? chain().addColumnBefore().run() : chain().addColumnAfter().run()
        },

      insertTableRow:
        (position = 'after') =>
        ({ chain }) => {
          return position === 'before' ? chain().addRowBefore().run() : chain().addRowAfter().run()
        },

      deleteTableColumns:
        () =>
        ({ chain }) => {
          return chain().deleteColumn().run()
        },

      deleteTableRows:
        () =>
        ({ chain }) => {
          return chain().deleteRow().run()
        },

      toggleTableHeaderRow:
        () =>
        ({ chain }) => {
          return chain().toggleHeaderRow().run()
        },

      setTableAlignment:
        (alignment) =>
        ({ state, dispatch }) => {
          const { selection } = state
          const table = state.doc.nodeAt(selection.from)
          if (!table || table.type.name !== 'table') return false
          if (dispatch) {
            dispatch(state.tr.setNodeMarkup(selection.from, undefined, {
              ...table.attrs,
              alignment,
            }))
          }
          return true
        },
    }
  },
})

// 扩展单元格
const TableCellOptions = {
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute('align') || null,
        renderHTML: ({ align }) => ({ align }),
      },
      background: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') || ''
          const match = style.match(/background(?:-color)?:\s*([^;]+)/i)
          return match ? match[1].trim() : null
        },
        renderHTML: ({ background }) => {
          return background ? { style: `background-color: ${background}` } : {}
        },
      },
      color: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') || ''
          const match = style.match(/(?<!background-)color:\s*([^;]+)/i)
          return match ? match[1].trim() : null
        },
        renderHTML: ({ color }) => {
          return color ? { style: `color: ${color}` } : {}
        },
      },
      colspan: {
        default: 1,
        parseHTML: (element) => {
          const value = element.getAttribute('colspan')
          return value ? parseInt(value, 10) : 1
        },
      },
      rowspan: {
        default: 1,
        parseHTML: (element) => {
          const value = element.getAttribute('rowspan')
          return value ? parseInt(value, 10) : 1
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('valign') || null,
        renderHTML: ({ verticalAlign }) => {
          return verticalAlign ? { valign: verticalAlign } : {}
        },
      },
      margins: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    }
  },
}

const CustomTableHeader = TableHeader.extend(TableCellOptions)
const CustomTableCell = TableCell.extend(TableCellOptions)

export {
  CustomTable as Table,
  CustomTableCell as TableCell,
  CustomTableHeader as TableHeader,
  TableRow,
}
