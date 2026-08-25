/**
 * OOXML Type Definitions
 *
 * Canonical type system for OOXML document representation.
 * Based on ECMA-376 (ISO/IEC 29500) standard.
 *
 * All measurements use OOXML native units:
 *   twips     = 1/20 pt = 1/1440 inch (lengths, margins, spacing)
 *   half-pt   = 1/2 pt                (font size)
 *   EMU       = 1/914400 inch         (image dimensions)
 *   percent   = 1/50 of 1%            (table widths)
 */

// ─── Package Structure ──────────────────────────────────────────────────────

export interface OoxmlPackage {
  document: DocumentPart
  styles: StylesPart
  numbering: NumberingPart
  settings: SettingsPart
  fontTable: FontTablePart
  theme: ThemePart | null
  headers: Map<string, HeaderPart>
  footers: Map<string, FooterPart>
  comments: CommentsPart | null
  footnotes: FootnotesPart | null
  endnotes: EndnotesPart | null
  contentTypes: ContentTypes
  relationships: Relationship[]
  media: Map<string, MediaPart>
}

export interface ContentTypes {
  defaults: Map<string, string>       // extension → contentType
  overrides: Map<string, string>      // partName → contentType
}

export interface Relationship {
  id: string
  type: string
  target: string
  targetMode?: 'External' | 'Internal'
}

export interface MediaPart {
  contentType: string
  data: Uint8Array
}

export interface FontTablePart {
  fonts: Map<string, FontFaceDeclaration>
}

export interface FontFaceDeclaration {
  name: string
  panose?: string
  charset?: string
  pitchFamily?: number
}

// ─── Document Part (word/document.xml) ──────────────────────────────────────

export interface DocumentPart {
  body: Body
}

export interface Body {
  children: BlockElement[]
  sectPr?: SectionProperties
}

export type BlockElement = Paragraph | Table | SdtBlock | AltChunk

// ─── Paragraph (w:p) ────────────────────────────────────────────────────────

export interface Paragraph {
  type: 'paragraph'
  pPr?: ParagraphProperties
  content: (Run | Hyperlink | SdtInline | SmartTag | CustomXml | TrackedRun | CommentRangeStart | CommentRangeEnd | BookmarkStart | BookmarkEnd)[]
  _raw?: Element
}

export interface ParagraphProperties {
  pStyle?: string
  keepNext?: boolean
  keepLines?: boolean
  pageBreakBefore?: boolean
  widowControl?: boolean
  suppressLineNumbers?: boolean
  numPr?: NumberingProperties
  pBdr?: ParagraphBorders
  shd?: Shading
  tabs?: TabStop[]
  suppressAutoHyphens?: boolean
  kinsoku?: boolean
  wordWrap?: boolean
  overflowPunct?: boolean
  topLinePunct?: boolean
  autoSpaceDE?: boolean
  autoSpaceDN?: boolean
  bidi?: boolean
  adjustRightInd?: boolean
  snapToGrid?: boolean
  spacing?: Spacing
  ind?: Indentation
  contextualSpacing?: boolean
  mirrorIndents?: boolean
  suppressOverlap?: boolean
  jc?: Justification
  textDirection?: TextDirection
  textAlignment?: TextAlignment
  outlineLevel?: number
  divId?: number
  cnfStyle?: string
  rPr?: RunProperties
  sectPr?: SectionProperties
  pPrChange?: RevisionMark
}

export interface NumberingProperties {
  numId: number
  ilvl: number
}

export interface TabStop {
  val: TabStopType
  pos: number          // twips
  leader?: TabLeader
}

export type TabStopType = 'left' | 'center' | 'right' | 'decimal' | 'bar' | 'clear'
export type TabLeader = 'none' | 'dot' | 'hyphen' | 'underscore' | 'heavy' | 'middleDot'

export interface Spacing {
  before?: number       // twips
  after?: number        // twips
  line?: number         // twips or proportional (240 = single spacing)
  lineRule?: 'auto' | 'atLeast' | 'exact'
  beforeAutoSpacing?: boolean
  afterAutoSpacing?: boolean
}

export interface Indentation {
  left?: number         // twips
  right?: number        // twips
  start?: number        // alias for left
  end?: number          // alias for right
  firstLine?: number    // twips
  hanging?: number      // twips
}

export type Justification = 'left' | 'center' | 'right' | 'both' | 'distribute' | 'mediumKashida' | 'lowKashida' | 'thaiDistribute'

