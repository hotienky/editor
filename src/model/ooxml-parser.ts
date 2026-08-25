/**
 * OOXML Parser
 *
 * Parses DOCX files directly into OoxmlPackage without conversion loss.
 * Based on ECMA-376 standard.
 *
 * Key differences from old parser (src/codecs/docx.ts):
 * - Outputs OoxmlPackage (not ProseMirror JSON)
 * - Preserves all OOXML properties (styles, numbering, sections)
 * - Supports nested tables
 * - Preserves numbering lvlText patterns
 */

import * as fflate from 'fflate'
import type {
  OoxmlPackage,
  DocumentPart,
  Body,
  BlockElement,
  Paragraph,
  ParagraphProperties,
  Run,
  RunProperties,
  RunFonts,
  Text,
  Break,
  Tab,
  Drawing,
  InlineDrawing,
  AnchorDrawing,
  BlipFill,
  Table,
  TableProperties,
  TableWidth,
  TableBorders,
  TableLook,
  GridColumn,
  TableRow,
  TableRowProperties,
  TableRowHeight,
  TableCell,
  TableCellProperties,
  TableCellBorders,
  Hyperlink,
  SdtBlock,
  SdtInline,
  AltChunk,
  SmartTag,
  CustomXml,
  StylesPart,
  StyleDefinition,
  StyleType,
  DocDefaults,
  NumberingPart,
  AbstractNumbering,
  NumberingLevel,
  NumberingInstance,
  LevelOverride,
  SettingsPart,
  FontTablePart,
  ThemePart,
  ThemeElements,
  FontScheme,
  FontGroup,
  FontFace,
  ColorScheme,
  HeaderPart,
  FooterPart,
  CommentsPart,
  CommentThread,
  CommentItem,
  ContentTypes,
  Relationship,
  MediaPart,
  SectionProperties,
  PageSize,
  PageMargins,
  Columns,
  HeaderFooterReference,
  PageNumberType,
  NumberingProperties,
  TabStop,
  TabStopType,
  TabLeader,
  Spacing,
  Indentation,
  ParagraphBorders,
  Justification,
  Border,
  Shading,
  CellMargins,
  RevisionMark,
} from './ooxml-types'

// ─── XML Helpers ────────────────────────────────────────────────────────────

function xmlElements(node: Element | Document, localName: string, direct = false): Element[] {
  if (direct) {
    return Array.from(node.children).filter((el) => {
      const ln = el.localName || el.tagName.split(':').pop()
      return ln === localName
    })
  }
  return Array.from(node.getElementsByTagName('*')).filter((el) => {
    const ln = el.localName || el.tagName.split(':').pop()
    return ln === localName
  })
}

function xmlFirst(node: Element | Document, localName: string): Element | undefined {
  return xmlElements(node, localName)[0]
}

function xmlValue(element?: Element): string | undefined {
  if (!element) return undefined
  return element.getAttribute('w:val')
    || element.getAttribute('val')
    || element.getAttribute('r:id')
    || element.getAttribute('id')
    || undefined
}

function wordAttr(element: Element | undefined | null, name: string): string | undefined {
  if (!element) return undefined
  return element.getAttribute(`w:${name}`)
    || element.getAttribute(name)
    || undefined
}

function wordInt(element: Element | undefined | null, name: string): number | undefined {
  const val = wordAttr(element, name)
  if (val === undefined) return undefined
  const n = Number(val)
  return Number.isFinite(n) ? n : undefined
}

function wordBoolean(element: Element | undefined | null): boolean | undefined {
  if (!element) return undefined
  const val = wordAttr(element, 'val')
  if (val === undefined) return true
  const lower = val.toLowerCase()
  return lower !== '0' && lower !== 'false' && lower !== 'off' && lower !== 'no'
}

// ─── Main Parser ────────────────────────────────────────────────────────────

export class OoxmlParser {
  private _parts: ParsedParts = {
    media: new Map(),
    related: new Map(),
    relatedRels: new Map(),
  }

  /**
   * Parse a DOCX buffer into an OoxmlPackage.
   */
  async parse(buffer: Uint8Array): Promise<OoxmlPackage> {
    // 1. Unzip
    const data = new Uint8Array(buffer)
    const unzipped = fflate.unzipSync(data)

    // 2. Extract parts
    this._extractParts(unzipped)

    // 3. Parse content types
    const contentTypes = this._parseContentTypes(unzipped['[Content_Types].xml'])

    // 4. Parse relationships
    const relationships = this._parseRelationships(unzipped['_rels/.rels'])

    // 5. Parse main parts
    const document = this._parseDocument(unzipped['word/document.xml'])
    const styles = this._parseStyles(unzipped['word/styles.xml'])
    const numbering = this._parseNumbering(unzipped['word/numbering.xml'])
    const settings = this._parseSettings(unzipped['word/settings.xml'])
    const fontTable = this._parseFontTable(unzipped['word/fontTable.xml'])
    const theme = this._parseTheme(unzipped['word/theme/theme1.xml'])

    // 6. Parse sub-documents
    const headers = this._parseHeaders(unzipped)
    const footers = this._parseFooters(unzipped)
    const comments = this._parseComments(unzipped['word/comments.xml'])

    return {
      document,
      styles,
      numbering,
      settings,
      fontTable,
      theme,
      headers,
      footers,
      comments,
      footnotes: null,
      endnotes: null,
      contentTypes,
      relationships,
      media: this._parts.media,
    }
  }

  // ─── Part Extraction ────────────────────────────────────────────────────

