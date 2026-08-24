import { ElementType } from '../dataset/enum/Element'
import { TitleLevel } from '../dataset/enum/Title'
import { RowFlex } from '../dataset/enum/Row'
import { ListType, ListStyle } from '../dataset/enum/List'
import { IEditorData } from '../interface/Editor'
import { IElement } from '../interface/Element'
import { ITr } from '../interface/table/Tr'
import { ITd } from '../interface/table/Td'
import { IColgroup } from '../interface/table/Colgroup'

// Points to Pixels (standard 96 DPI screen: 1 pt = 96 / 72 px)
export const ptToPx = (pt: number): number => Math.round((pt * 96) / 72)
export const pxToPt = (px: number): number => (px * 72) / 96

/**
 * Chuyển đổi màu từ Google Docs RGB sang chuỗi CSS rgb()/rgba()
 */
export function parseGDocRgbColor(colorObj: any): string | undefined {
  const rgb = colorObj?.color?.rgbColor
  if (!rgb) return undefined
  const r = Math.round((rgb.red || 0) * 255)
  const g = Math.round((rgb.green || 0) * 255)
  const b = Math.round((rgb.blue || 0) * 255)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Chuyển đổi chuỗi CSS rgb() / hex sang Google Docs rgbColor (0.0 -> 1.0)
 */
export function colorToGDocRgb(colorStr: string): any {
  if (!colorStr) return undefined
  let r = 0
  let g = 0
  let b = 0

  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    const num = parseInt(hex, 16)
    r = (num >> 16) & 255
    g = (num >> 8) & 255
    b = num & 255
  } else if (colorStr.startsWith('rgb')) {
    const match = colorStr.match(/\d+/g)
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10)
      g = parseInt(match[1], 10)
      b = parseInt(match[2], 10)
    }
  } else {
    return undefined
  }

  return {
    color: {
      rgbColor: {
        red: r / 255,
        green: g / 255,
        blue: b / 255
      }
    }
  }
}

/**
 * Kiểm tra xem JSON payload có phải là Google Docs AST hay không
 */
export function isGoogleDocsAST(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false
  return Boolean(
    payload.documentId ||
    payload.body?.content ||
    (payload.title !== undefined && Array.isArray(payload.body?.content))
  )
}

/**
 * Chuyển đổi StructuralElement[] của Google Docs sang IElement[] của Canvas-Editor
 */
