import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table/cell'
import { TableHeader } from '@tiptap/extension-table/header'
import { TableRow } from '@tiptap/extension-table/row'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// 解析剪切板中 excel 的 CSS 规则（将 CSS 字符串转换为对象）
const parseCSS = (cssRules) => {
  const results = {}
  const rules = cssRules
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
  rules.forEach((rule) => {
    const [property, value] = rule.split(':').map((part) => part.trim())
    if (property && value) {
      results[property] = value
    }
  })
  return results
}

// 提取样式规则的方法
const extractStyles = (styleText) => {
  const regex = /\.(\w+)\s*\{([^}]+)\}/g
  let match
  const styles = {}

  while ((match = regex.exec(styleText)) !== null) {
    // const className = match[1]
    // const cssRules = match[2]
    const [, className, cssRules] = match
    const parsedRules = parseCSS(cssRules)
    styles[className] = parsedRules
  }

  return styles
}

// 扩展表格能力
const CustomTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'umo-node-table',
      },
    }
  },
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      // 处理从 Microsoft Excel 粘贴的表格样式问题
      new Plugin({
        key: new PluginKey('handleExcelPaste'),
        props: {
          handlePaste(view, event) {
            const { clipboardData } = event
            if (!clipboardData) return false

            const html = clipboardData.getData('text/html')
            if (!html) return false

            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')
            const excel = doc
              ?.querySelector('html')
              ?.getAttribute('xmlns:x')
              ?.includes('office:excel')
            if (!excel) {
              return false
            }

            const table = doc.querySelector('table')
            if (!table) return false

            const styleText = Array.from(doc.head.querySelectorAll('style'))
              .map((style) => style.textContent)
              .join('\n')

            // 提取所有样式规则
            const styles = extractStyles(styleText)

            // 添加单元格的样式
            table.querySelectorAll('td, th').forEach((cell) => {
              const style = styles[cell.getAttribute('class')]
              if (style?.background) {
                cell.style.background = style.background
              }
              if (style?.color) {
                cell.style.color = style.color
              }
              if (style?.['text-align']) {
                cell.setAttribute('align', style['text-align'])
              }
            })

            // 使用 ProseMirror 的 DOMParser 将表格转换为 ProseMirror 节点
            const { schema } = view.state
            const fragment =
              ProseMirrorDOMParser.fromSchema(schema).parse(table)
            const transaction = view.state.tr.replaceSelectionWith(fragment)
            view.dispatch(transaction)

            return true
          },
        },
      }),
    ]
  },
})

// 扩展单元格
const TableCellOptions = {
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute('align') ?? null,
        renderHTML: ({ align }) => ({ align }),
      },
      background: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute('style') ?? ''
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
          const style = element.getAttribute('style') ?? ''
          const match = style.match(/(?<!background-)color:\s*([^;]+)/i)
          if (style.includes('background-color')) return null
          return match ? match[1].trim() : null
        },
        renderHTML: ({ color }) => {
          return color ? { style: `color: ${color}` } : {}
        },
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
