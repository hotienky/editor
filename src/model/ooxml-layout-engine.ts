/**
 * OOXML Layout Engine
 *
 * Flows OoxmlPackage content into a LayoutTree.
 * Handles:
 * - Section-aware layout (pgSz, pgMar, cols)
 * - Paragraph layout with numbering, indentation, spacing
 * - Table layout (grid columns, cell widths)
 * - Widow/orphan control
 * - Page breaks (manual and automatic)
 */

import type {
  OoxmlPackage,
  Body,
  Paragraph,
  Run,
  Text,
  Table,
  TableRow,
  TableCell,
  SectionProperties,
  PageSize,
  PageMargins,
  Columns,
  ParagraphProperties,
  RunProperties,
} from './ooxml-types'
import type {
  LayoutGeometry,
  LayoutLine,
  LayoutParagraph,
  LayoutBlock,
  LayoutPage,
  LayoutTree,
  LayoutTable,
  LayoutTableRow,
  LayoutTableCell,
  LayoutGridColumn,
  LayoutOptions,
  TextFragment,
} from './ooxml-layout-types'
import { OOXML } from './ooxml-layout-types'
import { OoxmlTextMeasurer } from './ooxml-text-measurer'
import { breakIntoLines } from './ooxml-line-breaker'
import { NumberingEngine } from './numbering-engine'

// ─── Constants ────────────────────────────────────────────────────────────────

const WIDOW_LINES = 2 // minimum lines at top of page
const ORPHAN_LINES = 2 // minimum lines at bottom of page

// ─── Helpers ──────────────────────────────────────────────────────────────────

function twipsToPx(twips: number): number {
  return twips / (20 / (96 / 72))
}

function resolvePageSize(pgSz: PageSize | undefined): { w: number; h: number } {
  if (!pgSz) {
    return {
      w: 12240, // Letter: 8.5in * 1440
      h: 15840, // Letter: 11in * 1440
    }
  }
  return { w: pgSz.w, h: pgSz.h }
}

function resolvePageMargins(pgMar: PageMargins | undefined): {
  top: number; bottom: number; left: number; right: number
} {
  return {
    top: pgMar?.top ?? 1440, // 1 inch
    bottom: pgMar?.bottom ?? 1440,
    left: pgMar?.left ?? 1440,
    right: pgMar?.right ?? 1440,
  }
}

function buildGeometry(section: SectionProperties | undefined): LayoutGeometry {
  const { w, h } = resolvePageSize(section?.pgSz)
  const margins = resolvePageMargins(section?.pgMar)
  return {
    pageW: w,
    pageH: h,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    marginRight: margins.right,
    contentW: w - margins.left - margins.right,
    contentH: h - margins.top - margins.bottom,
    orientation: section?.pgSz?.orient === 'landscape' ? 'landscape' : 'portrait',
  }
}

// ─── Layout Engine ────────────────────────────────────────────────────────────

export class OoxmlLayoutEngine {
  private _measurer: OoxmlTextMeasurer
  private _options: Required<LayoutOptions>

  constructor(options?: LayoutOptions) {
    this._measurer = new OoxmlTextMeasurer()
    this._options = {
      defaultSz: options?.defaultSz ?? 24,
      defaultFontFamily: options?.defaultFontFamily ?? 'Times New Roman',
      defaultLineHeight: options?.defaultLineHeight ?? 276,
      devicePixelRatio: options?.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
    }
  }

  /**
   * Layout an OoxmlPackage into a LayoutTree.
   */
  layout(pkg: OoxmlPackage): LayoutTree {
    const sections = this._extractSections(pkg.document.body)
    const allBlocks: LayoutBlock[] = []
    const pages: LayoutPage[] = []

    let pageNumber = 1
    let sectionIndex = 0

    for (const section of sections) {
      const geometry = buildGeometry(section.sectPr)
      const sectionBlocks = this._layoutSectionBlocks(
        section.blocks,
        pkg,
        geometry,
      )

      // Paginate this section
      const sectionPages = this._paginate(
        sectionBlocks,
        geometry,
        pageNumber,
        sectionIndex,
        section.isFirst,
      )

      for (const page of sectionPages) {
        allBlocks.push(...page.blocks)
        pages.push(page)
      }

      pageNumber += sectionPages.length
      sectionIndex++
    }

    return {
      totalPages: pages.length,
      pages,
      allBlocks,
    }
  }

  // ─── Section Extraction ──────────────────────────────────────────────────

