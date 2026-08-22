import type { JSONContent } from '@tiptap/core'
import {
  AlignmentType,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  DeletedTextRun,
  Document as DocxDocument,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  InsertedTextRun,
  Packer,
  PageBreak,
  PageNumber,
  PageOrientation,
  Paragraph,
  SectionType,
  Tab,
  TabStopType,
  LeaderType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx'
import { strFromU8, unzipSync } from 'fflate'
import * as mammoth from 'mammoth/mammoth.browser'

import { DocumentLibraryError } from '../core/errors'
import { createEmptyDocumentState } from '../core/state'
import type {
  CompatibilityIssue,
  CompatibilityReport,
  AssetReference,
  KindyDocumentState,
  KindyHeaderFooterState,
  KindyPageState,
  KindySectionState,
} from '../core/types'

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const KINDY_DOCX_PROFILE = 'kindy-docx-v2.0' as const

export interface DocxImportResult {
  state: KindyDocumentState
  report: CompatibilityReport
  messages: Array<{ type: string; message: string }>
}

export interface DocxExportResult {
  blob: Blob
  report: CompatibilityReport
}

export interface DocxCodecOptions {
  mode?: 'strict' | 'best-effort'
  profile?: CompatibilityReport['profile']
  limits?: Partial<DocxImportLimits>
}

export interface DocxImportLimits {
  maxCompressedBytes: number
  maxUncompressedBytes: number
  maxEntries: number
  maxCompressionRatio: number
  maxMediaBytes: number
  maxSingleMediaBytes: number
}

export const DEFAULT_DOCX_IMPORT_LIMITS: DocxImportLimits = {
  maxCompressedBytes: 50 * 1024 * 1024,
  maxUncompressedBytes: 250 * 1024 * 1024,
  maxEntries: 10_000,
  maxCompressionRatio: 100,
  maxMediaBytes: 100 * 1024 * 1024,
  maxSingleMediaBytes: 20 * 1024 * 1024,
}

export interface DocxPackageParts {
  contentTypes: string
  documentXml: string
  relationshipsXml?: string
  numberingXml?: string
  stylesXml?: string
  commentsXml?: string
  commentsExtendedXml?: string
  relatedXml?: Record<string, string>
  relatedRelationshipsXml?: Record<string, string>
  media: Record<string, Uint8Array>
}

const unsupportedOoxml: Array<[RegExp, string, string]> = [
  [/<w:(?:ins|del)\b/, 'TRACK_CHANGES', 'Track Changes requires the v2.2 compatibility profile.'],
  [/<w:commentRangeStart\b/, 'COMMENTS', 'DOCX comments require the v2.2 compatibility profile.'],
  [/<w:(?:altChunk|object)\b/, 'EMBEDDED_OBJECT', 'Embedded Word objects are not supported.'],
  [/<m:oMath\b/, 'EQUATION', 'Word equations are imported as best-effort content.'],
  [/<w:(?:footnoteReference|endnoteReference)\b/, 'FOOTNOTE', 'Footnotes and endnotes are outside the v2.0 DOCX profile.'],
  [/<w:fldSimple\b|<w:instrText\b/, 'FIELD', 'Dynamic Word fields may be flattened during import.'],
  [/<w:txbxContent\b/, 'TEXT_BOX', 'Floating text boxes are outside the v2.0 DOCX profile.'],
]

const supportedNodeTypes = new Set([
  'doc', 'paragraph', 'heading', 'text', 'hardBreak', 'pageBreak', 'docxTab',
  'bulletList', 'orderedList', 'listItem', 'table', 'tableRow', 'tableHeader',
  'tableCell', 'image', 'inlineImage', 'blockquote',
])
const supportedMarkTypes = new Set(['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'textStyle', 'link'])

const centimetersToTwip = (value: number) => convertMillimetersToTwip(value * 10)

const cloneIssue = (issue: CompatibilityIssue) => ({ ...issue })

const profileRank = (profile: CompatibilityReport['profile'] = KINDY_DOCX_PROFILE) => ({
  'kindy-docx-v2.0': 0,
  'kindy-docx-v2.1': 1,
  'kindy-docx-v2.2': 2,
}[profile])

function report(issues: CompatibilityIssue[] = [], profile: CompatibilityReport['profile'] = KINDY_DOCX_PROFILE): CompatibilityReport {
  return {
    profile,
    supported: !issues.some((issue) => issue.severity === 'error'),
    issues: issues.map(cloneIssue),
  }
}

function throwIfStrict(result: CompatibilityReport, mode: DocxCodecOptions['mode']) {
  if ((mode || 'strict') === 'strict' && result.issues.length) {
    throw new DocumentLibraryError('DOCX_UNSUPPORTED', `The document contains features outside the ${result.profile} profile.`, {
      details: result,
    })
  }
}

export async function extractDocxPackage(file: Blob, customLimits: Partial<DocxImportLimits> = {}): Promise<DocxPackageParts> {
  if (!file || file.size === 0) throw new DocumentLibraryError('DOCX_INVALID', 'The DOCX file is empty.')
  const limits = { ...DEFAULT_DOCX_IMPORT_LIMITS, ...customLimits }
  if (file.size > limits.maxCompressedBytes) throw new DocumentLibraryError('DOCX_INVALID', 'The DOCX file exceeds the configured compressed-size limit.')
  let entries: Record<string, Uint8Array>
  let entryCount = 0
  let uncompressedBytes = 0
  let mediaBytes = 0
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => {
        entryCount += 1
        if (entryCount > limits.maxEntries) throw new DocumentLibraryError('DOCX_INVALID', 'The DOCX ZIP contains too many entries.')
        const selected = entry.name === '[Content_Types].xml' || entry.name.startsWith('word/')
        if (!selected) return false
        uncompressedBytes += entry.originalSize
        if (uncompressedBytes > limits.maxUncompressedBytes) throw new DocumentLibraryError('DOCX_INVALID', 'The DOCX exceeds the configured uncompressed-size limit.')
        if (entry.name.startsWith('word/media/')) {
          if (entry.originalSize > limits.maxSingleMediaBytes) throw new DocumentLibraryError('DOCX_INVALID', 'A DOCX media asset exceeds the configured per-asset size limit.')
          mediaBytes += entry.originalSize
          if (mediaBytes > limits.maxMediaBytes) throw new DocumentLibraryError('DOCX_INVALID', 'DOCX media assets exceed the configured total size limit.')
        }
        if (entry.size > 0 && entry.originalSize / entry.size > limits.maxCompressionRatio) throw new DocumentLibraryError('DOCX_INVALID', 'The DOCX contains a suspicious ZIP compression ratio.')
        return true
      },
    })
  } catch (cause) {
    if (cause instanceof DocumentLibraryError) throw cause
    throw new DocumentLibraryError('DOCX_INVALID', 'The file is not a valid ZIP/OOXML document.', { cause })
  }

  if (!entries['[Content_Types].xml'] || !entries['word/document.xml']) {
    throw new DocumentLibraryError('DOCX_INVALID', 'Required DOCX OOXML parts are missing.')
  }

  const contentTypes = strFromU8(entries['[Content_Types].xml'])
  if (!contentTypes.includes('wordprocessingml.document')) {
    throw new DocumentLibraryError('DOCX_INVALID', 'The OOXML package is not a Word document.')
  }

  return {
    contentTypes,
    documentXml: strFromU8(entries['word/document.xml']),
    relationshipsXml: entries['word/_rels/document.xml.rels'] ? strFromU8(entries['word/_rels/document.xml.rels']) : undefined,
    numberingXml: entries['word/numbering.xml'] ? strFromU8(entries['word/numbering.xml']) : undefined,
    stylesXml: entries['word/styles.xml'] ? strFromU8(entries['word/styles.xml']) : undefined,
    commentsXml: entries['word/comments.xml'] ? strFromU8(entries['word/comments.xml']) : undefined,
    commentsExtendedXml: entries['word/commentsExtended.xml'] ? strFromU8(entries['word/commentsExtended.xml']) : undefined,
    relatedXml: Object.fromEntries(Object.entries(entries)
      .filter(([name]) => /^word\/(?:header|footer)\d+\.xml$/i.test(name))
      .map(([name, value]) => [name, strFromU8(value)])),
    relatedRelationshipsXml: Object.fromEntries(Object.entries(entries)
      .filter(([name]) => /^word\/_rels\/(?:header|footer)\d+\.xml\.rels$/i.test(name))
      .map(([name, value]) => [name, strFromU8(value)])),
    media: Object.fromEntries(Object.entries(entries).filter(([name]) => name.startsWith('word/media/') && !name.endsWith('/'))),
  }
}

