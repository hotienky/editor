/**
 * Streaming DOCX Import Pipeline
 *
 * Parses OOXML incrementally by paragraph chunks instead of loading the
 * entire document into memory. Builds ProseMirror JSON nodes progressively.
 *
 * Architecture: Layer 2 — Streaming Import
 */

import type { JSONContent, KindyDocumentState, KindyPageState, CompatibilityReport, CompatibilityIssue, AssetReference } from '../core/types'
import { createEmptyDocumentState } from '../core/state'
import { DocumentLibraryError } from '../core/errors'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StreamingImportOptions {
  /** Number of paragraphs to process per chunk */
  chunkSize?: number
  /** Callback for progress updates (0-100) */
  onProgress?: (percent: number, phase: string) => void
  /** Compatibility profile */
  profile?: CompatibilityReport['profile']
  /** Import mode */
  mode?: 'strict' | 'best-effort'
  /** Max compressed bytes */
  maxCompressedBytes?: number
  /** Max uncompressed bytes */
  maxUncompressedBytes?: number
}

export interface StreamingImportResult {
  state: KindyDocumentState
  report: CompatibilityReport
  stats: ImportStats
}

export interface ImportStats {
  totalParagraphs: number
  processedChunks: number
  totalChunks: number
  elapsedMs: number
  memoryUsageMB: number
}

interface XmlChunk {
  index: number
  xml: string
  type: 'paragraph' | 'table' | 'section' | 'other'
}

// ─── XML Chunker ────────────────────────────────────────────────────────────

/**
 * Splits OOXML document.xml into paragraph-level chunks without loading
 * the entire XML into memory as a DOM tree.
 */
export function* chunkDocumentXml(documentXml: string, chunkSize: number = 50): Generator<XmlChunk> {
  const paragraphPattern = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi
  const tablePattern = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gi
  const sectionPattern = /<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>/gi

  // Collect all block-level elements with their positions
  const blocks: Array<{ match: RegExpMatchArray; type: XmlChunk['type'] }> = []

  let m: RegExpExecArray | null
  while ((m = paragraphPattern.exec(documentXml)) !== null) {
    blocks.push({ match: m, type: 'paragraph' })
  }
  while ((m = tablePattern.exec(documentXml)) !== null) {
    blocks.push({ match: m, type: 'table' })
  }
  while ((m = sectionPattern.exec(documentXml)) !== null) {
    blocks.push({ match: m, type: 'section' })
  }

  // Sort by position in document
  blocks.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0))

  // Yield in chunks
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize)
    const combinedXml = chunk.map((b) => b.match[0]).join('')
    const primaryType = chunk[0]?.type || 'other'

    yield {
      index: Math.floor(i / chunkSize),
      xml: combinedXml,
      type: primaryType,
    }
  }
}

// ─── Lightweight XML Parser ─────────────────────────────────────────────────

/**
 * Parse a single OOXML paragraph element string into structured data.
 * Uses regex instead of DOMParser for speed on large documents.
 */
