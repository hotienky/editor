/**
 * OOXML Serializer
 *
 * Serializes OoxmlPackage back to DOCX ZIP format.
 * Uses fflate for ZIP creation (already a dependency).
 */

import { zipSync, deflateSync } from 'fflate'
import type {
  OoxmlPackage,
  DocumentPart,
  StylesPart,
  NumberingPart,
  SettingsPart,
  FontTablePart,
  ThemePart,
  HeaderPart,
  FooterPart,
  CommentsPart,
  ContentTypes,
  Relationship,
  BlockElement,
  Paragraph,
  Run,
  Text,
  RunProperties,
  ParagraphProperties,
  Table,
  TableRow,
  TableCell,
  SectionProperties,
  PageSize,
  PageMargins,
  Hyperlink,
  SdtInline,
  SdtBlock,
  Drawing,
  Picture,
  Break,
  Tab,
  TrackedRun,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  DeletedText,
  BookmarkStart,
  BookmarkEnd,
  FieldChar,
  InstrText,
} from './ooxml-types'

// ─── XML Helpers ──────────────────────────────────────────────────────────────

function esc(s: string | undefined): string {
  if (s === undefined) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function indent(level: number): string {
  return '  '.repeat(level)
}

function xmlAttr(name: string, val: string | number | boolean | undefined): string {
  if (val === undefined || val === null) return ''
  return ` ${name}="${esc(String(val))}"`
}

function xmlElem(tag: string, attrs: Record<string, string | number | boolean | undefined>, content?: string): string {
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${esc(String(v))}"`)
    .join('')
  if (content === undefined) return `<${tag}${attrStr}/>`
  return `<${tag}${attrStr}>${content}</${tag}>`
}

// ─── OOXML Namespaces ─────────────────────────────────────────────────────────

const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
}

// ─── Serializer ───────────────────────────────────────────────────────────────

export class OoxmlSerializer {
  private _pkg: OoxmlPackage
  private _rels: Array<{ id: string; type: string; target: string }> = []
  private _relsCounter = 1
  private _headerRels: Map<string, Array<{ id: string; type: string; target: string }>> = new Map()
  private _footerRels: Map<string, Array<{ id: string; type: string; target: string }>> = new Map()

  constructor(pkg: OoxmlPackage) {
    this._pkg = pkg
  }

  /**
   * Serialize to DOCX Blob.
   */
  serialize(): Blob {
    const entries: Record<string, Uint8Array> = {}

    // 1. [Content_Types].xml
    entries['[Content_Types].xml'] = this._serializeContentTypes()

    // 2. _rels/.rels
    entries['_rels/.rels'] = this._serializePackageRels()

    // 3. word/document.xml
    entries['word/document.xml'] = this._serializeDocument()

    // 4. word/_rels/document.xml.rels
    entries['word/_rels/document.xml.rels'] = this._serializeDocumentRels()

    // 5. word/styles.xml
    entries['word/styles.xml'] = this._serializeStyles()

    // 6. word/numbering.xml
    if (this._pkg.numbering.abstractNums.size > 0 || this._pkg.numbering.nums.size > 0) {
      entries['word/numbering.xml'] = this._serializeNumbering()
    }

    // 7. word/settings.xml
    entries['word/settings.xml'] = this._serializeSettings()

    // 8. word/fontTable.xml
    entries['word/fontTable.xml'] = this._serializeFontTable()

    // 9. word/theme/theme1.xml
    if (this._pkg.theme) {
      entries['word/theme/theme1.xml'] = this._serializeTheme()
    }

    // 10. Headers
    for (const [id, header] of this._pkg.headers) {
      entries[`word/${id}`] = this._serializeHeader(id, header)
      entries[`word/_rels/${id}.rels`] = this._serializeSubRels(id, 'header', this._headerRels.get(id) ?? [])
    }

    // 11. Footers
    for (const [id, footer] of this._pkg.footers) {
      entries[`word/${id}`] = this._serializeFooter(id, footer)
      entries[`word/_rels/${id}.rels`] = this._serializeSubRels(id, 'footer', this._footerRels.get(id) ?? [])
    }

    // 12. Comments
    if (this._pkg.comments && this._pkg.comments.comments.length > 0) {
      entries['word/comments.xml'] = this._serializeComments()
    }

    // 13. Footnotes
    const footnotesData = this._serializeFootnotes()
    if (footnotesData) {
      entries['word/footnotes.xml'] = footnotesData
    }

    // 14. Endnotes
    const endnotesData = this._serializeEndnotes()
    if (endnotesData) {
      entries['word/endnotes.xml'] = endnotesData
    }

    // 15. Media
    for (const [name, media] of this._pkg.media) {
      entries[`word/media/${name}`] = media.data
    }

    // Create ZIP with DEFLATE compression
    const zipData: Record<string, Uint8Array> = {}
    for (const [path, data] of Object.entries(entries)) {
      zipData[path] = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string)
    }