export function convertGoogleDocsContentToElements(
  contentList: any[],
  inlineObjectsMap: Record<string, any> = {}
): IElement[] {
  const elements: IElement[] = []

  for (const item of contentList) {
    // 1. Đoạn văn (Paragraph)
    if (item.paragraph) {
      const paragraph = item.paragraph
      const pStyle = paragraph.paragraphStyle || {}
      const namedStyle = pStyle.namedStyleType

      // Map Heading
      let level: TitleLevel | undefined
      if (namedStyle === 'HEADING_1' || namedStyle === 'TITLE') {
        level = TitleLevel.FIRST
      } else if (namedStyle === 'HEADING_2' || namedStyle === 'SUBTITLE') {
        level = TitleLevel.SECOND
      } else if (namedStyle === 'HEADING_3') {
        level = TitleLevel.THIRD
      } else if (namedStyle === 'HEADING_4') {
        level = TitleLevel.FOURTH
      } else if (namedStyle === 'HEADING_5') {
        level = TitleLevel.FIFTH
      } else if (namedStyle === 'HEADING_6') {
        level = TitleLevel.SIXTH
      }

      // Map Căn lề (Alignment)
      let rowFlex: RowFlex | undefined
      if (pStyle.alignment === 'CENTER') rowFlex = RowFlex.CENTER
      else if (pStyle.alignment === 'END') rowFlex = RowFlex.RIGHT
      else if (pStyle.alignment === 'JUSTIFIED') rowFlex = RowFlex.JUSTIFY

      // Map Danh sách (Bullet / Numbered List)
      let listType: ListType | undefined
      let listStyle: ListStyle | undefined
      let listId: string | undefined
      if (paragraph.bullet) {
        listId = paragraph.bullet.listId || 'list-1'
        listType = ListType.UL
        listStyle = ListStyle.DISC
      }

      for (const pElem of paragraph.elements || []) {
        // Xử lý Text Run
        if (pElem.textRun) {
          const { content, textStyle = {} } = pElem.textRun
          if (!content) continue

          const fontSizePt = textStyle.fontSize?.magnitude
          const fontSizePx = fontSizePt ? ptToPx(fontSizePt) : undefined
          const fontColor = parseGDocRgbColor(textStyle.foregroundColor)
          const highlight = parseGDocRgbColor(textStyle.backgroundColor)

          elements.push({
            value: content,
            level,
            rowFlex,
            listType,
            listStyle,
            listId,
            font: textStyle.weightedFontFamily?.fontFamily,
            bold: textStyle.bold || false,
            italic: textStyle.italic || false,
            underline: textStyle.underline || false,
            strikeout: textStyle.strikethrough || false,
            size: fontSizePx,
            color: fontColor,
            highlight
          })
        }
        // Xử lý Inline Image
        else if (pElem.inlineObjectElement) {
          const objectId = pElem.inlineObjectElement.inlineObjectId
          const inlineObj = inlineObjectsMap[objectId]
          const embedded = inlineObj?.inlineObjectProperties?.embeddedObject

          if (embedded?.imageProperties?.contentUri || embedded?.imageProperties?.sourceUri) {
            const uri =
              embedded.imageProperties.contentUri ||
              embedded.imageProperties.sourceUri
            const widthPt = embedded.size?.width?.magnitude
            const heightPt = embedded.size?.height?.magnitude

            elements.push({
              type: ElementType.IMAGE,
              value: uri,
              width: widthPt ? ptToPx(widthPt) : undefined,
              height: heightPt ? ptToPx(heightPt) : undefined
            })
          }
        }
        // Xử lý Page Break bên trong đoạn văn
        else if (pElem.pageBreak) {
          elements.push({
            type: ElementType.PAGE_BREAK,
            value: '\n'
          })
        }
        // Xử lý Horizontal Rule (Đường phân cách)
        else if (pElem.horizontalRule) {
          elements.push({
            type: ElementType.SEPARATOR,
            value: '\n'
          })
        }
      }
    }

    // 2. Bảng biểu (Table)
    if (item.table) {
      const gTable = item.table
      const trList: ITr[] = []
      const numCols = gTable.columns || (gTable.tableRows?.[0]?.tableCells?.length ?? 1)
      const colgroup: IColgroup[] = []

      // Trích xuất độ rộng từng cột
      if (gTable.tableStyle?.tableColumnProperties) {
        for (const colProp of gTable.tableStyle.tableColumnProperties) {
          const widthPt = colProp.width?.magnitude
          colgroup.push({ width: widthPt ? ptToPx(widthPt) : 150 })
        }
      } else {
        for (let i = 0; i < numCols; i++) {
          colgroup.push({ width: 180 })
        }
      }

      for (const row of gTable.tableRows || []) {
        const tdList: ITd[] = []
        for (const cell of row.tableCells || []) {
          const cellContentList = cell.content || []
          const cellElements = convertGoogleDocsContentToElements(
            cellContentList,
            inlineObjectsMap
          )

          // Xóa ký tự xuống dòng dư thừa ở cuối ô nếu có
          if (cellElements.length > 0) {
            const lastElem = cellElements[cellElements.length - 1]
            if (lastElem.value.endsWith('\n') && lastElem.value.length > 1) {
              lastElem.value = lastElem.value.slice(0, -1)
            }
          }

          const bgColor = parseGDocRgbColor(cell.tableCellStyle?.backgroundColor)

          tdList.push({
            colspan: cell.tableCellStyle?.columnSpan || 1,
            rowspan: cell.tableCellStyle?.rowSpan || 1,
            backgroundColor: bgColor,
            value: cellElements.length > 0 ? cellElements : [{ value: '' }]
          })
        }
        trList.push({
          height: 36,
          tdList
        })
      }

      elements.push({
        type: ElementType.TABLE,
        value: '\n',
        colgroup,
        trList
      })
    }

    // 3. Section Break
    if (item.sectionBreak) {
      elements.push({
        type: ElementType.PAGE_BREAK,
        value: '\n'
      })
    }
  }

  return elements
}