function inspectParts(parts: DocxPackageParts, profile: CompatibilityReport['profile'] = KINDY_DOCX_PROFILE) {
  const { documentXml } = parts
  const issues: CompatibilityIssue[] = []
  for (const [pattern, code, message] of unsupportedOoxml) {
    if (profileRank(profile) >= 2 && (code === 'TRACK_CHANGES' || code === 'COMMENTS')) continue
    if (pattern.test(documentXml)) issues.push({ code, feature: code.toLowerCase(), message, severity: 'warning' })
  }
  const sectionCount = (documentXml.match(/<w:sectPr\b/g) || []).length
  if (sectionCount > 1 && profileRank(profile) < 1) {
    issues.push({
      code: 'MULTIPLE_SECTIONS', feature: 'sections', severity: 'warning',
      message: 'Multiple Word sections require the v2.1 compatibility profile.',
    })
  }
  if (/<wp:anchor\b/.test(documentXml)) {
    issues.push({
      code: 'FLOATING_IMAGE_FLATTENED', feature: 'floating-image', severity: 'warning',
      message: 'Floating Word images are preserved as inline images in the v2.0 profile.',
    })
  }
  if (profileRank(profile) < 1 && /<w:headerReference\b|<w:footerReference\b/.test(documentXml)) {
    issues.push({
      code: 'HEADER_FOOTER_PROFILE', feature: 'header-footer', severity: 'warning',
      message: 'DOCX header/footer content requires the v2.1 compatibility profile.',
    })
  }
  const unsupportedMedia = Object.keys(parts.media).filter((name) => !isBrowserRenderableImage(name))
  if (unsupportedMedia.length) {
    issues.push({
      code: 'UNSUPPORTED_IMAGE_FORMAT', feature: 'image', severity: 'warning',
      message: `Some Word images use formats that browsers cannot render directly: ${unsupportedMedia.map(fileNameFromPath).join(', ')}.`,
    })
  }
  return { report: report(issues, profile), documentXml }
}

export async function inspectDocx(file: Blob, limits?: Partial<DocxImportLimits>, profile: CompatibilityReport['profile'] = KINDY_DOCX_PROFILE): Promise<{ report: CompatibilityReport; documentXml: string }> {
  return inspectParts(await extractDocxPackage(file, limits), profile)
}

type KindyMark = { type: string; attrs?: Record<string, unknown> }

function styleMap(style: CSSStyleDeclaration | null): KindyMark[] {
  if (!style) return []
  const marks: KindyMark[] = []
  const attrs: Record<string, unknown> = {}
  if (style.fontFamily) attrs.fontFamily = style.fontFamily.replace(/["']/g, '').split(',')[0]?.trim()
  if (style.fontSize) attrs.fontSize = style.fontSize
  if (style.color) attrs.color = style.color
  if (style.backgroundColor) attrs.backgroundColor = style.backgroundColor
  if (Object.keys(attrs).length) marks.push({ type: 'textStyle', attrs })
  return marks
}

function inlineContent(node: Node, inherited: KindyMark[] = []): JSONContent[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    return text ? [{ type: 'text', text, marks: inherited.length ? inherited : undefined }] : []
  }
  if (!(node instanceof HTMLElement)) return []
  if (node.tagName === 'BR') return [{ type: 'hardBreak' }]
  if (node.tagName === 'IMG') {
    return [{ type: 'inlineImage', attrs: { src: node.getAttribute('src'), alt: node.getAttribute('alt') || '', width: Number(node.getAttribute('width')) || null } }]
  }

  const marks = [...inherited, ...styleMap(node.style)]
  const simpleMarks: Record<string, string> = {
    STRONG: 'bold', B: 'bold', EM: 'italic', I: 'italic', U: 'underline', S: 'strike', DEL: 'strike', SUB: 'subscript', SUP: 'superscript', CODE: 'code',
  }
  if (simpleMarks[node.tagName]) marks.push({ type: simpleMarks[node.tagName] })
  if (node.tagName === 'A') marks.push({ type: 'link', attrs: { href: node.getAttribute('href') || '' } })
  return [...node.childNodes].flatMap((child) => inlineContent(child, marks))
}

function paragraphAttrs(element: HTMLElement) {
  const attrs: Record<string, unknown> = {}
  const align = element.style.textAlign || element.getAttribute('align')
  if (align) attrs.textAlign = align
  if (element.style.lineHeight) attrs.lineHeight = element.style.lineHeight
  if (element.style.marginLeft) attrs.indent = Number.parseFloat(element.style.marginLeft) || 0
  return attrs
}

function blockContent(element: Element): JSONContent[] {
  if (!(element instanceof HTMLElement)) return []
  const tag = element.tagName
  if (/^H[1-6]$/.test(tag)) {
    return [{ type: 'heading', attrs: { level: Number(tag.slice(1)), ...paragraphAttrs(element) }, content: inlineContent(element) }]
  }
  if (tag === 'P' || tag === 'DIV') {
    if (element.querySelector(':scope > table, :scope > ul, :scope > ol')) {
      return [...element.children].flatMap(blockContent)
    }
    return [{ type: 'paragraph', attrs: paragraphAttrs(element), content: inlineContent(element) }]
  }
  if (tag === 'UL' || tag === 'OL') {
    return [{
      type: tag === 'UL' ? 'bulletList' : 'orderedList',
      attrs: tag === 'OL' ? { start: Number(element.getAttribute('start')) || 1 } : undefined,
      content: [...element.children].filter((child) => child.tagName === 'LI').map((child) => ({
        type: 'listItem',
        content: [...child.childNodes].flatMap((node) => {
          if (node instanceof Element && (node.tagName === 'UL' || node.tagName === 'OL')) return blockContent(node)
          if (node instanceof Element && /^(P|DIV)$/.test(node.tagName)) return blockContent(node)
          return inlineContent(node).length ? [{ type: 'paragraph', content: inlineContent(node) }] : []
        }),
      })),
    }]
  }
  if (tag === 'TABLE') {
    const rows = [...element.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr')]
    return [{
      type: 'table',
      content: rows.map((row) => ({
        type: 'tableRow',
        content: [...row.children].filter((cell) => /^(TD|TH)$/.test(cell.tagName)).map((cell) => ({
          type: cell.tagName === 'TH' ? 'tableHeader' : 'tableCell',
          attrs: {
            colspan: Number(cell.getAttribute('colspan')) || 1,
            rowspan: Number(cell.getAttribute('rowspan')) || 1,
          },
          content: [...cell.children].flatMap(blockContent).length
            ? [...cell.children].flatMap(blockContent)
            : [{ type: 'paragraph', content: inlineContent(cell) }],
        })),
      })),
    }]
  }
  if (tag === 'IMG') return [{ type: 'image', attrs: { src: element.getAttribute('src'), alt: element.getAttribute('alt') || '' } }]
  if (tag === 'BLOCKQUOTE') return [{ type: 'blockquote', content: [...element.children].flatMap(blockContent) }]
  return [...element.children].flatMap(blockContent)
}

export function htmlToDocumentState(html: string, page?: Partial<KindyPageState>): KindyDocumentState {
  if (typeof DOMParser === 'undefined') {
    const text = html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    return createEmptyDocumentState({ content: { type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : undefined }] }, page: page as KindyPageState })
  }
  const { body } = new DOMParser().parseFromString(html, 'text/html')
  const content = [...body.children].flatMap(blockContent)
  return createEmptyDocumentState({ content: { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }, page: page as KindyPageState })
}

const xmlElements = (node: Element | Document, localName: string, direct = false) => {
  const values = direct && 'children' in node
    ? [...node.children]
    : [...node.getElementsByTagName('*')]
  return values.filter((element) => element.localName === localName || element.tagName.split(':').at(-1) === localName)
}
const xmlFirst = (node: Element | Document, localName: string) => xmlElements(node, localName)[0]
const xmlValue = (element?: Element) => element?.getAttribute('w:val') || element?.getAttribute('val') || element?.getAttribute('r:id') || element?.getAttribute('id') || undefined
const twipsToCentimeters = (value: string | null | undefined) => Number(value || 0) / 567

type DocxTabStop = {
  alignment: string
  position: number
  leader?: string
}

type DocxParagraphFormat = {
  textAlign?: string
  line?: number
  lineRule?: string
  before?: number
  after?: number
  left?: number
  right?: number
  firstLine?: number
  hanging?: number
  keepNext?: boolean
  keepLines?: boolean
  pageBreakBefore?: boolean
  tabStops?: DocxTabStop[]
}

type DocxRunFormat = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  subscript?: boolean
  superscript?: boolean
  fontAscii?: string
  fontHAnsi?: string
  fontEastAsia?: string
  fontComplex?: string
  fontSize?: string
  color?: string
  backgroundColor?: string
}

type ResolvedDocxStyle = {
  id: string
  basedOn?: string
  paragraph: DocxParagraphFormat
  run: DocxRunFormat
}

type DocxStyleContext = {
  paragraphDefault: DocxParagraphFormat
  runDefault: DocxRunFormat
  styles: Map<string, ResolvedDocxStyle>
}

const emptyStyleContext = (): DocxStyleContext => ({
  paragraphDefault: {},
  runDefault: {},
  styles: new Map(),
})

const wordAttribute = (element: Element | undefined, name: string) =>
  element?.getAttribute(`w:${name}`) || element?.getAttribute(name) || undefined

function wordBoolean(element?: Element) {
  if (!element) return undefined
  const value = wordAttribute(element, 'val')
  return value === undefined || !['0', 'false', 'off', 'no'].includes(value.toLowerCase())
}