export type TextDirection = 'lr' | 'rl' | 'lrV' | 'rlV' | 'vert' | 'vertR'
export type TextAlignment = 'auto' | 'top' | 'center' | 'bottom'

export interface ParagraphBorders {
  top?: Border
  bottom?: Border
  left?: Border
  right?: Border
  between?: Border
  bar?: Border
}

// ─── Run (w:r) ──────────────────────────────────────────────────────────────

export interface Run {
  type: 'run'
  rPr?: RunProperties
  content: (Text | Break | Tab | Symbol | Drawing | Picture | Math | FootnoteReference | EndnoteReference | DeletedText | CommentReference | FieldChar | InstrText)[]
  _raw?: Element
}

export interface RunProperties {
  rStyle?: string
  rFonts?: RunFonts
  b?: boolean
  bCs?: boolean
  i?: boolean
  iCs?: boolean
  caps?: boolean
  smallCaps?: boolean
  strike?: boolean
  dstrike?: boolean
  outline?: boolean
  shadow?: boolean
  emboss?: boolean
  imprint?: boolean
  noProof?: boolean
  snapToGrid?: boolean
  vanish?: boolean
  webHidden?: boolean
  color?: string
  spacing?: number       // hundredths of a point
  w?: number            // expanded/condensed
  kern?: number          // half-points
  position?: number      // half-points
  sz?: number            // half-points
  szCs?: number          // half-points (complex script)
  highlight?: string
  u?: string             // underline value: 'single', 'double', 'thick', etc.
  effect?: string
  bdr?: Border
  shd?: Shading
  fitText?: FitText
  vertAlign?: 'superscript' | 'subscript'
  rtl?: boolean
  cs?: boolean           // complex script
  lang?: string
  pStyle?: string
  rPrChange?: RevisionMark
}

export interface RunFonts {
  ascii?: string
  hAnsi?: string
  eastAsia?: string
  cs?: string
  hint?: 'default' | 'eastAsia' | 'cs' | 'hAnsi'
}

export interface FitText {
  val?: boolean
  scale?: number         // percentage
}

// ─── Text Content ───────────────────────────────────────────────────────────

export interface Text {
  type: 'text'
  text: string
  space?: 'preserve' | 'default'
}

export interface Break {
  type: 'break'
  breakType: 'page' | 'column' | 'line'
}

export interface Tab {
  type: 'tab'
}

export interface Symbol {
  type: 'symbol'
  font?: string
  char?: string
}

// ─── Hyperlink (w:hyperlink) ────────────────────────────────────────────────

export interface Hyperlink {
  type: 'hyperlink'
  rId?: string           // relationship ID
  history?: boolean
  tooltip?: string
  anchor?: string
  content: (Run | SdtInline)[]
}

// ─── Drawing (w:drawing) ────────────────────────────────────────────────────

export interface Drawing {
  type: 'drawing'
  inline?: InlineDrawing
  anchor?: AnchorDrawing
}

export interface InlineDrawing {
  extent: { cx: number; cy: number }   // EMU
  blip?: BlipFill
  docPr?: DocProperties
}

export interface AnchorDrawing {
  extent: { cx: number; cy: number }
  blip?: BlipFill
  positionH: PositionH
  positionV: PositionV
  wrap: WrapType
  simplePos?: { x: number; y: number }
  effectExtent?: { l: number; t: number; r: number; b: number }
  docPr?: DocProperties
}

export interface BlipFill {
  rId?: string           // relationship ID to image
  srcRect?: { l: number; t: number; r: number; b: number }  // EMU crop
  stretch?: boolean
}

export interface DocProperties {
  id?: number
  name?: string
  descr?: string
}

export type PositionH = { relativeFrom: string; align?: string; offset?: number }
export type PositionV = { relativeFrom: string; align?: string; offset?: number }
export type WrapType = 'none' | 'square' | 'tight' | 'through' | 'topAndBottom'

// ─── Picture (w:pict — legacy VML) ─────────────────────────────────────────

export interface Picture {
  type: 'picture'
  content: unknown[]     // VML shape elements
}

// ─── Table (w:tbl) ──────────────────────────────────────────────────────────

export interface Table {
  type: 'table'
  tblPr?: TableProperties
  tblGrid: GridColumn[]
  content: TableRow[]
  _raw?: Element
}

