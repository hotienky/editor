/**
 * DOCX Fidelity Debugger
 *
 * Analyzes a DOCX file and produces a diagnostic report showing:
 * - Parser statistics (paragraphs, runs, tables, images, etc.)
 * - Unsupported elements that may cause fidelity loss
 * - Font resolution status
 * - Style cascade analysis
 * - Numbering definitions
 * - Layout issues
 *
 * Reference: ISO/IEC 29500 (ECMA-376)
 */

import type {
  OoxmlPackage,
  Paragraph,
  Run,
  Table,
  TableRow,
  TableCell,
  NumberingLevel,
} from './ooxml-types'
import type { LayoutTree, LayoutPage, LayoutBlock } from './ooxml-layout-types'
import { OoxmlLayoutEngine } from './ooxml-layout-engine'
import { extractRequiredFonts } from './font-loader'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FidelityReport {
  /** Document filename */
  filename: string
  /** Analysis timestamp */
  timestamp: string

  /** Parser statistics */
  parser: ParserStats

  /** Unsupported elements */
  unsupported: UnsupportedElement[]

  /** Font analysis */
  fonts: FontAnalysis

  /** Style analysis */
  styles: StyleAnalysis

  /** Numbering analysis */
  numbering: NumberingAnalysis

  /** Layout analysis (if layout was performed) */
  layout?: LayoutAnalysis

  /** Overall fidelity score (0-100) */
  fidelityScore: number

  /** Recommendations for improving fidelity */
  recommendations: string[]
}

export interface ParserStats {
  paragraphs: number
  runs: number
  tables: number
  tableRows: number
  tableCells: number
  images: number
  inlineImages: number
  anchoredImages: number
  hyperlinks: number
  bookmarks: number
  fieldCodes: number
  footnotes: number
  endnotes: number
  comments: number
  trackedChanges: number
  sections: number
}

export interface UnsupportedElement {
  /** Element type */
  type: string
  /** Where it occurs (e.g., "paragraph 42", "table 3, row 5") */
  location: string
  /** Description of the element */
  description: string
  /** Impact on fidelity */
  impact: 'low' | 'medium' | 'high' | 'critical'
  /** Suggested fix */
  fix?: string
}

export interface FontAnalysis {
  /** All font families referenced in the document */
  required: string[]
  /** Theme fonts (major/minor) */
  themeFonts: { major: string; minor: string } | null
  /** Font table entries */
  fontTableEntries: number
  /** Embedded fonts */
  embeddedFonts: string[]
  /** Fonts that may not be available */
  potentialFallbacks: string[]
}

export interface StyleAnalysis {
  /** Total style count */
  totalStyles: number
  /** Paragraph styles */
  paragraphStyles: number
  /** Character styles */
  characterStyles: number
  /** Table styles */
  tableStyles: number
  /** Numbering styles */
  numberingStyles: number
  /** Styles with complex basedOn chains */
  complexInheritance: string[]
  /** Styles using theme fonts */
  themeFontStyles: string[]
  /** Styles using theme colors */
  themeColorStyles: string[]
}

export interface NumberingAnalysis {
  /** Abstract numbering definitions */
  abstractNums: number
  /** Concrete numbering instances */
  numInstances: number
  /** Number formats used */
  numFormats: string[]
  /** Multi-level numbering definitions */
  multiLevelDefs: number
}

export interface LayoutAnalysis {
  /** Total pages */
  totalPages: number
  /** Paragraphs split across pages */
  splitParagraphs: number
  /** Tables split across pages */
  splitTables: number
  /** Overflow content (exceeds page) */
  overflowContent: number
  /** Unresolved objects */
  unresolvedObjects: number
}

// ─── Fidelity Debugger ─────────────────────────────────────────────────────

export class FidelityDebugger {
  /**
   * Analyze a DOCX package and produce a fidelity report.
   */
  analyze(pkg: OoxmlPackage, filename: string = 'document.docx'): FidelityReport {
    const report: FidelityReport = {
      filename,
      timestamp: new Date().toISOString(),
      parser: this._analyzeParser(pkg),
      unsupported: this._findUnsupported(pkg),
      fonts: this._analyzeFonts(pkg),
      styles: this._analyzeStyles(pkg),
      numbering: this._analyzeNumbering(pkg),
      fidelityScore: 0,
      recommendations: [],
    }

    // Calculate fidelity score
    report.fidelityScore = this._calculateFidelityScore(report)
    report.recommendations = this._generateRecommendations(report)

    return report
  }

