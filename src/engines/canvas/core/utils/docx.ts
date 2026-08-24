import JSZip from 'jszip'
import mammoth from 'mammoth'
import { TableBorder } from '../dataset/enum/table/Table'
import { IPageNumber } from '../interface/PageNumber'
import { IElement } from '../interface/Element'
import { IEditorData } from '../interface/Editor'
import { RowFlex } from '../dataset/enum/Row'
import { ElementType } from '../dataset/enum/Element'
import { TitleLevel } from '../dataset/enum/Title'
import { ListStyle, ListType } from '../dataset/enum/List'
import { PaperDirection } from '../dataset/enum/Editor'
import { ZERO } from '../dataset/constant/Common'
import { getElementListByHTML } from './element'

export interface IConvertDocxOption {
  innerWidth?: number
}

export interface IConvertDocxResult {
  header?: IElement[]
  main: IElement[]
  footer?: IElement[]
}

export interface IExportDocxOption {
  fileName?: string
  width?: number
  height?: number
  margins?: [number, number, number, number]
  gutter?: number
  gutterPosition?: 'left' | 'top'
  header?: { top?: number }
  footer?: { bottom?: number }
  defaultFont?: string
  defaultSize?: number
  paperDirection?: PaperDirection
  pageNumber?: IPageNumber
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function toArrayBuffer(
  input: ArrayBuffer | Blob | any
): Promise<ArrayBuffer> {
  if (input && typeof input === 'object' && input.file) {
    input = input.file
  }
  if (input instanceof ArrayBuffer) {
    return input
  }
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength
    ) as ArrayBuffer
  }
  if (typeof input === 'object' && input !== null) {
    if (typeof input.arrayBuffer === 'function') {
      return (await input.arrayBuffer()) as ArrayBuffer
    }
    if (input.buffer && input.buffer instanceof ArrayBuffer) {
      return input.buffer as ArrayBuffer
    }
    if ('byteLength' in input && typeof input.byteLength === 'number') {
      return input as ArrayBuffer
    }
  }
  throw new Error('Invalid input for DOCX conversion')
}

function extractTextFromDoc(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(arrayBuffer)
    const textDecoderUtf8 = new TextDecoder('utf-8', { fatal: false })
    const rawText = textDecoderUtf8.decode(uint8)

    if (rawText.startsWith('{\\rtf')) {
      const plainText = rawText
        .replace(/\\par[d]?/g, '\n')
        .replace(/\{\\*?\\[^{}]+;?\}|[{}]|\\\w+/g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim()
      return `<p>${escapeHtml(plainText).replace(/\n/g, '<br/>')}</p>`
    }

    const printableLines: string[] = []
    let currentLine = ''
    for (let i = 0; i < uint8.length; i++) {
      const charCode = uint8[i]
      if (charCode === 10 || charCode === 13) {
        if (currentLine.trim().length > 0) {
          printableLines.push(currentLine.trim())
          currentLine = ''
        }
      } else if (charCode >= 32 && charCode <= 126) {
        currentLine += String.fromCharCode(charCode)
      } else if (charCode >= 160 && charCode <= 255) {
        currentLine += String.fromCharCode(charCode)
      }
    }
    if (currentLine.trim().length > 0) {
      printableLines.push(currentLine.trim())
    }

    if (printableLines.length > 0) {
      return printableLines.map(line => `<p>${escapeHtml(line)}</p>`).join('')
    }
  } catch (err) {
    console.error('Fallback text extraction failed', err)
  }
  return '<p></p>'
}

/**
 * Parse a Word header or footer XML string into canvas-editor IElement[]
 */
/**
 * Parse a Word header or footer XML string into canvas-editor IElement[]
 */
export function parseHeaderFooterXml(
  xmlContent: string,
  mediaMap?: Map<string, string>
): IElement[] {
  const elements: IElement[] = []
  if (!xmlContent || !xmlContent.trim()) return elements

  try {
    let doc: Document
    if (typeof DOMParser !== 'undefined') {
      doc = new DOMParser().parseFromString(xmlContent, 'text/xml')
    } else {
      return parseHeaderFooterXmlRegex(xmlContent)
    }

    // Process top-level body children (paragraphs and tables)
    const bodyNodes = doc.getElementsByTagNameNS('*', 'body')[0] || doc.documentElement
    const children = Array.from(bodyNodes.childNodes)

    for (const child of children) {
      if (child.nodeType !== 1) continue
      const element = child as Element
      const localName = element.localName || element.nodeName.replace(/^.*:/, '')

      if (localName === 'tbl') {
        // Parse Table in header/footer
        const tblElements = parseHeaderFooterTable(element, mediaMap)
        if (tblElements) {
          elements.push(tblElements)
          elements.push({ value: '\n' })
        }
      } else if (localName === 'p') {
        // Parse Paragraph
        const pElements = parseHeaderFooterParagraph(element, mediaMap)
        elements.push(...pElements)
      }
    }
  } catch (err) {
    console.error('Error parsing header/footer XML', err)
    return parseHeaderFooterXmlRegex(xmlContent)
  }

  return elements
}