function readParagraphFormat(properties?: Element): DocxParagraphFormat {
  if (!properties) return {}
  const spacing = xmlFirst(properties, 'spacing')
  const indent = xmlFirst(properties, 'ind')
  const [tabs] = xmlElements(properties, 'tabs', true)
  const tabStops = tabs
    ? xmlElements(tabs, 'tab', true)
      .map((tab): DocxTabStop | null => {
        const rawPosition = Number(wordAttribute(tab, 'pos'))
        if (!Number.isFinite(rawPosition)) return null
        return {
          alignment: wordAttribute(tab, 'val') || 'left',
          position: twipsToCentimeters(String(rawPosition)),
          leader: wordAttribute(tab, 'leader') || undefined,
        }
      })
      .filter((tab): tab is DocxTabStop => tab !== null)
    : undefined
  const number = (element: Element | undefined, name: string) => {
    const value = Number(wordAttribute(element, name))
    return Number.isFinite(value) ? value : undefined
  }
  return {
    textAlign: xmlValue(xmlFirst(properties, 'jc')),
    line: number(spacing, 'line'),
    lineRule: wordAttribute(spacing, 'lineRule'),
    before: number(spacing, 'before'),
    after: number(spacing, 'after'),
    left: number(indent, 'left') ?? number(indent, 'start'),
    right: number(indent, 'right') ?? number(indent, 'end'),
    firstLine: number(indent, 'firstLine'),
    hanging: number(indent, 'hanging'),
    keepNext: wordBoolean(xmlFirst(properties, 'keepNext')),
    keepLines: wordBoolean(xmlFirst(properties, 'keepLines')),
    pageBreakBefore: wordBoolean(xmlFirst(properties, 'pageBreakBefore')),
    tabStops,
  }
}

function readRunFormat(properties?: Element): DocxRunFormat {
  if (!properties) return {}
  const fonts = xmlFirst(properties, 'rFonts')
  const size = xmlValue(xmlFirst(properties, 'sz')) || xmlValue(xmlFirst(properties, 'szCs'))
  const color = xmlValue(xmlFirst(properties, 'color'))
  const shading = xmlFirst(properties, 'shd')
  const highlight = xmlValue(xmlFirst(properties, 'highlight'))
  const verticalAlign = xmlValue(xmlFirst(properties, 'vertAlign'))
  const fill = wordAttribute(shading, 'fill')
  return {
    bold: wordBoolean(xmlFirst(properties, 'b')),
    italic: wordBoolean(xmlFirst(properties, 'i')),
    underline: wordBoolean(xmlFirst(properties, 'u')),
    strike: wordBoolean(xmlFirst(properties, 'strike')) ?? wordBoolean(xmlFirst(properties, 'dstrike')),
    subscript: verticalAlign ? verticalAlign === 'subscript' : undefined,
    superscript: verticalAlign ? verticalAlign === 'superscript' : undefined,
    fontAscii: wordAttribute(fonts, 'ascii'),
    fontHAnsi: wordAttribute(fonts, 'hAnsi'),
    fontEastAsia: wordAttribute(fonts, 'eastAsia'),
    fontComplex: wordAttribute(fonts, 'cs'),
    fontSize: size && Number.isFinite(Number(size)) ? `${Number(size) / 2}pt` : undefined,
    color: color && color !== 'auto' ? `#${color}` : undefined,
    backgroundColor: fill && fill !== 'auto' && fill !== 'FFFFFF'
      ? `#${fill}`
      : highlight && highlight !== 'none'
        ? highlight
        : undefined,
  }
}

const definedEntries = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>

function mergeParagraphFormat(...values: DocxParagraphFormat[]) {
  const result: DocxParagraphFormat = {}
  for (const value of values) {
    const { tabStops, ...properties } = value
    Object.assign(result, definedEntries(properties))
    if (!tabStops) continue
    const merged = [...(result.tabStops || [])]
    for (const stop of tabStops) {
      const existing = merged.findIndex((candidate) => Math.abs(candidate.position - stop.position) < 0.001)
      if (existing >= 0) merged.splice(existing, 1)
      if (stop.alignment !== 'clear') merged.push(stop)
    }
    result.tabStops = merged.sort((left, right) => left.position - right.position)
  }
  return result
}

function mergeRunFormat(...values: DocxRunFormat[]) {
  const result: DocxRunFormat = {}
  for (const value of values) Object.assign(result, definedEntries(value))
  return result
}

function parseDocxStyles(stylesXml?: string): DocxStyleContext {
  if (!stylesXml || typeof DOMParser === 'undefined') return emptyStyleContext()
  const document = new DOMParser().parseFromString(stylesXml, 'application/xml')
  if (document.querySelector('parsererror')) return emptyStyleContext()
  const defaults = xmlFirst(document, 'docDefaults')
  const paragraphDefaultProperties = defaults ? xmlFirst(xmlFirst(defaults, 'pPrDefault') || defaults, 'pPr') : undefined
  const runDefaultProperties = defaults ? xmlFirst(xmlFirst(defaults, 'rPrDefault') || defaults, 'rPr') : undefined
  const rawStyles = new Map<string, {
    id: string
    basedOn?: string
    paragraph: DocxParagraphFormat
    run: DocxRunFormat
  }>()
  for (const style of xmlElements(document, 'style')) {
    if (wordAttribute(style, 'type') !== 'paragraph') continue
    const id = wordAttribute(style, 'styleId') || ''
    if (!id) continue
    const [paragraphProperties] = xmlElements(style, 'pPr', true)
    const [runProperties] = xmlElements(style, 'rPr', true)
    rawStyles.set(id, {
      id,
      basedOn: xmlValue(xmlFirst(style, 'basedOn')),
      paragraph: readParagraphFormat(paragraphProperties),
      run: readRunFormat(runProperties),
    })
  }

  const resolved = new Map<string, ResolvedDocxStyle>()
  const resolving = new Set<string>()
  const resolve = (id: string): ResolvedDocxStyle | undefined => {
    if (resolved.has(id)) return resolved.get(id)
    const style = rawStyles.get(id)
    if (!style || resolving.has(id)) return undefined
    resolving.add(id)
    const base = style.basedOn ? resolve(style.basedOn) : undefined
    const value: ResolvedDocxStyle = {
      id,
      basedOn: style.basedOn,
      paragraph: mergeParagraphFormat(base?.paragraph || {}, style.paragraph),
      run: mergeRunFormat(base?.run || {}, style.run),
    }
    resolving.delete(id)
    resolved.set(id, value)
    return value
  }
  for (const id of rawStyles.keys()) resolve(id)
  return {
    paragraphDefault: readParagraphFormat(paragraphDefaultProperties),
    runDefault: readRunFormat(runDefaultProperties),
    styles: resolved,
  }
}

function parseRelationships(xml?: string) {
  const values = new Map<string, string>()
  if (!xml || typeof DOMParser === 'undefined') return values
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  xmlElements(document, 'Relationship').forEach((relationship) => {
    const id = relationship.getAttribute('Id')
    const target = relationship.getAttribute('Target')
    if (id && target) values.set(id, target)
  })
  return values
}

function fileNameFromPath(value: string) {
  return value.split('/').at(-1) || value
}

function imageMimeType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension === 'jpg' || extension === 'jpeg' || extension === 'jfif' ? 'image/jpeg'
    : extension === 'svg' ? 'image/svg+xml'
      : extension === 'gif' ? 'image/gif'
        : extension === 'webp' ? 'image/webp'
          : extension === 'bmp' ? 'image/bmp'
            : extension === 'tif' || extension === 'tiff' ? 'image/tiff'
              : extension === 'emf' ? 'image/emf'
                : extension === 'wmf' ? 'image/wmf'
                  : extension === 'png' ? 'image/png'
                    : 'application/octet-stream'
}

function isBrowserRenderableImage(fileName: string) {
  return ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif', 'image/webp', 'image/bmp'].includes(imageMimeType(fileName))
}

function normalizeWordPartTarget(target: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return target
  const decoded = (() => {
    try { return decodeURIComponent(target) } catch { return target }
  })().replaceAll('\\', '/')
  const segments = decoded.startsWith('/') ? [] : ['word']
  for (const segment of decoded.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return segments.join('/')
}

function bytesToDataUrl(bytes: Uint8Array, fileName: string) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return `data:${imageMimeType(fileName)};base64,${btoa(binary)}`
}

function imageDimensions(element: Element) {
  const extent = xmlFirst(element, 'extent')
  let width = Math.round(Number(extent?.getAttribute('cx') || 0) / 9525) || undefined
  let height = Math.round(Number(extent?.getAttribute('cy') || 0) / 9525) || undefined
  if (!width || !height) {
    const style = xmlFirst(element, 'shape')?.getAttribute('style') || ''
    const readDimension = (name: string) => {
      const match = style.match(new RegExp(`${name}\\s*:\\s*([\\d.]+)(pt|px)?`, 'i'))
      if (!match) return undefined
      const value = Number(match[1])
      return Math.round(match[2]?.toLowerCase() === 'pt' ? value * 96 / 72 : value)
    }
    width ||= readDimension('width')
    height ||= readDimension('height')
  }
  return { width, height }
}