function parseWordParagraph(xml: string): ParsedParagraph {
  const result: ParsedParagraph = {
    runs: [],
    textAlign: undefined,
    lineHeight: undefined,
    indent: undefined,
    keepNext: false,
    keepLines: false,
    pageBreakBefore: false,
    tabStops: [],
    numbering: undefined,
  }

  // Extract paragraph properties
  const pPrMatch = xml.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/i)
  if (pPrMatch) {
    const pPr = pPrMatch[1]

    // Justification
    const jcMatch = pPr.match(/<w:jc\b[^>]*w:val="([^"]+)"/i)
    if (jcMatch) result.textAlign = jcMatch[1]

    // Spacing
    const spacingMatch = pPr.match(/<w:spacing\b([^>]*)/i)
    if (spacingMatch) {
      const lineMatch = spacingMatch[1].match(/w:line="(\d+)"/i)
      if (lineMatch) result.lineHeight = Number(lineMatch[1])
      const lineRuleMatch = spacingMatch[1].match(/w:lineRule="([^"]+)"/i)
      if (lineRuleMatch) result.lineRule = lineRuleMatch[1]
    }

    // Indentation
    const indMatch = pPr.match(/<w:ind\b([^>]*)/i)
    if (indMatch) {
      const leftMatch = indMatch[1].match(/w:(?:left|start)="(\d+)"/i)
      const rightMatch = indMatch[1].match(/w:(?:right|end)="(\d+)"/i)
      const firstLineMatch = indMatch[1].match(/w:firstLine="(\d+)"/i)
      const hangingMatch = indMatch[1].match(/w:hanging="(\d+)"/i)
      result.indent = {
        left: leftMatch ? Number(leftMatch[1]) : undefined,
        right: rightMatch ? Number(rightMatch[1]) : undefined,
        firstLine: firstLineMatch ? Number(firstLineMatch[1]) : undefined,
        hanging: hangingMatch ? Number(hangingMatch[1]) : undefined,
      }
    }

    // Keep properties
    if (/<w:keepNext\b/i.test(pPr)) result.keepNext = true
    if (/<w:keepLines\b/i.test(pPr)) result.keepLines = true
    if (/<w:pageBreakBefore\b/i.test(pPr)) result.pageBreakBefore = true

    // Numbering
    const numMatch = pPr.match(/<w:numPr\b[^>]*>([\s\S]*?)<\/w:numPr>/i)
    if (numMatch) {
      const ilvlMatch = numMatch[1].match(/w:ilvl="(\d+)"/i)
      const numIdMatch = numMatch[1].match(/w:numId="(\d+)"/i)
      if (numIdMatch) {
        result.numbering = {
          numId: Number(numIdMatch[1]),
          level: ilvlMatch ? Number(ilvlMatch[1]) : 0,
        }
      }
    }
  }

  // Extract runs
  const runPattern = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gi
  let runMatch: RegExpExecArray | null
  while ((runMatch = runPattern.exec(xml)) !== null) {
    const runXml = runMatch[1]
    const run: ParsedRun = { text: '' }

    // Run properties
    const rPrMatch = runXml.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/i)
    if (rPrMatch) {
      const rPr = rPrMatch[1]
      if (/<w:b\b/i.test(rPr) && !/w:val="(?:0|false)"/i.test(rPr)) run.bold = true
      if (/<w:i\b/i.test(rPr) && !/w:val="(?:0|false)"/i.test(rPr)) run.italic = true
      if (/<w:u\b/i.test(rPr) && !/w:val="(?:none|0)"/i.test(rPr)) run.underline = true
      if (/<w:strike\b/i.test(rPr) && !/w:val="(?:0|false)"/i.test(rPr)) run.strike = true
      if (/<w:sub\b/i.test(rPr)) run.subscript = true
      if (/<w:superscript\b/i.test(rPr)) run.superscript = true

      // Font
      const fontMatch = rPr.match(/w:ascii="([^"]+)"/i)
      if (fontMatch) run.font = fontMatch[1]

      // Size (half-points)
      const sizeMatch = rPr.match(/w:val="(\d+)"/i)
      if (sizeMatch) run.fontSize = sizeMatch[1]

      // Color
      const colorMatch = rPr.match(/<w:color\b[^>]*w:val="([^"]+)"/i)
      if (colorMatch) run.color = colorMatch[1]
    }

    // Text content
    const textMatch = runXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/i)
    if (textMatch) {
      run.text = textMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    }

    // Break
    if (/<w:br\b/i.test(runXml)) {
      run.isBreak = true
    }

    // Tab
    if (/<w:tab\b/i.test(runXml)) {
      run.isTab = true
    }

    // Image
    const drawingMatch = runXml.match(/<w:drawing\b[^>]*>([\s\S]*?)<\/w:drawing>/i)
    if (drawingMatch) {
      const blipMatch = drawingMatch[1].match(/r:embed="([^"]+)"/i)
      if (blipMatch) {
        run.image = { relationshipId: blipMatch[1] }
      }
    }

    result.runs.push(run)
  }

  // Extract inline field codes for page breaks
  if (/<w:br\b[^>]*w:type="page"/i.test(xml)) {
    result.pageBreak = true
  }

  return result
}

// ─── Internal Types ─────────────────────────────────────────────────────────

interface ParsedRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  subscript?: boolean
  superscript?: boolean
  font?: string
  fontSize?: string
  color?: string
  isBreak?: boolean
  isTab?: boolean
  image?: { relationshipId: string }
}

interface ParsedParagraph {
  runs: ParsedRun[]
  textAlign?: string
  lineHeight?: number
  lineRule?: string
  indent?: {
    left?: number
    right?: number
    firstLine?: number
    hanging?: number
  }
  keepNext?: boolean
  keepLines?: boolean
  pageBreakBefore?: boolean
  tabStops?: Array<{ alignment: string; position: number }>
  numbering?: { numId: number; level: number }
  pageBreak?: boolean
}

// ─── Converter: Parsed Data → ProseMirror JSON ──────────────────────────────

function twipsToCentimeters(twips: number): number {
  return Math.round((twips / 567) * 1000) / 1000
}