  /**
   * Analyze with layout (more comprehensive but slower).
   */
  analyzeWithLayout(
    pkg: OoxmlPackage,
    filename: string = 'document.docx',
  ): FidelityReport {
    const report = this.analyze(pkg, filename)

    // Perform layout
    const engine = new OoxmlLayoutEngine()
    const layout = engine.layout(pkg)

    report.layout = this._analyzeLayout(layout)

    // Recalculate fidelity with layout info
    report.fidelityScore = this._calculateFidelityScore(report)
    report.recommendations = this._generateRecommendations(report)

    return report
  }

  /**
   * Format report as human-readable text.
   */
  formatReport(report: FidelityReport): string {
    const lines: string[] = []
    const hr = '═'.repeat(60)

    lines.push(hr)
    lines.push(`  DOCX Fidelity Report: ${report.filename}`)
    lines.push(`  Generated: ${report.timestamp}`)
    lines.push(hr)
    lines.push('')

    // Parser stats
    lines.push('  PARSER STATISTICS')
    lines.push('  ' + '─'.repeat(40))
    const p = report.parser
    lines.push(`    Paragraphs:        ${p.paragraphs}`)
    lines.push(`    Runs:              ${p.runs}`)
    lines.push(`    Tables:            ${p.tables} (${p.tableRows} rows, ${p.tableCells} cells)`)
    lines.push(`    Images:            ${p.images} (${p.inlineImages} inline, ${p.anchoredImages} anchored)`)
    lines.push(`    Hyperlinks:        ${p.hyperlinks}`)
    lines.push(`    Bookmarks:         ${p.bookmarks}`)
    lines.push(`    Field codes:       ${p.fieldCodes}`)
    lines.push(`    Footnotes:         ${p.footnotes}`)
    lines.push(`    Endnotes:          ${p.endnotes}`)
    lines.push(`    Comments:          ${p.comments}`)
    lines.push(`    Tracked changes:   ${p.trackedChanges}`)
    lines.push(`    Sections:          ${p.sections}`)
    lines.push('')

    // Unsupported elements
    if (report.unsupported.length > 0) {
      lines.push('  UNSUPPORTED ELEMENTS')
      lines.push('  ' + '─'.repeat(40))
      for (const u of report.unsupported) {
        const icon = u.impact === 'critical' ? '❌' : u.impact === 'high' ? '⚠️' : u.impact === 'medium' ? '🔸' : '·'
        lines.push(`    ${icon} [${u.impact.toUpperCase()}] ${u.type}`)
        lines.push(`      Location: ${u.location}`)
        lines.push(`      ${u.description}`)
        if (u.fix) lines.push(`      Fix: ${u.fix}`)
      }
      lines.push('')
    }

    // Fonts
    lines.push('  FONT ANALYSIS')
    lines.push('  ' + '─'.repeat(40))
    if (report.fonts.themeFonts) {
      lines.push(`    Theme major font:  ${report.fonts.themeFonts.major}`)
      lines.push(`    Theme minor font:  ${report.fonts.themeFonts.minor}`)
    }
    lines.push(`    Required fonts:    ${report.fonts.required.length}`)
    for (const f of report.fonts.required.slice(0, 10)) {
      lines.push(`      - ${f}`)
    }
    if (report.fonts.required.length > 10) {
      lines.push(`      ... and ${report.fonts.required.length - 10} more`)
    }
    if (report.fonts.potentialFallbacks.length > 0) {
      lines.push(`    Potential fallbacks: ${report.fonts.potentialFallbacks.join(', ')}`)
    }
    lines.push('')

    // Styles
    lines.push('  STYLE ANALYSIS')
    lines.push('  ' + '─'.repeat(40))
    lines.push(`    Total styles:      ${report.styles.totalStyles}`)
    lines.push(`    Paragraph styles:  ${report.styles.paragraphStyles}`)
    lines.push(`    Character styles:  ${report.styles.characterStyles}`)
    lines.push(`    Table styles:      ${report.styles.tableStyles}`)
    lines.push(`    Numbering styles:  ${report.styles.numberingStyles}`)
    if (report.styles.complexInheritance.length > 0) {
      lines.push(`    Complex inheritance:`)
      for (const s of report.styles.complexInheritance.slice(0, 5)) {
        lines.push(`      - ${s}`)
      }
    }
    lines.push('')

    // Numbering
    lines.push('  NUMBERING ANALYSIS')
    lines.push('  ' + '─'.repeat(40))
    lines.push(`    Abstract nums:     ${report.numbering.abstractNums}`)
    lines.push(`    Concrete nums:     ${report.numbering.numInstances}`)
    lines.push(`    Num formats:       ${report.numbering.numFormats.join(', ')}`)
    lines.push(`    Multi-level defs:  ${report.numbering.multiLevelDefs}`)
    lines.push('')

    // Layout
    if (report.layout) {
      lines.push('  LAYOUT ANALYSIS')
      lines.push('  ' + '─'.repeat(40))
      lines.push(`    Total pages:       ${report.layout.totalPages}`)
      lines.push(`    Split paragraphs:  ${report.layout.splitParagraphs}`)
      lines.push(`    Split tables:      ${report.layout.splitTables}`)
      lines.push(`    Overflow content:  ${report.layout.overflowContent}`)
      lines.push(`    Unresolved objs:   ${report.layout.unresolvedObjects}`)
      lines.push('')
    }

    // Fidelity score
    lines.push(hr)
    const score = report.fidelityScore
    const grade = score >= 95 ? 'A' : score >= 85 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F'
    lines.push(`  FIDELITY SCORE: ${score}/100 (Grade: ${grade})`)
    lines.push(hr)
    lines.push('')

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('  RECOMMENDATIONS')
      lines.push('  ' + '─'.repeat(40))
      for (let i = 0; i < report.recommendations.length; i++) {
        lines.push(`    ${i + 1}. ${report.recommendations[i]}`)
      }
    }