/**
 * Chuyển đổi toàn bộ tài liệu Google Docs AST sang IEditorData của Canvas-Editor
 */
export function convertGoogleDocsToEditorData(gDoc: any): IEditorData {
  if (!gDoc) {
    return { main: [] }
  }

  const inlineObjects = gDoc.inlineObjects || {}
  const mainElements = convertGoogleDocsContentToElements(
    gDoc.body?.content || [],
    inlineObjects
  )

  let headerElements: IElement[] | undefined
  let footerElements: IElement[] | undefined

  // Xử lý Header nếu có
  if (gDoc.headers) {
    const firstHeaderId = Object.keys(gDoc.headers)[0]
    if (firstHeaderId && gDoc.headers[firstHeaderId]?.content) {
      headerElements = convertGoogleDocsContentToElements(
        gDoc.headers[firstHeaderId].content,
        inlineObjects
      )
    }
  }

  // Xử lý Footer nếu có
  if (gDoc.footers) {
    const firstFooterId = Object.keys(gDoc.footers)[0]
    if (firstFooterId && gDoc.footers[firstFooterId]?.content) {
      footerElements = convertGoogleDocsContentToElements(
        gDoc.footers[firstFooterId].content,
        inlineObjects
      )
    }
  }

  return {
    header: headerElements,
    main: mainElements,
    footer: footerElements
  }
}

/**
 * Chuyển đổi IElement[] của Canvas-Editor ngược lại thành Google Docs AST JSON
 */
