/**
 * OOXML Layout Types
 *
 * Types for the OOXML-native layout engine.
 * All measurements in twips (1/20 pt = 1/1440 inch) unless noted.
 */

// ─── Layout Geometry ─────────────────────────────────────────────────────────

export interface LayoutGeometry {
  /** Page width in twips */
  pageW: number
  /** Page height in twips */
  pageH: number
  /** Margins in twips */
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  /** Content area width = pageW - marginLeft - marginRight */
  contentW: number
  /** Content area height = pageH - marginTop - marginBottom */
  contentH: number
  /** Page orientation */
  orientation: 'portrait' | 'landscape'
}

// ─── Layout Fragment (smallest unit) ─────────────────────────────────────────

/** A single measured fragment of text with uniform styling */
export interface TextFragment {
  /** Fragment kind: text (default), break, tab, footnoteRef, endnoteRef, drawing */
  kind?: 'text' | 'break' | 'tab' | 'footnoteRef' | 'endnoteRef' | 'drawing'
  /** Break type (only when kind = 'break') */
  breakType?: 'page' | 'column' | 'line'
  /** The text content */
  text: string
  /** Width in twips */
  width: number
  /** Width in pixels (for rendering) */
  widthPx: number
  /** Font size in half-points */
  sz: number
  /** Font family name */
  fontFamily: string
  /** Bold */
  bold?: boolean
  /** Italic */
  italic?: boolean
  /** Color (hex) */
  color?: string
  /** Underline */
  underline?: string
  /** Vertical align (superscript/subscript) */
  vertAlign?: 'superscript' | 'subscript'
  /** Run properties reference for rendering */
  rPr?: Record<string, unknown>
  /** Reference ID for footnote/endnote */
  refId?: number
}

// ─── Layout Line ──────────────────────────────────────────────────────────────

/** A single line of text within a paragraph */
export interface LayoutLine {
  /** Fragments in this line */
  fragments: TextFragment[]
  /** Total line width in twips */
  width: number
  /** Line height in twips (ascent + descent + leading) */
  height: number
  /** Ascent in twips (above baseline) */
  ascent: number
  /** Descent in twips (below baseline) */
  descent: number
  /** Leading (inter-line spacing) in twips */
  leading: number
  /** Whether this line is justified (jc='both') */
  justified: boolean
  /** Extra space per justification gap in twips (0 if not justified) */
  justifyGap: number
}

// ─── Layout Paragraph ─────────────────────────────────────────────────────────

/** A fully laid-out paragraph */
export interface LayoutParagraph {
  /** Lines in this paragraph */
  lines: LayoutLine[]
  /** Total paragraph height in twips (sum of line heights + spacing before/after) */
  height: number
  /** Spacing before paragraph in twips */
  spacingBefore: number
  /** Spacing after paragraph in twips */
  spacingAfter: number
  /** First line indent in twips */
  firstLineIndent: number
  /** Left indent in twips */
  leftIndent: number
  /** Right indent in twips */
  rightIndent: number
  /** Justification */
  justification: string
  /** Numbering info */
  numbering?: { numId: number; ilvl: number; text: string }
  /** Section break type (if paragraph contains sectPr) */
  sectionBreak?: string
  /** Paragraph style ID */
  styleId?: string
  /** Raw paragraph properties for rendering */
  pPr?: Record<string, unknown>
}

// ─── Layout Table ──────────────────────────────────────────────────────────────

/** A column in a table grid */
export interface LayoutGridColumn {
  /** Column width in twips */
  width: number
}

/** A laid-out table cell */
export interface LayoutTableCell {
  /** Cell content (paragraphs or nested tables) */
  content: LayoutBlock[]
  /** Cell width in twips */
  width: number
  /** Cell properties for rendering */
  tcPr?: Record<string, unknown>
}

/** A laid-out table row */
export interface LayoutTableRow {
  /** Cells in this row */
  cells: LayoutTableCell[]
  /** Row height in twips (0 if auto) */
  height: number
}

/** A fully laid-out table */
export interface LayoutTable {
  /** Rows */
  rows: LayoutTableRow[]
  /** Total table width in twips */
  width: number
  /** Table properties for rendering */
  tblPr?: Record<string, unknown>
}

// ─── Layout Block (block-level element) ──────────────────────────────────────

export type LayoutBlock =
  | { type: 'paragraph'; data: LayoutParagraph }
  | { type: 'table'; data: LayoutTable }

// ─── Layout Page ──────────────────────────────────────────────────────────────

/** A single page in the layout tree */
export interface LayoutPage {
  /** 1-based page number */
  pageNumber: number
  /** Block index range on this page [start, end) */
  blockRange: [number, number]
  /** Layout blocks on this page */
  blocks: LayoutBlock[]
  /** Total content height used on this page in twips */
  usedHeight: number
  /** Available content height in twips */
  availableHeight: number
  /** Section index */
  sectionIndex: number
  /** Page geometry */
  geometry: LayoutGeometry
  /** Whether this is the first page of a section */
  isFirstInSection: boolean
  /** Whether this is the last page of a section */
  isLastInSection: boolean
}

// ─── Layout Tree ──────────────────────────────────────────────────────────────

/** The complete layout tree for a document */
export interface LayoutTree {
  /** Total number of pages */
  totalPages: number
  /** All pages */
  pages: LayoutPage[]
  /** All blocks in document order */
  allBlocks: LayoutBlock[]
}

// ─── Layout Options ───────────────────────────────────────────────────────────

/** Options for the layout engine */
export interface LayoutOptions {
  /** Default font size in half-points (default: 24 = 12pt) */
  defaultSz?: number
  /** Default font family */
  defaultFontFamily?: string
  /** Default line height in twips (default: 276 = 13.8pt = 1.15x) */
  defaultLineHeight?: number
  /** Device pixel ratio for twips-to-pixel conversion */
  devicePixelRatio?: number
}

// ─── OOXML Unit Constants ─────────────────────────────────────────────────────

/** Conversion constants for OOXML units */
export const OOXML = {
  /** Twips per inch */
  TWIPS_PER_INCH: 1440,
  /** Twips per point */
  TWIPS_PER_PT: 20,
  /** Twips per centimeter */
  TWIPS_PER_CM: 567,
  /** Half-points per point */
  HALF_PT_PER_PT: 2,
  /** EMU per inch */
  EMU_PER_INCH: 914400,
  /** EMU per twip */
  EMU_PER_TWIP: 635,
} as const