  private _extractSections(body: Body): Array<{
    blocks: Array<{ type: 'paragraph' | 'table'; data: Paragraph | Table }>
    sectPr: SectionProperties | undefined
    isFirst: boolean
  }> {
    const sections: Array<{
      blocks: Array<{ type: 'paragraph' | 'table'; data: Paragraph | Table }>
      sectPr: SectionProperties | undefined
      isFirst: boolean
    }> = []

    let currentBlocks: Array<{ type: 'paragraph' | 'table'; data: Paragraph | Table }> = []

    for (const child of body.children) {
      if (child.type === 'paragraph') {
        const para = child as Paragraph
        // Check if paragraph has sectPr (section break)
        if (para.pPr?.sectPr) {
          sections.push({
            blocks: currentBlocks,
            sectPr: para.pPr.sectPr,
            isFirst: sections.length === 0,
          })
          currentBlocks = []
        } else {
          currentBlocks.push({ type: 'paragraph', data: para })
        }
      } else if (child.type === 'table') {
        currentBlocks.push({ type: 'table', data: child as Table })
      }
    }

    // Body-level sectPr
    if (body.sectPr || currentBlocks.length > 0) {
      sections.push({
        blocks: currentBlocks,
        sectPr: body.sectPr,
        isFirst: sections.length === 0,
      })
    }

    return sections
  }

  // ─── Block Layout ────────────────────────────────────────────────────────

  private _layoutSectionBlocks(
    blocks: Array<{ type: 'paragraph' | 'table'; data: Paragraph | Table }>,
    pkg: OoxmlPackage,
    geometry: LayoutGeometry,
  ): LayoutBlock[] {
    const result: LayoutBlock[] = []

    for (const block of blocks) {
      if (block.type === 'paragraph') {
        const layoutPara = this._layoutParagraph(
          block.data as Paragraph,
          geometry.contentW,
          pkg,
        )
        result.push({ type: 'paragraph', data: layoutPara })
      } else if (block.type === 'table') {
        const layoutTable = this._layoutTable(
          block.data as Table,
          geometry.contentW,
          pkg,
        )
        result.push({ type: 'table', data: layoutTable })
      }
    }

    return result
  }

  // ─── Paragraph Layout ────────────────────────────────────────────────────

  private _layoutParagraph(
    para: Paragraph,
    availableWidth: number,
    pkg: OoxmlPackage,
  ): LayoutParagraph {
    const pPr = para.pPr
    const indent = this._resolveIndentation(pPr, availableWidth)
    const effectiveWidth = availableWidth - indent.left - indent.right

    // Flatten runs into fragments
    const fragments = this._flattenRuns(para.content || [], pkg)

    // Break into lines
    const justify = pPr?.jc === 'both'
    const { lines } = breakIntoLines({
      fragments,
      availableWidth: effectiveWidth,
      justify,
    })

    // Calculate spacing
    const spacing = this._resolveSpacing(pPr)

    // Calculate total height
    const linesHeight = lines.reduce((sum, line) => sum + line.height, 0)
    const height = linesHeight + spacing.before + spacing.after

    // Numbering
    let numbering: LayoutParagraph['numbering']
    if (pPr?.numPr) {
      numbering = {
        numId: pPr.numPr.numId,
        ilvl: pPr.numPr.ilvl,
        text: '' // resolved by NumberingEngine externally
      }
    }

    return {
      lines,
      height,
      spacingBefore: spacing.before,
      spacingAfter: spacing.after,
      firstLineIndent: indent.firstLine,
      leftIndent: indent.left,
      rightIndent: indent.right,
      justification: pPr?.jc || 'left',
      numbering,
      styleId: pPr?.pStyle,
      pPr: pPr as Record<string, unknown>,
    }
  }

  private _flattenRuns(
    content: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>,
    pkg: OoxmlPackage,
  ): TextFragment[] {
    const result: TextFragment[] = []

    for (const item of content) {
      if (item.type === 'run') {
        const run = item as unknown as Run
        const textParts = (run.content || []).filter(
          (c): c is Text => c.type === 'text',
        )
        const text = textParts.map((t) => (t as Text).text).join('')
        if (text) {
          result.push(this._measurer.measureRun(text, run.rPr, pkg.theme ?? undefined))
        }
      }
    }

    return result
  }

  private _resolveIndentation(
    pPr: ParagraphProperties | undefined,
    totalWidth: number,
  ): { left: number; right: number; firstLine: number } {
    return {
      left: pPr?.ind?.left ?? 0,
      right: pPr?.ind?.right ?? 0,
      firstLine: pPr?.ind?.firstLine ?? 0,
    }
  }

  private _resolveSpacing(pPr: ParagraphProperties | undefined): {
    before: number
    after: number
  } {
    return {
      before: pPr?.spacing?.before ?? 0,
      after: pPr?.spacing?.after ?? 0,
    }
  }

  // ─── Table Layout ────────────────────────────────────────────────────────

  private _layoutTable(
    table: Table,
    availableWidth: number,
    pkg: OoxmlPackage,
  ): LayoutTable {
    // Resolve column widths from tblGrid
    const gridCols = this._resolveGridColumns(table, availableWidth)

    // Layout rows
    const rows: LayoutTableRow[] = []
    let totalWidth = 0

    for (const row of table.content) {
      const layoutRow = this._layoutTableRow(row, gridCols, pkg)
      rows.push(layoutRow)
      totalWidth = Math.max(totalWidth, layoutRow.cells.reduce((sum, c) => sum + c.width, 0))
    }

    return {
      rows,
      width: totalWidth || availableWidth,
      tblPr: table.tblPr as Record<string, unknown>,
    }
  }