export function convertElementListToGoogleDocs(
  elements: IElement[],
  title = 'Untitled Document'
): any {
  const content: any[] = []
  const inlineObjects: Record<string, any> = {}
  let inlineObjCounter = 1

  let currentParagraphElements: any[] = []
  let currentLevel: TitleLevel | undefined
  let currentRowFlex: RowFlex | undefined

  const flushParagraph = () => {
    if (currentParagraphElements.length > 0) {
      let namedStyleType = 'NORMAL_TEXT'
      if (currentLevel === TitleLevel.FIRST) namedStyleType = 'HEADING_1'
      else if (currentLevel === TitleLevel.SECOND) namedStyleType = 'HEADING_2'
      else if (currentLevel === TitleLevel.THIRD) namedStyleType = 'HEADING_3'
      else if (currentLevel === TitleLevel.FOURTH) namedStyleType = 'HEADING_4'
      else if (currentLevel === TitleLevel.FIFTH) namedStyleType = 'HEADING_5'
      else if (currentLevel === TitleLevel.SIXTH) namedStyleType = 'HEADING_6'

      let alignment = 'START'
      if (currentRowFlex === RowFlex.CENTER) alignment = 'CENTER'
      else if (currentRowFlex === RowFlex.RIGHT) alignment = 'END'
      else if (currentRowFlex === RowFlex.JUSTIFY) alignment = 'JUSTIFIED'

      content.push({
        paragraph: {
          paragraphStyle: {
            namedStyleType,
            alignment
          },
          elements: currentParagraphElements
        }
      })
      currentParagraphElements = []
      currentLevel = undefined
      currentRowFlex = undefined
    }
  }

  for (const elem of elements) {
    if (elem.type === ElementType.TABLE) {
      flushParagraph()

      const tableRows: any[] = []
      for (const tr of elem.trList || []) {
        const tableCells: any[] = []
        for (const td of tr.tdList || []) {
          const cellSubDoc = convertElementListToGoogleDocs(td.value || [], '')
          const cellContent = cellSubDoc.body.content

          tableCells.push({
            content: cellContent.length > 0 ? cellContent : [
              { paragraph: { elements: [{ textRun: { content: '\n' } }] } }
            ],
            tableCellStyle: {
              columnSpan: td.colspan || 1,
              rowSpan: td.rowspan || 1,
              backgroundColor: td.backgroundColor ? colorToGDocRgb(td.backgroundColor) : undefined
            }
          })
        }
        tableRows.push({ tableCells })
      }

      content.push({
        table: {
          rows: elem.trList?.length || 0,
          columns: elem.colgroup?.length || 0,
          tableRows,
          tableStyle: {
            tableColumnProperties: elem.colgroup?.map(c => ({
              width: { magnitude: pxToPt(c.width), unit: 'PT' }
            }))
          }
        }
      })
    } else if (elem.type === ElementType.PAGE_BREAK) {
      currentParagraphElements.push({ pageBreak: {} })
      flushParagraph()
    } else if (elem.type === ElementType.SEPARATOR) {
      currentParagraphElements.push({ horizontalRule: {} })
      flushParagraph()
    } else if (elem.type === ElementType.IMAGE) {
      const objId = `kix.img_${inlineObjCounter++}`
      inlineObjects[objId] = {
        objectId: objId,
        inlineObjectProperties: {
          embeddedObject: {
            imageProperties: {
              contentUri: elem.value
            },
            size: {
              width: { magnitude: elem.width ? pxToPt(elem.width) : 200, unit: 'PT' },
              height: { magnitude: elem.height ? pxToPt(elem.height) : 200, unit: 'PT' }
            }
          }
        }
      }

      currentParagraphElements.push({
        inlineObjectElement: {
          inlineObjectId: objId
        }
      })
    } else {
      // Text element
      currentLevel = elem.level || currentLevel
      currentRowFlex = elem.rowFlex || currentRowFlex

      const textStyle: any = {}
      if (elem.bold) textStyle.bold = true
      if (elem.italic) textStyle.italic = true
      if (elem.underline) textStyle.underline = true
      if (elem.strikeout) textStyle.strikethrough = true
      if (elem.size) textStyle.fontSize = { magnitude: pxToPt(elem.size), unit: 'PT' }
      if (elem.color) textStyle.foregroundColor = colorToGDocRgb(elem.color)
      if (elem.highlight) textStyle.backgroundColor = colorToGDocRgb(elem.highlight)
      if (elem.font) textStyle.weightedFontFamily = { fontFamily: elem.font }

      currentParagraphElements.push({
        textRun: {
          content: elem.value,
          textStyle: Object.keys(textStyle).length > 0 ? textStyle : undefined
        }
      })

      if (elem.value.includes('\n')) {
        flushParagraph()
      }
    }
  }

  flushParagraph()

  return {
    title,
    body: {
      content
    },
    inlineObjects
  }
}

/**
 * Chuyển đổi EditorData của Canvas-Editor sang Google Docs AST JSON
 */
export function convertEditorDataToGoogleDocs(
  data: IEditorData | IElement[],
  title = 'Canvas Editor Document'
): any {
  if (Array.isArray(data)) {
    return convertElementListToGoogleDocs(data, title)
  }
  const mainDoc = convertElementListToGoogleDocs(data.main || [], title)

  if (data.header && data.header.length > 0) {
    const headerDoc = convertElementListToGoogleDocs(data.header, 'Header')
    mainDoc.headers = {
      kix_header_1: {
        headerId: 'kix_header_1',
        content: headerDoc.body.content
      }
    }
  }

  if (data.footer && data.footer.length > 0) {
    const footerDoc = convertElementListToGoogleDocs(data.footer, 'Footer')
    mainDoc.footers = {
      kix_footer_1: {
        footerId: 'kix_footer_1',
        content: footerDoc.body.content
      }
    }
  }

  return mainDoc
}