function parseHeaderFooterParagraph(p: Element, mediaMap?: Map<string, string>): IElement[] {
  const elements: IElement[] = []
  let rowFlex = RowFlex.LEFT

  // Paragraph alignment
  const jcNodes = p.getElementsByTagNameNS('*', 'jc')
  const jcNode = jcNodes.length > 0 ? jcNodes[0] : p.getElementsByTagName('w:jc')[0]
  if (jcNode) {
    const val = jcNode.getAttribute('w:val') || jcNode.getAttribute('val') || jcNode.getAttribute('value')
    if (val === 'center') rowFlex = RowFlex.CENTER
    else if (val === 'right') rowFlex = RowFlex.RIGHT
    else if (val === 'both' || val === 'distribute') rowFlex = RowFlex.JUSTIFY
  }

  // Check runs
  const runs = Array.from(p.getElementsByTagNameNS('*', 'r'))
  for (const r of runs) {
    const rPrNodes = r.getElementsByTagNameNS('*', 'rPr')
    const rPr = rPrNodes.length > 0 ? rPrNodes[0] : null

    let bold = false
    let italic = false
    let underline = false
    let strikeout = false
    let color: string | undefined
    let size: number | undefined
    let font: string | undefined

    if (rPr) {
      const bNode = rPr.getElementsByTagNameNS('*', 'b')[0]
      if (bNode) {
        const bVal = bNode.getAttribute('w:val') || bNode.getAttribute('val')
        bold = bVal !== '0' && bVal !== 'false'
      }

      const iNode = rPr.getElementsByTagNameNS('*', 'i')[0]
      if (iNode) {
        const iVal = iNode.getAttribute('w:val') || iNode.getAttribute('val')
        italic = iVal !== '0' && iVal !== 'false'
      }

      const uNode = rPr.getElementsByTagNameNS('*', 'u')[0]
      if (uNode) {
        const uVal = uNode.getAttribute('w:val') || uNode.getAttribute('val')
        underline = uVal !== 'none' && uVal !== '0'
      }

      const strikeNode = rPr.getElementsByTagNameNS('*', 'strike')[0]
      if (strikeNode) {
        const strikeVal = strikeNode.getAttribute('w:val') || strikeNode.getAttribute('val')
        strikeout = strikeVal !== '0' && strikeVal !== 'false'
      }

      const colorNode = rPr.getElementsByTagNameNS('*', 'color')[0]
      if (colorNode) {
        const cVal = colorNode.getAttribute('w:val') || colorNode.getAttribute('val')
        if (cVal && cVal !== 'auto') {
          color = cVal.startsWith('#') ? cVal : `#${cVal}`
        }
      }

      const szNode = rPr.getElementsByTagNameNS('*', 'sz')[0]
      if (szNode) {
        const szVal = szNode.getAttribute('w:val') || szNode.getAttribute('val')
        if (szVal) {
          size = Math.round(Number(szVal) / 2)
        }
      }

      const fontNode = rPr.getElementsByTagNameNS('*', 'rFonts')[0]
      if (fontNode) {
        font = fontNode.getAttribute('w:ascii') || fontNode.getAttribute('w:hAnsi') || undefined
      }
    }

    // Check images in run
    if (mediaMap) {
      const blipNodes = Array.from(r.getElementsByTagNameNS('*', 'blip'))
      for (const blip of blipNodes) {
        const rId = blip.getAttribute('r:embed') || blip.getAttribute('embed')
        if (rId && mediaMap.has(rId)) {
          elements.push({
            type: ElementType.IMAGE,
            value: mediaMap.get(rId)!,
            width: 120,
            height: 40,
            rowFlex: rowFlex !== RowFlex.LEFT ? rowFlex : undefined
          })
        }
      }
    }

    // Check page number field
    const fldNodes = Array.from(r.getElementsByTagNameNS('*', 'fldSimple'))
    const instrNodes = Array.from(r.getElementsByTagNameNS('*', 'instrText'))
    const isPageNum = fldNodes.some(f => /PAGE/i.test(f.getAttribute('w:instr') || '')) ||
      instrNodes.some(i => /PAGE/i.test(i.textContent || ''))

    if (isPageNum) {
      elements.push({
        value: '1',
        bold,
        italic,
        color,
        size,
        font,
        rowFlex: rowFlex !== RowFlex.LEFT ? rowFlex : undefined
      })
    }

    // Text in run
    const tNodes = Array.from(r.getElementsByTagNameNS('*', 't'))
    for (const t of tNodes) {
      const text = t.textContent
      if (text) {
        const el: IElement = { value: text }
        if (bold) el.bold = true
        if (italic) el.italic = true
        if (underline) el.underline = true
        if (strikeout) el.strikeout = true
        if (color) el.color = color
        if (size) el.size = size
        if (font) el.font = font
        if (rowFlex !== RowFlex.LEFT) el.rowFlex = rowFlex
        elements.push(el)
      }
    }
  }

  // End of paragraph break
  const breakEl: IElement = { value: '\n' }
  if (rowFlex !== RowFlex.LEFT) breakEl.rowFlex = rowFlex
  elements.push(breakEl)

  return elements
}

function parseHeaderFooterTable(tbl: Element, mediaMap?: Map<string, string>): IElement | null {
  const trNodes = Array.from(tbl.getElementsByTagNameNS('*', 'tr'))
  if (trNodes.length === 0) return null

  const trList: any[] = []
  let colCount = 0

  for (const tr of trNodes) {
    const tcNodes = Array.from(tr.getElementsByTagNameNS('*', 'tc'))
    colCount = Math.max(colCount, tcNodes.length)
    const tdList: any[] = []

    for (const tc of tcNodes) {
      const pNodes = Array.from(tc.getElementsByTagNameNS('*', 'p'))
      const cellElements: IElement[] = []
      for (const p of pNodes) {
        cellElements.push(...parseHeaderFooterParagraph(p, mediaMap))
      }
      tdList.push({
        colspan: 1,
        rowspan: 1,
        value: cellElements.length > 0 ? cellElements : [{ value: '' }]
      })
    }

    trList.push({
      minHeight: 24,
      tdList
    })
  }

  const colgroup = Array.from({ length: colCount }).map(() => ({ width: Math.floor(700 / Math.max(1, colCount)) }))

  return {
    type: ElementType.TABLE,
    value: '',
    colgroup,
    trList,
    borderType: TableBorder.EMPTY
  }
}

/**
 * Regex fallback for environments without full DOMParser
 */