export interface TableProperties {
  tblStyle?: string
  tblpPr?: TablePosition
  tblOverlap?: 'never' | 'intersect'
  bidiVisual?: boolean
  tblStyleRowBandSize?: number
  tblStyleColBandSize?: number
  tblW?: TableWidth
  jc?: Justification
  tblCellSpacing?: number
  tblInd?: number        // twips
  tblBorders?: TableBorders
  shd?: Shading
  tblLayout?: 'fixed' | 'autofit'
  tblCellMar?: CellMargins
  tblLook?: TableLook
  tblCaption?: string
  tblDescription?: string
  tblPrChange?: RevisionMark
}

export interface TableWidth {
  w: number
  type: 'dxa' | 'pct' | 'auto'   // twips, percentage, auto
}

export interface TableBorders {
  top?: Border
  left?: Border
  bottom?: Border
  right?: Border
  insideH?: Border
  insideV?: Border
}

export interface TableLook {
  firstRow?: boolean
  lastRow?: boolean
  firstColumn?: boolean
  lastColumn?: boolean
  noHBand?: boolean
  noVBand?: boolean
}

export interface TablePosition {
  horzAnchor?: 'text' | 'margin' | 'page'
  vertAnchor?: 'text' | 'margin' | 'page'
  horzAlign?: 'left' | 'center' | 'right'
  vertAlign?: 'top' | 'center' | 'bottom'
  distFromLeft?: number
  distFromTop?: number
  distFromRight?: number
  distFromBottom?: number
}

export interface GridColumn {
  width?: number         // twips
}

export interface TableRow {
  trPr?: TableRowProperties
  content: TableCell[]
  _raw?: Element
}

export interface TableRowProperties {
  cnfStyle?: string
  divId?: number
  gridBefore?: number
  gridAfter?: number
  wBefore?: number
  wAfter?: number
  cantSplit?: boolean
  trHeight?: TableRowHeight
  tblHeader?: boolean
  tblCellSpacing?: number
  jc?: Justification
  hidden?: boolean
  trPrChange?: RevisionMark
}

export interface TableRowHeight {
  val?: number           // twips
  heightRule?: 'atLeast' | 'exact' | 'auto'
}

export interface TableCell {
  tcPr?: TableCellProperties
  content: (Paragraph | Table)[]
  _raw?: Element
}

export interface TableCellProperties {
  cnfStyle?: string
  tcBorders?: TableCellBorders
  shd?: Shading
  noWrap?: boolean
  tcW?: number           // twips
  gridSpan?: number
  hMerge?: 'restart' | 'continue'
  vMerge?: 'restart' | 'continue'
  vAlign?: 'top' | 'center' | 'bottom'
  hideMark?: boolean
  cellDel?: CellMark
  cellIns?: CellMark
  cellMerge?: CellMerge
  tcPrChange?: RevisionMark
  tcMar?: CellMargins
}

export interface TableCellBorders {
  top?: Border
  left?: Border
  bottom?: Border
  right?: Border
  insideH?: Border
  insideV?: Border
  tl2br?: Border
  tr2bl?: Border
}

export interface CellMark {
  id?: number
  author?: string
  date?: string
}

export interface CellMerge {
  vMerge?: 'restart' | 'continue'
  hMerge?: 'restart' | 'continue'
}

// ─── Common Types ───────────────────────────────────────────────────────────

export interface Border {
  val: string            // single, double, thick, etc.
  sz?: number            // half-points
  space?: number         // points
  color?: string
  shadow?: boolean
}

export interface Shading {
  val: string            // clear, solid, etc.
  color?: string
  fill?: string          // hex color
}

export interface CellMargins {
  top?: number           // twips
  start?: number         // twips (left)
  bottom?: number        // twips
  end?: number           // twips (right)
}

// ─── Section Properties (w:sectPr) ─────────────────────────────────────────

export interface SectionProperties {
  type?: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage'
  pgSz?: PageSize
  pgMar?: PageMargins
  cols?: Columns
  docGrid?: DocGrid
  headerReference?: HeaderFooterReference[]
  footerReference?: HeaderFooterReference[]
  titlePg?: boolean
  evenAndOddHeaders?: boolean
  pgNumType?: PageNumberType
  pgBorders?: PageBorders
  lnNumType?: LineNumberType
  prot?: SectionProtection
  textDirection?: TextDirection
  verticalAlign?: string
  formProt?: boolean
  rtlGutter?: boolean
  sectPrChange?: RevisionMark
}

export interface PageSize {
  w: number               // twips
  h: number               // twips
  orient?: 'portrait' | 'landscape'
}

export interface PageMargins {
  top: number             // twips
  right: number           // twips
  bottom: number          // twips
  left: number            // twips
  header: number          // twips (distance from page edge)
  footer: number          // twips (distance from page edge)
  gutter: number          // twips
}