    return lines.join('\n')
  }

  // ─── Internal Analysis Methods ──────────────────────────────────────────

  private _analyzeParser(pkg: OoxmlPackage): ParserStats {
    const body = pkg.document.body
    let paragraphs = 0
    let runs = 0
    let tables = 0
    let tableRows = 0
    let tableCells = 0
    let images = 0
    let inlineImages = 0
    let anchoredImages = 0
    let hyperlinks = 0
    let bookmarks = 0
    let fieldCodes = 0

    const countBlock = (block: any) => {
      if (block.type === 'paragraph') {
        paragraphs++
        const p = block as Paragraph
        for (const item of p.content) {
          if (item.type === 'run') {
            runs++
          } else if (item.type === 'hyperlink') {
            hyperlinks++
            for (const child of (item as any).content) {
              if (child.type === 'run') runs++
            }
          } else if (item.type === 'bookmarkStart' || item.type === 'bookmarkEnd') {
            bookmarks++
          } else if (item.type === 'fldChar' || item.type === 'instrText') {
            fieldCodes++
          }
        }
      } else if (block.type === 'table') {
        tables++
        const t = block as Table
        for (const row of t.rows) {
          tableRows++
          for (const cell of row.cells) {
            tableCells++
            for (const child of cell.content) {
              countBlock(child)
            }
          }
        }
      }
    }

    for (const child of body.children) {
      countBlock(child)
    }

    return {
      paragraphs,
      runs,
      tables,
      tableRows,
      tableCells,
      images,
      inlineImages,
      anchoredImages,
      hyperlinks,
      bookmarks,
      fieldCodes,
      footnotes: pkg.footnotes?.notes?.length ?? 0,
      endnotes: pkg.endnotes?.notes?.length ?? 0,
      comments: pkg.comments?.comments?.length ?? 0,
      trackedChanges: 0,
      sections: body.sectPr ? 1 : 0,
    }
  }

  private _findUnsupported(pkg: OoxmlPackage): UnsupportedElement[] {
    const unsupported: UnsupportedElement[] = []

    // Check for floating images (wp:anchor)
    let blockIndex = 0
    for (const child of pkg.document.body.children) {
      if (child.type === 'paragraph') {
        const p = child as Paragraph
        for (const item of p.content) {
          if ((item as any).type === 'anchor' || (item as any).drawing?.type === 'anchor') {
            unsupported.push({
              type: 'Floating Image (wp:anchor)',
              location: `paragraph ${blockIndex}`,
              description: 'Floating images with text wrapping are not fully supported',
              impact: 'high',
              fix: 'Implement DrawingML anchor positioning and text wrapping',
            })
          }
        }
      }
      blockIndex++
    }

    // Check for table styles
    let tableIndex = 0
    for (const child of pkg.document.body.children) {
      if (child.type === 'table') {
        const t = child as Table
        if (t.tblPr?.tblStyle) {
          unsupported.push({
            type: 'Table Style',
            location: `table ${tableIndex}`,
            description: `Table uses style "${t.tblPr.tblStyle}" which may not be fully applied`,
            impact: 'medium',
            fix: 'Implement full table style resolution with conditional formatting',
          })
        }

        // Check for vertical merge
        for (const row of t.rows) {
          for (const cell of row.cells) {
            if ((cell as any).tcPr?.vMerge) {
              unsupported.push({
                type: 'Vertical Merge (vMerge)',
                location: `table ${tableIndex}`,
                description: 'Vertical cell merge is not fully supported in layout',
                impact: 'medium',
                fix: 'Implement vMerge layout algorithm',
              })
              break
            }
          }
        }
      }
      tableIndex++
    }

    // Check for footnotes/endnotes content
    if (pkg.footnotes && pkg.footnotes.notes.length > 0) {
      unsupported.push({
        type: 'Footnotes',
        location: 'document',
        description: `${pkg.footnotes.notes.length} footnote(s) parsed but content area not rendered`,
        impact: 'medium',
        fix: 'Implement footnote area layout at page bottom',
      })
    }

    if (pkg.endnotes && pkg.endnotes.notes.length > 0) {
      unsupported.push({
        type: 'Endnotes',
        location: 'document',
        description: `${pkg.endnotes.notes.length} endnote(s) parsed but content area not rendered`,
        impact: 'medium',
        fix: 'Implement endnote area layout',
      })
    }

    // Check for field codes
    let fieldCount = 0
    for (const child of pkg.document.body.children) {
      if (child.type === 'paragraph') {
        for (const item of (child as Paragraph).content) {
          if ((item as any).type === 'fldChar' || (item as any).type === 'instrText') {
            fieldCount++
          }
        }
      }
    }
    if (fieldCount > 0) {
      unsupported.push({
        type: 'Field Codes',
        location: 'document',
        description: `${fieldCount} field code(s) not evaluated (DATE, PAGE, TOC, etc.)`,
        impact: 'low',
        fix: 'Implement field code evaluation engine',
      })
    }

    // Check for columns layout
    if (pkg.document.body.sectPr?.cols && (pkg.document.body.sectPr.cols as any).num > 1) {
      unsupported.push({
        type: 'Multi-column Layout',
        location: 'section',
        description: 'Multi-column layout is not implemented',
        impact: 'high',
        fix: 'Implement column layout algorithm',
      })
    }

    return unsupported
  }

  private _analyzeFonts(pkg: OoxmlPackage): FontAnalysis {
    const required = extractRequiredFonts(pkg.fontTable, pkg.theme)

    let themeFonts = null
    if (pkg.theme?.themeElements?.fontScheme) {
      const scheme = pkg.theme.themeElements.fontScheme
      themeFonts = {
        major: scheme.majorFont.latin?.typeface || 'Unknown',
        minor: scheme.minorFont.latin?.typeface || 'Unknown',
      }
    }

    return {
      required,
      themeFonts,
      fontTableEntries: pkg.fontTable.fonts.size,
      embeddedFonts: [],
      potentialFallbacks: required.filter(f => !this._isSystemFont(f)),
    }
  }

  private _isSystemFont(family: string): boolean {
    const common = [
      'Arial', 'Helvetica', 'Times New Roman', 'Calibri', 'Cambria',
      'Georgia', 'Verdana', 'Courier New', 'Symbol', 'Wingdings',
      'SimSun', 'SimHei', 'Microsoft YaHei', 'MS Gothic',
      'Tahoma', 'Trebuchet MS', 'Comic Sans MS', 'Impact',
    ]
    return common.includes(family)
  }

  private _analyzeStyles(pkg: OoxmlPackage): StyleAnalysis {
    let paragraphStyles = 0
    let characterStyles = 0
    let tableStyles = 0
    let numberingStyles = 0
    const complexInheritance: string[] = []
    const themeFontStyles: string[] = []
    const themeColorStyles: string[] = []

    for (const [id, style] of pkg.styles.styles) {
      switch (style.type) {
        case 'paragraph': paragraphStyles++; break
        case 'character': characterStyles++; break
        case 'table': tableStyles++; break
        case 'numbering': numberingStyles++; break
      }

      // Check for complex inheritance (basedOn chains > 2 levels)
      if (style.basedOn) {
        const basedOnStyle = pkg.styles.styles.get(style.basedOn)
        if (basedOnStyle?.basedOn) {
          complexInheritance.push(`${id} → ${style.basedOn} → ${basedOnStyle.basedOn}`)
        }
      }

      // Check for theme font usage
      const rFonts = style.rPr?.rFonts
      if (rFonts?.asciiTheme || rFonts?.hAnsiTheme || rFonts?.eastAsiaTheme) {
        themeFontStyles.push(id)
      }

      // Check for theme color usage
      const color = style.rPr?.color
      if (color && typeof color === 'string' && color.startsWith('theme')) {
        themeColorStyles.push(id)
      }
    }

    return {
      totalStyles: pkg.styles.styles.size,
      paragraphStyles,
      characterStyles,
      tableStyles,
      numberingStyles,
      complexInheritance,
      themeFontStyles,
      themeColorStyles,
    }
  }

  private _analyzeNumbering(pkg: OoxmlPackage): NumberingAnalysis {
    const numFormats = new Set<string>()
    let multiLevelDefs = 0

    for (const [id, abstractNum] of pkg.numbering.abstractNums) {
      if (abstractNum.levels.length > 1) {
        multiLevelDefs++
      }
      for (const level of abstractNum.levels) {
        if (level.numFmt) numFormats.add(level.numFmt)
      }
    }

    return {
      abstractNums: pkg.numbering.abstractNums.size,
      numInstances: pkg.numbering.nums.size,
      numFormats: Array.from(numFormats),
      multiLevelDefs,
    }
  }

  private _analyzeLayout(layout: LayoutTree): LayoutAnalysis {
    let splitParagraphs = 0
    let splitTables = 0
    let overflowContent = 0

    for (const page of layout.pages) {
      for (const block of page.blocks) {
        if (block.type === 'paragraph') {
          // Check if paragraph continues on next page
          const para = block.data
          if (para.lines.length > 0 && page !== layout.pages[layout.pages.length - 1]) {
            // Simplified: check if paragraph height seems truncated
          }
        } else if (block.type === 'table') {
          splitTables++
        }
      }
    }

    return {
      totalPages: layout.totalPages,
      splitParagraphs,
      splitTables,
      overflowContent,
      unresolvedObjects: 0,
    }
  }

  private _calculateFidelityScore(report: FidelityReport): number {
    let score = 100

    // Deduct for unsupported elements
    for (const u of report.unsupported) {
      switch (u.impact) {
        case 'critical': score -= 20; break
        case 'high': score -= 10; break
        case 'medium': score -= 5; break
        case 'low': score -= 1; break
      }
    }

    // Deduct for font fallbacks
    score -= report.fonts.potentialFallbacks.length * 2

    // Deduct for complex inheritance (may not resolve correctly)
    score -= report.styles.complexInheritance.length * 1

    return Math.max(0, Math.min(100, score))
  }

  private _generateRecommendations(report: FidelityReport): string[] {
    const recs: string[] = []

    // Check critical unsupported
    const critical = report.unsupported.filter(u => u.impact === 'critical')
    if (critical.length > 0) {
      recs.push(`Address ${critical.length} critical unsupported element(s) for basic fidelity`)
    }

    // Check font issues
    if (report.fonts.potentialFallbacks.length > 0) {
      recs.push(`Install or embed fonts: ${report.fonts.potentialFallbacks.slice(0, 3).join(', ')}`)
    }

    // Check theme fonts
    if (report.fonts.themeFonts && report.styles.themeFontStyles.length > 0) {
      recs.push(`Resolve theme fonts (${report.styles.themeFontStyles.length} styles depend on them)`)
    }

    // Check numbering
    if (report.numbering.multiLevelDefs > 0) {
      recs.push(`Verify multi-level numbering resolution (${report.numbering.multiLevelDefs} definitions)`)
    }

    // Check layout
    if (report.layout) {
      if (report.layout.splitParagraphs > 0) {
        recs.push(`Review ${report.layout.splitParagraphs} split paragraph(s) for correct widow/orphan`)
      }
      if (report.layout.overflowContent > 0) {
        recs.push(`Fix ${report.layout.overflowContent} overflow content(s)`)
      }
    }

    if (recs.length === 0) {
      recs.push('Document fidelity is good — no major issues detected')
    }

    return recs
  }
}