function imageFromOoxml(
  element: Element,
  relationships: Map<string, string>,
  parts: DocxPackageParts,
  assets: AssetReference[],
): JSONContent | null {
  // A Word run may contain mc:AlternateContent with a DrawingML choice and a
  // VML fallback. Do not stop at the first relationship: it is common for the
  // primary choice to be EMF/WMF while the fallback is a browser-safe PNG.
  const relationshipCandidates = [
    ...xmlElements(element, 'blip').flatMap((value) => [
      value.getAttribute('r:embed'),
      value.getAttribute('embed'),
      value.getAttribute('r:link'),
      value.getAttribute('link'),
    ]),
    ...xmlElements(element, 'imagedata').flatMap((value) => [
      value.getAttribute('r:id'),
      value.getAttribute('id'),
    ]),
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
  const resolved = relationshipCandidates
    .map((relationId) => {
      const target = relationships.get(relationId)
      const mediaName = target ? normalizeWordPartTarget(target) : undefined
      const media = mediaName ? parts.media[mediaName] : undefined
      return { relationId, mediaName, media }
    })
    .find((candidate) => candidate.mediaName && candidate.media && isBrowserRenderableImage(candidate.mediaName))
  if (!resolved?.mediaName || !resolved.media) return null
  const { relationId, mediaName, media } = resolved

  const dataUrl = bytesToDataUrl(media, mediaName)
  const metadata = xmlFirst(element, 'docPr') || xmlFirst(element, 'cNvPr')
  const imageData = xmlFirst(element, 'imagedata')
  const alt = metadata?.getAttribute('descr') || imageData?.getAttribute('o:title') || ''
  const title = metadata?.getAttribute('title') || metadata?.getAttribute('name') || alt
  const id = `docx-${mediaName.replace(/[^a-z\d_-]/gi, '-')}`
  if (!assets.some((asset) => asset.id === id)) {
    assets.push({
      id,
      kind: 'image',
      mimeType: imageMimeType(mediaName),
      fileName: fileNameFromPath(mediaName),
      size: media.byteLength,
      metadata: { sourcePath: mediaName, relationshipId: relationId },
    })
  }
  const { width, height } = imageDimensions(element)
  return {
    type: 'inlineImage',
    attrs: {
      id,
      name: fileNameFromPath(mediaName),
      size: media.byteLength,
      src: dataUrl,
      alt,
      title,
      width: width || 150,
      height: height || 80,
      inline: true,
      uploaded: true,
    },
  }
}

function parseNumberingKinds(xml?: string) {
  const result = new Map<string, 'bullet' | 'number'>()
  if (!xml || typeof DOMParser === 'undefined') return result
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const abstractKinds = new Map<string, 'bullet' | 'number'>()
  xmlElements(document, 'abstractNum').forEach((abstract) => {
    const abstractId = abstract.getAttribute('w:abstractNumId') || abstract.getAttribute('abstractNumId') || ''
    const format = xmlValue(xmlFirst(abstract, 'numFmt'))
    abstractKinds.set(abstractId, format === 'bullet' ? 'bullet' : 'number')
  })
  xmlElements(document, 'num').forEach((numbering) => {
    const id = numbering.getAttribute('w:numId') || numbering.getAttribute('numId') || ''
    const abstractId = xmlValue(xmlFirst(numbering, 'abstractNumId')) || ''
    result.set(id, abstractKinds.get(abstractId) || 'number')
  })
  return result
}

type ParsedDocxComment = {
  id: string
  user: string
  color: string
  thread: string
}

function parseDocxComments(xml?: string, extendedXml?: string) {
  const comments = new Map<string, ParsedDocxComment>()
  if (!xml || typeof DOMParser === 'undefined') return comments
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const entries = xmlElements(document, 'comment').map((comment) => {
    const rawId = comment.getAttribute('w:id') || comment.getAttribute('id') || ''
    const author = comment.getAttribute('w:author') || comment.getAttribute('author') || 'Anonymous'
    const createdAt = Date.parse(comment.getAttribute('w:date') || comment.getAttribute('date') || '') || Date.now()
    const paragraph = xmlFirst(comment, 'p')
    const paraId = paragraph?.getAttribute('w14:paraId') || paragraph?.getAttribute('paraId') || ''
    return { rawId, author, createdAt, paraId, text: comment.textContent || '' }
  }).filter((entry) => entry.rawId)
  const extended = new Map<string, { parent?: string; done: boolean }>()
  if (extendedXml) {
    const extendedDocument = new DOMParser().parseFromString(extendedXml, 'application/xml')
    for (const value of xmlElements(extendedDocument, 'commentEx')) {
      const paraId = value.getAttribute('w15:paraId') || value.getAttribute('paraId') || ''
      if (paraId) extended.set(paraId, {
        parent: value.getAttribute('w15:paraIdParent') || value.getAttribute('paraIdParent') || undefined,
        done: (value.getAttribute('w15:done') || value.getAttribute('done')) === '1',
      })
    }
  }
  for (const entry of entries) {
    if (extended.get(entry.paraId)?.parent) continue
    const replies = entries
      .filter((candidate) => extended.get(candidate.paraId)?.parent === entry.paraId)
      .map((reply) => ({
        id: `comment-${reply.rawId}`,
        user: reply.author,
        userId: '',
        text: reply.text,
        createdAt: reply.createdAt,
      }))
    const parent = extended.get(entry.paraId)
    const thread = {
      id: `comment-${entry.rawId}`,
      user: entry.author,
      userId: '',
      color: 'rgba(255, 213, 79, 0.4)',
      text: entry.text,
      replies,
      resolved: parent?.done || false,
      createdAt: entry.createdAt,
      resolvedAt: null,
    }
    comments.set(entry.rawId, { id: thread.id, user: entry.author, color: thread.color, thread: JSON.stringify(thread) })
  }
  return comments
}

function ooxmlRun(
  run: Element,
  relationships: Map<string, string>,
  parts: DocxPackageParts,
  assets: AssetReference[],
  inheritedFormat: DocxRunFormat = {},
): JSONContent[] {
  const properties = xmlFirst(run, 'rPr')
  const format = mergeRunFormat(inheritedFormat, readRunFormat(properties))
  const marks: KindyMark[] = []
  if (format.bold) marks.push({ type: 'bold' })
  if (format.italic) marks.push({ type: 'italic' })
  if (format.underline) marks.push({ type: 'underline' })
  if (format.strike) marks.push({ type: 'strike' })
  if (format.subscript) marks.push({ type: 'subscript' })
  if (format.superscript) marks.push({ type: 'superscript' })
  const style = definedEntries({
    // Vietnamese contract templates frequently declare their intended
    // cross-platform face in w:eastAsia while leaving the Latin slots on the
    // base style. Prefer that explicit face so browser metrics stay aligned
    // with Word/LibreOffice pagination.
    fontFamily: format.fontEastAsia || format.fontHAnsi || format.fontAscii || format.fontComplex,
    fontSize: format.fontSize,
    color: format.color,
    backgroundColor: format.backgroundColor,
  })
  if (Object.keys(style).length) marks.push({ type: 'textStyle', attrs: style })

  const tracked = run.parentElement?.localName === 'ins' || run.parentElement?.localName === 'del' ? run.parentElement : null
  if (tracked) {
    marks.push({ type: 'trackChange', attrs: {
      id: tracked.getAttribute('w:id') || tracked.getAttribute('id'),
      type: tracked.localName === 'del' ? 'delete' : 'insert',
      author: tracked.getAttribute('w:author') || tracked.getAttribute('author') || 'Unknown',
      timestamp: Date.parse(tracked.getAttribute('w:date') || tracked.getAttribute('date') || '') || Date.now(),
    } })
  }

  const output: JSONContent[] = []
  for (const child of [...run.children]) {
    if (child.localName === 't' || child.localName === 'delText') {
      if (child.textContent) output.push({ type: 'text', text: child.textContent, marks: marks.length ? marks : undefined })
    } else if (child.localName === 'tab') {
      output.push({ type: 'docxTab' })
    } else if (child.localName === 'br') {
      output.push({ type: child.getAttribute('w:type') === 'page' ? 'pageBreak' : 'hardBreak' })
    } else if (
      child.localName === 'drawing'
      || child.localName === 'pict'
      || xmlElements(child, 'drawing').length > 0
      || xmlElements(child, 'pict').length > 0
    ) {
      const image = imageFromOoxml(child, relationships, parts, assets)
      if (image) output.push(image)
    }
  }
  return output
}

function splitParagraphPageBreaks(node: JSONContent) {
  const output: JSONContent[] = []
  let inline: JSONContent[] = []
  const flush = () => {
    if (!inline.length) return
    output.push({ ...node, content: inline })
    inline = []
  }
  for (const child of node.content || []) {
    if (child.type === 'pageBreak') {
      flush()
      output.push({ type: 'pageBreak' })
    } else {
      inline.push(child)
    }
  }
  flush()
  if (!output.length) output.push({ ...node, content: undefined })
  return output
}

function ooxmlParagraph(
  element: Element,
  relationships: Map<string, string>,
  parts: DocxPackageParts,
  assets: AssetReference[],
  comments: Map<string, ParsedDocxComment> = new Map(),
  styleContext: DocxStyleContext = emptyStyleContext(),
) {
  const properties = xmlFirst(element, 'pPr')
  const paragraphStyle = xmlValue(properties ? xmlFirst(properties, 'pStyle') : undefined) || ''
  const headingMatch = paragraphStyle.match(/(?:Heading|Tiêuđề|Titre)\s*([1-6])/i)
  const resolvedStyle = styleContext.styles.get(paragraphStyle)
  const format = mergeParagraphFormat(
    styleContext.paragraphDefault,
    resolvedStyle?.paragraph || {},
    readParagraphFormat(properties),
  )
  const inheritedRunFormat = mergeRunFormat(
    styleContext.runDefault,
    resolvedStyle?.run || {},
    readRunFormat(properties ? xmlFirst(properties, 'rPr') : undefined),
  )
  const attrs: Record<string, unknown> = {}
  if (format.textAlign) attrs.textAlign = format.textAlign === 'both' ? 'justify' : format.textAlign
  if (format.line) {
    attrs.lineHeight = format.lineRule && format.lineRule !== 'auto'
      ? `${format.line / 15}px`
      : format.line / 240
  }
  if (format.before || format.after) {
    attrs.margin = {
      top: format.before ? String(format.before / 15) : undefined,
      bottom: format.after ? String(format.after / 15) : undefined,
    }
  }
  const layout = definedEntries({
    left: format.left ? twipsToCentimeters(String(format.left)) : undefined,
    right: format.right ? twipsToCentimeters(String(format.right)) : undefined,
    firstLine: format.firstLine ? twipsToCentimeters(String(format.firstLine)) : undefined,
    hanging: format.hanging ? twipsToCentimeters(String(format.hanging)) : undefined,
    keepNext: format.keepNext,
    keepLines: format.keepLines,
    pageBreakBefore: format.pageBreakBefore,
    tabStops: format.tabStops?.length ? format.tabStops : undefined,
  })
  if (Object.keys(layout).length) attrs.docxLayout = layout
  if (format.left) attrs.indent = twipsToCentimeters(String(format.left))

  const content: JSONContent[] = []
  const activeComments: string[] = []
  const applyComments = (values: JSONContent[]) => {
    if (!activeComments.length) return values
    return values.map((value) => {
      if (value.type !== 'text') return value
      const marks = [...(value.marks || [])]
      for (const id of activeComments) {
        const comment = comments.get(id)
        if (comment) marks.push({ type: 'comment', attrs: comment })
      }
      return { ...value, marks }
    })
  }
  for (const child of [...element.children]) {
    if (child.localName === 'commentRangeStart') {
      const id = child.getAttribute('w:id') || child.getAttribute('id') || ''
      if (id && !activeComments.includes(id)) activeComments.push(id)
      continue
    }
    if (child.localName === 'commentRangeEnd') {
      const id = child.getAttribute('w:id') || child.getAttribute('id') || ''
      const index = activeComments.lastIndexOf(id)
      if (index >= 0) activeComments.splice(index, 1)
      continue
    }
    if (child.localName === 'r') content.push(...applyComments(ooxmlRun(child, relationships, parts, assets, inheritedRunFormat)))
    if (child.localName === 'hyperlink' || child.localName === 'ins' || child.localName === 'del') {
      const hyperlinkId = child.getAttribute('r:id') || child.getAttribute('id')
      const href = hyperlinkId ? relationships.get(hyperlinkId) : undefined
      xmlElements(child, 'r', true).forEach((run) => {
        const values = ooxmlRun(run, relationships, parts, assets, inheritedRunFormat)
        if (href) values.forEach((value) => {
          if (value.type === 'text') value.marks = [...(value.marks || []), { type: 'link', attrs: { href } }]
        })
        content.push(...applyComments(values))
      })
    }
  }
  let tabIndex = 0
  for (const child of content) {
    if (child.type !== 'docxTab') continue
    const stop = format.tabStops?.[tabIndex]
    const previousPosition = format.tabStops?.at(-1)?.position || 0
    const fallbackOffset = Math.max(1, tabIndex - (format.tabStops?.length || 0) + 1)
    child.attrs = {
      alignment: stop?.alignment || 'left',
      position: stop?.position || previousPosition + (1.27 * fallbackOffset),
      leader: stop?.leader || 'none',
      index: tabIndex,
    }
    tabIndex += 1
  }
  const numPr = properties ? xmlFirst(properties, 'numPr') : undefined
  const node = { type: headingMatch ? 'heading' : 'paragraph', attrs: headingMatch ? { ...attrs, level: Number(headingMatch[1]) } : attrs, content: content.length ? content : undefined } as JSONContent
  return {
    nodes: splitParagraphPageBreaks(node),
    numbering: numPr ? { id: xmlValue(xmlFirst(numPr, 'numId')) || '', level: Number(xmlValue(xmlFirst(numPr, 'ilvl')) || 0) } : null,
  }
}

function ooxmlTable(
  element: Element,
  relationships: Map<string, string>,
  parts: DocxPackageParts,
  assets: AssetReference[],
  comments: Map<string, ParsedDocxComment> = new Map(),
  styleContext: DocxStyleContext = emptyStyleContext(),
): JSONContent {
  let activeMerges = new Map<number, JSONContent>()
  const rows: JSONContent[] = []
  for (const row of xmlElements(element, 'tr', true)) {
    const nextMerges = new Map<number, JSONContent>()
    const continued = new Set<JSONContent>()
    const rowProperties = xmlFirst(row, 'trPr')
    const cellType = rowProperties && xmlFirst(rowProperties, 'tblHeader') ? 'tableHeader' : 'tableCell'
    const cells: JSONContent[] = []
    let column = 0
    for (const cell of xmlElements(row, 'tc', true)) {
      const properties = xmlFirst(cell, 'tcPr')
      const merge = properties ? xmlFirst(properties, 'vMerge') : undefined
      const mergeValue = merge ? (xmlValue(merge) || 'continue') : undefined
      const previous = activeMerges.get(column)
      const colspan = Number(xmlValue(properties ? xmlFirst(properties, 'gridSpan') : undefined))
        || Number(previous?.attrs?.colspan)
        || 1

      if (mergeValue === 'continue' && previous) {
        if (!continued.has(previous)) {
          previous.attrs = { ...previous.attrs, rowspan: Number(previous.attrs?.rowspan || 1) + 1 }
          continued.add(previous)
        }
        for (let offset = 0; offset < colspan; offset += 1) nextMerges.set(column + offset, previous)
        column += colspan
        continue
      }

      const verticalAlign = xmlValue(properties ? xmlFirst(properties, 'vAlign') : undefined)
      const fill = properties ? xmlFirst(properties, 'shd')?.getAttribute('w:fill') || xmlFirst(properties, 'shd')?.getAttribute('fill') : undefined
      const node: JSONContent = {
        type: cellType,
        attrs: {
          colspan,
          rowspan: 1,
          verticalAlign: verticalAlign || null,
          background: fill && fill !== 'auto' ? `#${fill}` : null,
        },
        content: [...cell.children]
          .filter((child) => child.localName === 'p')
          .flatMap((paragraph) => ooxmlParagraph(paragraph, relationships, parts, assets, comments, styleContext).nodes),
      }
      if (!node.content?.length) node.content = [{ type: 'paragraph' }]
      cells.push(node)
      if (mergeValue === 'restart') {
        for (let offset = 0; offset < colspan; offset += 1) nextMerges.set(column + offset, node)
      }
      column += colspan
    }
    activeMerges = nextMerges
    rows.push({ type: 'tableRow', content: cells })
  }
  return {
    type: 'table',
    content: rows,
  }
}

function textFromContent(node?: JSONContent): string {
  if (!node) return ''
  return node.text || (node.content || []).map(textFromContent).join('')
}

function parseRelatedDocument(
  partName: string,
  parts: DocxPackageParts,
  assets: AssetReference[],
  styleContext: DocxStyleContext,
): JSONContent | undefined {
  const xmlSource = parts.relatedXml?.[partName]
  if (!xmlSource || typeof DOMParser === 'undefined') return undefined
  const xml = new DOMParser().parseFromString(xmlSource, 'application/xml')
  if (xml.querySelector('parsererror')) return undefined
  const relationshipName = `${partName.replace(/^word\//, 'word/_rels/')  }.rels`
  const relationships = parseRelationships(parts.relatedRelationshipsXml?.[relationshipName])
  const root = xml.documentElement
  const content: JSONContent[] = []
  for (const child of [...root.children]) {
    if (child.localName === 'p') content.push(...ooxmlParagraph(child, relationships, parts, assets, new Map(), styleContext).nodes)
    else if (child.localName === 'tbl') content.push(ooxmlTable(child, relationships, parts, assets, new Map(), styleContext))
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

function parseHeaderFooterState(
  section: Element,
  type: 'header' | 'footer',
  documentRelationships: Map<string, string>,
  parts: DocxPackageParts,
  assets: AssetReference[],
  styleContext: DocxStyleContext,
): KindyHeaderFooterState {
  const values: Partial<Record<'default' | 'first' | 'even', JSONContent>> = {}
  for (const reference of xmlElements(section, `${type}Reference`, true)) {
    const relationId = reference.getAttribute('r:id') || reference.getAttribute('id') || ''
    const target = relationId ? documentRelationships.get(relationId) : undefined
    const partName = target ? normalizeWordPartTarget(target) : undefined
    const variant = (reference.getAttribute('w:type') || reference.getAttribute('type') || 'default') as 'default' | 'first' | 'even'
    const content = partName ? parseRelatedDocument(partName, parts, assets, styleContext) : undefined
    if (content && ['default', 'first', 'even'].includes(variant)) values[variant] = content
  }
  return {
    enabled: Boolean(values.default || values.first || values.even),
    content: values.default,
    text: textFromContent(values.default),
    firstContent: values.first,
    firstText: textFromContent(values.first),
    evenContent: values.even,
    evenText: textFromContent(values.even),
    differentFirstPage: Boolean(values.first || xmlFirst(section, 'titlePg')),
    differentOddEven: Boolean(values.even),
  }
}

function parseSectionState(
  section: Element,
  id: string,
  documentRelationships: Map<string, string>,
  parts: DocxPackageParts,
  assets: AssetReference[],
  styleContext: DocxStyleContext,
): KindySectionState & { breakType: string } {
  const size = xmlFirst(section, 'pgSz')
  const width = twipsToCentimeters(size?.getAttribute('w:w') || size?.getAttribute('w')) || 21
  const height = twipsToCentimeters(size?.getAttribute('w:h') || size?.getAttribute('h')) || 29.7
  const landscape = (size?.getAttribute('w:orient') || size?.getAttribute('orient')) === 'landscape' || width > height
  const margin = xmlFirst(section, 'pgMar')
  const readMargin = (name: string) => twipsToCentimeters(margin?.getAttribute(`w:${name}`) || margin?.getAttribute(name)) || 2.54
  const pageNumber = xmlFirst(section, 'pgNumType')
  const start = Number(pageNumber?.getAttribute('w:start') || pageNumber?.getAttribute('start'))
  return {
    id,
    size: landscape && width > height ? { width: height, height: width } : { width, height },
    orientation: landscape ? 'landscape' : 'portrait',
    margin: { top: readMargin('top'), right: readMargin('right'), bottom: readMargin('bottom'), left: readMargin('left') },
    pageNumberStart: Number.isFinite(start) && start > 0 ? start : undefined,
    header: parseHeaderFooterState(section, 'header', documentRelationships, parts, assets, styleContext),
    footer: parseHeaderFooterState(section, 'footer', documentRelationships, parts, assets, styleContext),
    breakType: xmlValue(xmlFirst(section, 'type')) || 'nextPage',
  }
}

export function ooxmlToDocumentState(parts: DocxPackageParts): KindyDocumentState {
  if (typeof DOMParser === 'undefined') return htmlToDocumentState(parts.documentXml)
  const xml = new DOMParser().parseFromString(parts.documentXml, 'application/xml')
  if (xml.querySelector('parsererror')) throw new DocumentLibraryError('DOCX_INVALID', 'word/document.xml is malformed.')
  const body = xmlFirst(xml, 'body')
  if (!body) throw new DocumentLibraryError('DOCX_INVALID', 'The Word document body is missing.')
  const relationships = parseRelationships(parts.relationshipsXml)
  const numberingKinds = parseNumberingKinds(parts.numberingXml)
  const comments = parseDocxComments(parts.commentsXml, parts.commentsExtendedXml)
  const styleContext = parseDocxStyles(parts.stylesXml)
  const content: JSONContent[] = []
  const assets: AssetReference[] = []
  const sectionElements: Element[] = []
  const sectionBreakNodes: JSONContent[] = []
  let activeLists: JSONContent[] = []
  let activeListId = ''
  let activeListType = ''
  const resetActiveList = () => {
    activeLists = []
    activeListId = ''
    activeListType = ''
  }
  const createList = (type: string): JSONContent => ({
    type,
    attrs: type === 'orderedList' ? { start: 1 } : undefined,
    content: [],
  })
  for (const child of [...body.children]) {
    if (child.localName === 'tbl') {
      resetActiveList()
      content.push(ooxmlTable(child, relationships, parts, assets, comments, styleContext))
      continue
    }
    if (child.localName !== 'p') continue
    const parsed = ooxmlParagraph(child, relationships, parts, assets, comments, styleContext)
    for (const node of parsed.nodes) {
      if (node.type === 'pageBreak') {
        resetActiveList()
        content.push(node)
      } else if (parsed.numbering) {
        const kind = numberingKinds.get(parsed.numbering.id) || 'number'
        const type = kind === 'bullet' ? 'bulletList' : 'orderedList'
        const level = Math.max(0, parsed.numbering.level)
        if (!activeLists.length || activeListType !== type || activeListId !== parsed.numbering.id) {
          const root = createList(type)
          activeLists = [root]
          activeListId = parsed.numbering.id
          activeListType = type
          content.push(root)
        }
        for (let depth = activeLists.length; depth <= level; depth += 1) {
          const parent = activeLists[depth - 1]
          let parentItem = parent.content?.at(-1)
          if (!parentItem) {
            parentItem = { type: 'listItem', content: [{ type: 'paragraph' }] }
            parent.content!.push(parentItem)
          }
          const nested = createList(type)
          parentItem.content = [...(parentItem.content || []), nested]
          activeLists[depth] = nested
        }
        activeLists = activeLists.slice(0, level + 1)
        activeLists[level].content!.push({ type: 'listItem', content: [node] })
      } else {
        resetActiveList()
        content.push(node)
      }
    }
    const [paragraphProperties] = xmlElements(child, 'pPr', true)
    const [paragraphSection] = paragraphProperties ? xmlElements(paragraphProperties, 'sectPr', true) : []
    if (paragraphSection) {
      resetActiveList()
      sectionElements.push(paragraphSection)
      const boundary: JSONContent = { type: 'sectionBreak', attrs: { id: `section-break-${sectionElements.length}`, type: 'nextPage', page: null } }
      content.push(boundary)
      sectionBreakNodes.push(boundary)
    }
  }

  const [finalSection] = xmlElements(body, 'sectPr', true)
  if (finalSection) sectionElements.push(finalSection)
  const sections = sectionElements.map((section, index) => parseSectionState(section, `section-${index + 1}`, relationships, parts, assets, styleContext))
  sectionBreakNodes.forEach((node, index) => {
    node.attrs = { ...node.attrs, type: sections[index + 1]?.breakType || 'nextPage', page: sections[index + 1] || null }
  })
  const [firstSection] = sections
  const page: Partial<KindyPageState> = firstSection ? {
    size: firstSection.size,
    orientation: firstSection.orientation,
    margin: firstSection.margin,
    header: firstSection.header,
    footer: firstSection.footer,
    sections: sections.map(({ breakType: _breakType, ...section }) => section),
  } : {}
  return createEmptyDocumentState({ content: { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }, page: page as KindyPageState, assets })
}

export async function importDocx(file: Blob, options: DocxCodecOptions = {}): Promise<DocxImportResult> {
  const parts = await extractDocxPackage(file, options.limits)
  const profile = options.profile || KINDY_DOCX_PROFILE
  const inspection = inspectParts(parts, profile)
  throwIfStrict(inspection.report, options.mode || 'best-effort')
  try {
    const converted = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      includeDefaultStyleMap: true,
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
      ],
    })
    const mammothIssues: CompatibilityIssue[] = converted.messages.map((message: { type: string; message: string }) => ({
      code: 'MAMMOTH_MESSAGE', feature: 'conversion', message: message.message,
      severity: message.type === 'error' ? 'error' : 'warning',
    }))
    const combined = report([...inspection.report.issues, ...mammothIssues], profile)
    throwIfStrict(combined, options.mode)
    const state = typeof DOMParser === 'undefined' ? htmlToDocumentState(converted.value) : ooxmlToDocumentState(parts)
    return { state, report: combined, messages: converted.messages }
  } catch (cause) {
    if (cause instanceof DocumentLibraryError) throw cause
    throw new DocumentLibraryError('IMPORT_FAILED', 'DOCX conversion failed.', { cause })
  }
}