function parseHeaderFooterXmlRegex(xmlContent: string): IElement[] {
  const elements: IElement[] = []
  const pRegex = /<w:p(?:[\s>])([\s\S]*?)<\/w:p>/g
  let pMatch: RegExpExecArray | null

  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const pContent = pMatch[1]
    let rowFlex = RowFlex.LEFT
    const jcMatch = /<w:jc[^>]+w:val="([^"]+)"/i.exec(pContent)
    if (jcMatch) {
      if (jcMatch[1] === 'center') rowFlex = RowFlex.CENTER
      else if (jcMatch[1] === 'right') rowFlex = RowFlex.RIGHT
      else if (jcMatch[1] === 'both' || jcMatch[1] === 'distribute')
        rowFlex = RowFlex.JUSTIFY
    }

    const rRegex = /<w:r(?:[\s>])([\s\S]*?)<\/w:r>/g
    let rMatch: RegExpExecArray | null
    let hasText = false

    while ((rMatch = rRegex.exec(pContent)) !== null) {
      const rContent = rMatch[1]
      const bold = /<w:b(?:\s|>|\/)/i.test(rContent) && !/<w:b[^>]+w:val="(?:0|false)"/i.test(rContent)
      const italic = /<w:i(?:\s|>|\/)/i.test(rContent) && !/<w:i[^>]+w:val="(?:0|false)"/i.test(rContent)
      const underline = /<w:u(?:\s|>|\/)/i.test(rContent) && !/<w:u[^>]+w:val="(?:none|0)"/i.test(rContent)
      const strikeout = /<w:strike(?:\s|>|\/)/i.test(rContent) && !/<w:strike[^>]+w:val="(?:0|false)"/i.test(rContent)
      const colorMatch = /<w:color[^>]+w:val="([^"]+)"/i.exec(rContent)
      const color = colorMatch && colorMatch[1] !== 'auto' ? `#${colorMatch[1]}` : undefined
      const szMatch = /<w:sz[^>]+w:val="([^"]+)"/i.exec(rContent)
      const size = szMatch ? Math.round(Number(szMatch[1]) / 2) : undefined

      const tRegex = /<w:t(?:[^>]*)>([\s\S]*?)<\/w:t>/g
      let tMatch: RegExpExecArray | null
      while ((tMatch = tRegex.exec(rContent)) !== null) {
        const text = tMatch[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
        if (text) {
          hasText = true
          const el: IElement = { value: text }
          if (bold) el.bold = true
          if (italic) el.italic = true
          if (underline) el.underline = true
          if (strikeout) el.strikeout = true
          if (color) el.color = color
          if (size) el.size = size
          if (rowFlex !== RowFlex.LEFT) el.rowFlex = rowFlex
          elements.push(el)
        }
      }
    }

    if (hasText) {
      const breakEl: IElement = { value: '\n' }
      if (rowFlex !== RowFlex.LEFT) breakEl.rowFlex = rowFlex
      elements.push(breakEl)
    }
  }

  return elements
}

/**
 * Extract headers and footers from a DOCX zip archive with exact relationships and images
 */
export async function extractDocxHeaderFooter(
  input: ArrayBuffer | Blob | any
): Promise<{
  header?: IElement[]
  footer?: IElement[]
  options?: {
    width?: number
    height?: number
    paperDirection?: PaperDirection
    margins?: [number, number, number, number]
  }
}> {
  try {
    const arrayBuffer = await toArrayBuffer(input)
    const zip = await JSZip.loadAsync(arrayBuffer)

    let headerElements: IElement[] = []
    let footerElements: IElement[] = []
    let pageOptions: any = {}

    // 1. Read document relationships to find active headers/footers
    const relsFile = zip.file('word/_rels/document.xml.rels')
    const relsMap = new Map<string, string>()
    if (relsFile) {
      const relsXml = await relsFile.async('string')
      const relMatches = relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)
      for (const m of relMatches) {
        relsMap.set(m[1], m[2])
      }
    }

    // 2. Read document section properties (Page Size & Margins)
    const docFile = zip.file('word/document.xml')
    if (docFile) {
      const docXml = await docFile.async('string')
      
      // Page size
      const pgSzMatch = /<w:pgSz[^>]+w:w="(\d+)"[^>]+w:h="(\d+)"(?:[^>]+w:orient="([^"]+)")?/i.exec(docXml)
      if (pgSzMatch) {
        const wTwips = Number(pgSzMatch[1])
        const hTwips = Number(pgSzMatch[2])
        const isLandscape = pgSzMatch[3] === 'landscape' || wTwips > hTwips
        // 1 twip = 1/20 pt = 1/1440 in = 96/1440 px = 1/15 px
        pageOptions.width = Math.round(wTwips / 15)
        pageOptions.height = Math.round(hTwips / 15)
        pageOptions.paperDirection = isLandscape ? PaperDirection.HORIZONTAL : PaperDirection.VERTICAL
      }

      // Margins
      const pgMarMatch = /<w:pgMar[^>]+w:top="(\d+)"[^>]+w:right="(\d+)"[^>]+w:bottom="(\d+)"[^>]+w:left="(\d+)"/i.exec(docXml)
      if (pgMarMatch) {
        pageOptions.margins = [
          Math.round(Number(pgMarMatch[1]) / 15),
          Math.round(Number(pgMarMatch[2]) / 15),
          Math.round(Number(pgMarMatch[3]) / 15),
          Math.round(Number(pgMarMatch[4]) / 15)
        ]
      }
    }

    // 3. Helper to read media images for a header/footer part
    const readPartMedia = async (partName: string): Promise<Map<string, string>> => {
      const mediaMap = new Map<string, string>()
      const partRelsFile = zip.file(`word/_rels/${partName}.rels`)
      if (partRelsFile) {
        const partRelsXml = await partRelsFile.async('string')
        const relMatches = partRelsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)
        for (const m of relMatches) {
          const rId = m[1]
          let target = m[2]
          if (!target.startsWith('media/')) target = `media/${target.replace(/^.*[\\/]/, '')}`
          const imgFile = zip.file(`word/${target}`)
          if (imgFile) {
            const base64 = await imgFile.async('base64')
            const ext = target.split('.').pop() || 'png'
            mediaMap.set(rId, `data:image/${ext};base64,${base64}`)
          }
        }
      }
      return mediaMap
    }

    // 4. Look for header files
    const headerFiles = Object.keys(zip.files).filter(name => /^word\/header\d+\.xml$/i.test(name)).sort()
    if (headerFiles.length > 0) {
      const headerFileName = headerFiles[0].replace('word/', '')
      const mediaMap = await readPartMedia(headerFileName)
      const headerXml = await zip.files[headerFiles[0]].async('string')
      headerElements = parseHeaderFooterXml(headerXml, mediaMap)
    }

    // 5. Look for footer files
    const footerFiles = Object.keys(zip.files).filter(name => /^word\/footer\d+\.xml$/i.test(name)).sort()
    if (footerFiles.length > 0) {
      const footerFileName = footerFiles[0].replace('word/', '')
      const mediaMap = await readPartMedia(footerFileName)
      const footerXml = await zip.files[footerFiles[0]].async('string')
      footerElements = parseHeaderFooterXml(footerXml, mediaMap)
    }

    return {
      header: headerElements.length > 0 ? headerElements : undefined,
      footer: footerElements.length > 0 ? footerElements : undefined,
      options: Object.keys(pageOptions).length > 0 ? pageOptions : undefined
    }
  } catch (err) {
    console.warn('Could not extract header/footer from docx archive', err)
    return {}
  }
}

