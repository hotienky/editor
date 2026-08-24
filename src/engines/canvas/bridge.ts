import type { JSONContent } from '@tiptap/core'
import {
  ElementType,
  ImageDisplay,
  ListType,
  RowFlex,
  TableBorder,
  TitleLevel,
  VerticalAlign,
  type IEditorData,
  type IElement,
} from './core'
import type { KindyHeaderFooterState, KindyPageState } from '../../core/types'

const TITLE_LEVELS = [
  TitleLevel.FIRST,
  TitleLevel.SECOND,
  TitleLevel.THIRD,
  TitleLevel.FOURTH,
  TitleLevel.FIFTH,
  TitleLevel.SIXTH,
]

const graphemes = (value: string) => {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...segmenter.segment(value)].map((part) => part.segment)
  }
  return Array.from(value)
}

const numericFontSize = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number.parseFloat(String(value || ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

const rowFlexFromAttrs = (attrs: JSONContent['attrs']): RowFlex | undefined => {
  const align = String(attrs?.textAlign || attrs?.align || '').toLowerCase()
  if (align === 'center') return RowFlex.CENTER
  if (align === 'right' || align === 'end') return RowFlex.RIGHT
  if (align === 'justify' || align === 'both' || align === 'distribute' || align === 'alignment') return RowFlex.JUSTIFY
  if (align === 'left' || align === 'start') return RowFlex.LEFT
  return undefined
}

const paragraphStyle = (node: JSONContent): Partial<IElement> => {
  const attrs = node.attrs || {}
  const lineHeight = numericFontSize(attrs.lineHeight)
  return {
    rowFlex: rowFlexFromAttrs(attrs),
    rowMargin: lineHeight,
    extension: {
      kindyBlockAttrs: attrs,
      kindyBlockType: node.type,
      kindyNodeAttrs: attrs,
      kindyNodeType: node.type,
    },
  }
}

const extensionRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const mergeExtension = (
  inherited: Partial<IElement>,
  value: Record<string, unknown>,
) => ({
  ...extensionRecord(inherited.extension),
  ...value,
})

const inlineStyle = (node: JSONContent): Partial<IElement> => {
  const result: Partial<IElement> = {}
  for (const mark of node.marks || []) {
    if (mark.type === 'bold') result.bold = true
    if (mark.type === 'italic') result.italic = true
    if (mark.type === 'underline') result.underline = true
    if (mark.type === 'strike') result.strikeout = true
    if (mark.type === 'subscript') result.type = ElementType.SUBSCRIPT
    if (mark.type === 'superscript') result.type = ElementType.SUPERSCRIPT
    if (mark.type === 'comment') {
      const commentId = String(mark.attrs?.id || mark.attrs?.thread || '')
      if (commentId) result.groupIds = [commentId]
    }
    if (mark.type === 'textStyle') {
      result.font = String(mark.attrs?.fontFamily || '') || undefined
      result.size = numericFontSize(mark.attrs?.fontSize)
      result.color = String(mark.attrs?.color || '') || undefined
      result.highlight = String(mark.attrs?.backgroundColor || '') || undefined
    }
  }
  return result
}

const linkFromMarks = (node: JSONContent) => node.marks?.find((mark) => mark.type === 'link')

const inlineNodesToElements = (
  nodes: JSONContent[] = [],
  inherited: Partial<IElement> = {},
): IElement[] => {
  const output: IElement[] = []
  for (const node of nodes) {
    if (node.type === 'text') {
      const storedMarks = (node.marks || [])
        .filter((mark) => mark.type === 'comment' || mark.type === 'trackChange')
        .map((mark) => ({ type: mark.type, attrs: mark.attrs ? { ...mark.attrs } : undefined }))
      const style = {
        ...inherited,
        ...inlineStyle(node),
        extension: mergeExtension(inherited, storedMarks.length ? { kindyMarks: storedMarks } : {}),
      }
      const valueList = graphemes(node.text || '').map((value) => ({ value, ...style }))
      const link = linkFromMarks(node)
      if (link?.attrs?.href) {
        output.push({
          type: ElementType.HYPERLINK,
          value: '',
          valueList,
          url: String(link.attrs.href),
        })
      } else {
        output.push(...valueList)
      }
      continue
    }
    if (node.type === 'hardBreak') {
      output.push({
        value: '\n',
        ...inherited,
        extension: mergeExtension(inherited, {
          kindyInlineNodeType: node.type,
          kindyInlineNodeAttrs: node.attrs || {},
        }),
      })
    }
    if (node.type === 'docxTab') {
      output.push({
        type: ElementType.TAB,
        value: '\t',
        ...inherited,
        extension: mergeExtension(inherited, {
          kindyInlineNodeType: node.type,
          kindyInlineNodeAttrs: node.attrs || {},
        }),
      })
    }
    if (node.type === 'pageBreak' || node.type === 'sectionBreak') {
      output.push({
        type: ElementType.PAGE_BREAK,
        value: '',
        extension: { kindyNodeType: node.type, kindyNodeAttrs: node.attrs || {} },
      })
    }
    if (node.type === 'inlineImage' || node.type === 'image') {
      const attrs = node.attrs || {}
      output.push({
        type: ElementType.IMAGE,
        value: String(attrs.src || ''),
        width: numericFontSize(attrs.width),
        height: numericFontSize(attrs.height),
        imgDisplay: node.type === 'inlineImage' ? ImageDisplay.INLINE : ImageDisplay.BLOCK,
        extension: mergeExtension(inherited, { kindyNodeAttrs: attrs, kindyNodeType: node.type }),
      })
    }
  }
  return output
}

const cellElements = (node: JSONContent) => {
  const output: IElement[] = []
  for (const child of node.content || []) output.push(...blockNodeToElements(child))
  return output.length ? output : [{ value: '' }]
}

const listItemElements = (node: JSONContent, level: number) => {
  const output: IElement[] = []
  for (const child of node.content || []) {
    if (child.type === 'bulletList' || child.type === 'orderedList') {
      for (const nested of child.content || []) {
        output.push(...listItemElements(nested, level + 1))
      }
      continue
    }
    const values = blockNodeToElements(child)
    values.forEach((value) => { value.listLevel = level })
    output.push(...values)
  }
  if (output.at(-1)?.value !== '\n') output.push({ value: '\n', listLevel: level })
  return output
}

const blockNodeToElements = (node: JSONContent): IElement[] => {
  if (node.type === 'paragraph') {
    const style = paragraphStyle(node)
    return [...inlineNodesToElements(node.content, style), { value: '\n', ...style }]
  }
  if (node.type === 'heading') {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1))
    const titleId = String(node.attrs?.titleId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    const valueList = inlineNodesToElements(node.content, paragraphStyle(node))
    valueList.forEach((el) => {
      el.titleId = titleId
      el.level = TITLE_LEVELS[level - 1]
    })
    return [{
      type: ElementType.TITLE,
      value: '',
      titleId,
      level: TITLE_LEVELS[level - 1],
      valueList,
      extension: { kindyNodeAttrs: { ...node.attrs, titleId }, kindyNodeType: node.type },
    }]
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const valueList = (node.content || []).flatMap((item) => listItemElements(item, 0))
    return [{
      type: ElementType.LIST,
      value: '',
      listType: node.type === 'orderedList' ? ListType.OL : ListType.UL,
      valueList,
      extension: { kindyNodeAttrs: node.attrs || {}, kindyNodeType: node.type },
    }]
  }
  if (node.type === 'table') {
    const rows = node.content || []
    const tableLayout = extensionRecord(node.attrs?.docxLayout)
    const columnCount = Math.max(1, ...rows.map((row) => (row.content || [])
      .reduce((sum, cell) => sum + (Number(cell.attrs?.colspan) || 1), 0)))
    const firstRow = rows[0]?.content || []
    const importedGrid = Array.isArray(tableLayout.gridWidthsTwip)
      ? tableLayout.gridWidthsTwip.map(Number).filter((width) => Number.isFinite(width) && width > 0)
      : []
    const cellWidths = firstRow.flatMap((cell) => {
      const colwidth = cell.attrs?.colwidth
      if (Array.isArray(colwidth) && colwidth.length) return colwidth.map(Number)
      return [0]
    })
    const explicitWidths = importedGrid.length === columnCount
      ? importedGrid.map((width) => width / 15)
      : cellWidths
    const totalExplicit = explicitWidths.reduce((sum, w) => sum + (w || 0), 0)
    const colgroup = totalExplicit > 0 && explicitWidths.length === columnCount
      ? explicitWidths.map((width) => ({ width: width > 0 ? width : Math.floor(650 / columnCount) }))
      : Array.from({ length: columnCount }, () => ({ width: Math.floor(650 / columnCount) }))
    const hasVisibleBorders = tableLayout.hasVisibleBorders !== false
    return [{
      type: ElementType.TABLE,
      value: '',
      colgroup,
      borderType: hasVisibleBorders ? TableBorder.ALL : TableBorder.EMPTY,
      borderColor: String(tableLayout.borderColor || '#94a3b8'),
      borderWidth: Number(tableLayout.borderWidthPx) || 1,
      trList: rows.map((row) => ({
        height: Number(row.attrs?.height) || 36,
        pagingRepeat: Boolean(row.attrs?.repeatHeader || row.content?.some((cell) => cell.type === 'tableHeader')),
        extension: {
          kindyNodeAttrs: row.attrs || {},
          kindyNodeType: row.type,
        },
        tdList: (row.content || []).map((cell) => ({
          colspan: Number(cell.attrs?.colspan) || 1,
          rowspan: Number(cell.attrs?.rowspan) || 1,
          verticalAlign: cell.attrs?.verticalAlign === 'bottom'
            ? VerticalAlign.BOTTOM
            : cell.attrs?.verticalAlign === 'center' || cell.attrs?.verticalAlign === 'middle'
              ? VerticalAlign.MIDDLE
              : VerticalAlign.TOP,
          backgroundColor: String(cell.attrs?.background || '') || undefined,
          value: cellElements(cell),
          extension: {
            kindyNodeAttrs: cell.attrs || {},
            kindyNodeType: cell.type,
          },
        })),
      })),
      extension: { kindyNodeAttrs: node.attrs || {}, kindyNodeType: node.type },
    }]
  }
  if (node.type === 'pageBreak' || node.type === 'sectionBreak') {
    return [{
      type: ElementType.PAGE_BREAK,
      value: '',
      extension: { kindyNodeAttrs: node.attrs || {}, kindyNodeType: node.type },
    }]
  }
  if (node.type === 'image' || node.type === 'inlineImage') return inlineNodesToElements([node])
  if (node.type === 'horizontalRule') return [{ type: ElementType.SEPARATOR, value: '' }]
  if (node.type === 'blockquote') {
    return (node.content || []).flatMap((child) => blockNodeToElements(child))
  }
  return (node.content || []).flatMap((child) => blockNodeToElements(child))
}

const headerFooterToElements = (state?: KindyHeaderFooterState) => {
  if (!state?.enabled) return []
  if (state.content) return proseMirrorToCanvasElements(state.content)
  if (state.text) return [...graphemes(state.text).map((value) => ({ value })), { value: '\n' }]
  return []
}

export function proseMirrorToCanvasElements(content: JSONContent): IElement[] {
  const elements = (content.content || []).flatMap((node) => blockNodeToElements(node))
  if (!elements.length) return [{ value: '' }]
  if (elements.at(-1)?.value === '\n') elements.pop()
  return elements.length ? elements : [{ value: '' }]
}

export function proseMirrorToCanvasData(
  content: JSONContent,
  page?: KindyPageState,
): IEditorData {
  return {
    header: headerFooterToElements(page?.header),
    main: proseMirrorToCanvasElements(content),
    footer: headerFooterToElements(page?.footer),
  }
}

const marksFromElement = (element: IElement): JSONContent['marks'] => {
  const marks: NonNullable<JSONContent['marks']> = []
  const extension = extensionRecord(element.extension)
  const storedMarks = Array.isArray(extension.kindyMarks)
    ? extension.kindyMarks.filter((mark): mark is NonNullable<JSONContent['marks']>[number] => (
        Boolean(mark) && typeof mark === 'object' && typeof (mark as { type?: unknown }).type === 'string'
      ))
    : []
  if (element.bold) marks.push({ type: 'bold' })
  if (element.italic) marks.push({ type: 'italic' })
  if (element.underline) marks.push({ type: 'underline' })
  if (element.strikeout) marks.push({ type: 'strike' })
  if (element.type === ElementType.SUBSCRIPT) marks.push({ type: 'subscript' })
  if (element.type === ElementType.SUPERSCRIPT) marks.push({ type: 'superscript' })
  for (const groupId of element.groupIds || []) {
    const stored = storedMarks.find((mark) => mark.type === 'comment' && String(mark.attrs?.id || '') === groupId)
    marks.push(stored
      ? { type: 'comment', attrs: stored.attrs ? { ...stored.attrs } : { id: groupId } }
      : { type: 'comment', attrs: { id: groupId, thread: groupId } })
  }
  storedMarks
    .filter((mark) => mark.type === 'trackChange')
    .forEach((mark) => marks.push({ type: mark.type, attrs: mark.attrs ? { ...mark.attrs } : undefined }))
  const textStyle = {
    fontFamily: element.font,
    fontSize: element.size ? `${element.size}pt` : undefined,
    color: element.color,
    backgroundColor: element.highlight,
  }
  if (Object.values(textStyle).some(Boolean)) marks.push({ type: 'textStyle', attrs: textStyle })
  return marks.length ? marks : undefined
}

const sameMarks = (left?: JSONContent['marks'], right?: JSONContent['marks']) => (
  JSON.stringify(left || []) === JSON.stringify(right || [])
)

const appendText = (output: JSONContent[], text: string, marks?: JSONContent['marks']) => {
  if (!text) return
  const previous = output.at(-1)
  if (previous?.type === 'text' && sameMarks(previous.marks, marks)) previous.text = `${previous.text || ''}${text}`
  else output.push({ type: 'text', text, marks })
}

const inlineElementsToNodes = (elements: IElement[] = []): JSONContent[] => {
  const output: JSONContent[] = []
  for (const element of elements) {
    if (element.type === ElementType.HYPERLINK) {
      const nodes = inlineElementsToNodes(element.valueList || [])
      for (const node of nodes) {
        if (node.type !== 'text') {
          output.push(node)
          continue
        }
        node.marks = [...(node.marks || []), { type: 'link', attrs: { href: element.url || '' } }]
        output.push(node)
      }
      continue
    }
    if (element.type === ElementType.IMAGE) {
      const extension = element.extension as Record<string, unknown> | undefined
      const imported = extension?.kindyNodeAttrs as Record<string, unknown> | undefined
      output.push({
        type: extension?.kindyNodeType === 'inlineImage' ? 'inlineImage' : 'image',
        attrs: { ...imported, src: element.value, width: element.width, height: element.height },
      })
      continue
    }
    if (element.type === ElementType.TAB) {
      const extension = extensionRecord(element.extension)
      output.push({
        type: 'docxTab',
        attrs: (extension.kindyInlineNodeAttrs || {}) as JSONContent['attrs'],
      })
      continue
    }
    if (element.type === ElementType.PAGE_BREAK) {
      const extension = element.extension as Record<string, unknown> | undefined
      output.push({
        type: extension?.kindyNodeType === 'sectionBreak' ? 'sectionBreak' : 'pageBreak',
        attrs: extension?.kindyNodeAttrs as JSONContent['attrs'],
      })
      continue
    }
    if (element.value === '\n') output.push({ type: 'hardBreak' })
    else appendText(output, element.value || '', marksFromElement(element))
  }
  return output
}

const attrsFromExtension = (element: IElement) => {
  const extension = element.extension as Record<string, unknown> | undefined
  return (extension?.kindyNodeAttrs || {}) as JSONContent['attrs']
}

const paragraphsFromElements = (elements: IElement[] = []) => {
  const paragraphs: JSONContent[] = []
  let current: IElement[] = []
  const flush = (boundary?: IElement) => {
    const style = current.find((element) => element.rowFlex || element.rowMargin)
    const metadataSource = current.find((element) => {
      const extension = extensionRecord(element.extension)
      return Boolean(extension.kindyBlockAttrs || extension.kindyNodeAttrs)
    }) || boundary
    const metadata = extensionRecord(metadataSource?.extension)
    const attrs: Record<string, unknown> = {
      ...extensionRecord(metadata.kindyBlockAttrs || metadata.kindyNodeAttrs),
    }
    if (style?.rowFlex) attrs.textAlign = style.rowFlex === RowFlex.ALIGNMENT ? 'justify' : style.rowFlex
    if (style?.rowMargin !== undefined) attrs.lineHeight = style.rowMargin
    paragraphs.push({
      type: 'paragraph',
      attrs: Object.keys(attrs).length ? attrs : undefined,
      content: inlineElementsToNodes(current),
    })
    current = []
  }
  for (const element of elements) {
    const extension = extensionRecord(element.extension)
    if (element.value === '\n' && extension.kindyInlineNodeType === 'hardBreak') current.push(element)
    else if (element.value === '\n') flush(element)
    else current.push(element)
  }
  if (current.length || !paragraphs.length) flush()
  return paragraphs
}

const listItemFromElements = (elements: IElement[]) => ({
  type: 'listItem',
  content: paragraphsFromElements(elements),
} satisfies JSONContent)

const blockElementsToNodes = (elements: IElement[] = []): JSONContent[] => {
  const output: JSONContent[] = []
  let inline: IElement[] = []
  const flushInline = () => {
    if (!inline.length) return
    output.push(...paragraphsFromElements(inline))
    inline = []
  }
  for (const element of elements) {
    if (element.type === ElementType.TITLE) {
      flushInline()
      output.push({
        type: 'heading',
        attrs: {
          ...attrsFromExtension(element),
          level: Math.max(1, TITLE_LEVELS.indexOf(element.level || TitleLevel.FIRST) + 1),
        },
        content: inlineElementsToNodes(element.valueList || []),
      })
      continue
    }
    if (element.type === ElementType.LIST) {
      flushInline()
      const items: IElement[][] = []
      let current: IElement[] = []
      for (const value of element.valueList || []) {
        if (value.value === '\n') {
          items.push(current)
          current = []
        } else current.push(value)
      }
      if (current.length) items.push(current)
      output.push({
        type: element.listType === ListType.OL ? 'orderedList' : 'bulletList',
        attrs: attrsFromExtension(element),
        content: (items.length ? items : [[]]).map(listItemFromElements),
      })
      continue
    }
    if (element.type === ElementType.TABLE) {
      flushInline()
      output.push({
        type: 'table',
        attrs: attrsFromExtension(element),
        content: (element.trList || []).map((row) => ({
          type: 'tableRow',
          attrs: {
            ...extensionRecord(extensionRecord(row.extension).kindyNodeAttrs),
            height: row.height || null,
            repeatHeader: Boolean(row.pagingRepeat),
          },
          content: row.tdList.map((cell) => {
            const extension = cell.extension as Record<string, unknown> | undefined
            return {
              type: extension?.kindyNodeType === 'tableHeader' ? 'tableHeader' : 'tableCell',
              attrs: {
                ...(extension?.kindyNodeAttrs as Record<string, unknown> || {}),
                colspan: cell.colspan,
                rowspan: cell.rowspan,
                verticalAlign: cell.verticalAlign,
                background: cell.backgroundColor,
              },
              content: blockElementsToNodes(cell.value),
            }
          }),
        })),
      })
      continue
    }
    if (element.type === ElementType.PAGE_BREAK) {
      flushInline()
      const extension = element.extension as Record<string, unknown> | undefined
      output.push({
        type: extension?.kindyNodeType === 'sectionBreak' ? 'sectionBreak' : 'pageBreak',
        attrs: extension?.kindyNodeAttrs as JSONContent['attrs'],
      })
      continue
    }
    if (element.type === ElementType.SEPARATOR) {
      flushInline()
      output.push({ type: 'horizontalRule' })
      continue
    }
    inline.push(element)
  }
  flushInline()
  return output
}

export function canvasDataToProseMirror(data: IEditorData): JSONContent {
  const content = blockElementsToNodes(data.main)
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  }
}

export function canvasElementsToProseMirror(elements: IElement[]): JSONContent {
  const content = blockElementsToNodes(elements)
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  }
}