  private _extractParts(unzipped: Record<string, Uint8Array>): void {
    // Extract media files
    for (const [path, data] of Object.entries(unzipped)) {
      if (path.startsWith('word/media/')) {
        const name = path.split('/').pop() || path
        const ext = name.split('.').pop()?.toLowerCase() || ''
        const mime = EXTENSION_TO_MIME[ext] || 'application/octet-stream'
        this._parts.media.set(name, { contentType: mime, data })
      }
    }

    // Extract header/footer relationships
    const relsPattern = /word\/_rels\/(header|footer)\d+\.xml\.rels/
    for (const [path, data] of Object.entries(unzipped)) {
      const match = path.match(relsPattern)
      if (match) {
        const name = path.replace('_rels/', '').replace('.rels', '')
        this._parts.relatedRels.set(name, this._parseRelsXml(data))
      }
    }

    // Extract header/footer content
    const hfPattern = /word\/(header|footer)\d+\.xml/
    for (const [path, data] of Object.entries(unzipped)) {
      if (hfPattern.test(path)) {
        const name = path.split('/').pop() || path
        this._parts.related.set(name, data)
      }
    }
  }

  // ─── Content Types ──────────────────────────────────────────────────────

  private _parseContentTypes(data: Uint8Array | undefined): ContentTypes {
    const defaults = new Map<string, string>()
    const overrides = new Map<string, string>()

    if (!data) return { defaults, overrides }

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return { defaults, overrides }

    for (const el of xmlElements(doc, 'Default')) {
      const ext = el.getAttribute('Extension')
      const ct = el.getAttribute('ContentType')
      if (ext && ct) defaults.set(ext.toLowerCase(), ct)
    }

    for (const el of xmlElements(doc, 'Override')) {
      const pn = el.getAttribute('PartName')
      const ct = el.getAttribute('ContentType')
      if (pn && ct) overrides.set(pn, ct)
    }

    return { defaults, overrides }
  }

  // ─── Relationships ──────────────────────────────────────────────────────

  private _parseRelationships(data: Uint8Array | undefined): Relationship[] {
    if (!data) return []
    return this._parseRelsXml(data)
  }

  private _parseRelsXml(data: Uint8Array): Relationship[] {
    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return []

    const rels: Relationship[] = []
    for (const el of xmlElements(doc, 'Relationship')) {
      const id = el.getAttribute('Id')
      const type = el.getAttribute('Type')
      const target = el.getAttribute('Target')
      const targetMode = el.getAttribute('TargetMode') as 'External' | 'Internal' | undefined
      if (id && type && target) {
        rels.push({ id, type, target, targetMode: targetMode || undefined })
      }
    }
    return rels
  }

  // ─── Document Part ──────────────────────────────────────────────────────

  private _parseDocument(data: Uint8Array | undefined): DocumentPart {
    const empty: DocumentPart = { body: { children: [] } }
    if (!data) return empty

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return empty

    const body = xmlFirst(doc, 'body')
    if (!body) return empty

    const children: BlockElement[] = []
    for (const child of Array.from(body.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'p') {
        children.push(this._parseParagraph(child))
      } else if (ln === 'tbl') {
        children.push(this._parseTable(child))
      } else if (ln === 'sdt') {
        children.push(this._parseSdtBlock(child))
      } else if (ln === 'altChunk') {
        children.push(this._parseAltChunk(child))
      }
    }

    // Parse body-level sectPr (last child of w:body)
    const bodySectPr = xmlFirst(body, 'sectPr')

    return { body: { children, sectPr: bodySectPr ? this._parseSectionProperties(bodySectPr) : undefined } }
  }

  // ─── Paragraph ──────────────────────────────────────────────────────────