export async function convertDocxToHTML(
  input: ArrayBuffer | Blob | any
): Promise<string> {
  const arrayBuffer = await toArrayBuffer(input)
  try {
    const zip = await JSZip.loadAsync(arrayBuffer)
    if (!zip.file('word/document.xml') || !zip.file('_rels/.rels')) {
      return extractTextFromDoc(arrayBuffer)
    }
    const options = {
      convertImage: mammoth.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`
          }
        })
      })
    }
    const result = await mammoth.convertToHtml({ arrayBuffer }, options)
    return result.value
  } catch (error) {
    console.warn('Mammoth conversion failed, attempting text fallback', error)
    return extractTextFromDoc(arrayBuffer)
  }
}

/**
 * Convert DOC/DOCX to canvas-editor IEditorData (header, main, footer)
 */
export async function convertDocxToEditorData(
  input: ArrayBuffer | Blob | any,
  options?: IConvertDocxOption
): Promise<IEditorData & { options?: any }> {
  const arrayBuffer = await toArrayBuffer(input)
  const innerWidth = options?.innerWidth || 794

  const [html, headerFooter] = await Promise.all([
    convertDocxToHTML(arrayBuffer),
    extractDocxHeaderFooter(arrayBuffer)
  ])

  const mainElements = getElementListByHTML(html, { innerWidth })

  const result: IEditorData & { options?: any } = {
    main: mainElements
  }

  if (headerFooter.header && headerFooter.header.length > 0) {
    result.header = headerFooter.header
  }
  if (headerFooter.footer && headerFooter.footer.length > 0) {
    result.footer = headerFooter.footer
  }
  if (headerFooter.options) {
    result.options = headerFooter.options
  }

  return result
}

export async function convertDocxToElementList(
  input: ArrayBuffer | Blob | any,
  options?: IConvertDocxOption
): Promise<IElement[]> {
  const data = await convertDocxToEditorData(input, options)
  return data.main
}

function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colorToHex(color?: string): string | undefined {
  if (!color || color === 'transparent' || color === 'inherit') return undefined
  if (color.startsWith('#')) {
    let hex = color.slice(1)
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(c => c + c)
        .join('')
    }
    return hex.slice(0, 6).toUpperCase()
  }
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0')
    return `${r}${g}${b}`.toUpperCase()
  }
  return undefined
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } else if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  return new Uint8Array(0)
}

interface IDocxRelationship {
  id: string
  type: string
  target: string
  targetMode?: string
}

class DocxRelsManager {
  private rels: IDocxRelationship[] = []
  private relCounter = 1
  private docPrCounter = 1
  private mediaCounter = 1
  public mediaMap = new Map<string, { bytes: Uint8Array; ext: string }>()

  constructor() {
    this.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
      'styles.xml'
    )
  }

  public addRelationship(
    type: string,
    target: string,
    targetMode?: string
  ): string {
    const id = `rId${this.relCounter++}`
    this.rels.push({ id, type, target, targetMode })
    return id
  }

  public addHyperlink(url: string): string {
    return this.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
      url,
      'External'
    )
  }

  public addImage(bytes: Uint8Array, ext: string): string {
    const mediaName = `image${this.mediaCounter++}.${ext}`
    this.mediaMap.set(mediaName, { bytes, ext })
    return this.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      `media/${mediaName}`
    )
  }

  public getNextDocPrId(): number {
    return this.docPrCounter++
  }

  public toXml(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    xml +=
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
    for (const rel of this.rels) {
      const modeAttr = rel.targetMode
        ? ` TargetMode="${rel.targetMode}"`
        : ''
      xml += `  <Relationship Id="${rel.id}" Type="${rel.type}" Target="${escapeXml(
        rel.target
      )}"${modeAttr}/>\n`
    }
    xml += '</Relationships>'
    return xml
  }
}

interface IDocxBlock {
  type: 'paragraph' | 'table' | 'separator' | 'page_break'
  tableElement?: IElement
  rowFlex?: RowFlex
  level?: TitleLevel
  listType?: ListType
  listStyle?: ListStyle
  listLevel?: number
  listIndex?: number
  rowMargin?: number
  runs: IElement[]
}

function flattenZippedElements(elements: IElement[]): IElement[] {
  const result: IElement[] = []
  for (const el of elements) {
    if (el.type === ElementType.TITLE && el.valueList) {
      for (const child of el.valueList) {
        result.push({
          ...child,
          level: child.level || el.level,
          titleId: child.titleId || el.titleId,
          rowFlex: child.rowFlex || el.rowFlex
        })
      }
    } else if (el.type === ElementType.LIST && el.valueList) {
      for (const child of el.valueList) {
        result.push({
          ...child,
          listType: child.listType || el.listType,
          listStyle: child.listStyle || el.listStyle,
          listId: child.listId || el.listId,
          listLevel:
            child.listLevel !== undefined ? child.listLevel : el.listLevel
        })
      }
    } else if (el.type === ElementType.AREA && el.valueList) {
      result.push(...flattenZippedElements(el.valueList))
    } else {
      result.push(el)
    }
  }
  return result
}