function parsedRunsToNodes(runs: ParsedRun[]): JSONContent[] {
  const nodes: JSONContent[] = []

  for (const run of runs) {
    if (run.isBreak) {
      nodes.push({ type: 'hardBreak' })
      continue
    }
    if (run.isTab) {
      nodes.push({ type: 'docxTab', attrs: { alignment: 'left' } })
      continue
    }
    if (run.image) {
      nodes.push({
        type: 'inlineImage',
        attrs: { src: '', alt: '', width: null, height: null },
      })
      continue
    }
    if (!run.text) continue

    const marks: JSONContent['marks'] = []
    if (run.bold) marks.push({ type: 'bold' })
    if (run.italic) marks.push({ type: 'italic' })
    if (run.underline) marks.push({ type: 'underline' })
    if (run.strike) marks.push({ type: 'strike' })
    if (run.subscript) marks.push({ type: 'subscript' })
    if (run.superscript) marks.push({ type: 'superscript' })

    if (run.font || run.fontSize || run.color) {
      marks.push({
        type: 'textStyle',
        attrs: {
          fontFamily: run.font || undefined,
          fontSize: run.fontSize ? `${Number(run.fontSize) / 2}pt` : undefined,
          color: run.color ? `#${run.color}` : undefined,
        },
      })
    }

    nodes.push({
      type: 'text',
      text: run.text,
      marks: marks.length ? marks : undefined,
    })
  }

  return nodes
}

function parsedParagraphToNode(parsed: ParsedParagraph): JSONContent {
  const attrs: Record<string, unknown> = {}

  if (parsed.textAlign) attrs.textAlign = parsed.textAlign
  if (parsed.lineHeight) {
    attrs.lineHeight = parsed.lineRule === 'exact'
      ? `${parsed.lineHeight / 20}pt`
      : parsed.lineHeight / 240
  }
  if (parsed.indent) {
    const docxLayout: Record<string, unknown> = {}
    if (parsed.indent.left !== undefined) docxLayout.leftTwip = parsed.indent.left
    if (parsed.indent.right !== undefined) docxLayout.rightTwip = parsed.indent.right
    if (parsed.indent.firstLine !== undefined) docxLayout.firstLineTwip = parsed.indent.firstLine
    if (parsed.indent.hanging !== undefined) docxLayout.hangingTwip = parsed.indent.hanging
    if (Object.keys(docxLayout).length) attrs.docxLayout = docxLayout
  }
  if (parsed.keepNext) {
    attrs.docxLayout = { ...(attrs.docxLayout as Record<string, unknown>), keepNext: true }
  }
  if (parsed.keepLines) {
    attrs.docxLayout = { ...(attrs.docxLayout as Record<string, unknown>), keepLines: true }
  }
  if (parsed.pageBreakBefore) {
    attrs.docxLayout = { ...(attrs.docxLayout as Record<string, unknown>), pageBreakBefore: true }
  }

  const content = parsedRunsToNodes(parsed.runs)

  return {
    type: 'paragraph',
    attrs: Object.keys(attrs).length ? attrs : undefined,
    content: content.length ? content : undefined,
  }
}

// ─── Streaming Importer ─────────────────────────────────────────────────────

/**
 * Import a DOCX file using streaming chunk-based parsing.
 * Processes paragraphs in chunks to keep memory usage low.
 */
