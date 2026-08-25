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
  TrackedRun,
  Spacing,
  TableProperties,
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
import { StyleResolver } from './style-resolver'
import { FontLoader } from './font-loader'

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
  private _resolver: StyleResolver | null = null
  private _numbering: NumberingEngine | null = null
  private _fontLoader: FontLoader | null = null

  constructor(options?: LayoutOptions) {
    this._fontLoader = new FontLoader()
    this._measurer = new OoxmlTextMeasurer(this._fontLoader)
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
    // Create StyleResolver from package styles and theme
    this._resolver = new StyleResolver(pkg.styles, pkg.theme)
    this._numbering = new NumberingEngine(pkg.numbering)

    // Load fonts before layout (non-blocking — uses available system fonts)
    this._fontLoader?.loadFonts(pkg.fontTable, pkg.theme)

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

      // Resolve section headers and footers (ISO/IEC 29500 §17.10)
      let headerLayout: { blocks: LayoutBlock[]; height: number } | undefined
      if (pkg.headers && pkg.headers.size > 0) {
        const headerPart = Array.from(pkg.headers.values())[0]
        if (headerPart && headerPart.content.length > 0) {
          const hBlocks = this._layoutSectionBlocks(
            headerPart.content.map(c => ({ type: c.type, data: c })),
            pkg,
            geometry
          )
          const hHeight = hBlocks.reduce((s, b) => s + this._getBlockHeight(b), 0)
          headerLayout = { blocks: hBlocks, height: hHeight }
        }
      }

      let footerLayout: { blocks: LayoutBlock[]; height: number } | undefined
      if (pkg.footers && pkg.footers.size > 0) {
        const footerPart = Array.from(pkg.footers.values())[0]
        if (footerPart && footerPart.content.length > 0) {
          const fBlocks = this._layoutSectionBlocks(
            footerPart.content.map(c => ({ type: c.type, data: c })),
            pkg,
            geometry
          )
          const fHeight = fBlocks.reduce((s, b) => s + this._getBlockHeight(b), 0)
          footerLayout = { blocks: fBlocks, height: fHeight }
        }
      }

      for (const page of sectionPages) {
        if (headerLayout) page.header = headerLayout
        if (footerLayout) page.footer = footerLayout
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
    const rawPPr = para.pPr

    // Resolve full style cascade: docDefaults → basedOn chain → style → direct formatting
    let resolvedPPr = rawPPr
    let defaultRPr: RunProperties | undefined

    if (this._resolver) {
      const resolved = this._resolver.resolveParagraph(rawPPr?.pStyle, rawPPr)
      resolvedPPr = resolved.pPr
      defaultRPr = resolved.rPr
    }

    let pPr = resolvedPPr

    // Numbering — resolve text from NumberingEngine (do this first to get level indentation)
    let numbering: LayoutParagraph['numbering']
    let numberingFragment: TextFragment | null = null
    if (pPr?.numPr && this._numbering && pPr.numPr.numId > 0) {
      const resolved = this._numbering.resolve(pPr.numPr.numId, pPr.numPr.ilvl)
      if (resolved) {
        numbering = {
          numId: pPr.numPr.numId,
          ilvl: pPr.numPr.ilvl,
          text: resolved.text,
        }
        // Apply numbering level indentation if paragraph doesn't have its own
        if (resolved.pPr?.ind && !pPr?.ind) {
          pPr = { ...pPr, ind: resolved.pPr.ind }
        }
        // Create a TextFragment for the numbering prefix
        numberingFragment = this._measurer.measureRun(
          resolved.text,
          { ...(resolved.rPr as RunProperties), ...(defaultRPr as RunProperties) } as RunProperties,
          pkg.theme ?? undefined,
          'numbering',
        )
        // Add suffix (tab after numbering by default)
        const tabWidth = this._resolveNumberingTabWidth(pPr, resolved)
        numberingFragment = {
          ...numberingFragment,
          width: numberingFragment.width + tabWidth,
          widthPx: twipsToPx(numberingFragment.width + tabWidth),
        }
      }
    }

    const indent = this._resolveIndentation(pPr, availableWidth)
    const effectiveWidth = availableWidth - indent.left - indent.right

    // Flatten runs into fragments — merge paragraph default rPr into each run
    let fragments = this._flattenRuns(para.content || [], pkg, pPr, defaultRPr)

    // Prepend numbering fragment if resolved
    if (numberingFragment) {
      fragments = [numberingFragment, ...fragments]
    }

    // Break into lines
    const justify = pPr?.jc === 'both'
    let { lines } = breakIntoLines({
      fragments,
      availableWidth: effectiveWidth,
      justify,
    })

    // Calculate spacing — use resolved spacing from style cascade
    const spacing = this._resolveSpacing(pPr)

    // Calculate total height — include line spacing
    const linesHeight = lines.reduce((sum, line) => sum + line.height, 0)
    const lineHeight = this._resolveLineHeight(pPr, this._options.defaultLineHeight)
    // If line spacing is specified, adjust line heights proportionally
    const totalLinesHeight = pPr?.spacing?.line
      ? lines.reduce((sum, line) => sum + this._adjustLineHeight(line.height, pPr.spacing!), 0)
      : linesHeight
    const height = totalLinesHeight + spacing.before + spacing.after

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
      styleId: rawPPr?.pStyle,
      pPr: pPr as Record<string, unknown>,
      keepNext: pPr?.keepNext,
      keepLines: pPr?.keepLines,
      widowControl: pPr?.widowControl !== false,
      pageBreakBefore: pPr?.pageBreakBefore,
      tabs: pPr?.tabs as LayoutParagraph['tabs'],
    }
  }

  private _flattenRuns(
    content: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>,
    pkg: OoxmlPackage,
    pPr?: ParagraphProperties,
    defaultRPr?: RunProperties,
  ): TextFragment[] {
    const result: TextFragment[] = []

    for (const item of content) {
      if (item.type === 'run') {
        const run = item as unknown as Run
        // Merge paragraph default rPr into run rPr (direct formatting takes priority)
        const mergedRPr = this._mergeRunPropertiesForRun(defaultRPr, run.rPr)
        for (const node of run.content) {
          if (node.type === 'text') {
            const text = (node as Text).text
            if (text) {
              result.push(this._measurer.measureRun(text, mergedRPr, pkg.theme ?? undefined))
            }
          } else if (node.type === 'break') {
            const br = node as { breakType: string }
            result.push({
              kind: 'break',
              breakType: br.breakType as 'page' | 'column' | 'line',
              text: '',
              width: 0,
              widthPx: 0,
              sz: 0,
              fontFamily: '',
              rPr: mergedRPr as Record<string, unknown>,
            })
          } else if (node.type === 'tab') {
            // Measure following text segment width for Center/Right tab stops (ISO §17.3.1.37)
            const itemIdx = content.indexOf(item)
            const nodeIdx = run.content.indexOf(node)
            const followingWidth = this._measureFollowingSegmentWidth(content, itemIdx, nodeIdx, defaultRPr, pkg)
            const tabWidth = this._calculateTabWidth(result, followingWidth, pPr)
            result.push({
              kind: 'tab',
              text: '',
              width: tabWidth,
              widthPx: twipsToPx(tabWidth),
              sz: 0,
              fontFamily: '',
              rPr: mergedRPr as Record<string, unknown>,
            })
          } else if (node.type === 'footnoteReference') {
            const ref = node as { id: number }
            result.push(this._measurer.measureRun(
              `[${ref.id}]`,
              { ...mergedRPr, vertAlign: 'superscript', sz: 16 } as any,
              pkg.theme ?? undefined,
              'footnoteRef',
              ref.id,
            ))
          } else if (node.type === 'endnoteReference') {
            const ref = node as { id: number }
            result.push(this._measurer.measureRun(
              `[${ref.id}]`,
              { ...mergedRPr, vertAlign: 'superscript', sz: 16 } as any,
              pkg.theme ?? undefined,
              'endnoteRef',
              ref.id,
            ))
          } else if (node.type === 'drawing') {
            // Support both inline drawings and floating anchor drawings (ISO/IEC 29500 §19)
            const drawing = node as unknown as { type: string; inline?: any; anchor?: any }
            const extent = drawing.inline?.extent || drawing.anchor?.extent
            if (extent) {
              const emuW = extent.cx || 0
              const emuH = extent.cy || 0
              const widthTwips = Math.round(emuW / 914400 * 1440)
              const heightTwips = Math.round(emuH / 914400 * 1440)
              result.push({
                kind: 'drawing',
                text: '',
                width: widthTwips,
                widthPx: twipsToPx(widthTwips),
                sz: 0,
                fontFamily: '',
                rPr: {
                  ...mergedRPr,
                  drawingExtent: extent,
                  drawingBlip: drawing.inline?.blip || drawing.anchor?.blip,
                  drawingAnchor: drawing.anchor,
                  heightTwips,
                } as any,
              })
            }
          }
        }
      } else if (item.type === 'hyperlink') {
        const link = item as unknown as { content: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }
        for (const child of link.content) {
          if (child.type === 'run') {
            const run = child as unknown as Run
            const mergedRPr = this._mergeRunPropertiesForRun(defaultRPr, run.rPr)
            for (const node of run.content) {
              if (node.type === 'text') {
                const text = (node as Text).text
                if (text) {
                  result.push(this._measurer.measureRun(text, mergedRPr, pkg.theme ?? undefined))
                }
              }
            }
          }
        }
      } else if (item.type === 'ins' || item.type === 'del') {
        // Walk into tracked changes — flatten the contained runs
        const tracked = item as unknown as TrackedRun
        for (const run of tracked.content) {
          const mergedRPr = this._mergeRunPropertiesForRun(defaultRPr, run.rPr)
          for (const node of run.content) {
            if (node.type === 'text') {
              const text = (node as Text).text
              if (text) {
                result.push(this._measurer.measureRun(text, mergedRPr, pkg.theme ?? undefined))
              }
            }
          }
        }
      }
    }

    return result
  }

  /**
   * Merge paragraph default rPr into a run's rPr.
   * Direct formatting (run-level) takes priority over paragraph defaults.
   */
  private _mergeRunPropertiesForRun(
    defaultRPr: RunProperties | undefined,
    runRPr: RunProperties | undefined,
  ): RunProperties | undefined {
    if (!defaultRPr && !runRPr) return undefined
    if (!defaultRPr) return runRPr
    if (!runRPr) return { ...defaultRPr }

    const merged: RunProperties = { ...defaultRPr }

    for (const [key, value] of Object.entries(runRPr)) {
      if (value === undefined) continue
      if (key === 'rFonts' && typeof value === 'object') {
        // Merge individual rFonts attributes
        if (!merged.rFonts) {
          merged.rFonts = { ...value }
        } else {
          for (const [attr, fontName] of Object.entries(value)) {
            if (fontName !== undefined) {
              ;(merged.rFonts as any)[attr] = fontName
            }
          }
        }
      } else {
        // Override directly
        ;(merged as any)[key] = value
      }
    }

    return merged
  }

  /**
   * Calculate the width to the next tab stop.
   * Falls back to a default 720 twips (0.5 inch) if no tab stops defined.
   */
  /**
   * Measure the width of following text runs in the current segment (until next tab or break).
   * Needed for ISO/IEC 29500 §17.3.1.37 Center and Right Tab Stop positioning.
   */
  private _measureFollowingSegmentWidth(
    content: Array<{ type: string; content?: any[] }>,
    startItemIdx: number,
    startNodeIdx: number,
    defaultRPr: RunProperties | undefined,
    pkg: OoxmlPackage,
  ): number {
    let width = 0
    for (let i = startItemIdx; i < content.length; i++) {
      const item = content[i]
      if (item.type === 'run') {
        const run = item as unknown as Run
        const mergedRPr = this._mergeRunPropertiesForRun(defaultRPr, run.rPr)
        const nodes = run.content || []
        const startN = (i === startItemIdx) ? startNodeIdx + 1 : 0
        for (let j = startN; j < nodes.length; j++) {
          const node = nodes[j]
          if (node.type === 'tab' || node.type === 'break') {
            return width
          }
          if (node.type === 'text') {
            const t = (node as Text).text
            if (t) {
              const frag = this._measurer.measureRun(t, mergedRPr, pkg.theme ?? undefined)
              width += frag.width
            }
          }
        }
      }
    }
    return width
  }

  /**
   * Calculate the width to the next tab stop with ISO/IEC 29500 §17.3.1.37 compliance.
   * Supports left, center, right tab alignments.
   */
  private _calculateTabWidth(
    fragments: TextFragment[],
    followingWidth: number,
    pPr?: ParagraphProperties,
  ): number {
    // Calculate current X position including paragraph indentation (ISO §17.3.1.37)
    let startIndent = 0
    if (pPr?.ind) {
      const left = pPr.ind.left ?? 0
      const firstLine = pPr.ind.hanging ? -pPr.ind.hanging : (pPr.ind.firstLine ?? 0)
      startIndent = left + firstLine
    }
    let currentX = startIndent
    for (const f of fragments) {
      currentX += f.width
    }

    const defaultInterval = 720 // 0.5 inch in twips
    const tabStops = pPr?.tabs

    if (tabStops && tabStops.length > 0) {
      const sorted = [...tabStops].sort((a, b) => a.pos - b.pos)
      for (const ts of sorted) {
        // ISO §17.3.1.37: Center tab centers following text around ts.pos
        // Right tab aligns right edge of following text at ts.pos
        // Left tab aligns left edge of following text at ts.pos
        let targetStartX = ts.pos
        if (ts.val === 'center') {
          targetStartX = ts.pos - Math.round(followingWidth / 2)
        } else if (ts.val === 'right') {
          targetStartX = ts.pos - followingWidth
        }

        if (targetStartX > currentX || ts.pos > currentX) {
          return Math.max(50, targetStartX - currentX)
        }
      }
    }

    // Snap to the next default tab stop boundary (Left tab)
    const nextTabStop = Math.ceil((currentX + 1) / defaultInterval) * defaultInterval
    return Math.max(50, nextTabStop - currentX)
  }

  private _resolveIndentation(
    pPr: ParagraphProperties | undefined,
    totalWidth: number,
  ): { left: number; right: number; firstLine: number } {
    const ind = pPr?.ind
    // In OOXML, hanging = negative firstLine indent
    let firstLine = ind?.firstLine ?? 0
    if (ind?.hanging && !ind?.firstLine) {
      firstLine = -ind.hanging
    }
    return {
      left: ind?.left ?? 0,
      right: ind?.right ?? 0,
      firstLine,
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

  /**
   * Resolve line height from paragraph spacing.
   * In OOXML, spacing.line with lineRule="auto" uses 240 = single spacing (100% of font size).
   */
  private _resolveLineHeight(pPr: ParagraphProperties | undefined, defaultLineHeight: number): number {
    const line = pPr?.spacing?.line
    const lineRule = pPr?.spacing?.lineRule

    if (line === undefined) return defaultLineHeight

    if (lineRule === 'auto' || lineRule === undefined) {
      // Proportional: 240 = single spacing, 480 = double, etc.
      // Convert to twips: proportion * fontSize
      const sz = pPr?.rPr?.sz ?? 24 // half-points
      const sizeTwips = sz * 10 // half-points → twips (roughly)
      return Math.round((line / 240) * sizeTwips)
    }

    // "atLeast" or "exact": line value is in twips
    return line
  }

  /**
   * Adjust a single line's height based on paragraph line spacing.
   */
  private _adjustLineHeight(baseHeight: number, spacing: Spacing): number {
    const line = spacing.line
    const lineRule = spacing.lineRule

    if (!line) return baseHeight

    if (lineRule === 'auto' || lineRule === undefined) {
      // Proportional: 240 = single spacing
      return Math.round(baseHeight * (line / 240))
    }

    // "atLeast" or "exact": use the exact value
    return line
  }

  /**
   * Resolve the tab width for numbering suffix.
   * In OOXML, numbering is typically followed by a tab character.
   * We find the first tab stop position from the paragraph's tab stops.
   */
  private _resolveNumberingTabWidth(pPr: ParagraphProperties, _resolved: { pPr?: { tabs?: Array<{ val: string; pos: number }> } }): number {
    // Default tab stop: 720 twips (half inch)
    const defaultTabWidth = 720

    // Check paragraph tab stops
    const tabs = pPr?.tabs
    if (tabs && tabs.length > 0) {
      // Find the first left tab stop after the numbering indent
      const leftTabs = tabs.filter(t => t.val === 'left' || t.val === undefined)
      if (leftTabs.length > 0) {
        return leftTabs[0].pos
      }
    }

    return defaultTabWidth
  }

  // ─── Table Layout ────────────────────────────────────────────────────────

  private _layoutTable(
    table: Table,
    availableWidth: number,
    pkg: OoxmlPackage,
  ): LayoutTable {
    // Resolve table style cascade
    let resolvedTblPr = table.tblPr
    if (this._resolver && table.tblPr) {
      const resolved = this._resolver.resolveTable(table.tblPr.tblStyle, table.tblPr)
      if (resolved.tblPr) {
        resolvedTblPr = { ...resolved.tblPr, ...table.tblPr }
      }
    }

    // Resolve column widths from tblGrid
    const gridCols = this._resolveGridColumns(table, availableWidth)

    // Layout rows
    const rows: LayoutTableRow[] = []
    let totalWidth = 0

    for (let ri = 0; ri < table.content.length; ri++) {
      const row = table.content[ri]
      const layoutRow = this._layoutTableRow(row, gridCols, pkg, resolvedTblPr, ri, table.content.length)
      rows.push(layoutRow)
      totalWidth = Math.max(totalWidth, layoutRow.cells.reduce((sum, c) => sum + c.width, 0))
    }

    return {
      rows,
      width: totalWidth || availableWidth,
      tblPr: resolvedTblPr as Record<string, unknown>,
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
    tblPr?: TableProperties,
    rowIndex?: number,
    totalRows?: number,
  ): LayoutTableRow {
    const cells: LayoutTableCell[] = []

    // Resolve table look flags for conditional formatting
    const tblLook = tblPr?.tblLook
    const isFirstRow = rowIndex === 0 && tblLook?.firstRow !== false
    const isLastRow = rowIndex === (totalRows ?? 0) - 1 && tblLook?.lastRow !== false
    const isOddRow = (rowIndex ?? 0) % 2 === 0

    // Determine conditional formatting band
    const bandSize = tblPr?.tblStyleRowBandSize ?? 1
    const bandIndex = Math.floor((rowIndex ?? 0) / bandSize)

    let colIdx = 0
    for (let i = 0; i < row.content.length; i++) {
      const cell = row.content[i]
      const tcPr = cell.tcPr as any
      const gridSpan = Number(tcPr?.gridSpan ?? 1)

      // Accumulate widths of all spanned columns (ISO/IEC 29500 §17.4.17)
      let cellWidth = 0
      for (let k = 0; k < gridSpan; k++) {
        cellWidth += gridCols[colIdx + k]?.width ?? 0
      }
      if (cellWidth === 0) {
        cellWidth = gridCols[colIdx]?.width ?? 0
      }

      const isFirstCol = colIdx === 0
      const isLastCol = colIdx + gridSpan >= gridCols.length
      const layoutCell = this._layoutTableCell(
        cell,
        cellWidth,
        pkg,
        tblPr,
        isFirstRow,
        isLastRow,
        isFirstCol,
        isLastCol,
      )
      cells.push(layoutCell)
      colIdx += gridSpan
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
    tblPr?: TableProperties,
    isFirstRow?: boolean,
    isLastRow?: boolean,
    isFirstCol?: boolean,
    isLastCol?: boolean,
  ): LayoutTableCell {
    const content: LayoutBlock[] = []

    // Subtract cell margins / padding so text inside cell does not overflow or wrap unnecessarily
    const tcPr = cell.tcPr as any
    const marLeft = tcPr?.tcMar?.left?.w ?? tblPr?.tblCellMar?.left?.w ?? 108 // ~5.4pt default
    const marRight = tcPr?.tcMar?.right?.w ?? tblPr?.tblCellMar?.right?.w ?? 108
    const cellContentWidth = Math.max(100, width - marLeft - marRight)

    for (const child of cell.content) {
      if (child.type === 'paragraph') {
        const layoutPara = this._layoutParagraph(
          child as Paragraph,
          cellContentWidth,
          pkg,
        )
        content.push({ type: 'paragraph', data: layoutPara })
      } else if (child.type === 'table') {
        const layoutTable = this._layoutTable(
          child as Table,
          cellContentWidth,
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

    // Pre-compute keepNext chains: find groups of blocks that must stay together
    const keepGroups = this._computeKeepGroups(blocks)

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const blockHeight = this._getBlockHeight(block)

      // pageBreakBefore: force new page
      if (block.type === 'paragraph' && block.data.pageBreakBefore) {
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
      }

      // Check if this block is part of a keepNext group
      const groupId = keepGroups.get(i)
      if (groupId !== undefined) {
        // Find the full group
        const groupStart = keepGroups.get(i) ?? i
        let groupEnd = i
        while (groupEnd + 1 < blocks.length && keepGroups.get(groupEnd + 1) === groupId) {
          groupEnd++
        }

        // Calculate total group height
        let groupHeight = 0
        for (let g = groupStart; g <= groupEnd; g++) {
          groupHeight += this._getBlockHeight(blocks[g])
        }

        // If the whole group doesn't fit, move it to next page
        if (groupHeight > remainingHeight && currentPage.blocks.length > 0) {
          pages.push(currentPage)
          currentPage = this._createPage(
            startPageNumber + pages.length,
            geometry,
            sectionIndex,
            false,
          )
          remainingHeight = geometry.contentH
        }

        // Add blocks from groupStart to groupEnd
        for (let g = groupStart; g <= groupEnd; g++) {
          if (g < i) continue // already processed
          const gBlock = blocks[g]
          const gHeight = this._getBlockHeight(gBlock)

          if (gBlock.type === 'paragraph' && gBlock.data.keepLines) {
            // keepLines: try to fit entire paragraph, or move to next page
            if (gHeight > remainingHeight && currentPage.blocks.length > 0) {
              pages.push(currentPage)
              currentPage = this._createPage(
                startPageNumber + pages.length,
                geometry,
                sectionIndex,
                false,
              )
              remainingHeight = geometry.contentH
            }
          }

          currentPage.blocks.push(gBlock)
          currentPage.usedHeight += gHeight
          remainingHeight -= gHeight
        }

        i = groupEnd // skip processed group
        continue
      }

      // Standard block fitting
      if (blockHeight <= remainingHeight) {
        currentPage.blocks.push(block)
        currentPage.usedHeight += blockHeight
        remainingHeight -= blockHeight
      } else if (block.type === 'paragraph' && block.data.lines.length > 1) {
        // Paragraph splitting: split at line boundary
        const splitResult = this._splitParagraph(block, remainingHeight)
        if (splitResult.first !== null) {
          currentPage.blocks.push(splitResult.first)
          currentPage.usedHeight += splitResult.firstHeight
        }
        // Start new page with remaining lines
        pages.push(currentPage)
        currentPage = this._createPage(
          startPageNumber + pages.length,
          geometry,
          sectionIndex,
          false,
        )
        remainingHeight = geometry.contentH

        if (splitResult.rest !== null) {
          // Apply widow/orphan control on the continuation
          const restHeight = splitResult.restHeight
          if (restHeight > remainingHeight) {
            // Rest doesn't fit — recurse
            currentPage.blocks.push(splitResult.rest)
            currentPage.usedHeight += restHeight
            remainingHeight -= restHeight
          } else {
            currentPage.blocks.push(splitResult.rest)
            currentPage.usedHeight += restHeight
            remainingHeight -= restHeight
          }
        }
      } else if (block.type === 'table') {
        // Table: try row-level splitting
        const splitResult = this._splitTable(block, remainingHeight)
        if (splitResult.first !== null) {
          currentPage.blocks.push(splitResult.first)
          currentPage.usedHeight += splitResult.firstHeight
        }
        pages.push(currentPage)
        currentPage = this._createPage(
          startPageNumber + pages.length,
          geometry,
          sectionIndex,
          false,
        )
        remainingHeight = geometry.contentH

        if (splitResult.rest !== null) {
          currentPage.blocks.push(splitResult.rest)
          currentPage.usedHeight += splitResult.restHeight
          remainingHeight -= splitResult.restHeight
        }
      } else {
        // Block doesn't fit — move to new page
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

  /**
   * Compute keepNext groups: blocks that must stay together.
   * A keepNext group includes a block and all following blocks until one without keepNext.
   */
  private _computeKeepGroups(blocks: LayoutBlock[]): Map<number, number> {
    const groups = new Map<number, number>()
    let groupId = 0

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (block.type === 'paragraph' && block.data.keepNext) {
        // Start or extend a group
        const existingGroup = groups.get(i - 1)
        const gid = existingGroup !== undefined ? existingGroup : groupId++
        groups.set(i, gid)
        // Also mark the next block as part of this group
        if (i + 1 < blocks.length) {
          groups.set(i + 1, gid)
        }
      } else if (groups.has(i)) {
        // Already marked as part of a group (continuation)
        // Mark next block too if current has keepNext
        if (block.type === 'paragraph' && block.data.keepNext && i + 1 < blocks.length) {
          groups.set(i + 1, groups.get(i)!)
        }
      }
    }

    return groups
  }

  /**
   * Split a paragraph at a line boundary.
   * Returns first part (fits on current page) and rest (goes to next page).
   */
  private _splitParagraph(
    block: LayoutBlock & { type: 'paragraph' },
    availableHeight: number,
  ): {
    first: LayoutBlock | null
    firstHeight: number
    rest: LayoutBlock | null
    restHeight: number
  } {
    const para = block.data
    if (para.lines.length <= 1) {
      // Single line — can't split
      return { first: null, firstHeight: 0, rest: block, restHeight: para.height }
    }

    // Find the best split point
    let splitLine = 0
    let accumulatedHeight = 0

    for (let i = 0; i < para.lines.length; i++) {
      const lineHeight = para.lines[i].height
      if (accumulatedHeight + lineHeight > availableHeight) {
        break
      }
      accumulatedHeight += lineHeight
      splitLine = i + 1
    }

    // Ensure minimum lines for widow/orphan control
    const minTopLines = WIDOW_LINES
    const minBottomLines = ORPHAN_LINES

    if (para.widowControl !== false) {
      // Don't leave fewer than minBottomLines at the bottom
      if (para.lines.length - splitLine < minBottomLines && splitLine > 0) {
        splitLine = Math.max(minTopLines, para.lines.length - minBottomLines)
      }
      // Don't leave fewer than minTopLines at the top
      if (splitLine < minTopLines && para.lines.length > minTopLines) {
        splitLine = minTopLines
      }
    }

    // Clamp
    splitLine = Math.max(1, Math.min(splitLine, para.lines.length - 1))

    const firstLines = para.lines.slice(0, splitLine)
    const restLines = para.lines.slice(splitLine)

    const firstHeight = firstLines.reduce((sum, l) => sum + l.height, 0) +
      para.spacingBefore + para.spacingAfter
    const restHeight = restLines.reduce((sum, l) => sum + l.height, 0) +
      para.spacingBefore + para.spacingAfter

    const first: LayoutParagraph = {
      ...para,
      lines: firstLines,
      height: firstHeight,
      // No spacing after on the split (continuation has it)
      spacingAfter: 0,
    }

    const rest: LayoutParagraph = {
      ...para,
      lines: restLines,
      height: restHeight,
      // No spacing before on the continuation
      spacingBefore: 0,
    }

    return {
      first: { type: 'paragraph', data: first },
      firstHeight,
      rest: { type: 'paragraph', data: rest },
      restHeight,
    }
  }

  /**
   * Split a table at row boundaries.
   * Returns rows that fit and rows that go to next page.
   */
  private _splitTable(
    block: LayoutBlock & { type: 'table' },
    availableHeight: number,
  ): {
    first: LayoutBlock | null
    firstHeight: number
    rest: LayoutBlock | null
    restHeight: number
  } {
    const table = block.data
    if (!table.rows || table.rows.length === 0) {
      return { first: null, firstHeight: 0, rest: block, restHeight: 0 }
    }

    let accumulatedHeight = 0
    let splitRow = 0

    for (let i = 0; i < table.rows.length; i++) {
      const rowHeight = this._getRowHeight(table.rows[i])
      if (accumulatedHeight + rowHeight > availableHeight) {
        break
      }
      accumulatedHeight += rowHeight
      splitRow = i + 1
    }

    // Must split at least one row
    if (splitRow === 0) splitRow = 1

    const firstRows = table.rows.slice(0, splitRow)
    const restRows = table.rows.slice(splitRow)

    const firstHeight = firstRows.reduce((sum, r) => sum + this._getRowHeight(r), 0)
    const restHeight = restRows.reduce((sum, r) => sum + this._getRowHeight(r), 0)

    const first: LayoutTable = {
      ...table,
      rows: firstRows,
      width: table.width,
    }

    const rest: LayoutTable = {
      ...table,
      rows: restRows,
      width: table.width,
    }

    return {
      first: { type: 'table', data: first },
      firstHeight,
      rest: restRows.length > 0 ? { type: 'table', data: rest } : null,
      restHeight,
    }
  }

  /**
   * Get the height of a single table row.
   */
  private _getRowHeight(row: LayoutTableRow): number {
    if (!row.cells || row.cells.length === 0) return row.height || 0
    return Math.max(
      ...row.cells.map((cell) => {
        if (!cell.content || cell.content.length === 0) return 0
        return cell.content.reduce((s, child) => {
          if (child.type === 'paragraph') return s + child.data.height
          return s + this._getTableHeight(child.data)
        }, 0)
      }),
      row.height,
    )
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
      return sum + this._getRowHeight(row)
    }, 0)
  }

  /** Get the underlying text measurer (for testing) */
  get measurer(): OoxmlTextMeasurer {
    return this._measurer
  }
}