/** Runs ZIP validation and Mammoth conversion off the main thread when supported. */
export async function importDocxInWorker(file: Blob, options: DocxCodecOptions & { signal?: AbortSignal } = {}): Promise<DocxImportResult> {
  if (typeof Worker === 'undefined') return importDocx(file, options)
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
  const worker = new Worker(new URL('./docx.worker.ts', import.meta.url), { type: 'module', name: 'kindy-docx-import' })
  return new Promise((resolve, reject) => {
    const stop = () => {
      worker.terminate()
      reject(new DocumentLibraryError('OPERATION_CANCELLED', 'DOCX import was cancelled.'))
    }
    options.signal?.addEventListener('abort', stop, { once: true })
    worker.onerror = (event) => {
      worker.terminate()
      reject(new DocumentLibraryError('IMPORT_FAILED', event.message || 'DOCX worker failed.'))
    }
    worker.onmessage = (event: MessageEvent<any>) => {
      if (event.data?.id !== id) return
      worker.terminate()
      options.signal?.removeEventListener('abort', stop)
      if (!event.data.ok) {
        reject(new DocumentLibraryError(event.data.error?.code || 'IMPORT_FAILED', event.data.error?.message || 'DOCX import failed.'))
        return
      }
      const messages = event.data.messages || []
      const issues: CompatibilityIssue[] = [
        ...inspectParts(event.data.parts, options.profile || KINDY_DOCX_PROFILE).report.issues,
        ...messages.map((message: { type: string; message: string }) => ({ code: 'MAMMOTH_MESSAGE', feature: 'conversion', message: message.message, severity: message.type === 'error' ? 'error' : 'warning' })),
      ]
      const compatibility = report(issues, options.profile || KINDY_DOCX_PROFILE)
      try {
        throwIfStrict(compatibility, options.mode || 'best-effort')
        resolve({ state: typeof DOMParser === 'undefined' ? htmlToDocumentState(event.data.html) : ooxmlToDocumentState(event.data.parts), report: compatibility, messages })
      } catch (error) { reject(error) }
    }
    file.arrayBuffer().then((buffer) => worker.postMessage({ id, buffer, limits: options.limits }, [buffer])).catch(reject)
  })
}