    const zipped = zipSync(zipData, { level: 6 })
    return new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  }

  // ─── [Content_Types].xml ────────────────────────────────────────────────────

  private _serializeContentTypes(): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    ]

    // Defaults
    const defaults: [string, string][] = [
      ['rels', 'application/vnd.openxmlformats-package.relationships+xml'],
      ['xml', 'application/xml'],
      ['png', 'image/png'],
      ['jpg', 'image/jpeg'],
      ['jpeg', 'image/jpeg'],
      ['gif', 'image/gif'],
      ['bmp', 'image/bmp'],
      ['svg', 'image/svg+xml'],
    ]
    for (const [ext, ct] of defaults) {
      lines.push(`  <Default Extension="${ext}" ContentType="${ct}"/>`)
    }

    // Overrides
    const overrides: [string, string][] = [
      ['/word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'],
      ['/word/styles.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml'],
      ['/word/settings.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml'],
      ['/word/fontTable.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml'],
    ]
    for (const [pt, ct] of overrides) {
      lines.push(`  <Override PartName="${pt}" ContentType="${ct}"/>`)
    }

    // Numbering
    if (this._pkg.numbering.abstractNums.size > 0) {
      lines.push('  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>')
    }

    // Theme
    if (this._pkg.theme) {
      lines.push('  <Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>')
    }

    // Headers/Footers
    for (const id of this._pkg.headers.keys()) {
      lines.push(`  <Override PartName="/word/${id}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`)
    }
    for (const id of this._pkg.footers.keys()) {
      lines.push(`  <Override PartName="/word/${id}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`)
    }

    // Comments
    if (this._pkg.comments && this._pkg.comments.comments.length > 0) {
      lines.push('  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>')
    }

    lines.push('</Types>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── _rels/.rels ────────────────────────────────────────────────────────────

  private _serializePackageRels(): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
      '</Relationships>',
    ]
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── word/_rels/document.xml.rels ───────────────────────────────────────────

  private _serializeDocumentRels(): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]

    for (const rel of this._rels) {
      lines.push(`  <Relationship Id="${esc(rel.id)}" Type="${esc(rel.type)}" Target="${esc(rel.target)}"/>`)
    }

    lines.push('</Relationships>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── word/document.xml ──────────────────────────────────────────────────────

  private _serializeDocument(): Uint8Array {
    const body = this._pkg.document.body
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:document xmlns:w="${NS.w}" xmlns:r="${NS.r}" xmlns:wp="${NS.wp}" xmlns:a="${NS.a}" xmlns:pic="${NS.pic}">`,
      '  <w:body>',
    ]

    // Content
    for (const block of body.children) {
      lines.push(this._serializeBlockElement(block, 2))
    }

    // Final section properties
    if (body.sectPr) {
      lines.push(this._serializeSectionProperties(body.sectPr, 2))
    }

    lines.push('  </w:body>')
    lines.push('</w:document>')

    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Block Elements ─────────────────────────────────────────────────────────

  private _serializeBlockElement(block: BlockElement, depth: number): string {
    switch (block.type) {
      case 'paragraph': return this._serializeParagraph(block as Paragraph, depth)
      case 'table': return this._serializeTable(block as Table, depth)
      case 'sdtBlock': return this._serializeSdtBlock(block as SdtBlock, depth)
      default: return ''
    }
  }

  private _serializeParagraph(para: Paragraph, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:p>`]

    // pPr (always first)
    if (para.pPr) {
      lines.push(this._serializeParagraphProperties(para.pPr, depth + 1))
    }

    // Content (runs, hyperlinks, etc.)
    for (const item of para.content) {
      switch (item.type) {
        case 'run':
          lines.push(this._serializeRun(item as Run, depth + 1))
          break
        case 'hyperlink':
          lines.push(this._serializeHyperlink(item as Hyperlink, depth + 1))
          break
        case 'sdtInline':
          lines.push(this._serializeSdtInline(item as SdtInline, depth + 1))
          break
        case 'ins':
        case 'del':
          lines.push(this._serializeTrackedRun(item as TrackedRun, depth + 1))
          break
        case 'commentRangeStart':
          lines.push(`${indent(depth + 1)}<w:commentRangeStart w:id="${(item as CommentRangeStart).id}"/>`)
          break
        case 'commentRangeEnd':
          lines.push(`${indent(depth + 1)}<w:commentRangeEnd w:id="${(item as CommentRangeEnd).id}"/>`)
          break
        case 'bookmarkStart': {
          const bs = item as BookmarkStart
          lines.push(`${indent(depth + 1)}<w:bookmarkStart w:id="${bs.id}"${xmlAttr(' w:name', bs.name)}${xmlAttr(' w:colFirst', bs.colFirst)}${xmlAttr(' w:colLast', bs.colLast)}/>`)
          break
        }
        case 'bookmarkEnd':
          lines.push(`${indent(depth + 1)}<w:bookmarkEnd w:id="${(item as BookmarkEnd).id}"/>`)
          break
      }
    }

    lines.push(`${indent(depth)}</w:p>`)
    return lines.join('\n')
  }

  private _serializeParagraphProperties(pPr: ParagraphProperties, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:pPr>`]

    if (pPr.pStyle) lines.push(`${indent(depth + 1)}<w:pStyle w:val="${esc(pPr.pStyle)}"/>`)
    if (pPr.keepNext) lines.push(`${indent(depth + 1)}<w:keepNext/>`)
    if (pPr.keepLines) lines.push(`${indent(depth + 1)}<w:keepLines/>`)
    if (pPr.pageBreakBefore) lines.push(`${indent(depth + 1)}<w:pageBreakBefore/>`)

    if (pPr.numPr) {
      lines.push(`${indent(depth + 1)}<w:numPr>`)
      lines.push(`${indent(depth + 2)}<w:ilvl w:val="${pPr.numPr.ilvl}"/>`)
      lines.push(`${indent(depth + 2)}<w:numId w:val="${pPr.numPr.numId}"/>`)
      lines.push(`${indent(depth + 1)}</w:numPr>`)
    }

    if (pPr.spacing) {
      const s = pPr.spacing
      lines.push(`${indent(depth + 1)}<w:spacing${xmlAttr(' w:before', s.before)}${xmlAttr(' w:after', s.after)}${xmlAttr(' w:line', s.line)}${xmlAttr(' w:lineRule', s.lineRule)}/>`)
    }

    if (pPr.ind) {
      const i = pPr.ind
      lines.push(`${indent(depth + 1)}<w:ind${xmlAttr(' w:left', i.left)}${xmlAttr(' w:right', i.right)}${xmlAttr(' w:firstLine', i.firstLine)}${xmlAttr(' w:hanging', i.hanging)}/>`)
    }

    if (pPr.jc) lines.push(`${indent(depth + 1)}<w:jc w:val="${esc(pPr.jc)}"/>`)

    if (pPr.pBdr) {
      const b = pPr.pBdr
      const borders: string[] = []
      if (b.top) borders.push(`<w:top w:val="${esc(b.top.val ?? 'single')}" w:sz="${b.top.sz ?? 4}" w:space="${b.top.space ?? 0}" w:color="${esc(b.top.color ?? '000000')}"/>`)
      if (b.bottom) borders.push(`<w:bottom w:val="${esc(b.bottom.val ?? 'single')}" w:sz="${b.bottom.sz ?? 4}" w:space="${b.bottom.space ?? 0}" w:color="${esc(b.bottom.color ?? '000000')}"/>`)
      if (b.left) borders.push(`<w:left w:val="${esc(b.left.val ?? 'single')}" w:sz="${b.left.sz ?? 4}" w:space="${b.left.space ?? 0}" w:color="${esc(b.left.color ?? '000000')}"/>`)
      if (b.right) borders.push(`<w:right w:val="${esc(b.right.val ?? 'single')}" w:sz="${b.right.sz ?? 4}" w:space="${b.right.space ?? 0}" w:color="${esc(b.right.color ?? '000000')}"/>`)
      if (borders.length > 0) {
        lines.push(`${indent(depth + 1)}<w:pBdr>`)
        lines.push(...borders.map((b) => `${indent(depth + 2)}${b}`))
        lines.push(`${indent(depth + 1)}</w:pBdr>`)
      }
    }

    if (pPr.shd) {
      lines.push(`${indent(depth + 1)}<w:shd w:val="${esc(pPr.shd.val)}" w:color="${esc(pPr.shd.color)}" w:fill="${esc(pPr.shd.fill)}"/>`)
    }

    if (pPr.tabs && pPr.tabs.length > 0) {
      lines.push(`${indent(depth + 1)}<w:tabs>`)
      for (const tab of pPr.tabs) {
        lines.push(`${indent(depth + 2)}<w:tab w:val="${esc(tab.val)}" w:pos="${tab.pos}"${xmlAttr(' w:leader', tab.leader)}/>`)
      }
      lines.push(`${indent(depth + 1)}</w:tabs>`)
    }

    if (pPr.sectPr) {
      lines.push(this._serializeSectionProperties(pPr.sectPr, depth + 1))
    }

    if (pPr.rPr) {
      lines.push(this._serializeRunProperties(pPr.rPr, depth + 1, 'w:rPr'))
    }

    // Track changes: pPrChange
    if (pPr.pPrChange) {
      const c = pPr.pPrChange
      lines.push(`${indent(depth + 1)}<w:pPrChange w:id="${c.id}" w:author="${esc(c.author)}" w:date="${esc(c.date)}"/>`)
    }

    lines.push(`${indent(depth)}</w:pPr>`)
    return lines.join('\n')
  }

  // ─── Runs ───────────────────────────────────────────────────────────────────

  private _serializeTrackedRun(tracked: TrackedRun, depth: number): string {
    const lines: string[] = []
    const tag = tracked.type === 'ins' ? 'w:ins' : 'w:del'
    lines.push(`${indent(depth)}<${tag} w:id="${tracked.id}" w:author="${esc(tracked.author)}" w:date="${esc(tracked.date)}">`)
    for (const run of tracked.content) {
      lines.push(this._serializeRun(run, depth + 1))
    }
    lines.push(`${indent(depth)}</${tag}>`)
    return lines.join('\n')
  }

  private _serializeRun(run: Run, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:r>`]

    if (run.rPr) {
      lines.push(this._serializeRunProperties(run.rPr, depth + 1, 'w:rPr'))
    }

    for (const node of run.content) {
      switch (node.type) {
        case 'text': {
          const t = node as Text
          const preserve = t.space === 'preserve' ? ' xml:space="preserve"' : ''
          lines.push(`${indent(depth + 1)}<w:t${preserve}>${esc(t.text)}</w:t>`)
          break
        }
        case 'break':
          lines.push(`${indent(depth + 1)}<w:br/>`)
          break
        case 'tab':
          lines.push(`${indent(depth + 1)}<w:tab/>`)
          break
        case 'footnoteReference':
          lines.push(`${indent(depth + 1)}<w:footnoteReference w:id="${node.id}"/>`)
          break
        case 'endnoteReference':
          lines.push(`${indent(depth + 1)}<w:endnoteReference w:id="${node.id}"/>`)
          break
        case 'delText': {
          const dt = node as DeletedText
          const preserve = dt.space === 'preserve' ? ' xml:space="preserve"' : ''
          lines.push(`${indent(depth + 1)}<w:delText${preserve}>${esc(dt.text)}</w:delText>`)
          break
        }
        case 'commentReference':
          lines.push(`${indent(depth + 1)}<w:commentReference w:id="${node.id}"/>`)
          break
        case 'drawing':
          lines.push(this._serializeDrawing(node as Drawing, depth + 1))
          break
        case 'fieldChar': {
          const fc = node as FieldChar
          lines.push(`${indent(depth + 1)}<w:fldChar w:fldCharType="${esc(fc.fldCharType)}"/>`)
          break
        }
        case 'instrText': {
          const it = node as InstrText
          const preserve = it.space === 'preserve' ? ' xml:space="preserve"' : ''
          lines.push(`${indent(depth + 1)}<w:instrText${preserve}>${esc(it.text)}</w:instrText>`)
          break
        }
      }
    }

    lines.push(`${indent(depth)}</w:r>`)
    return lines.join('\n')
  }

  private _serializeRunProperties(rPr: RunProperties, depth: number, tag: string = 'w:rPr'): string {
    const lines: string[] = [`${indent(depth)}<${tag}>`]

    if (rPr.rFonts) {
      const f = rPr.rFonts
      lines.push(`${indent(depth + 1)}<w:rFonts${xmlAttr(' w:ascii', f.ascii)}${xmlAttr(' w:hAnsi', f.hAnsi)}${xmlAttr(' w:eastAsia', f.eastAsia)}${xmlAttr(' w:cs', f.cs)}/>`)
    }
    if (rPr.b) lines.push(`${indent(depth + 1)}<w:b/>`)
    if (rPr.bCs) lines.push(`${indent(depth + 1)}<w:bCs/>`)
    if (rPr.i) lines.push(`${indent(depth + 1)}<w:i/>`)
    if (rPr.iCs) lines.push(`${indent(depth + 1)}<w:iCs/>`)
    if (rPr.caps) lines.push(`${indent(depth + 1)}<w:caps/>`)
    if (rPr.smallCaps) lines.push(`${indent(depth + 1)}<w:smallCaps/>`)
    if (rPr.strike) lines.push(`${indent(depth + 1)}<w:strike/>`)
    if (rPr.dstrike) lines.push(`${indent(depth + 1)}<w:dstrike/>`)
    if (rPr.outline) lines.push(`${indent(depth + 1)}<w:outline/>`)
    if (rPr.shadow) lines.push(`${indent(depth + 1)}<w:shadow/>`)
    if (rPr.imprint) lines.push(`${indent(depth + 1)}<w:imprint/>`)
    if (rPr.noProof) lines.push(`${indent(depth + 1)}<w:noProof/>`)
    if (rPr.snapToGrid) lines.push(`${indent(depth + 1)}<w:snapToGrid/>`)
    if (rPr.u) lines.push(`${indent(depth + 1)}<w:u w:val="${esc(rPr.u)}"/>`)
    if (rPr.effect) lines.push(`${indent(depth + 1)}<w:effect w:val="${esc(rPr.effect)}"/>`)
    if (rPr.color) lines.push(`${indent(depth + 1)}<w:color w:val="${esc(rPr.color)}"/>`)
    if (rPr.spacing !== undefined) lines.push(`${indent(depth + 1)}<w:spacing w:val="${rPr.spacing}"/>`)
    if (rPr.w !== undefined) lines.push(`${indent(depth + 1)}<w:w w:val="${rPr.w}"/>`)
    if (rPr.kern !== undefined) lines.push(`${indent(depth + 1)}<w:kern w:val="${rPr.kern}"/>`)
    if (rPr.position !== undefined) lines.push(`${indent(depth + 1)}<w:position w:val="${rPr.position}"/>`)
    if (rPr.sz !== undefined) lines.push(`${indent(depth + 1)}<w:sz w:val="${rPr.sz}"/>`)
    if (rPr.szCs !== undefined) lines.push(`${indent(depth + 1)}<w:szCs w:val="${rPr.szCs}"/>`)
    if (rPr.highlight) lines.push(`${indent(depth + 1)}<w:highlight w:val="${esc(rPr.highlight)}"/>`)
    if (rPr.vertAlign) lines.push(`${indent(depth + 1)}<w:vertAlign w:val="${esc(rPr.vertAlign)}"/>`)
    if (rPr.rFonts) {
      // already handled above
    }

    if (rPr.shd) {
      lines.push(`${indent(depth + 1)}<w:shd w:val="${esc(rPr.shd.val)}" w:color="${esc(rPr.shd.color)}" w:fill="${esc(rPr.shd.fill)}"/>`)
    }

    // Track changes: rPrChange
    if (rPr.rPrChange) {
      const c = rPr.rPrChange
      lines.push(`${indent(depth + 1)}<w:rPrChange w:id="${c.id}" w:author="${esc(c.author)}" w:date="${esc(c.date)}"/>`)
    }

    lines.push(`${indent(depth)}</${tag}>`)
    return lines.join('\n')
  }

  // ─── Hyperlinks ─────────────────────────────────────────────────────────────

  private _serializeHyperlink(link: Hyperlink, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:hyperlink>`]
    for (const run of link.content) {
      if (run.type === 'run') {
        lines.push(this._serializeRun(run as Run, depth + 1))
      }
    }
    lines.push(`${indent(depth)}</w:hyperlink>`)
    return lines.join('\n')
  }

  // ─── Tables ─────────────────────────────────────────────────────────────────

  private _serializeTable(table: Table, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:tbl>`]

    if (table.tblPr) {
      lines.push(this._serializeTableProperties(table.tblPr, table.tblGrid, depth + 1))
    }

    lines.push(`${indent(depth + 1)}<w:tblGrid>`)
    for (const col of table.tblGrid) {
      lines.push(`${indent(depth + 2)}<w:gridCol${xmlAttr(' w:w', col.width)}/>`)
    }
    lines.push(`${indent(depth + 1)}</w:tblGrid>`)

    for (const row of table.content) {
      lines.push(this._serializeTableRow(row, depth + 1))
    }

    lines.push(`${indent(depth)}</w:tbl>`)
    return lines.join('\n')
  }

  private _serializeTableProperties(tblPr: any, tblGrid: any[], depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:tblPr>`]
    if (tblPr.tblStyle) lines.push(`${indent(depth + 1)}<w:tblStyle w:val="${esc(tblPr.tblStyle)}"/>`)
    if (tblPr.tblStyleRowBandSize !== undefined) lines.push(`${indent(depth + 1)}<w:tblStyleRowBandSize w:val="${tblPr.tblStyleRowBandSize}"/>`)
    if (tblPr.tblStyleColBandSize !== undefined) lines.push(`${indent(depth + 1)}<w:tblStyleColBandSize w:val="${tblPr.tblStyleColBandSize}"/>`)
    if (tblPr.tblW) lines.push(`${indent(depth + 1)}<w:tblW w:w="${tblPr.tblW.w}" w:type="${esc(tblPr.tblW.type)}"/>`)
    if (tblPr.jc) lines.push(`${indent(depth + 1)}<w:jc w:val="${esc(tblPr.jc)}"/>`)
    if (tblPr.tblLayout) lines.push(`${indent(depth + 1)}<w:tblLayout w:type="${esc(tblPr.tblLayout)}"/>`)

    // Table look
    if (tblPr.tblLook) {
      const look = tblPr.tblLook
      lines.push(`${indent(depth + 1)}<w:tblLook${xmlAttr(' w:firstRow', look.firstRow ? 1 : 0)}${xmlAttr(' w:lastRow', look.lastRow ? 1 : 0)}${xmlAttr(' w:firstColumn', look.firstColumn ? 1 : 0)}${xmlAttr(' w:lastColumn', look.lastColumn ? 1 : 0)}${xmlAttr(' w:noHBand', look.noHBand ? 1 : 0)}${xmlAttr(' w:noVBand', look.noVBand ? 1 : 0)}/>`)
    }

    // Table borders
    if (tblPr.tblBorders) {
      lines.push(`${indent(depth + 1)}<w:tblBorders>`)
      const b = tblPr.tblBorders
      for (const side of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const) {
        const border = b[side]
        if (border) {
          lines.push(`${indent(depth + 2)}<w:${side} w:val="${esc(border.val)}" w:sz="${border.sz ?? 4}" w:space="0" w:color="${esc(border.color ?? '000000')}"/>`)
        }
      }
      lines.push(`${indent(depth + 1)}</w:tblBorders>`)
    }

    // Table cell margins
    if (tblPr.tblCellMar) {
      const m = tblPr.tblCellMar
      lines.push(`${indent(depth + 1)}<w:tblCellMar>`)
      if (m.top != null) lines.push(`${indent(depth + 2)}<w:top w:w="${m.top}" w:type="dxa"/>`)
      if (m.start != null) lines.push(`${indent(depth + 2)}<w:start w:w="${m.start}" w:type="dxa"/>`)
      if (m.bottom != null) lines.push(`${indent(depth + 2)}<w:bottom w:w="${m.bottom}" w:type="dxa"/>`)
      if (m.end != null) lines.push(`${indent(depth + 2)}<w:end w:w="${m.end}" w:type="dxa"/>`)
      lines.push(`${indent(depth + 1)}</w:tblCellMar>`)
    }

    // Table shading
    if (tblPr.shd) {
      lines.push(`${indent(depth + 1)}<w:shd w:val="${esc(tblPr.shd.val)}" w:color="${esc(tblPr.shd.color)}" w:fill="${esc(tblPr.shd.fill)}"/>`)
    }

    // Track changes: tblPrChange
    if (tblPr.tblPrChange) {
      const c = tblPr.tblPrChange
      lines.push(`${indent(depth + 1)}<w:tblPrChange w:id="${c.id}" w:author="${esc(c.author)}" w:date="${esc(c.date)}"/>`)
    }

    lines.push(`${indent(depth)}</w:tblPr>`)
    return lines.join('\n')
  }

  private _serializeTableRow(row: TableRow, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:tr>`]
    if (row.trPr) {
      lines.push(`${indent(depth + 1)}<w:trPr>`)
      // Track changes: trPrChange
      if (row.trPr.trPrChange) {
        const c = row.trPr.trPrChange
        lines.push(`${indent(depth + 2)}<w:trPrChange w:id="${c.id}" w:author="${esc(c.author)}" w:date="${esc(c.date)}"/>`)
      }
      lines.push(`${indent(depth + 1)}</w:trPr>`)
    }
    for (const cell of row.content) {
      lines.push(this._serializeTableCell(cell, depth + 1))
    }
    lines.push(`${indent(depth)}</w:tr>`)
    return lines.join('\n')
  }

  private _serializeTableCell(cell: TableCell, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:tc>`]
    if (cell.tcPr) {
      const p = cell.tcPr
      lines.push(`${indent(depth + 1)}<w:tcPr>`)
      if (p.tcW) lines.push(`${indent(depth + 2)}<w:tcW w:w="${p.tcW}" w:type="dxa"/>`)
      if (p.gridSpan) lines.push(`${indent(depth + 2)}<w:gridSpan w:val="${p.gridSpan}"/>`)
      if (p.hMerge) lines.push(`${indent(depth + 2)}<w:hMerge${p.hMerge === 'continue' ? '' : ` w:val="${esc(p.hMerge)}"`}/>`)
      if (p.vMerge) lines.push(`${indent(depth + 2)}<w:vMerge${p.vMerge === 'continue' ? '' : ` w:val="${esc(p.vMerge)}"`}/>`)
      if (p.vAlign) lines.push(`${indent(depth + 2)}<w:vAlign w:val="${esc(p.vAlign)}"/>`)

      // Cell borders
      if (p.tcBorders) {
        lines.push(`${indent(depth + 2)}<w:tcBorders>`)
        for (const side of ['top', 'left', 'bottom', 'right'] as const) {
          const border = p.tcBorders[side]
          if (border) {
            lines.push(`${indent(depth + 3)}<w:${side} w:val="${esc(border.val)}" w:sz="${border.sz ?? 4}" w:space="0" w:color="${esc(border.color ?? '000000')}"/>`)
          }
        }
        lines.push(`${indent(depth + 2)}</w:tcBorders>`)
      }

      // Cell shading
      if (p.shd) {
        lines.push(`${indent(depth + 2)}<w:shd w:val="${esc(p.shd.val)}" w:color="${esc(p.shd.color)}" w:fill="${esc(p.shd.fill)}"/>`)
      }

      // Cell margins
      if (p.tcMar) {
        const m = p.tcMar
        lines.push(`${indent(depth + 2)}<w:tcMar>`)
        if (m.top != null) lines.push(`${indent(depth + 3)}<w:top w:w="${m.top}" w:type="dxa"/>`)
        if (m.start != null) lines.push(`${indent(depth + 3)}<w:start w:w="${m.start}" w:type="dxa"/>`)
        if (m.bottom != null) lines.push(`${indent(depth + 3)}<w:bottom w:w="${m.bottom}" w:type="dxa"/>`)
        if (m.end != null) lines.push(`${indent(depth + 3)}<w:end w:w="${m.end}" w:type="dxa"/>`)
        lines.push(`${indent(depth + 2)}</w:tcMar>`)
      }

      // Track changes: tcPrChange
      if (p.tcPrChange) {
        const c = p.tcPrChange
        lines.push(`${indent(depth + 2)}<w:tcPrChange w:id="${c.id}" w:author="${esc(c.author)}" w:date="${esc(c.date)}"/>`)
      }

      lines.push(`${indent(depth + 1)}</w:tcPr>`)
    }
    for (const block of cell.content) {
      lines.push(this._serializeBlockElement(block, depth + 1))
    }
    lines.push(`${indent(depth)}</w:tc>`)
    return lines.join('\n')
  }

  // ─── SDT ────────────────────────────────────────────────────────────────────

  private _serializeSdtBlock(sdt: SdtBlock, depth: number): string {
    return `${indent(depth)}<!-- SDT block skipped -->`
  }

  private _serializeSdtInline(sdt: SdtInline, depth: number): string {
    return `${indent(depth)}<!-- SDT inline skipped -->`
  }

  // ─── Drawing ────────────────────────────────────────────────────────────────

  private _serializeDrawing(drawing: Drawing, depth: number): string {
    if (drawing.inline) {
      const ext = drawing.inline.extent
      const docPr = drawing.inline.docPr
      const blip = drawing.inline.blip
      const docPrAttrs = docPr
        ? ` id="${docPr.id}" name="${esc(docPr.name || 'Image')}"${xmlAttr(' descr', docPr.descr)}`
        : ' id="1" name="Image"'

      let graphic = ''
      if (blip?.rId) {
        graphic = `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/pic"><pic:nvPicPr><pic:cNvPr id="0" name=""/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${esc(blip.rId)}"/></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${ext.cx}" cy="${ext.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`
      }

      return `${indent(depth)}<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${ext.cx}" cy="${ext.cy}"/><wp:docPr${docPrAttrs}/>${graphic}</wp:inline></w:drawing>`
    }
    return `${indent(depth)}<!-- Drawing skipped -->`
  }

  // ─── Section Properties ─────────────────────────────────────────────────────

  private _serializeSectionProperties(sectPr: SectionProperties, depth: number): string {
    const lines: string[] = [`${indent(depth)}<w:sectPr>`]

    if (sectPr.type) {
      lines.push(`${indent(depth + 1)}<w:type w:val="${esc(sectPr.type)}"/>`)
    }

    if (sectPr.pgSz) {
      const pg = sectPr.pgSz
      lines.push(`${indent(depth + 1)}<w:pgSz w:w="${pg.w}" w:h="${pg.h}"${xmlAttr(' w:orient', pg.orient)}/>`)
    }

    if (sectPr.pgMar) {
      const m = sectPr.pgMar
      lines.push(`${indent(depth + 1)}<w:pgMar w:top="${m.top}" w:right="${m.right}" w:bottom="${m.bottom}" w:left="${m.left}" w:header="${m.header}" w:footer="${m.footer}" w:gutter="${m.gutter}"/>`)
    }

    if (sectPr.pgNumType) {
      lines.push(`${indent(depth + 1)}<w:pgNumType${xmlAttr(' w:start', sectPr.pgNumType.start)}${xmlAttr(' w:fmt', sectPr.pgNumType.fmt)}/>`)
    }

    if (sectPr.cols) {
      lines.push(`${indent(depth + 1)}<w:cols${xmlAttr(' w:space', sectPr.cols.space)}/>`)
    }

    if (sectPr.titlePg) lines.push(`${indent(depth + 1)}<w:titlePg/>`)
    if (sectPr.evenAndOddHeaders) lines.push(`${indent(depth + 1)}<w:evenAndOddHeaders/>`)

    // Header/Footer references
    if (sectPr.headerReference) {
      for (const ref of sectPr.headerReference) {
        lines.push(`${indent(depth + 1)}<w:headerReference w:type="${esc(ref.type)}" r:id="${esc(ref.rId)}"/>`)
      }
    }
    if (sectPr.footerReference) {
      for (const ref of sectPr.footerReference) {
        lines.push(`${indent(depth + 1)}<w:footerReference w:type="${esc(ref.type)}" r:id="${esc(ref.rId)}"/>`)
      }
    }

    lines.push(`${indent(depth)}</w:sectPr>`)
    return lines.join('\n')
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────

  private _serializeStyles(): Uint8Array {
    const styles = this._pkg.styles
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:styles xmlns:w="${NS.w}" xmlns:r="${NS.r}">`,
    ]

    if (styles.docDefaults) {
      lines.push('  <w:docDefaults>')
      if (styles.docDefaults.rPrDefault) {
        lines.push('    <w:rPrDefault>')
        lines.push(this._serializeRunProperties(styles.docDefaults.rPrDefault, 3, 'w:rPr'))
        lines.push('    </w:rPrDefault>')
      }
      if (styles.docDefaults.pPrDefault) {
        lines.push('    <w:pPrDefault>')
        lines.push(this._serializeParagraphProperties(styles.docDefaults.pPrDefault, 3))
        lines.push('    </w:pPrDefault>')
      }
      lines.push('  </w:docDefaults>')
    }

    for (const [, style] of styles.styles) {
      lines.push(`  <w:style w:type="${esc(style.type)}" w:styleId="${esc(style.id)}">`)
      if (style.name) lines.push(`    <w:name w:val="${esc(style.name)}"/>`)
      if (style.basedOn) lines.push(`    <w:basedOn w:val="${esc(style.basedOn)}"/>`)
      if (style.next) lines.push(`    <w:next w:val="${esc(style.next)}"/>`)
      if (style.link) lines.push(`    <w:link w:val="${esc(style.link)}"/>`)
      if (style.qFormat) lines.push('    <w:qFormat/>')
      if (style.pPr) lines.push(this._serializeParagraphProperties(style.pPr, 3))
      if (style.rPr) lines.push(this._serializeRunProperties(style.rPr, 3, 'w:rPr'))
      lines.push('  </w:style>')
    }

    lines.push('</w:styles>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Numbering ──────────────────────────────────────────────────────────────

  private _serializeNumbering(): Uint8Array {
    const num = this._pkg.numbering
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:numbering xmlns:w="${NS.w}">`,
    ]

    for (const [id, abstractNum] of num.abstractNums) {
      lines.push(`  <w:abstractNum w:abstractNumId="${id}">`)
      if (abstractNum.levels) {
        for (const level of abstractNum.levels) {
          lines.push(`    <w:lvl w:ilvl="${level.ilvl}">`)
          if (level.start !== undefined) lines.push(`      <w:start w:val="${level.start}"/>`)
          if (level.numFmt) lines.push(`      <w:numFmt w:val="${esc(level.numFmt)}"/>`)
          if (level.lvlText) lines.push(`      <w:lvlText w:val="${esc(level.lvlText)}"/>`)
          if (level.lvlJc) lines.push(`      <w:lvlJc w:val="${esc(level.lvlJc)}"/>`)
          if (level.pPr) lines.push(this._serializeParagraphProperties(level.pPr, 3))
          if (level.rPr) lines.push(this._serializeRunProperties(level.rPr, 3, 'w:rPr'))
          lines.push(`    </w:lvl>`)
        }
      }
      lines.push('  </w:abstractNum>')
    }

    for (const [id, numInstance] of num.nums) {
      lines.push(`  <w:num w:numId="${id}">`)
      lines.push(`    <w:abstractNumId w:val="${numInstance.abstractNumId}"/>`)
      lines.push('  </w:num>')
    }

    lines.push('</w:numbering>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Settings ───────────────────────────────────────────────────────────────

  private _serializeSettings(): Uint8Array {
    const s = this._pkg.settings
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:settings xmlns:w="${NS.w}">`,
    ]

    if (s.defaultTabStop !== undefined) lines.push(`  <w:defaultTabStop w:val="${s.defaultTabStop}"/>`)
    if (s.characterSpacingControl) lines.push(`  <w:characterSpacingControl w:val="${esc(s.characterSpacingControl)}"/>`)
    if (s.trackRevisions) lines.push('  <w:trackRevisions/>')
    if (s.evenAndOddHeaders) lines.push('  <w:evenAndOddHeaders/>')

    lines.push('</w:settings>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Font Table ─────────────────────────────────────────────────────────────

  private _serializeFontTable(): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:fonts xmlns:w="${NS.w}">`,
    ]

    for (const [name, font] of this._pkg.fontTable.fonts) {
      lines.push(`  <w:font w:name="${esc(name)}">`)
      if (font.panose) lines.push(`    <w:panose1 w:val="${esc(font.panose)}"/>`)
      if (font.charset) lines.push(`    <w:charset w:val="${esc(font.charset)}"/>`)
      if (font.pitchFamily !== undefined) lines.push(`    <w:pitchAndFamily w:val="${font.pitchFamily}"/>`)
      lines.push('  </w:font>')
    }

    lines.push('</w:fonts>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Theme ──────────────────────────────────────────────────────────────────

  private _serializeTheme(): Uint8Array {
    // Minimal theme XML — full theme serialization is complex
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Theme">',
      '  <a:themeElements>',
      '    <a:clrScheme name="Custom">',
      '      <a:dk1><a:srgbClr val="000000"/></a:dk1>',
      '      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>',
      '      <a:dk2><a:srgbClr val="44546A"/></a:dk2>',
      '      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>',
      '      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>',
      '      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>',
      '      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>',
      '      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>',
      '      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>',
      '      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>',
      '      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>',
      '      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>',
      '    </a:clrScheme>',
      '    <a:fontScheme name="Custom">',
      '      <a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>',
      '      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>',
      '    </a:fontScheme>',
      '    <a:fmtScheme name="Office">',
      '      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>',
      '      <a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>',
      '      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>',
      '      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>',
      '    </a:fmtScheme>',
      '  </a:themeElements>',
      '</a:theme>',
    ]
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Headers / Footers ──────────────────────────────────────────────────────

  private _serializeHeader(id: string, header: HeaderPart): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:hdr xmlns:w="${NS.w}" xmlns:r="${NS.r}">`,
    ]
    for (const block of header.content) {
      lines.push(this._serializeBlockElement(block, 1))
    }
    lines.push('</w:hdr>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  private _serializeFooter(id: string, footer: FooterPart): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:ftr xmlns:w="${NS.w}" xmlns:r="${NS.r}">`,
    ]
    for (const block of footer.content) {
      lines.push(this._serializeBlockElement(block, 1))
    }
    lines.push('</w:ftr>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Comments ───────────────────────────────────────────────────────────────

  private _serializeComments(): Uint8Array {
    const comments = this._pkg.comments!
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:comments xmlns:w="${NS.w}" xmlns:r="${NS.r}">`,
    ]

    for (const comment of comments.comments) {
      lines.push(`  <w:comment w:id="${comment.id}" w:author="${esc(comment.author)}"${xmlAttr(' w:date', comment.date)} w:initials="${esc(comment.initials ?? '')}">`)
      for (const item of comment.content) {
        // CommentItem is { text: string, author?: string, date?: string }
        // Render as a simple paragraph with the comment text
        lines.push(`${indent(2)}<w:p>`)
        lines.push(`${indent(3)}<w:r><w:t>${esc(item.text)}</w:t></w:r>`)
        lines.push(`${indent(2)}</w:p>`)
      }
      lines.push('  </w:comment>')
    }

    lines.push('</w:comments>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  private _serializeFootnotes(): Uint8Array | undefined {
    const fn = this._pkg.footnotes
    if (!fn || fn.footnotes.size === 0) return undefined

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:footnotes xmlns:w="${NS.w}" xmlns:r="${NS.r}">`,
    ]

    for (const [id, note] of fn.footnotes) {
      const typeAttr = note.type ? ` w:type="${note.type}"` : ''
      lines.push(`  <w:footnote w:id="${id}"${typeAttr}>`)
      for (const item of note.content) {
        lines.push(this._serializeParagraph(item as Paragraph, 2))
      }
      lines.push('  </w:footnote>')
    }

    lines.push('</w:footnotes>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  private _serializeEndnotes(): Uint8Array | undefined {
    const en = this._pkg.endnotes
    if (!en || en.endnotes.size === 0) return undefined

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<w:endnotes xmlns:w="${NS.w}" xmlns:r="${NS.r}">`,
    ]

    for (const [id, note] of en.endnotes) {
      const typeAttr = note.type ? ` w:type="${note.type}"` : ''
      lines.push(`  <w:endnote w:id="${id}"${typeAttr}>`)
      for (const item of note.content) {
        lines.push(this._serializeParagraph(item as Paragraph, 2))
      }
      lines.push('  </w:endnote>')
    }

    lines.push('</w:endnotes>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Sub-relationships ──────────────────────────────────────────────────────

  private _serializeSubRels(_partId: string, _type: string, rels: Array<{ id: string; type: string; target: string }>): Uint8Array {
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]
    for (const rel of rels) {
      lines.push(`  <Relationship Id="${esc(rel.id)}" Type="${esc(rel.type)}" Target="${esc(rel.target)}"/>`)
    }
    lines.push('</Relationships>')
    return new TextEncoder().encode(lines.join('\n'))
  }

  // ─── Relationship helpers ───────────────────────────────────────────────────

  private _addRelationship(type: string, target: string): string {
    const id = `rId${this._relsCounter++}`
    this._rels.push({ id, type, target })
    return id
  }
}