  private _parseParagraph(el: Element): Paragraph {
    const pPr = this._parseParagraphProperties(xmlFirst(el, 'pPr'))
    const content: Paragraph['content'] = []

    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'pPr') continue // already handled
      if (ln === 'r') {
        content.push(this._parseRun(child))
      } else if (ln === 'hyperlink') {
        content.push(this._parseHyperlink(child))
      } else if (ln === 'sdt') {
        content.push(this._parseSdtInline(child))
      } else if (ln === 'smartTag') {
        content.push(this._parseSmartTag(child))
      } else if (ln === 'customXml') {
        content.push(this._parseCustomXml(child))
      }
    }

    return { type: 'paragraph', pPr, content, _raw: el }
  }

  private _parseParagraphProperties(el: Element | undefined): ParagraphProperties | undefined {
    if (!el) return undefined

    const pPr: ParagraphProperties = {}

    // Style reference
    const pStyle = xmlFirst(el, 'pStyle')
    if (pStyle) pPr.pStyle = wordAttr(pStyle, 'val')

    // Keep properties
    if (xmlFirst(el, 'keepNext')) pPr.keepNext = wordBoolean(xmlFirst(el, 'keepNext'))
    if (xmlFirst(el, 'keepLines')) pPr.keepLines = wordBoolean(xmlFirst(el, 'keepLines'))
    if (xmlFirst(el, 'pageBreakBefore')) pPr.pageBreakBefore = wordBoolean(xmlFirst(el, 'pageBreakBefore'))
    if (xmlFirst(el, 'widowControl')) pPr.widowControl = wordBoolean(xmlFirst(el, 'widowControl'))

    // Numbering
    const numPr = xmlFirst(el, 'numPr')
    if (numPr) {
      const ilvl = xmlFirst(numPr, 'ilvl')
      const numId = xmlFirst(numPr, 'numId')
      pPr.numPr = {
        ilvl: wordInt(ilvl, 'val') ?? 0,
        numId: wordInt(numId, 'val') ?? 0,
      }
    }

    // Spacing
    const spacing = xmlFirst(el, 'spacing')
    if (spacing) {
      pPr.spacing = {
        before: wordInt(spacing, 'before'),
        after: wordInt(spacing, 'after'),
        line: wordInt(spacing, 'line'),
        lineRule: wordAttr(spacing, 'lineRule') as Spacing['lineRule'],
      }
    }

    // Indentation
    const ind = xmlFirst(el, 'ind')
    if (ind) {
      pPr.ind = {
        left: wordInt(ind, 'left') ?? wordInt(ind, 'start'),
        right: wordInt(ind, 'right') ?? wordInt(ind, 'end'),
        firstLine: wordInt(ind, 'firstLine'),
        hanging: wordInt(ind, 'hanging'),
      }
    }

    // Justification
    const jc = xmlFirst(el, 'jc')
    if (jc) pPr.jc = wordAttr(jc, 'val') as Justification

    // Tab stops
    const tabs = xmlElements(el, 'tabs')
    if (tabs.length > 0) {
      pPr.tabs = []
      for (const tabEl of xmlElements(el, 'tab')) {
        pPr.tabs.push({
          val: (wordAttr(tabEl, 'val') || 'left') as TabStopType,
          pos: wordInt(tabEl, 'pos') ?? 0,
          leader: wordAttr(tabEl, 'leader') as TabLeader | undefined,
        })
      }
    }

    // Outline level
    const outlineLvl = xmlFirst(el, 'outlineLvl')
    if (outlineLvl) pPr.outlineLevel = wordInt(outlineLvl, 'val')

    // Section break (embedded in paragraph)
    const sectPr = xmlFirst(el, 'sectPr')
    if (sectPr) pPr.sectPr = this._parseSectionProperties(sectPr)

    // Paragraph borders
    const pBdr = xmlFirst(el, 'pBdr')
    if (pBdr) pPr.pBdr = this._parseParagraphBorders(pBdr)

    // Shading
    const shd = xmlFirst(el, 'shd')
    if (shd) pPr.shd = this._parseShading(shd)

    // Run properties (default for paragraph)
    const rPr = xmlFirst(el, 'rPr')
    if (rPr) pPr.rPr = this._parseRunProperties(rPr)

    return pPr
  }

  // ─── Run ────────────────────────────────────────────────────────────────

  private _parseRun(el: Element): Run {
    const rPr = this._parseRunProperties(xmlFirst(el, 'rPr'))
    const content: Run['content'] = []

    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'rPr') continue

      if (ln === 't') {
        content.push({
          type: 'text',
          text: child.textContent || '',
          space: child.getAttribute('xml:space') as 'preserve' | 'default' || undefined,
        })
      } else if (ln === 'delText') {
        // Deleted text in track changes
        content.push({
          type: 'text',
          text: child.textContent || '',
          space: child.getAttribute('xml:space') as 'preserve' | 'default' || undefined,
        })
      } else if (ln === 'br') {
        const breakType = wordAttr(child, 'type') as Break['breakType'] || 'line'
        content.push({ type: 'break', breakType })
      } else if (ln === 'tab') {
        content.push({ type: 'tab' })
      } else if (ln === 'sym') {
        content.push({
          type: 'symbol',
          font: wordAttr(child, 'font'),
          char: wordAttr(child, 'char'),
        })
      } else if (ln === 'drawing') {
        const drawing = this._parseDrawing(child)
        if (drawing) content.push(drawing)
      } else if (ln === 'pict') {
        // Legacy VML picture
        content.push({ type: 'picture', content: Array.from(child.children) })
      }
    }

    return { type: 'run', rPr, content, _raw: el }
  }

  private _parseRunProperties(el: Element | undefined): RunProperties | undefined {
    if (!el) return undefined

    const rPr: RunProperties = {}

    // Style reference
    const rStyle = xmlFirst(el, 'rStyle')
    if (rStyle) rPr.rStyle = wordAttr(rStyle, 'val')

    // Fonts
    const rFonts = xmlFirst(el, 'rFonts')
    if (rFonts) {
      rPr.rFonts = {
        ascii: wordAttr(rFonts, 'ascii'),
        hAnsi: wordAttr(rFonts, 'hAnsi'),
        eastAsia: wordAttr(rFonts, 'eastAsia'),
        cs: wordAttr(rFonts, 'cs'),
        hint: wordAttr(rFonts, 'hint') as RunFonts['hint'],
      }
    }

    // Boolean properties
    if (xmlFirst(el, 'b')) rPr.b = wordBoolean(xmlFirst(el, 'b'))
    if (xmlFirst(el, 'bCs')) rPr.bCs = wordBoolean(xmlFirst(el, 'bCs'))
    if (xmlFirst(el, 'i')) rPr.i = wordBoolean(xmlFirst(el, 'i'))
    if (xmlFirst(el, 'iCs')) rPr.iCs = wordBoolean(xmlFirst(el, 'iCs'))
    if (xmlFirst(el, 'caps')) rPr.caps = wordBoolean(xmlFirst(el, 'caps'))
    if (xmlFirst(el, 'smallCaps')) rPr.smallCaps = wordBoolean(xmlFirst(el, 'smallCaps'))
    if (xmlFirst(el, 'strike')) rPr.strike = wordBoolean(xmlFirst(el, 'strike'))
    if (xmlFirst(el, 'dstrike')) rPr.dstrike = wordBoolean(xmlFirst(el, 'dstrike'))
    if (xmlFirst(el, 'outline')) rPr.outline = wordBoolean(xmlFirst(el, 'outline'))
    if (xmlFirst(el, 'shadow')) rPr.shadow = wordBoolean(xmlFirst(el, 'shadow'))
    if (xmlFirst(el, 'emboss')) rPr.emboss = wordBoolean(xmlFirst(el, 'emboss'))
    if (xmlFirst(el, 'imprint')) rPr.imprint = wordBoolean(xmlFirst(el, 'imprint'))

    // Font size
    const sz = xmlFirst(el, 'sz')
    if (sz) rPr.sz = wordInt(sz, 'val')
    const szCs = xmlFirst(el, 'szCs')
    if (szCs) rPr.szCs = wordInt(szCs, 'val')

    // Color
    const color = xmlFirst(el, 'color')
    if (color) {
      const val = wordAttr(color, 'val')
      rPr.color = val && val !== 'auto' ? val : undefined
    }

    // Highlight
    const highlight = xmlFirst(el, 'highlight')
    if (highlight) rPr.highlight = wordAttr(highlight, 'val')

    // Underline
    const u = xmlFirst(el, 'u')
    if (u) rPr.u = wordAttr(u, 'val')

    // Vertical align (subscript/superscript)
    const vertAlign = xmlFirst(el, 'vertAlign')
    if (vertAlign) rPr.vertAlign = wordAttr(vertAlign, 'val') as RunProperties['vertAlign']

    // Spacing
    const spacing = xmlFirst(el, 'spacing')
    if (spacing) rPr.spacing = wordInt(spacing, 'val')

    // Kern
    const kern = xmlFirst(el, 'kern')
    if (kern) rPr.kern = wordInt(kern, 'val')

    // Shading
    const shd = xmlFirst(el, 'shd')
    if (shd) rPr.shd = this._parseShading(shd)

    // Language
    const lang = xmlFirst(el, 'lang')
    if (lang) rPr.lang = wordAttr(lang, 'val')

    return rPr
  }

  // ─── Drawing ────────────────────────────────────────────────────────────

  private _parseDrawing(el: Element): Drawing | null {
    const inline = xmlFirst(el, 'inline')
    if (inline) return { type: 'drawing', inline: this._parseInlineDrawing(inline) }

    const anchor = xmlFirst(el, 'anchor')
    if (anchor) return { type: 'drawing', anchor: this._parseAnchorDrawing(anchor) }

    return null
  }

  private _parseInlineDrawing(el: Element): InlineDrawing {
    const extent = xmlFirst(el, 'extent')
    const cx = Number(extent?.getAttribute('cx') || 0)
    const cy = Number(extent?.getAttribute('cy') || 0)

    let blip: BlipFill | undefined
    const blipEl = xmlFirst(xmlFirst(el, 'graphic') || el, 'blip')
    if (blipEl) {
      blip = { rId: blipEl.getAttribute('r:embed') || undefined }
    }

    const docPr = xmlFirst(el, 'docPr')

    return {
      extent: { cx, cy },
      blip,
      docPr: docPr ? {
        id: Number(docPr.getAttribute('id') || 0),
        name: docPr.getAttribute('name') || undefined,
        descr: docPr.getAttribute('descr') || undefined,
      } : undefined,
    }
  }

  private _parseAnchorDrawing(el: Element): AnchorDrawing {
    const extent = xmlFirst(el, 'extent')
    const cx = Number(extent?.getAttribute('cx') || 0)
    const cy = Number(extent?.getAttribute('cy') || 0)

    let blip: BlipFill | undefined
    const blipEl = xmlFirst(xmlFirst(el, 'graphic') || el, 'blip')
    if (blipEl) {
      blip = { rId: blipEl.getAttribute('r:embed') || undefined }
    }

    // Position H
    const posH = xmlFirst(el, 'positionH')
    const positionH = posH ? {
      relativeFrom: posH.getAttribute('relativeFrom') || 'column',
      align: xmlFirst(posH, 'align')?.textContent || undefined,
      offset: wordInt(xmlFirst(posH, 'offset'), 'val'),
    } : { relativeFrom: 'column' }

    // Position V
    const posV = xmlFirst(el, 'positionV')
    const positionV = posV ? {
      relativeFrom: posV.getAttribute('relativeFrom') || 'paragraph',
      align: xmlFirst(posV, 'align')?.textContent || undefined,
      offset: wordInt(xmlFirst(posV, 'offset'), 'val'),
    } : { relativeFrom: 'paragraph' }

    // Wrap
    const wrapNone = xmlFirst(el, 'wrapNone')
    const wrapSquare = xmlFirst(el, 'wrapSquare')
    const wrapTight = xmlFirst(el, 'wrapTight')
    let wrap: AnchorDrawing['wrap'] = 'none'
    if (wrapSquare) wrap = 'square'
    else if (wrapTight) wrap = 'tight'

    const docPr = xmlFirst(el, 'docPr')

    return {
      extent: { cx, cy },
      blip,
      positionH,
      positionV,
      wrap,
      docPr: docPr ? {
        id: Number(docPr.getAttribute('id') || 0),
        name: docPr.getAttribute('name') || undefined,
        descr: docPr.getAttribute('descr') || undefined,
      } : undefined,
    }
  }

  // ─── Hyperlink ──────────────────────────────────────────────────────────

  private _parseHyperlink(el: Element): Hyperlink {
    const content: Hyperlink['content'] = []
    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'r') content.push(this._parseRun(child))
      else if (ln === 'sdt') content.push(this._parseSdtInline(child))
    }

    return {
      type: 'hyperlink',
      rId: el.getAttribute('r:id') || undefined,
      history: el.getAttribute('w:history') ? wordBoolean(el) : undefined,
      tooltip: el.getAttribute('w:tooltip') || undefined,
      anchor: el.getAttribute('w:anchor') || undefined,
      content,
    }
  }

  // ─── Table ──────────────────────────────────────────────────────────────

  private _parseTable(el: Element): Table {
    const tblPr = this._parseTableProperties(xmlFirst(el, 'tblPr'))

    // Grid columns
    const tblGrid = xmlFirst(el, 'tblGrid')
    const gridCols: GridColumn[] = tblGrid
      ? xmlElements(tblGrid, 'gridCol').map((col) => ({
          width: wordInt(col, 'w'),
        }))
      : []

    // Rows
    const content: TableRow[] = []
    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'tr') {
        content.push(this._parseTableRow(child))
      }
    }

    return { type: 'table', tblPr, tblGrid: gridCols, content, _raw: el }
  }

  private _parseTableProperties(el: Element | undefined): TableProperties | undefined {
    if (!el) return undefined

    const tblPr: TableProperties = {}

    // Style
    const tblStyle = xmlFirst(el, 'tblStyle')
    if (tblStyle) tblPr.tblStyle = wordAttr(tblStyle, 'val')

    // Table width
    const tblW = xmlFirst(el, 'tblW')
    if (tblW) {
      tblPr.tblW = {
        w: wordInt(tblW, 'w') ?? 0,
        type: (wordAttr(tblW, 'type') || 'dxa') as TableWidth['type'],
      }
    }

    // Indent
    const tblInd = xmlFirst(el, 'tblInd')
    if (tblInd) tblPr.tblInd = wordInt(tblInd, 'w')

    // Borders
    const tblBorders = xmlFirst(el, 'tblBorders')
    if (tblBorders) tblPr.tblBorders = this._parseTableBorders(tblBorders)

    // Justification
    const jc = xmlFirst(el, 'jc')
    if (jc) tblPr.jc = wordAttr(jc, 'val') as Justification

    // Layout
    const tblLayout = xmlFirst(el, 'tblLayout')
    if (tblLayout) tblPr.tblLayout = wordAttr(tblLayout, 'type') as TableProperties['tblLayout']

    // Table look
    const tblLook = xmlFirst(el, 'tblLook')
    if (tblLook) {
      tblPr.tblLook = {
        firstRow: wordBoolean(xmlFirst(tblLook, 'firstRow')),
        lastRow: wordBoolean(xmlFirst(tblLook, 'lastRow')),
        firstColumn: wordBoolean(xmlFirst(tblLook, 'firstColumn')),
        lastColumn: wordBoolean(xmlFirst(tblLook, 'lastColumn')),
        noHBand: wordBoolean(xmlFirst(tblLook, 'noHBand')),
        noVBand: wordBoolean(xmlFirst(tblLook, 'noVBand')),
      }
    }

    return tblPr
  }

  private _parseTableBorders(el: Element): TableBorders {
    return {
      top: this._parseBorder(xmlFirst(el, 'top')),
      left: this._parseBorder(xmlFirst(el, 'left')),
      bottom: this._parseBorder(xmlFirst(el, 'bottom')),
      right: this._parseBorder(xmlFirst(el, 'right')),
      insideH: this._parseBorder(xmlFirst(el, 'insideH')),
      insideV: this._parseBorder(xmlFirst(el, 'insideV')),
    }
  }

  private _parseBorder(el: Element | undefined): Border | undefined {
    if (!el) return undefined
    return {
      val: wordAttr(el, 'val') || 'single',
      sz: wordInt(el, 'sz'),
      space: wordInt(el, 'space'),
      color: wordAttr(el, 'color'),
    }
  }

  private _parseTableRow(el: Element): TableRow {
    const trPr = this._parseTableRowProperties(xmlFirst(el, 'trPr'))
    const content: TableCell[] = []

    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'tc') {
        content.push(this._parseTableCell(child))
      }
    }

    return { trPr, content, _raw: el }
  }

  private _parseTableRowProperties(el: Element | undefined): TableRowProperties | undefined {
    if (!el) return undefined

    const trPr: TableRowProperties = {}

    if (xmlFirst(el, 'cantSplit')) trPr.cantSplit = wordBoolean(xmlFirst(el, 'cantSplit'))
    if (xmlFirst(el, 'tblHeader')) trPr.tblHeader = wordBoolean(xmlFirst(el, 'tblHeader'))

    const trHeight = xmlFirst(el, 'trHeight')
    if (trHeight) {
      trPr.trHeight = {
        val: wordInt(trHeight, 'val'),
        heightRule: wordAttr(trHeight, 'hRule') as TableRowHeight['heightRule'],
      }
    }

    return trPr
  }

  private _parseTableCell(el: Element): TableCell {
    const tcPr = this._parseTableCellProperties(xmlFirst(el, 'tcPr'))
    const content: TableCell['content'] = []

    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'tcPr') continue

      if (ln === 'p') {
        content.push(this._parseParagraph(child))
      } else if (ln === 'tbl') {
        // Nested tables — this is the key fix!
        content.push(this._parseTable(child))
      }
    }

    return { tcPr, content, _raw: el }
  }

  private _parseTableCellProperties(el: Element | undefined): TableCellProperties | undefined {
    if (!el) return undefined

    const tcPr: TableCellProperties = {}

    const tcW = xmlFirst(el, 'tcW')
    if (tcW) tcPr.tcW = wordInt(tcW, 'w')

    const gridSpan = xmlFirst(el, 'gridSpan')
    if (gridSpan) tcPr.gridSpan = wordInt(gridSpan, 'val')

    const vMerge = xmlFirst(el, 'vMerge')
    if (vMerge) {
      const val = wordAttr(vMerge, 'val')
      tcPr.vMerge = (!val || val === 'restart') ? 'restart' : 'continue'
    }

    const shd = xmlFirst(el, 'shd')
    if (shd) tcPr.shd = this._parseShading(shd)

    const vAlign = xmlFirst(el, 'vAlign')
    if (vAlign) tcPr.vAlign = wordAttr(vAlign, 'val') as TableCellProperties['vAlign']

    // Cell margins
    const tcMar = xmlFirst(el, 'tcMar')
    if (tcMar) {
      tcPr.tcMar = {
        top: wordInt(xmlFirst(tcMar, 'top'), 'w'),
        start: wordInt(xmlFirst(tcMar, 'start') || xmlFirst(tcMar, 'left'), 'w'),
        bottom: wordInt(xmlFirst(tcMar, 'bottom'), 'w'),
        end: wordInt(xmlFirst(tcMar, 'end') || xmlFirst(tcMar, 'right'), 'w'),
      }
    }

    // Cell borders
    const tcBorders = xmlFirst(el, 'tcBorders')
    if (tcBorders) {
      tcPr.tcBorders = {
        top: this._parseBorder(xmlFirst(tcBorders, 'top')),
        left: this._parseBorder(xmlFirst(tcBorders, 'left')),
        bottom: this._parseBorder(xmlFirst(tcBorders, 'bottom')),
        right: this._parseBorder(xmlFirst(tcBorders, 'right')),
      }
    }

    return tcPr
  }

  private _parseShading(el: Element): Shading {
    return {
      val: wordAttr(el, 'val') || 'clear',
      color: wordAttr(el, 'color'),
      fill: wordAttr(el, 'fill'),
    }
  }

  private _parseParagraphBorders(el: Element): ParagraphBorders {
    return {
      top: this._parseBorder(xmlFirst(el, 'top')),
      bottom: this._parseBorder(xmlFirst(el, 'bottom')),
      left: this._parseBorder(xmlFirst(el, 'left')),
      right: this._parseBorder(xmlFirst(el, 'right')),
      between: this._parseBorder(xmlFirst(el, 'between')),
      bar: this._parseBorder(xmlFirst(el, 'bar')),
    } as any
  }

  // ─── SDT (Structured Document Tags) ────────────────────────────────────

  private _parseSdtBlock(el: Element): SdtBlock {
    const sdtContent = xmlFirst(el, 'sdtContent')
    const children: BlockElement[] = []

    if (sdtContent) {
      for (const child of Array.from(sdtContent.children)) {
        const ln = child.localName || child.tagName.split(':').pop()
        if (ln === 'p') children.push(this._parseParagraph(child))
        else if (ln === 'tbl') children.push(this._parseTable(child))
      }
    }

    return { type: 'sdtBlock', sdtContent: children }
  }

  private _parseSdtInline(el: Element): SdtInline {
    const sdtContent = xmlFirst(el, 'sdtContent')
    const content: SdtInline['sdtContent'] = []

    if (sdtContent) {
      for (const child of Array.from(sdtContent.children)) {
        const ln = child.localName || child.tagName.split(':').pop()
        if (ln === 'r') content.push(this._parseRun(child))
        else if (ln === 'hyperlink') content.push(this._parseHyperlink(child))
      }
    }

    return { type: 'sdtInline', sdtContent: content }
  }

  private _parseAltChunk(el: Element): AltChunk {
    return { type: 'altChunk', rId: el.getAttribute('r:id') || undefined }
  }

  private _parseSmartTag(el: Element): SmartTag {
    const content: SmartTag['content'] = []
    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'r') content.push(this._parseRun(child))
      else if (ln === 'hyperlink') content.push(this._parseHyperlink(child))
    }
    return { type: 'smartTag', namespace: el.getAttribute('w:uri') || undefined, content }
  }

  private _parseCustomXml(el: Element): CustomXml {
    const content: BlockElement[] = []
    for (const child of Array.from(el.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'p') content.push(this._parseParagraph(child))
      else if (ln === 'tbl') content.push(this._parseTable(child))
    }
    return { type: 'customXml', namespace: el.getAttribute('w:uri') || undefined, content }
  }

  // ─── Section Properties ─────────────────────────────────────────────────

  private _parseSectionProperties(el: Element): SectionProperties {
    const sectPr: SectionProperties = {}

    const type = xmlFirst(el, 'type')
    if (type) sectPr.type = wordAttr(type, 'val') as SectionProperties['type']

    const pgSz = xmlFirst(el, 'pgSz')
    if (pgSz) {
      sectPr.pgSz = {
        w: wordInt(pgSz, 'w') ?? 0,
        h: wordInt(pgSz, 'h') ?? 0,
        orient: wordAttr(pgSz, 'orient') as PageSize['orient'],
      }
    }

    const pgMar = xmlFirst(el, 'pgMar')
    if (pgMar) {
      sectPr.pgMar = {
        top: wordInt(pgMar, 'top') ?? 0,
        right: wordInt(pgMar, 'right') ?? 0,
        bottom: wordInt(pgMar, 'bottom') ?? 0,
        left: wordInt(pgMar, 'left') ?? 0,
        header: wordInt(pgMar, 'header') ?? 0,
        footer: wordInt(pgMar, 'footer') ?? 0,
        gutter: wordInt(pgMar, 'gutter') ?? 0,
      }
    }

    const cols = xmlFirst(el, 'cols')
    if (cols) {
      sectPr.cols = {
        num: wordInt(cols, 'num'),
        space: wordInt(cols, 'space'),
        equalWidth: wordBoolean(xmlFirst(cols, 'equalWidth')),
      }
    }

    // Header/footer references
    const headerRefs = xmlElements(el, 'headerReference')
    const footerRefs = xmlElements(el, 'footerReference')
    if (headerRefs.length > 0 || footerRefs.length > 0) {
      sectPr.headerReference = headerRefs.map((ref) => ({
        type: (wordAttr(ref, 'type') || 'default') as HeaderFooterReference['type'],
        rId: ref.getAttribute('r:id') || '',
      }))
      sectPr.footerReference = footerRefs.map((ref) => ({
        type: (wordAttr(ref, 'type') || 'default') as HeaderFooterReference['type'],
        rId: ref.getAttribute('r:id') || '',
      }))
    }

    if (xmlFirst(el, 'titlePg')) sectPr.titlePg = true
    if (xmlFirst(el, 'evenAndOddHeaders')) sectPr.evenAndOddHeaders = true

    const pgNumType = xmlFirst(el, 'pgNumType')
    if (pgNumType) {
      sectPr.pgNumType = {
        start: wordInt(pgNumType, 'start'),
        fmt: wordAttr(pgNumType, 'fmt'),
      }
    }

    return sectPr
  }

  // ─── Styles ─────────────────────────────────────────────────────────────

  private _parseStyles(data: Uint8Array | undefined): StylesPart {
    const empty: StylesPart = {
      docDefaults: {},
      styles: new Map(),
    }
    if (!data) return empty

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return empty

    // Parse docDefaults
    const docDefaults = xmlFirst(doc, 'docDefaults')
    let docDefaultsResult: DocDefaults = {}
    if (docDefaults) {
      const pPrDefault = xmlFirst(xmlFirst(docDefaults, 'pPrDefault') || docDefaults, 'pPr')
      const rPrDefault = xmlFirst(xmlFirst(docDefaults, 'rPrDefault') || docDefaults, 'rPr')
      docDefaultsResult = {
        pPrDefault: pPrDefault ? this._parseParagraphProperties(pPrDefault) : undefined,
        rPrDefault: rPrDefault ? this._parseRunProperties(rPrDefault) : undefined,
      }
    }

    // Parse styles
    const styles = new Map<string, StyleDefinition>()
    for (const styleEl of xmlElements(doc, 'style')) {
      const id = wordAttr(styleEl, 'styleId')
      if (!id) continue

      const type = wordAttr(styleEl, 'type') as StyleType || 'paragraph'
      const name = xmlFirst(styleEl, 'name') ? wordAttr(xmlFirst(styleEl, 'name'), 'val') : undefined
      const basedOn = xmlFirst(styleEl, 'basedOn') ? wordAttr(xmlFirst(styleEl, 'basedOn'), 'val') : undefined

      const styleDef: StyleDefinition = {
        id,
        type,
        name,
        basedOn,
      }

      // Parse properties based on type
      const pPr = xmlFirst(styleEl, 'pPr')
      if (pPr) styleDef.pPr = this._parseParagraphProperties(pPr)

      const rPr = xmlFirst(styleEl, 'rPr')
      if (rPr) styleDef.rPr = this._parseRunProperties(rPr)

      const tblPr = xmlFirst(styleEl, 'tblPr')
      if (tblPr) styleDef.tblPr = this._parseTableProperties(tblPr)

      styles.set(id, styleDef)
    }

    return { docDefaults: docDefaultsResult, styles }
  }

  // ─── Numbering ──────────────────────────────────────────────────────────

  private _parseNumbering(data: Uint8Array | undefined): NumberingPart {
    const empty: NumberingPart = {
      abstractNums: new Map(),
      nums: new Map(),
    }
    if (!data) return empty

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return empty

    // Parse abstract numbering
    const abstractNums = new Map<number, AbstractNumbering>()
    for (const el of xmlElements(doc, 'abstractNum')) {
      const abstractNumId = wordInt(el, 'abstractNumId') ?? 0
      const levels: NumberingLevel[] = []

      for (const lvlEl of xmlElements(el, 'lvl')) {
        const ilvl = wordInt(lvlEl, 'ilvl') ?? 0
        const level: NumberingLevel = {
          ilvl,
          start: wordInt(xmlFirst(lvlEl, 'start'), 'val'),
          numFmt: wordAttr(xmlFirst(lvlEl, 'numFmt'), 'val'),
          lvlText: wordAttr(xmlFirst(lvlEl, 'lvlText'), 'val'),
          lvlJc: wordAttr(xmlFirst(lvlEl, 'lvlJc'), 'val') as NumberingLevel['lvlJc'],
          isLgl: wordBoolean(xmlFirst(lvlEl, 'isLgl')),
          suff: wordAttr(xmlFirst(lvlEl, 'suff'), 'val') as NumberingLevel['suff'],
        }

        // Parse level paragraph properties
        const pPr = xmlFirst(lvlEl, 'pPr')
        if (pPr) level.pPr = this._parseParagraphProperties(pPr)

        // Parse level run properties
        const rPr = xmlFirst(lvlEl, 'rPr')
        if (rPr) level.rPr = this._parseRunProperties(rPr)

        levels.push(level)
      }

      abstractNums.set(abstractNumId, { abstractNumId, levels })
    }

    // Parse concrete numbering instances
    const nums = new Map<number, NumberingInstance>()
    for (const el of xmlElements(doc, 'num')) {
      const numId = wordInt(el, 'numId') ?? 0
      const abstractNumId = wordInt(xmlFirst(el, 'abstractNumId'), 'val') ?? 0
      const levelOverride: LevelOverride[] = []

      for (const overrideEl of xmlElements(el, 'lvlOverride')) {
        const ilvl = wordInt(overrideEl, 'ilvl') ?? 0
        const startOverride = wordInt(xmlFirst(overrideEl, 'startOverride'), 'val')
        levelOverride.push({ ilvl, startOverride })
      }

      nums.set(numId, { numId, abstractNumId, levelOverride })
    }

    return { abstractNums, nums }
  }

  // ─── Settings ───────────────────────────────────────────────────────────

  private _parseSettings(data: Uint8Array | undefined): SettingsPart {
    if (!data) return {}

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return {}

    const settings: SettingsPart = {}

    const defaultTabStop = xmlFirst(doc, 'defaultTabStop')
    if (defaultTabStop) settings.defaultTabStop = wordInt(defaultTabStop, 'val')

    if (xmlFirst(doc, 'evenAndOddHeaders')) settings.evenAndOddHeaders = true
    if (xmlFirst(doc, 'trackRevisions')) settings.trackRevisions = true

    const charSpacing = xmlFirst(doc, 'characterSpacingControl')
    if (charSpacing) settings.characterSpacingControl = wordAttr(charSpacing, 'val')

    return settings
  }

  // ─── Font Table ─────────────────────────────────────────────────────────

  private _parseFontTable(data: Uint8Array | undefined): FontTablePart {
    const fonts = new Map<string, FontTablePart['fonts'] extends Map<string, infer V> ? V : never>()
    if (!data) return { fonts }

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return { fonts }

    for (const el of xmlElements(doc, 'font')) {
      const name = el.getAttribute('name')
      if (name) {
        fonts.set(name, {
          name,
          panose: el.getAttribute('panose-1') || undefined,
        })
      }
    }

    return { fonts }
  }

  // ─── Theme ──────────────────────────────────────────────────────────────

  private _parseTheme(data: Uint8Array | undefined): ThemePart | null {
    if (!data) return null

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null

    const themeElements = xmlFirst(doc, 'themeElements')
    if (!themeElements) return null

    // Color scheme
    const clrScheme = xmlFirst(themeElements, 'clrScheme')
    const colorScheme: ColorScheme = clrScheme ? {
      name: clrScheme.getAttribute('name') || undefined,
      dark1: this._getSchemeColor(clrScheme, 'dk1'),
      light1: this._getSchemeColor(clrScheme, 'lt1'),
      dark2: this._getSchemeColor(clrScheme, 'dk2'),
      light2: this._getSchemeColor(clrScheme, 'lt2'),
      accent1: this._getSchemeColor(clrScheme, 'accent1'),
      accent2: this._getSchemeColor(clrScheme, 'accent2'),
      accent3: this._getSchemeColor(clrScheme, 'accent3'),
      accent4: this._getSchemeColor(clrScheme, 'accent4'),
      accent5: this._getSchemeColor(clrScheme, 'accent5'),
      accent6: this._getSchemeColor(clrScheme, 'accent6'),
      hyperlink: this._getSchemeColor(clrScheme, 'hyperlink'),
      followedHyperlink: this._getSchemeColor(clrScheme, 'folHlink'),
    } : { name: undefined }

    // Font scheme
    const fontScheme = xmlFirst(themeElements, 'fontScheme')
    const majorFont = this._parseFontGroup(xmlFirst(fontScheme || doc, 'majorFont'))
    const minorFont = this._parseFontGroup(xmlFirst(fontScheme || doc, 'minorFont'))

    const fontSchemeResult: FontScheme = {
      name: fontScheme?.getAttribute('name') || undefined,
      majorFont,
      minorFont,
    }

    return {
      themeElements: {
        clrScheme: colorScheme,
        fontScheme: fontSchemeResult,
        fmtScheme: { name: undefined },
      },
    }
  }

  private _getSchemeColor(clrScheme: Element, name: string): string | undefined {
    const el = xmlFirst(clrScheme, name)
    if (!el) return undefined
    const srgbClr = xmlFirst(el, 'srgbClr')
    if (srgbClr) return srgbClr.getAttribute('val') || undefined
    const sysClr = xmlFirst(el, 'sysClr')
    if (sysClr) return sysClr.getAttribute('lastClr') || undefined
    return undefined
  }

  private _parseFontGroup(el: Element | undefined): FontGroup {
    if (!el) return {}
    return {
      latin: this._parseFontFace(xmlFirst(el, 'latin')),
      eastAsia: this._parseFontFace(xmlFirst(el, 'ea')),
      cs: this._parseFontFace(xmlFirst(el, 'cs')),
    }
  }

  private _parseFontFace(el: Element | undefined): FontFace | undefined {
    if (!el) return undefined
    return {
      typeface: el.getAttribute('typeface') || '',
      panose: el.getAttribute('panose') || undefined,
    }
  }

  // ─── Headers/Footers ────────────────────────────────────────────────────

  private _parseHeaders(unzipped: Record<string, Uint8Array>): Map<string, HeaderPart> {
    const headers = new Map<string, HeaderPart>()
    const pattern = /word\/(header\d+\.xml)/

    for (const [path, data] of Object.entries(unzipped)) {
      const match = path.match(pattern)
      if (match) {
        const name = match[1]
        headers.set(name, this._parseRelatedPart(data))
      }
    }

    return headers
  }

  private _parseFooters(unzipped: Record<string, Uint8Array>): Map<string, FooterPart> {
    const footers = new Map<string, FooterPart>()
    const pattern = /word\/(footer\d+\.xml)/

    for (const [path, data] of Object.entries(unzipped)) {
      const match = path.match(pattern)
      if (match) {
        const name = match[1]
        footers.set(name, this._parseRelatedPart(data))
      }
    }

    return footers
  }

  private _parseRelatedPart(data: Uint8Array): HeaderPart | FooterPart {
    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return { content: [] }

    const content: (Paragraph | Table)[] = []
    const body = doc.documentElement // header/footer root is the content

    for (const child of Array.from(body.children)) {
      const ln = child.localName || child.tagName.split(':').pop()
      if (ln === 'p') content.push(this._parseParagraph(child))
      else if (ln === 'tbl') content.push(this._parseTable(child))
    }

    return { content }
  }

  // ─── Comments ───────────────────────────────────────────────────────────

  private _parseComments(data: Uint8Array | undefined): CommentsPart | null {
    if (!data) return null

    const xml = fflate.strFromU8(data)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null

    const comments: CommentThread[] = []
    for (const el of xmlElements(doc, 'comment')) {
      const id = el.getAttribute('w:id') || ''
      const author = el.getAttribute('w:author') || ''
      const date = el.getAttribute('w:date') || undefined

      const content: CommentItem[] = []
      for (const child of Array.from(el.children)) {
        const ln = child.localName || child.tagName.split(':').pop()
        if (ln === 'p') {
          const para = this._parseParagraph(child)
          const text = this._extractText(para)
          content.push({ id: `${id}-${content.length}`, text })
        }
      }

      comments.push({ id, author, date, content })
    }

    return { comments }
  }

  private _extractText(para: Paragraph): string {
    let text = ''
    for (const item of para.content) {
      if (item.type === 'run') {
        for (const runContent of item.content) {
          if (runContent.type === 'text') text += runContent.text
        }
      }
    }
    return text
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const EXTENSION_TO_MIME: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  'emf': 'image/x-emf',
  'wmf': 'image/x-wmf',
  'svg': 'image/svg+xml',
}

interface ParsedParts {
  media: Map<string, MediaPart>
  related: Map<string, Uint8Array>
  relatedRels: Map<string, Relationship[]>
}