export async function streamingImportDocx(
  file: Blob,
  options: StreamingImportOptions = {},
): Promise<StreamingImportResult> {
  const startTime = performance.now()
  const {
    chunkSize = 50,
    onProgress,
    profile = 'kindy-docx-v2.0',
    mode = 'strict',
  } = options

  onProgress?.(0, 'extracting')

  // Step 1: Extract ZIP contents
  const { unzipSync } = await import('fflate')
  const arrayBuffer = await file.arrayBuffer()
  let entries: Record<string, Uint8Array>

  try {
    entries = unzipSync(new Uint8Array(arrayBuffer), {
      filter: (entry) => {
        return entry.name === '[Content_Types].xml' ||
          entry.name === 'word/document.xml' ||
          entry.name.startsWith('word/media/')
      },
    })
  } catch (cause) {
    throw new DocumentLibraryError('DOCX_INVALID', 'The file is not a valid ZIP/OOXML document.', { cause })
  }

  if (!entries['[Content_Types].xml'] || !entries['word/document.xml']) {
    throw new DocumentLibraryError('DOCX_INVALID', 'Required DOCX OOXML parts are missing.')
  }

  onProgress?.(10, 'parsing')

  // Step 2: Get document XML as string
  const { strFromU8 } = await import('fflate')
  const documentXml = strFromU8(entries['word/document.xml'])

  // Step 3: Extract media references
  const media: Record<string, Uint8Array> = {}
  for (const [name, data] of Object.entries(entries)) {
    if (name.startsWith('word/media/') && !name.endsWith('/')) {
      media[name] = data
    }
  }

  // Step 4: Stream-parse paragraphs
  const allNodes: JSONContent[] = []
  const issues: CompatibilityIssue[] = []
  let totalParagraphs = 0
  let processedChunks = 0

  // Count total blocks for progress
  const totalBlocks = (documentXml.match(/<w:p\b/gi) || []).length +
    (documentXml.match(/<w:tbl\b/gi) || []).length

  // Process in chunks
  for (const chunk of chunkDocumentXml(documentXml, chunkSize)) {
    if (chunk.type === 'paragraph') {
      // Parse individual paragraphs from chunk
      const paragraphPattern = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi
      let pm: RegExpExecArray | null
      while ((pm = paragraphPattern.exec(chunk.xml)) !== null) {
        const parsed = parseWordParagraph(pm[0])

        // Handle page breaks
        if (parsed.pageBreak) {
          allNodes.push({ type: 'pageBreak' })
        }

        // Handle pageBreakBefore
        if (parsed.pageBreakBefore && allNodes.length > 0) {
          allNodes.push({ type: 'pageBreak' })
        }

        const node = parsedParagraphToNode(parsed)
        allNodes.push(node)
        totalParagraphs++
      }
    } else if (chunk.type === 'table') {
      // Parse table from chunk
      const tableNode = parseTableChunk(chunk.xml)
      if (tableNode) allNodes.push(tableNode)
    } else if (chunk.type === 'section') {
      // Section breaks - extract section properties
      const sectionMatch = chunk.xml.match(/<w:sectPr\b[^>]*>([\s\S]*?)<\/w:sectPr>/i)
      if (sectionMatch) {
        allNodes.push({
          type: 'sectionBreak',
          attrs: {
            id: `section-${allNodes.length}`,
            type: 'nextPage',
          },
        })
      }
    }

    processedChunks++
    const percent = Math.min(90, 10 + (processedChunks / Math.ceil(totalBlocks / chunkSize)) * 80)
    onProgress?.(percent, 'parsing')
  }

  onProgress?.(90, 'building')

  // Step 5: Build document state
  const content: JSONContent = {
    type: 'doc',
    content: allNodes.length ? allNodes : [{ type: 'paragraph' }],
  }

  const state = createEmptyDocumentState({ content })

  onProgress?.(100, 'complete')

  const elapsedMs = performance.now() - startTime
  const memory = (performance as any).memory
  const memoryUsageMB = memory
    ? Math.round(memory.usedJSHeapSize / 1024 / 1024)
    : 0

  return {
    state,
    report: {
      profile,
      supported: !issues.some((i) => i.severity === 'error'),
      issues,
    },
    stats: {
      totalParagraphs,
      processedChunks,
      totalChunks: Math.ceil(totalBlocks / chunkSize),
      elapsedMs: Math.round(elapsedMs),
      memoryUsageMB,
    },
  }
}

// ─── Table Parser ───────────────────────────────────────────────────────────

function parseTableChunk(xml: string): JSONContent | null {
  const rows: JSONContent[] = []

  const rowPattern = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/gi
  let rm: RegExpExecArray | null
  while ((rm = rowPattern.exec(xml)) !== null) {
    const cells: JSONContent[] = []
    const cellPattern = /<w:(?:tc|th)\b[^>]*>([\s\S]*?)<\/w:(?:tc|th)>/gi
    let cm: RegExpExecArray | null
    while ((cm = cellPattern.exec(rm[1])) !== null) {
      const isHeader = /<w:th\b/i.test(cm[0])
      const cellContent = cm[1]

      // Extract cell properties
      const colspanMatch = cellContent.match(/w:gridSpan="(\d+)"/i)
      const rowspanMatch = cellContent.match(/w:vMerge(?:\s|w:val="restart")/i)

      // Extract cell content (paragraphs)
      const cellParagraphs: JSONContent[] = []
      const pPattern = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi
      let pm: RegExpExecArray | null
      while ((pm = pPattern.exec(cellContent)) !== null) {
        const parsed = parseWordParagraph(pm[0])
        cellParagraphs.push(parsedParagraphToNode(parsed))
      }

      cells.push({
        type: isHeader ? 'tableHeader' : 'tableCell',
        attrs: {
          colspan: colspanMatch ? Number(colspanMatch[1]) : 1,
          rowspan: rowspanMatch ? 1 : 1,
        },
        content: cellParagraphs.length ? cellParagraphs : [{ type: 'paragraph' }],
      })
    }

    if (cells.length) {
      rows.push({
        type: 'tableRow',
        content: cells,
      })
    }
  }

  if (!rows.length) return null

  return {
    type: 'table',
    content: rows,
  }
}

export default streamingImportDocx