function groupElementsIntoDocxBlocks(rawElements: IElement[]): IDocxBlock[] {
  const elements = flattenZippedElements(rawElements)
  const blocks: IDocxBlock[] = []
  let currentParagraph: IDocxBlock | null = null
  let currentListIndex = 1
  let lastListId: string | undefined

  function flushParagraph() {
    if (currentParagraph) {
      blocks.push(currentParagraph)
      currentParagraph = null
    }
  }

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]

    if (el.type === ElementType.TABLE) {
      flushParagraph()
      blocks.push({ type: 'table', tableElement: el, runs: [] })
      continue
    }

    if (el.type === ElementType.SEPARATOR) {
      flushParagraph()
      blocks.push({ type: 'separator', runs: [] })
      continue
    }

    if (el.type === ElementType.PAGE_BREAK) {
      flushParagraph()
      blocks.push({ type: 'page_break', runs: [] })
      continue
    }

    if (el.value === '\n') {
      if (!currentParagraph) {
        currentParagraph = {
          type: 'paragraph',
          rowFlex: el.rowFlex,
          level: el.level,
          listType: el.listType,
          listStyle: el.listStyle,
          listLevel: el.listLevel,
          rowMargin: el.rowMargin,
          runs: []
        }
      }
      flushParagraph()
      continue
    }

    if (el.listId && el.listId !== lastListId) {
      lastListId = el.listId
      currentListIndex = 1
    }

    if (el.value === ZERO && !el.listWrap) {
      flushParagraph()
      currentParagraph = {
        type: 'paragraph',
        rowFlex: el.rowFlex,
        level: el.level,
        listType: el.listType,
        listStyle: el.listStyle,
        listLevel: el.listLevel,
        listIndex: currentListIndex++,
        rowMargin: el.rowMargin,
        runs: []
      }
      continue
    }

    if (!currentParagraph) {
      currentParagraph = {
        type: 'paragraph',
        rowFlex: el.rowFlex,
        level: el.level,
        listType: el.listType,
        listStyle: el.listStyle,
        listLevel: el.listLevel,
        listIndex: el.listType === ListType.OL ? currentListIndex++ : undefined,
        rowMargin: el.rowMargin,
        runs: []
      }
    } else {
      if (!currentParagraph.rowFlex && el.rowFlex) {
        currentParagraph.rowFlex = el.rowFlex
      }
      if (
        (el.level !== currentParagraph.level && el.level) ||
        (el.listType !== currentParagraph.listType && el.listType) ||
        (el.rowFlex !== currentParagraph.rowFlex &&
          el.rowFlex &&
          currentParagraph.runs.length > 0 &&
          currentParagraph.rowFlex)
      ) {
        flushParagraph()
        currentParagraph = {
          type: 'paragraph',
          rowFlex: el.rowFlex,
          level: el.level,
          listType: el.listType,
          listStyle: el.listStyle,
          listLevel: el.listLevel,
          listIndex: el.listType === ListType.OL ? currentListIndex++ : undefined,
          rowMargin: el.rowMargin,
          runs: []
        }
      }
    }

    currentParagraph.runs.push(el)
  }

  flushParagraph()
  return blocks
}

function renderRunPropertiesXml(
  el: IElement,
  defaultFont: string,
  defaultSize: number
): string {
  let xml = '<w:rPr>'
  const font = el.font || defaultFont
  xml += `<w:rFonts w:ascii="${escapeXml(font)}" w:hAnsi="${escapeXml(
    font
  )}" w:cs="${escapeXml(font)}" w:eastAsia="${escapeXml(font)}"/>`

  if (el.bold) {
    xml += '<w:b/><w:bCs/>'
  }
  if (el.italic) {
    xml += '<w:i/><w:iCs/>'
  }
  if (el.underline) {
    xml += '<w:u w:val="single"/>'
  }
  if (el.strikeout) {
    xml += '<w:strike/>'
  }
  if (el.color) {
    const colorHex = colorToHex(el.color)
    if (colorHex) {
      xml += `<w:color w:val="${colorHex}"/>`
    }
  }
  if (el.highlight) {
    const bgHex = colorToHex(el.highlight)
    if (bgHex) {
      xml += `<w:shd w:val="clear" w:color="auto" w:fill="${bgHex}"/>`
    }
  }
  const size = el.size || defaultSize
  const szVal = Math.round(size * 2)
  xml += `<w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/>`

  if (el.type === ElementType.SUPERSCRIPT) {
    xml += '<w:vertAlign w:val="superscript"/>'
  } else if (el.type === ElementType.SUBSCRIPT) {
    xml += '<w:vertAlign w:val="subscript"/>'
  }

  xml += '</w:rPr>'
  return xml
}

/**
 * Fetch an image URL (http/https/blob/data-URL) and return
 * { bytes: Uint8Array, ext: string } for embedding in the docx.
 * Returns null if the image cannot be fetched.
 */
async function fetchImageBytes(
  src: string
): Promise<{ bytes: Uint8Array; ext: string } | null> {
  try {
    // Already a base64 data URL – decode directly
    if (src.startsWith('data:image/')) {
      const match = src.match(
        /^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/
      )
      if (!match) return null
      let ext = match[1].toLowerCase()
      if (ext === 'jpeg') ext = 'jpg'
      else if (ext === 'svg+xml') ext = 'svg'
      return { bytes: decodeBase64ToUint8Array(match[2]), ext }
    }

    // Remote URL or blob URL – fetch as ArrayBuffer
    const response = await fetch(src)
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || 'image/png'
    const mimeBase = contentType.split(';')[0].trim()
    let ext = 'png'
    if (mimeBase === 'image/jpeg') ext = 'jpg'
    else if (mimeBase === 'image/gif') ext = 'gif'
    else if (mimeBase === 'image/svg+xml') ext = 'svg'
    else if (mimeBase === 'image/webp') ext = 'webp'
    else if (mimeBase === 'image/png') ext = 'png'
    const arrayBuffer = await response.arrayBuffer()
    return { bytes: new Uint8Array(arrayBuffer), ext }
  } catch {
    return null
  }
}

async function renderImageXml(
  el: IElement,
  rels: DocxRelsManager
): Promise<string> {
  const widthPx = el.width || 200
  const heightPx = el.height || 200
  const cx = Math.round(widthPx * 9525)
  const cy = Math.round(heightPx * 9525)
  let relId = ''

  if (el.value) {
    const imgData = await fetchImageBytes(el.value)
    if (imgData) {
      relId = rels.addImage(imgData.bytes, imgData.ext)
    }
  }

  if (!relId) {
    return '<w:r><w:t>[Hình ảnh]</w:t></w:r>'
  }

  const docPrId = rels.getNextDocPrId()
  return `<w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:docPr id="${docPrId}" name="Picture ${docPrId}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${docPrId}" name="Picture ${docPrId}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relId}"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${cx}" cy="${cy}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>`
}