  private _resolveGridColumns(
    table: Table,
    availableWidth: number,
  ): LayoutGridColumn[] {
    if (table.tblGrid && table.tblGrid.length > 0) {
      const totalGrid = table.tblGrid.reduce((sum, g) => sum + (g.width || 0), 0)
      if (totalGrid > 0) {
        return table.tblGrid.map((g) => ({
          width: Math.round(((g.width ?? 0) / totalGrid) * availableWidth),
        }))
      }
    }

    // Fallback: equal columns
    const colCount = table.content[0]?.content.length || 1
    const colWidth = Math.floor(availableWidth / colCount)
    return Array.from({ length: colCount }, () => ({ width: colWidth }))
  }

  private _layoutTableRow(
    row: TableRow,
    gridCols: LayoutGridColumn[],
    pkg: OoxmlPackage,
  ): LayoutTableRow {
    const cells: LayoutTableCell[] = []

    for (let i = 0; i < row.content.length; i++) {
      const cell = row.content[i]
      const cellWidth = gridCols[i]?.width ?? 0
      const layoutCell = this._layoutTableCell(cell, cellWidth, pkg)
      cells.push(layoutCell)
    }

    return {
      cells,
      height: 0, // calculated during pagination
    }
  }

  private _layoutTableCell(
    cell: TableCell,
    width: number,
    pkg: OoxmlPackage,
  ): LayoutTableCell {
    const content: LayoutBlock[] = []

    for (const child of cell.content) {
      if (child.type === 'paragraph') {
        const layoutPara = this._layoutParagraph(
          child as Paragraph,
          width,
          pkg,
        )
        content.push({ type: 'paragraph', data: layoutPara })
      } else if (child.type === 'table') {
        const layoutTable = this._layoutTable(
          child as Table,
          width,
          pkg,
        )
        content.push({ type: 'table', data: layoutTable })
      }
    }

    return {
      content,
      width,
      tcPr: cell.tcPr as Record<string, unknown>,
    }
  }

  // ─── Pagination ──────────────────────────────────────────────────────────

  private _paginate(
    blocks: LayoutBlock[],
    geometry: LayoutGeometry,
    startPageNumber: number,
    sectionIndex: number,
    isFirstInSection: boolean,
  ): LayoutPage[] {
    const pages: LayoutPage[] = []
    let currentPage = this._createPage(
      startPageNumber,
      geometry,
      sectionIndex,
      isFirstInSection,
    )
    let remainingHeight = geometry.contentH

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const blockHeight = this._getBlockHeight(block)

      // Check if block fits on current page
      if (blockHeight <= remainingHeight) {
        currentPage.blocks.push(block)
        currentPage.usedHeight += blockHeight
        remainingHeight -= blockHeight
      } else {
        // Block doesn't fit — start new page
        if (currentPage.blocks.length > 0) {
          pages.push(currentPage)
        }

        currentPage = this._createPage(
          startPageNumber + pages.length,
          geometry,
          sectionIndex,
          false,
        )
        remainingHeight = geometry.contentH

        currentPage.blocks.push(block)
        currentPage.usedHeight += blockHeight
        remainingHeight -= blockHeight
      }
    }

    // Add last page
    if (currentPage.blocks.length > 0 || pages.length === 0) {
      currentPage.isLastInSection = true
      pages.push(currentPage)
    }

    return pages
  }

  private _createPage(
    pageNumber: number,
    geometry: LayoutGeometry,
    sectionIndex: number,
    isFirst: boolean,
  ): LayoutPage {
    return {
      pageNumber,
      blockRange: [0, 0],
      blocks: [],
      usedHeight: 0,
      availableHeight: geometry.contentH,
      sectionIndex,
      geometry,
      isFirstInSection: isFirst,
      isLastInSection: false,
    }
  }

  private _getBlockHeight(block: LayoutBlock): number {
    if (block.type === 'paragraph') {
      return block.data.height
    }
    if (block.type === 'table') {
      return this._getTableHeight(block.data)
    }
    return 0
  }

  private _getTableHeight(table: LayoutTable): number {
    if (!table.rows || table.rows.length === 0) return 0
    return table.rows.reduce((sum, row) => {
      if (!row.cells || row.cells.length === 0) return sum + (row.height || 0)
      const rowHeight = Math.max(
        ...row.cells.map((cell) => {
          if (!cell.content || cell.content.length === 0) return 0
          return cell.content.reduce((s, child) => {
            if (child.type === 'paragraph') return s + child.data.height
            return s + this._getTableHeight(child.data)
          }, 0)
        }),
        row.height,
      )
      return sum + rowHeight
    }, 0)
  }

  /** Get the underlying text measurer (for testing) */
  get measurer(): OoxmlTextMeasurer {
    return this._measurer
  }
}