export interface Columns {
  num?: number
  space?: number          // twips (space between columns)
  sep?: boolean           // separator line
  equalWidth?: boolean
  col?: ColumnSpec[]
}

export interface ColumnSpec {
  w?: number              // twips (column width)
  space?: number          // twips (space after column)
}

export interface DocGrid {
  type?: 'default' | 'lines' | 'linesAndChars' | 'snapToChars'
  linePitch?: number      // twips
  charSpace?: number
}

export interface HeaderFooterReference {
  type: 'default' | 'first' | 'even'
  rId: string
}

export interface PageNumberType {
  start?: number
  fmt?: string            // decimal, upperRoman, lowerRoman, etc.
}

export interface PageBorders {
  top?: Border
  bottom?: Border
  left?: Border
  right?: Border
  display?: 'allPages' | 'firstPage' | 'none'
  offsetFrom?: 'page' | 'text'
}

export interface LineNumberType {
  countBy?: number
  start?: number
  dist?: number           // twips
  restart?: 'continuous' | 'newSection' | 'newPage'
}

export interface SectionProtection {
 编辑?: boolean
  format?: boolean
  protection?: string
  hash?: string
  salt?: string
  spin?: boolean
}

// ─── Styles (word/styles.xml) ───────────────────────────────────────────────

export interface StylesPart {
  docDefaults: DocDefaults
  styles: Map<string, StyleDefinition>
  numberFormats?: Map<string, string>
}

export interface DocDefaults {
  rPrDefault?: RunProperties
  pPrDefault?: ParagraphProperties
}

export interface StyleDefinition {
  id: string
  type: StyleType
  name?: string
  basedOn?: string
  next?: string
  link?: string
  autoRedefine?: boolean
  uiPriority?: number
  semiHidden?: boolean
  unhideWhenUsed?: boolean
  qFormat?: boolean
  locked?: boolean
  personal?: boolean
  personalCompose?: boolean
  reply?: boolean
  pPr?: ParagraphProperties
  rPr?: RunProperties
  tblPr?: TableProperties
  trPr?: TableRowProperties
  tcPr?: TableCellProperties
}

export type StyleType = 'paragraph' | 'character' | 'table' | 'numbering'

// ─── Numbering (word/numbering.xml) ────────────────────────────────────────

export interface NumberingPart {
  abstractNums: Map<number, AbstractNumbering>
  nums: Map<number, NumberingInstance>
}

export interface AbstractNumbering {
  abstractNumId: number
  multiLevelType?: string
  levels: NumberingLevel[]
}

export interface NumberingLevel {
  ilvl: number
  start?: number
  numFmt?: string         // decimal, lowerLetter, upperLetter, lowerRoman, upperRoman, bullet, etc.
  lvlText?: string        // "%1.", "(%2)", "Article %1", etc.
  lvlJc?: Justification
  pPr?: ParagraphProperties
  rPr?: RunProperties
  isLgl?: boolean
  suff?: string           // tab, space, nothing
}

export interface NumberingInstance {
  numId: number
  abstractNumId: number
  levelOverride?: LevelOverride[]
}

export interface LevelOverride {
  ilvl: number
  startOverride?: number
}

// ─── Theme (word/theme/theme1.xml) ─────────────────────────────────────────

export interface ThemePart {
  themeElements: ThemeElements
  objectDefaults?: object
}

export interface ThemeElements {
  clrScheme: ColorScheme
  fontScheme: FontScheme
  fmtScheme: FormatScheme
}

export interface ColorScheme {
  name?: string
  dark1?: string
  light1?: string
  dark2?: string
  light2?: string
  accent1?: string
  accent2?: string
  accent3?: string
  accent4?: string
  accent5?: string
  accent6?: string
  hyperlink?: string
  followedHyperlink?: string
}

export interface FontScheme {
  name?: string
  majorFont: FontGroup
  minorFont: FontGroup
}

export interface FontGroup {
  latin?: FontFace
  eastAsia?: FontFace
  cs?: FontFace
  hdr?: FontFace
  symbol?: FontFace
}

export interface FontFace {
  typeface: string
  panose?: string
  pitchFamily?: number
  charset?: number
}

export interface FormatScheme {
  name?: string
  fillStyleLst?: object[]
  lnStyleLst?: object[]
  effectStyleLst?: object[]
  bgFillStyleLst?: object[]
}

// ─── Settings (word/settings.xml) ──────────────────────────────────────────