async function renderBlockToDocxXml(
  block: IDocxBlock,
  rels: DocxRelsManager,
  defaultFont: string,
  defaultSize: number,
  isHeaderFooter = false
): Promise<string> {
  if (block.type === 'page_break') {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
  }

  if (block.type === 'separator') {
    return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>'
  }

  if (block.type === 'table' && block.tableElement) {
    return renderTableToDocxXml(
      block.tableElement,
      rels,
      defaultFont,
      defaultSize,
      isHeaderFooter
    )
  }

  let pPrXml = '<w:pPr>'
  if (block.level) {
    const levelMap: Record<TitleLevel, string> = {
      [TitleLevel.FIRST]: 'Heading1',
      [TitleLevel.SECOND]: 'Heading2',
      [TitleLevel.THIRD]: 'Heading3',
      [TitleLevel.FOURTH]: 'Heading4',
      [TitleLevel.FIFTH]: 'Heading5',
      [TitleLevel.SIXTH]: 'Heading6'
    }
    const styleId = levelMap[block.level]
    if (styleId) {
      pPrXml += `<w:pStyle w:val="${styleId}"/>`
    }
  }

  if (block.rowFlex) {
    let jcVal = 'left'
    if (block.rowFlex === RowFlex.CENTER) jcVal = 'center'
    else if (block.rowFlex === RowFlex.RIGHT) jcVal = 'right'
    else if (
      block.rowFlex === RowFlex.JUSTIFY ||
      block.rowFlex === RowFlex.ALIGNMENT
    )
      jcVal = 'both'
    pPrXml += `<w:jc w:val="${jcVal}"/>`
  }

  if (block.listType) {
    const indentLeft = Math.round(((block.listLevel || 0) + 1) * 720)
    pPrXml += `<w:ind w:left="${indentLeft}" w:hanging="360"/>`
  }

  if (block.rowMargin) {
    pPrXml += `<w:spacing w:line="${Math.round(
      block.rowMargin * 240
    )}" w:lineRule="auto"/>`
  } else if (isHeaderFooter) {
    pPrXml += '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>'
  }
  pPrXml += '</w:pPr>'

  let runsXml = ''
  if (block.listType) {
    let prefix = '• '
    if (block.listType === ListType.OL) {
      prefix = `${block.listIndex || 1}. `
    } else if (block.listStyle === ListStyle.DASH) {
      prefix = '- '
    } else if (block.listStyle === ListStyle.CIRCLE) {
      prefix = '◦ '
    } else if (block.listStyle === ListStyle.SQUARE) {
      prefix = '▫︎ '
    } else if (block.listStyle === ListStyle.CHECKBOX) {
      const firstRun = block.runs[0]
      if (firstRun?.type !== ElementType.CHECKBOX) {
        prefix = '☐ '
      } else {
        prefix = ''
      }
    }
    if (prefix) {
      const prefixSz = Math.round(defaultSize * 2)
      const prefixPr = `<w:rPr><w:rFonts w:ascii="${escapeXml(
        defaultFont
      )}" w:hAnsi="${escapeXml(defaultFont)}" w:cs="${escapeXml(
        defaultFont
      )}"/><w:sz w:val="${prefixSz}"/><w:szCs w:val="${prefixSz}"/></w:rPr>`
      runsXml += `<w:r>${prefixPr}<w:t xml:space="preserve">${escapeXml(
        prefix
      )}</w:t></w:r>`
    }
  }

  for (const run of block.runs) {
    if (run.type === ElementType.PAGE_BREAK) {
      runsXml += '<w:r><w:br w:type="page"/></w:r>'
      continue
    }

    if (run.type === ElementType.IMAGE) {
      runsXml += await renderImageXml(run, rels)
      continue
    }

    if (run.type === ElementType.TAB) {
      runsXml += '<w:r><w:tab/></w:r>'
      continue
    }

    if (run.type === ElementType.HYPERLINK) {
      const linkText =
        run.valueList?.map(v => v.value).join('') || run.value || run.url || ''
      const relId = rels.addHyperlink(run.url || '#')
      const rPr = renderRunPropertiesXml(run, defaultFont, defaultSize)
      runsXml += `<w:hyperlink r:id="${relId}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/>${rPr.replace(
        '<w:rPr>',
        ''
      )}<w:t xml:space="preserve">${escapeXml(
        linkText
      )}</w:t></w:r></w:hyperlink>`
      continue
    }

    const rPr = renderRunPropertiesXml(run, defaultFont, defaultSize)

    if (run.type === ElementType.CHECKBOX) {
      const char = run.checkbox?.value ? '☑ ' : '☐ '
      runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${char}</w:t></w:r>`
      continue
    }

    if (run.type === ElementType.RADIO) {
      const char = run.radio?.value ? '☉ ' : '○ '
      runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${char}</w:t></w:r>`
      continue
    }

    if (run.type === ElementType.DATE) {
      const text =
        run.valueList?.map(v => v.value).join('') || run.value || ''
      runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(
        text
      )}</w:t></w:r>`
      continue
    }

    if (run.type === ElementType.CONTROL) {
      const controlVal = run.control?.value?.[0]?.value || ''
      const text = controlVal
        ? `${run.control?.preText || ''}${controlVal}${
            run.control?.postText || ''
          }`
        : run.control?.placeholder || ''
      runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(
        text
      )}</w:t></w:r>`
      continue
    }

    if (run.type === ElementType.LATEX) {
      const text =
        run.valueList?.map(v => v.value).join('') || run.value || ''
      runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(
        text
      )}</w:t></w:r>`
      continue
    }

    const rawValue = run.value || ''
    if (!rawValue) continue

    const lines = rawValue.split('\n')
    for (let l = 0; l < lines.length; l++) {
      if (l > 0) {
        runsXml += '<w:r><w:br/></w:r>'
      }
      if (lines[l]) {
        const line = lines[l]
        if (line.includes('{pageNo}') || line.includes('{pageCount}')) {
          const parts = line.split(/(\{pageNo\}|\{pageCount\})/g)
          for (const part of parts) {
            if (part === '{pageNo}') {
              runsXml += `<w:fldSimple w:instr="PAGE"><w:r>${rPr}<w:t>1</w:t></w:r></w:fldSimple>`
            } else if (part === '{pageCount}') {
              runsXml += `<w:fldSimple w:instr="NUMPAGES"><w:r>${rPr}<w:t>1</w:t></w:r></w:fldSimple>`
            } else if (part) {
              runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(
                part
              )}</w:t></w:r>`
            }
          }
        } else {
          runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(
            line
          )}</w:t></w:r>`
        }
      }
    }
  }

  return `<w:p>${pPrXml}${runsXml}</w:p>`
}


async function renderTableToDocxXml(
  tableEl: IElement,
  rels: DocxRelsManager,
  defaultFont: string,
  defaultSize: number,
  isHeaderFooter = false
): Promise<string> {
  const colgroup = tableEl.colgroup || []
  const trList = tableEl.trList || []
  const totalColWidth = colgroup.reduce((acc, c) => acc + (c.width || 100), 0)
  const isBorderEmpty = tableEl.borderType === TableBorder.EMPTY
  const borderColor = colorToHex(tableEl.borderColor) || 'D3D3D3'
  const borderWidth = tableEl.borderWidth
    ? Math.round(tableEl.borderWidth * 4)
    : 4

  let xml = '<w:tbl>'
  xml += '<w:tblPr>'
  xml += `<w:tblW w:w="${Math.round(totalColWidth * 15)}" w:type="dxa"/>`
  if (isBorderEmpty) {
    xml += '<w:tblBorders>'
    xml += '<w:top w:val="none"/>'
    xml += '<w:left w:val="none"/>'
    xml += '<w:bottom w:val="none"/>'
    xml += '<w:right w:val="none"/>'
    xml += '<w:insideH w:val="none"/>'
    xml += '<w:insideV w:val="none"/>'
    xml += '</w:tblBorders>'
  } else {
    xml += '<w:tblBorders>'
    xml += `<w:top w:val="single" w:sz="${borderWidth}" w:space="0" w:color="${borderColor}"/>`
    xml += `<w:left w:val="single" w:sz="${borderWidth}" w:space="0" w:color="${borderColor}"/>`
    xml += `<w:bottom w:val="single" w:sz="${borderWidth}" w:space="0" w:color="${borderColor}"/>`
    xml += `<w:right w:val="single" w:sz="${borderWidth}" w:space="0" w:color="${borderColor}"/>`
    xml += `<w:insideH w:val="single" w:sz="${borderWidth}" w:space="0" w:color="${borderColor}"/>`
    xml += `<w:insideV w:val="single" w:sz="${borderWidth}" w:space="0" w:color="${borderColor}"/>`
    xml += '</w:tblBorders>'
  }
  xml += '<w:tblCellMar>'
  xml += '<w:top w:w="120" w:type="dxa"/>'
  xml += '<w:left w:w="160" w:type="dxa"/>'
  xml += '<w:bottom w:w="120" w:type="dxa"/>'
  xml += '<w:right w:w="160" w:type="dxa"/>'
  xml += '</w:tblCellMar>'
  xml += '</w:tblPr>'

  xml += '<w:tblGrid>'
  for (const col of colgroup) {
    xml += `<w:gridCol w:w="${Math.round((col.width || 100) * 15)}"/>`
  }
  xml += '</w:tblGrid>'

  for (let r = 0; r < trList.length; r++) {
    const tr = trList[r]
    xml += '<w:tr>'
    if (tr.height) {
      xml += `<w:trPr><w:trHeight w:val="${Math.round(
        tr.height * 15
      )}" w:hRule="atLeast"/></w:trPr>`
    }
    for (let c = 0; c < tr.tdList.length; c++) {
      const td = tr.tdList[c]
      xml += '<w:tc>'
      xml += '<w:tcPr>'
      if (td.colspan && td.colspan > 1) {
        xml += `<w:gridSpan w:val="${td.colspan}"/>`
      }
      if (td.rowspan && td.rowspan > 1) {
        xml += '<w:vMerge w:val="restart"/>'
      }
      if (td.backgroundColor) {
        const hex = colorToHex(td.backgroundColor)
        if (hex) xml += `<w:shd w:val="clear" w:color="auto" w:fill="${hex}"/>`
      }
      if (td.verticalAlign) {
        const vAlign =
          td.verticalAlign === 'middle' ? 'center' : td.verticalAlign
        xml += `<w:vAlign w:val="${vAlign}"/>`
      }
      xml += '</w:tcPr>'

      const cellBlocks =
        td.value && td.value.length > 0
          ? groupElementsIntoDocxBlocks(td.value)
          : []
      if (cellBlocks.length === 0) {
        xml += '<w:p/>'
      } else {
        for (const block of cellBlocks) {
          xml += await renderBlockToDocxXml(
            block,
            rels,
            defaultFont,
            defaultSize,
            isHeaderFooter
          )
        }
      }
      xml += '</w:tc>'
    }
    xml += '</w:tr>'
  }

  xml += '</w:tbl>'
  return xml
}