function unsupportedStateIssues(
  node: JSONContent,
  path = 'content',
  profile: CompatibilityReport['profile'] = KINDY_DOCX_PROFILE,
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []
  const supportedNode = !node.type || supportedNodeTypes.has(node.type)
    || (profileRank(profile) >= 1 && node.type === 'sectionBreak')
  if (!supportedNode) {
    issues.push({ code: 'UNSUPPORTED_NODE', feature: node.type!, severity: 'warning', message: `Node “${node.type}” is outside the ${profile} profile.`, location: path })
  }
  if (node.type === 'image' || node.type === 'inlineImage') {
    const source = String(node.attrs?.src || '')
    const type = imageTypeFromSource(source)
    if (!source) {
      issues.push({
        code: 'IMAGE_SOURCE_MISSING', feature: 'image', severity: 'warning',
        message: 'The image has no source and cannot be written to DOCX.', location: path,
      })
    } else if (!type) {
      issues.push({
        code: 'IMAGE_FORMAT_UNVERIFIED', feature: 'image', severity: 'warning',
        message: 'The image format cannot be verified as PNG, JPEG, GIF or BMP for DOCX export.', location: path,
      })
    }
  }
  node.marks?.forEach((mark) => {
    const supportedMark = supportedMarkTypes.has(mark.type)
      || (profileRank(profile) >= 2 && (mark.type === 'trackChange' || mark.type === 'comment'))
    if (!supportedMark) {
      issues.push({ code: 'UNSUPPORTED_MARK', feature: mark.type, severity: 'warning', message: `Mark “${mark.type}” is outside the ${profile} profile.`, location: path })
    }
  })
  node.content?.forEach((child, index) => issues.push(...unsupportedStateIssues(child, `${path}.${index}`, profile)))
  return issues
}