export interface SettingsPart {
  zoom?: Zoom
  defaultTabStop?: number
  evenAndOddHeaders?: boolean
  revisionView?: object
  trackRevisions?: boolean
  doNotTrackMoves?: boolean
  doNotTrackFormatting?: boolean
  documentProtection?: object
  autoFormatOverride?: boolean
  styleLockTheme?: boolean
  styleLockQFSet?: boolean
  defaultTableStyle?: string
  characterSpacingControl?: string
  compat?: Compatibility[]
  // ... other settings
}

export interface Zoom {
  pct?: number
  w?: string
}

export interface Compatibility {
  name: string
  val?: boolean | string
}

// ─── Comments ───────────────────────────────────────────────────────────────

export interface CommentsPart {
  comments: CommentThread[]
}

export interface CommentThread {
  id: string
  author: string
  date?: string
  initials?: string
  content: CommentItem[]
}

export interface CommentItem {
  id: string
  text: string
  done?: boolean
  replies?: CommentReply[]
}

export interface CommentReply {
  id: string
  text: string
  author: string
  date?: string
}

// ─── Sub-documents ──────────────────────────────────────────────────────────

export interface HeaderPart {
  content: (Paragraph | Table)[]
}

export interface FooterPart {
  content: (Paragraph | Table)[]
}

export interface FootnotesPart {
  footnotes: Map<number, Footnote>
}

export interface Footnote {
  id: number
  type?: 'normal' | 'separator' | 'continuationSeparator'
  content: (Paragraph | Table)[]
}

export interface EndnotesPart {
  endnotes: Map<number, Endnote>
}

export interface Endnote {
  id: number
  type?: 'normal' | 'separator' | 'continuationSeparator'
  content: (Paragraph | Table)[]
}

// ─── SDT (Structured Document Tags) ────────────────────────────────────────

export interface SdtBlock {
  type: 'sdtBlock'
  sdtPr?: SdtProperties
  sdtContent?: BlockElement[]
}

export interface SdtInline {
  type: 'sdtInline'
  sdtPr?: SdtProperties
  sdtContent?: (Run | Hyperlink)[]
}

export interface SdtProperties {
  tag?: string
  alias?: string
  lock?: string
  placeholder?: { docPart?: string }
}

// ─── Other Inline Elements ──────────────────────────────────────────────────

export interface SmartTag {
  type: 'smartTag'
  namespace?: string
  content: (Run | Hyperlink)[]
}

export interface CustomXml {
  type: 'customXml'
  namespace?: string
  content: BlockElement[]
}

export interface AltChunk {
  type: 'altChunk'
  rId?: string
}

// ─── Math ───────────────────────────────────────────────────────────────────

export interface Math {
  type: 'math'
  content: unknown[]     // Office MathML elements
}

export interface FootnoteReference {
  type: 'footnoteReference'
  id: number
}

export interface EndnoteReference {
  type: 'endnoteReference'
  id: number
}

// ─── Revision Marks ─────────────────────────────────────────────────────────

export interface RevisionMark {
  id?: number
  author?: string
  date?: string
  /** Original properties before change (for rPrChange/pPrChange/etc.) */
  originalRPr?: RunProperties
  originalPPr?: ParagraphProperties
}

// ─── Track Changes (w:ins / w:del) ──────────────────────────────────────────

export interface TrackedRun {
  type: 'ins' | 'del'
  id: number
  author: string
  date: string
  content: Run[]
  _raw?: Element
}

// ─── Comment Range Markers ───────────────────────────────────────────────────

export interface CommentRangeStart {
  type: 'commentRangeStart'
  id: number
}

export interface CommentRangeEnd {
  type: 'commentRangeEnd'
  id: number
}

export interface CommentReference {
  type: 'commentReference'
  id: number
}

// ─── Deleted Text (w:delText) ───────────────────────────────────────────────

export interface DeletedText {
  type: 'delText'
  text: string
  space?: 'preserve' | 'default'
}

// ─── Bookmarks (w:bookmarkStart / w:bookmarkEnd) ───────────────────────────

export interface BookmarkStart {
  type: 'bookmarkStart'
  id: number
  name?: string
  colFirst?: number
  colLast?: number
}

export interface BookmarkEnd {
  type: 'bookmarkEnd'
  id: number
}

// ─── Field Codes (w:fldChar / w:instrText) ──────────────────────────────────

export interface FieldChar {
  type: 'fieldChar'
  fldCharType: 'begin' | 'separate' | 'end'
}

export interface InstrText {
  type: 'instrText'
  text: string
  space?: 'preserve' | 'default'
}