function generateStylesXml(
  defaultFont: string,
  defaultSize: number
): string {
  const szVal = Math.round(defaultSize * 2)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${escapeXml(defaultFont)}" w:hAnsi="${escapeXml(
    defaultFont
  )}" w:cs="${escapeXml(defaultFont)}" w:eastAsia="${escapeXml(defaultFont)}"/>
        <w:sz w:val="${szVal}"/>
        <w:szCs w:val="${szVal}"/>
        <w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="240" w:after="120"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="52"/>
      <w:szCs w:val="52"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="200" w:after="100"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="48"/>
      <w:szCs w:val="48"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="160" w:after="80"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="44"/>
      <w:szCs w:val="44"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="120" w:after="60"/>
      <w:outlineLvl w:val="3"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="40"/>
      <w:szCs w:val="40"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading5">
    <w:name w:val="heading 5"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="100" w:after="50"/>
      <w:outlineLvl w:val="4"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading6">
    <w:name w:val="heading 6"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="80" w:after="40"/>
      <w:outlineLvl w:val="5"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
      <w:color w:val="0563C1"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>
</w:styles>`
}

/**
 * Convert canvas-editor IEditorData to a valid, styled DOCX Blob
 */
export async function convertEditorDataToDocx(
  data: IEditorData,
  options?: IExportDocxOption
): Promise<Blob> {
  const zip = new JSZip()

  const defaultFont = options?.defaultFont || 'Segoe UI'
  const defaultSize = options?.defaultSize || 11
  const width = options?.width || 794
  const height = options?.height || 1123
  const margins = options?.margins || [100, 120, 100, 120]
  const isLandscape = options?.paperDirection === PaperDirection.HORIZONTAL

  const pgWidthTwips = Math.round(width * 15)
  const pgHeightTwips = Math.round(height * 15)
  const topTwips = Math.round((margins[0] || 100) * 15)
  const rightTwips = Math.round((margins[1] || 120) * 15)
  const bottomTwips = Math.round((margins[2] || 100) * 15)
  const leftTwips = Math.round((margins[3] || 120) * 15)

  // Each part (document, header, footer) needs its own relationship manager
  // so that image rIds are resolved from the correct .rels sidecar file.
  const docRelsManager = new DocxRelsManager()
  let hasHeader = false
  let headerRelId = ''

  if (data.header && data.header.length > 0) {
    // Use a dedicated rels manager for the header part
    const headerRelsManager = new DocxRelsManager()
    const headerBlocks = groupElementsIntoDocxBlocks(data.header)
    let headerXmlContent = ''
    for (const block of headerBlocks) {
      headerXmlContent += await renderBlockToDocxXml(
        block,
        headerRelsManager,
        defaultFont,
        defaultSize,
        true
      )
    }
    const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  ${headerXmlContent}
</w:hdr>`
    zip.file('word/header1.xml', headerXml)
    // Write header part's own .rels (resolves image rIds inside header1.xml)
    zip.file('word/_rels/header1.xml.rels', headerRelsManager.toXml())
    // Copy media files referenced by the header into the zip
    for (const [mediaName, mediaInfo] of headerRelsManager.mediaMap.entries()) {
      zip.file(`word/media/${mediaName}`, mediaInfo.bytes)
    }
    // Register the header part in the document's relationship list
    headerRelId = docRelsManager.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header',
      'header1.xml'
    )
    hasHeader = true
  }

  let hasFooter = false
  let footerRelId = ''
  let footerElements = data.footer

  // If no explicit footer elements but page numbering is enabled, create footer with page number
  if (
    (!footerElements || footerElements.length === 0) &&
    options?.pageNumber &&
    !options.pageNumber.disabled
  ) {
    footerElements = [
      {
        value: options.pageNumber.format || '{pageNo}',
        rowFlex: options.pageNumber.rowFlex || RowFlex.CENTER,
        size: options.pageNumber.size,
        font: options.pageNumber.font,
        color: options.pageNumber.color
      }
    ]
  }

  if (footerElements && footerElements.length > 0) {
    // Use a dedicated rels manager for the footer part
    const footerRelsManager = new DocxRelsManager()
    const footerBlocks = groupElementsIntoDocxBlocks(footerElements)
    let footerXmlContent = ''
    for (const block of footerBlocks) {
      footerXmlContent += await renderBlockToDocxXml(
        block,
        footerRelsManager,
        defaultFont,
        defaultSize,
        true
      )
    }
    const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  ${footerXmlContent}
</w:ftr>`
    zip.file('word/footer1.xml', footerXml)
    // Write footer part's own .rels (resolves image rIds inside footer1.xml)
    zip.file('word/_rels/footer1.xml.rels', footerRelsManager.toXml())
    // Copy media files referenced by the footer into the zip
    for (const [mediaName, mediaInfo] of footerRelsManager.mediaMap.entries()) {
      zip.file(`word/media/${mediaName}`, mediaInfo.bytes)
    }
    // Register the footer part in the document's relationship list
    footerRelId = docRelsManager.addRelationship(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer',
      'footer1.xml'
    )
    hasFooter = true
  }

  const mainBlocks = groupElementsIntoDocxBlocks(data.main || [])
  let mainBodyXml = ''
  for (const block of mainBlocks) {
    mainBodyXml += await renderBlockToDocxXml(
      block,
      docRelsManager,
      defaultFont,
      defaultSize
    )
  }

  let sectPrXml = '<w:sectPr>'
  if (hasHeader) {
    sectPrXml += `<w:headerReference w:type="default" r:id="${headerRelId}"/>`
  }
  if (hasFooter) {
    sectPrXml += `<w:footerReference w:type="default" r:id="${footerRelId}"/>`
  }
  sectPrXml += `<w:pgSz w:w="${pgWidthTwips}" w:h="${pgHeightTwips}"${
    isLandscape ? ' w:orient="landscape"' : ''
  }/>`
  const headerTopPx = options?.header?.top ?? 30
  const headerTwips = Math.round(headerTopPx * 15)
  const footerBottomPx = options?.footer?.bottom ?? 30
  const footerTwips = Math.round(footerBottomPx * 15)
  const gutterPx = options?.gutter ?? 0
  const gutterTwips = Math.round(gutterPx * 15)
  const isGutterTop = options?.gutterPosition === 'top'

  sectPrXml += `<w:pgMar w:top="${topTwips}" w:right="${rightTwips}" w:bottom="${bottomTwips}" w:left="${leftTwips}" w:header="${headerTwips}" w:footer="${footerTwips}" w:gutter="${gutterTwips}"${
    isGutterTop ? ' w:gutterAtTop="1"' : ''
  }/>`
  sectPrXml += '</w:sectPr>'

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${mainBodyXml}
    ${sectPrXml}
  </w:body>
</w:document>`

  zip.file('word/document.xml', documentXml)
  zip.file('word/styles.xml', generateStylesXml(defaultFont, defaultSize))

  // Copy media referenced by the document body
  for (const [mediaName, mediaInfo] of docRelsManager.mediaMap.entries()) {
    zip.file(`word/media/${mediaName}`, mediaInfo.bytes)
  }

  zip.file('word/_rels/document.xml.rels', docRelsManager.toXml())

  const dotRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  zip.file('_rels/.rels', dotRelsXml)

  let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`
  if (hasHeader) {
    contentTypesXml += `\n  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`
  }
  if (hasFooter) {
    contentTypesXml += `\n  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`
  }
  contentTypesXml += `\n</Types>`
  zip.file('[Content_Types].xml', contentTypesXml)

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  return blob
}