const alignment = (value?: string) => ({
  left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED, both: AlignmentType.JUSTIFIED,
}[value || ''] as typeof AlignmentType[keyof typeof AlignmentType] | undefined)

function markValue(node: JSONContent, name: string) {
  return node.marks?.find((mark) => mark.type === name)
}

function normalizeColor(value?: string) {
  if (!value) return undefined
  const match = value.match(/^#?([0-9a-f]{6})$/i)
  return match?.[1]?.toUpperCase()
}

function fontSizeHalfPoints(value: unknown) {
  const match = String(value || '').match(/[\d.]+/)
  if (!match) return undefined
  const number = Number(match[0])
  return Number.isFinite(number) ? Math.round(number * 2) : undefined
}

type SerializableImageType = 'jpg' | 'png' | 'gif' | 'bmp'

function imageTypeFromSource(source: string): SerializableImageType | undefined {
  const dataType = source.match(/^data:image\/([^;,]+)/i)?.[1]?.toLowerCase().replace('jpeg', 'jpg')
  const pathType = (() => {
    try {
      return new URL(source, 'https://kindy.invalid').pathname.split('.').pop()?.toLowerCase().replace('jpeg', 'jpg')
    } catch {
      return undefined
    }
  })()
  const type = dataType || pathType
  return type === 'jpg' || type === 'png' || type === 'gif' || type === 'bmp' ? type : undefined
}

async function loadImage(source: string): Promise<{ type: SerializableImageType; data: Uint8Array }> {
  if (source.startsWith('data:')) {
    const [meta, payload] = source.split(',', 2)
    const type = imageTypeFromSource(source)
    if (!type) throw new Error('Image type is not supported by the DOCX serializer.')
    const binary = meta.includes(';base64') ? atob(payload) : decodeURIComponent(payload)
    return { type, data: Uint8Array.from(binary, (char) => char.charCodeAt(0)) }
  }
  const response = await fetch(source)
  if (!response.ok) throw new Error(`Image fetch failed (${response.status}).`)
  const mime = response.headers.get('content-type') || 'image/png'
  const type = imageTypeFromSource(`data:${mime},`)
  if (!type) throw new Error(`Image type ${mime} is not supported by the DOCX serializer.`)
  return { type, data: new Uint8Array(await response.arrayBuffer()) }
}

function numericRevisionId(value: unknown) {
  const source = String(value || '')
  const imported = source.match(/^comment-(\d+)$/)
  if (imported) return Number(imported[1])
  let hash = 0
  for (let index = 0; index < source.length; index += 1) hash = ((hash * 31) + source.charCodeAt(index)) >>> 0
  return (hash % 2_000_000_000) || 1
}

function collectCommentDefinitions(root: JSONContent) {
  const definitions: Array<{
    id: number
    author: string
    initials: string
    date: Date
    children: Paragraph[]
    parentId?: number
    resolved?: boolean
  }> = []
  const seen = new Set<number>()
  const visit = (node: JSONContent) => {
    for (const mark of node.marks || []) {
      if (mark.type !== 'comment') continue
      const id = numericRevisionId(mark.attrs?.id)
      if (seen.has(id)) continue
      seen.add(id)
      let thread: Record<string, any> = {}
      try { thread = JSON.parse(String(mark.attrs?.thread || '{}')) } catch { /* use mark attributes */ }
      const author = String(thread.user || mark.attrs?.user || 'Anonymous')
      definitions.push({
        id,
        author,
        initials: author.split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase(),
        date: new Date(Number(thread.createdAt) || Date.now()),
        children: [new Paragraph({ children: [new TextRun(String(thread.text || ''))] })],
        resolved: Boolean(thread.resolved),
      })
      for (const reply of Array.isArray(thread.replies) ? thread.replies : []) {
        const replyId = numericRevisionId(reply.id || `${mark.attrs?.id}-reply-${definitions.length}`)
        if (seen.has(replyId)) continue
        seen.add(replyId)
        const replyAuthor = String(reply.user || 'Anonymous')
        definitions.push({
          id: replyId,
          parentId: id,
          author: replyAuthor,
          initials: replyAuthor.split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase(),
          date: new Date(Number(reply.createdAt) || Date.now()),
          children: [new Paragraph({ children: [new TextRun(String(reply.text || ''))] })],
        })
      }
    }
    node.content?.forEach(visit)
  }
  visit(root)
  return definitions
}

async function inlineRuns(nodes: JSONContent[] = []): Promise<Array<TextRun | InsertedTextRun | DeletedTextRun | ImageRun | ExternalHyperlink | PageBreak | CommentRangeStart | CommentRangeEnd | CommentReference>> {
  const children: Array<TextRun | InsertedTextRun | DeletedTextRun | ImageRun | ExternalHyperlink | PageBreak | CommentRangeStart | CommentRangeEnd | CommentReference> = []
  let openCommentId: number | null = null
  const closeComment = () => {
    if (openCommentId === null) return
    children.push(new CommentRangeEnd(openCommentId), new CommentReference(openCommentId))
    openCommentId = null
  }
  for (const node of nodes) {
    const comment = markValue(node, 'comment')
    const commentId = comment ? numericRevisionId(comment.attrs?.id) : null
    if (commentId !== openCommentId) {
      closeComment()
      if (commentId !== null) {
        openCommentId = commentId
        children.push(new CommentRangeStart(commentId))
      }
    }
    if (node.type === 'hardBreak') {
      children.push(new TextRun({ break: 1 }))
      continue
    }
    if (node.type === 'docxTab') {
      children.push(new TextRun({ children: [new Tab()] }))
      continue
    }
    if (node.type === 'inlineImage' || node.type === 'image') {
      const src = String(node.attrs?.src || '')
      if (!src) continue
      try {
        const image = await loadImage(src)
        children.push(new ImageRun({
          data: image.data,
          type: image.type,
          transformation: { width: Number(node.attrs?.width) || 320, height: Number(node.attrs?.height) || 180 },
        }))
      } catch {
        children.push(new TextRun('[Unsupported image]'))
      }
      continue
    }
    if (node.type !== 'text') continue
    const textStyle = markValue(node, 'textStyle')?.attrs || {}
    const runOptions = {
      text: node.text || '',
      bold: Boolean(markValue(node, 'bold')),
      italics: Boolean(markValue(node, 'italic')),
      strike: Boolean(markValue(node, 'strike')),
      underline: markValue(node, 'underline') ? {} : undefined,
      subScript: Boolean(markValue(node, 'subscript')),
      superScript: Boolean(markValue(node, 'superscript')),
      font: String(textStyle.fontFamily || '') || undefined,
      size: fontSizeHalfPoints(textStyle.fontSize),
      color: normalizeColor(String(textStyle.color || '')),
      shading: normalizeColor(String(textStyle.backgroundColor || ''))
        ? { fill: normalizeColor(String(textStyle.backgroundColor || '')) }
        : undefined,
    }
    const tracked = markValue(node, 'trackChange')
    const revision = tracked ? {
      id: numericRevisionId(tracked.attrs?.id),
      author: String(tracked.attrs?.author || 'Unknown'),
      date: new Date(Number(tracked.attrs?.timestamp) || Date.now()).toISOString(),
    } : null
    const run = tracked?.attrs?.type === 'insert'
      ? new InsertedTextRun({ ...runOptions, ...revision! })
      : tracked?.attrs?.type === 'delete'
        ? new DeletedTextRun({ ...runOptions, ...revision! })
        : new TextRun(runOptions)
    const link = markValue(node, 'link')
    if (link?.attrs?.href) children.push(new ExternalHyperlink({ children: [run], link: String(link.attrs.href) }))
    else children.push(run)
  }
  closeComment()
  return children
}

async function nodeToChildren(node: JSONContent, list?: { kind: 'bullet' | 'number'; level: number }): Promise<Array<Paragraph | Table>> {
  if (node.type === 'pageBreak') return [new Paragraph({ children: [new PageBreak()] })]
  if (node.type === 'paragraph' || node.type === 'heading') {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1))
    const docxLayout = node.attrs?.docxLayout && typeof node.attrs.docxLayout === 'object'
      ? node.attrs.docxLayout as Record<string, any>
      : {}
    const margin = node.attrs?.margin && typeof node.attrs.margin === 'object'
      ? node.attrs.margin as Record<string, any>
      : {}
    const tabStopType = (value: string) => ({
      bar: TabStopType.BAR,
      center: TabStopType.CENTER,
      decimal: TabStopType.DECIMAL,
      end: TabStopType.END,
      left: TabStopType.LEFT,
      num: TabStopType.NUM,
      right: TabStopType.RIGHT,
      start: TabStopType.START,
    }[value] || TabStopType.LEFT)
    const leaderType = (value: string) => ({
      dot: LeaderType.DOT,
      hyphen: LeaderType.HYPHEN,
      middleDot: LeaderType.MIDDLE_DOT,
      underscore: LeaderType.UNDERSCORE,
    }[value])
    const lineHeight = node.attrs?.lineHeight
    const absoluteLineHeight = typeof lineHeight === 'string' && /px$/i.test(lineHeight)
      ? Math.round(Number.parseFloat(lineHeight) * 15)
      : undefined
    return [new Paragraph({
      children: await inlineRuns(node.content),
      heading: node.type === 'heading' ? HeadingLevel[`HEADING_${level}` as keyof typeof HeadingLevel] : undefined,
      alignment: alignment(String(node.attrs?.textAlign || node.attrs?.align || '')),
      indent: Object.keys(docxLayout).length
        ? {
            left: docxLayout.left ? centimetersToTwip(Number(docxLayout.left)) : undefined,
            right: docxLayout.right ? centimetersToTwip(Number(docxLayout.right)) : undefined,
            firstLine: docxLayout.firstLine ? centimetersToTwip(Number(docxLayout.firstLine)) : undefined,
            hanging: docxLayout.hanging ? centimetersToTwip(Number(docxLayout.hanging)) : undefined,
          }
        : node.attrs?.indent
          ? { left: centimetersToTwip(Number(node.attrs.indent)) }
          : undefined,
      spacing: node.attrs?.lineHeight || margin.top || margin.bottom
        ? {
            line: absoluteLineHeight || (Number.isFinite(Number(lineHeight)) ? Math.round(Number(lineHeight) * 240) : undefined),
            lineRule: absoluteLineHeight ? 'exact' : undefined,
            before: margin.top ? Math.round(Number(margin.top) * 15) : undefined,
            after: margin.bottom ? Math.round(Number(margin.bottom) * 15) : undefined,
          }
        : undefined,
      keepNext: Boolean(docxLayout.keepNext),
      keepLines: Boolean(docxLayout.keepLines),
      pageBreakBefore: Boolean(docxLayout.pageBreakBefore),
      tabStops: Array.isArray(docxLayout.tabStops)
        ? docxLayout.tabStops.map((stop: Record<string, any>) => ({
            type: tabStopType(String(stop.alignment || 'left')),
            position: centimetersToTwip(Number(stop.position) || 0),
            leader: leaderType(String(stop.leader || 'none')),
          }))
        : undefined,
      bullet: list?.kind === 'bullet' ? { level: list.level } : undefined,
      numbering: list?.kind === 'number' ? { reference: 'kindy-numbering', level: list.level } : undefined,
    })]
  }
  if (node.type === 'image' || node.type === 'inlineImage') {
    return [new Paragraph({ children: await inlineRuns([node]), alignment: AlignmentType.CENTER })]
  }
  if (node.type === 'blockquote') {
    return nodesToChildren(node.content || [])
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const output: Array<Paragraph | Table> = []
    const level = list ? Math.min(8, list.level + 1) : 0
    for (const item of node.content || []) {
      for (const child of item.content || []) {
        output.push(...await nodeToChildren(child, { kind: node.type === 'bulletList' ? 'bullet' : 'number', level }))
      }
    }
    return output
  }
  if (node.type === 'table') {
    const tableVerticalAlign = (value: unknown) => ({
      top: VerticalAlign.TOP,
      center: VerticalAlign.CENTER,
      bottom: VerticalAlign.BOTTOM,
    }[String(value || '').toLowerCase()] || VerticalAlign.CENTER)
    const rows: TableRow[] = []
    for (const row of node.content || []) {
      const cells: TableCell[] = []
      for (const cell of row.content || []) {
        cells.push(new TableCell({
          children: await nodesToChildren(cell.content || [{ type: 'paragraph' }]),
          columnSpan: Number(cell.attrs?.colspan) || 1,
          rowSpan: Number(cell.attrs?.rowspan) || 1,
          verticalAlign: tableVerticalAlign(cell.attrs?.verticalAlign),
          shading: normalizeColor(String(cell.attrs?.background || ''))
            ? { fill: normalizeColor(String(cell.attrs?.background || '')) }
            : undefined,
        }))
      }
      rows.push(new TableRow({ children: cells }))
    }
    return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })]
  }
  return nodesToChildren(node.content || [])
}

async function nodesToChildren(nodes: JSONContent[]): Promise<Array<Paragraph | Table>> {
  const output: Array<Paragraph | Table> = []
  for (const node of nodes) output.push(...await nodeToChildren(node))
  return output
}

async function headerFooter(
  value: KindyHeaderFooterState | undefined,
  type: 'header' | 'footer',
  variant: 'default' | 'first' | 'even' = 'default',
) {
  if (!value?.enabled) return undefined
  const content = variant === 'first' ? value.firstContent : variant === 'even' ? value.evenContent : value.content
  const text = variant === 'first' ? value.firstText : variant === 'even' ? value.evenText : value.text
  if (variant !== 'default' && !content && !text) return undefined
  const children = content?.content
    ? await nodesToChildren(content.content)
    : [new Paragraph({
      children: [new TextRun(text || ''), ...(type === 'footer' ? [new TextRun({ children: [PageNumber.CURRENT] })] : [])],
      alignment: AlignmentType.CENTER,
    })]
  return type === 'header' ? new Header({ children }) : new Footer({ children })
}

function splitDocumentSections(nodes: JSONContent[] = []) {
  const chunks: JSONContent[][] = [[]]
  const breaks: string[] = []
  for (const node of nodes) {
    if (node.type === 'sectionBreak') {
      breaks.push(String(node.attrs?.type || 'nextPage'))
      chunks.push([])
    } else {
      chunks.at(-1)!.push(node)
    }
  }
  return { chunks, breaks }
}

const sectionType = (value?: string) => ({
  continuous: SectionType.CONTINUOUS,
  evenPage: SectionType.EVEN_PAGE,
  oddPage: SectionType.ODD_PAGE,
  nextColumn: SectionType.NEXT_COLUMN,
  nextPage: SectionType.NEXT_PAGE,
}[value || 'nextPage'] || SectionType.NEXT_PAGE)

export async function exportDocx(state: KindyDocumentState, options: DocxCodecOptions = {}): Promise<DocxExportResult> {
  const profile = options.profile || KINDY_DOCX_PROFILE
  const compatibility = report(unsupportedStateIssues(state.content, 'content', profile), profile)
  throwIfStrict(compatibility, options.mode)
  try {
    const { page } = state
    const split = splitDocumentSections(state.content.content || [])
    const configuredSections = page.sections?.length ? page.sections : [{
      id: 'section-1', size: page.size, orientation: page.orientation, margin: page.margin,
      header: page.header, footer: page.footer,
    }]
    const sections = await Promise.all(split.chunks.map(async (children, index) => {
      const configured = configuredSections[index] || configuredSections.at(-1)!
      return {
        properties: {
          page: {
            size: {
              width: centimetersToTwip(configured.size.width),
              height: centimetersToTwip(configured.size.height),
              orientation: configured.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: centimetersToTwip(configured.margin.top), right: centimetersToTwip(configured.margin.right),
              bottom: centimetersToTwip(configured.margin.bottom), left: centimetersToTwip(configured.margin.left),
            },
            pageNumbers: configured.pageNumberStart ? { start: configured.pageNumberStart } : undefined,
          },
          titlePage: Boolean(configured.header?.differentFirstPage || configured.footer?.differentFirstPage),
          type: index > 0 ? sectionType(split.breaks[index - 1]) : undefined,
        },
        headers: {
          default: await headerFooter(configured.header, 'header'),
          first: await headerFooter(configured.header, 'header', 'first'),
          even: await headerFooter(configured.header, 'header', 'even'),
        },
        footers: {
          default: await headerFooter(configured.footer, 'footer'),
          first: await headerFooter(configured.footer, 'footer', 'first'),
          even: await headerFooter(configured.footer, 'footer', 'even'),
        },
        children: await nodesToChildren(children.length ? children : [{ type: 'paragraph' }]),
      }
    }))
    const doc = new DocxDocument({
      comments: { children: collectCommentDefinitions(state.content) },
      features: { trackRevisions: JSON.stringify(state.content).includes('"trackChange"') },
      numbering: {
        config: [{ reference: 'kindy-numbering', levels: Array.from({ length: 9 }, (_, level) => ({ level, format: 'decimal', text: `%${level + 1}.`, alignment: AlignmentType.START })) }],
      },
      evenAndOddHeaderAndFooters: configuredSections.some((section) => section.header?.differentOddEven || section.footer?.differentOddEven),
      sections,
    })
    const blob = await Packer.toBlob(doc)
    return { blob: new Blob([blob], { type: DOCX_MIME }), report: compatibility }
  } catch (cause) {
    throw new DocumentLibraryError('EXPORT_FAILED', 'DOCX serialization failed.', { cause, details: compatibility })
  }
}

export const createDocxCodec = () => ({ import: importDocx, export: exportDocx, inspect: inspectDocx })
