// i18n message catalog type — the "shape" of every user-visible string in
// the editor UI. All fields are required so TypeScript catches a missing
// translation at compile time. Add new languages by implementing this interface.
//
// Keyed by conceptual UI area, not by file, so a translator can work through
// section-by-section without needing to know the codebase.

// ---- Shared helpers ---------------------------------------------------------

export interface DialogCommon {
  /** Generic "OK" confirm button. */
  ok: string;
  /** Generic "Cancel" dismiss button. */
  cancel: string;
  /** Generic "Apply" without closing. */
  apply: string;
  /** Generic "Close" button. */
  close: string;
  /** Generic "Delete" (danger action). */
  delete: string;
}

// ---- Ribbon tabs ------------------------------------------------------------

export interface RibbonMessages {
  /** "File" tab label. */
  file: string;
  /** "Home" tab label. */
  home: string;
  /** "Insert" tab label. */
  insert: string;
  /** "Layout" tab label. */
  layout: string;
  /** "Table" tab label — visible only when caret is inside a table. */
  table: string;
  /** "View" tab label. */
  view: string;
  /** "Developer" tab label — shown only in develop mode. */
  developer: string;
}

// ---- File / Undo group ------------------------------------------------------

export interface FileGroupMessages {
  /** Group label "Undo". */
  groupUndo: string;
  /** Group label "Export". */
  groupExport: string;
  /** Tooltip: "Undo (Ctrl+Z)". */
  undo: string;
  /** Tooltip: "Redo (Ctrl+Y)". */
  redo: string;
  /** Button face + tooltip: "Export to PDF". */
  exportPdf: string;
  /** Button face + tooltip: "Export to .docx". */
  exportDocx: string;
}

// ---- Clipboard group --------------------------------------------------------

export interface ClipboardMessages {
  /** Group label "Clipboard". */
  groupLabel: string;
  /** Paste button caption + tooltip. */
  paste: string;
  /** Paste tooltip with shortcut. */
  pasteTooltip: string;
  /** Cut tooltip with shortcut. */
  cutTooltip: string;
  /** Copy tooltip with shortcut. */
  copyTooltip: string;
  /** Format painter tooltip. */
  formatPainterTooltip: string;
}

// ---- Font group -------------------------------------------------------------

export interface FontMessages {
  /** Group label "Font". */
  groupLabel: string;
  /** Font family select tooltip. */
  fontFamily: string;
  /** Font size input tooltip. */
  fontSize: string;
  /** Font size presets button tooltip. */
  fontSizePresets: string;
  /** Grow font tooltip. */
  growFont: string;
  /** Shrink font tooltip. */
  shrinkFont: string;
  /** Change case button tooltip. */
  changeCase: string;
  /** Clear formatting tooltip. */
  clearFormatting: string;
  /** Bold tooltip. */
  bold: string;
  /** Italic tooltip. */
  italic: string;
  /** Underline tooltip. */
  underline: string;
  /** Strikethrough tooltip. */
  strikethrough: string;
  /** Superscript tooltip. */
  superscript: string;
  /** Subscript tooltip. */
  subscript: string;
  /** All caps tooltip. */
  allCaps: string;
  /** Small caps tooltip. */
  smallCaps: string;
  /** Double strikethrough tooltip. */
  doubleStrikethrough: string;
  /** Font effects dialog launcher tooltip. */
  fontEffects: string;
  /** Text highlight colour tooltip. */
  highlightColor: string;
  /** Font colour tooltip. */
  fontColor: string;
  /** "No Color" clear option for highlight. */
  noColor: string;
  /** "Automatic" reset option for font color. */
  automatic: string;
  // Case mode labels:
  caseSentence: string;
  caseLower: string;
  caseUpper: string;
  caseTitle: string;
  caseToggle: string;
}

// ---- Paragraph group --------------------------------------------------------

export interface ParagraphMessages {
  /** Group label "Paragraph". */
  groupLabel: string;
  /** Bulleted list button tooltip. */
  bulletedList: string;
  /** Numbered list button tooltip. */
  numberedList: string;
  /** Multilevel list button tooltip. */
  multilevelList: string;
  /** Decrease indent tooltip. */
  decreaseIndent: string;
  /** Increase indent tooltip. */
  increaseIndent: string;
  /** Sort button tooltip (stub). */
  sort: string;
  /** Toggle formatting marks tooltip. */
  formattingMarks: string;
  /** Align left tooltip. */
  alignLeft: string;
  /** Center tooltip. */
  alignCenter: string;
  /** Align right tooltip. */
  alignRight: string;
  /** Justify tooltip. */
  alignJustify: string;
  /** LTR paragraph button tooltip. */
  ltr: string;
  /** RTL paragraph button tooltip. */
  rtl: string;
  /** Line spacing button tooltip. */
  lineSpacing: string;
  /** "Line Spacing Options…" menu item. */
  lineSpacingOptions: string;
  /** Borders & shading button tooltip. */
  borders: string;
  // Bullet list style options:
  bulletFilledCircle: string;
  bulletHollowCircle: string;
  bulletFilledSquare: string;
  bulletDash: string;
  bulletArrow: string;
  // Numbered list style options:
  numberDecimal: string;
  numberDecimalParen: string;
  numberLowerLetter: string;
  numberUpperLetter: string;
  numberLowerRoman: string;
  numberUpperRoman: string;
}

// ---- Styles group -----------------------------------------------------------

export interface StylesMessages {
  /** Group label "Styles". */
  groupLabel: string;
  /** Update current style tooltip. */
  updateStyle: string;
  /** Manage styles button tooltip. */
  manageStyles: string;
  /** Filter toggle tooltip (off state). */
  showOnlyUsed: string;
  /** Filter toggle tooltip (on state). */
  showAllStyles: string;
  /** Character style marker suffix: " ⓐ" after the name. */
  charStyleSuffix: string;
  /** Title suffix for character-style cards. */
  charStyleTitle: string;
}

// ---- Editing group ----------------------------------------------------------

export interface EditingMessages {
  /** Group label "Editing". */
  groupLabel: string;
  /** Find button face. */
  find: string;
  /** Find & replace tooltip. */
  findTooltip: string;
  /** Replace button face. */
  replace: string;
  /** Replace tooltip. */
  replaceTooltip: string;
  /** Select All button face. */
  selectAll: string;
  /** Select all tooltip. */
  selectAllTooltip: string;
}

// ---- Insert tab -------------------------------------------------------------

export interface InsertMessages {
  // Pages group:
  groupPages: string;
  pageBreak: string;
  sectionBreak: string;
  // Tables group:
  groupTables: string;
  insertTable: string;
  // Illustrations group:
  groupIllustrations: string;
  insertImage: string;
  // Picture (selected image) group:
  groupPicture: string;
  wrapSquare: string;
  wrapInline: string;
  // Equation group:
  groupEquation: string;
  insertEquation: string;
  // Symbols group:
  groupSymbols: string;
  insertSymbol: string;
  // Links group:
  groupLinks: string;
  insertLink: string;
  // References group:
  groupReferences: string;
  insertToc: string;
  recalcToc: string;
  insertFootnote: string;
  insertEndnote: string;
  // Controls group:
  groupControls: string;
  richTextControl: string;
  checkboxControl: string;
  dropdownControl: string;
  datePickerControl: string;
  /** Prompt text when creating a drop-down list control. */
  dropdownPrompt: string;
  /** Default drop-down list items. */
  dropdownDefault: string;
  contentControlProps: string;
  removeContentControl: string;
  /** Alert when trying to inspect a content control outside one. */
  noContentControl: string;
  /** "select an image first" hint when image-wrap is disabled. */
  selectImageFirst: string;
  /** "place the caret in a content control" hint. */
  placeCaretInControl: string;
}

// ---- Layout tab -------------------------------------------------------------

export interface LayoutMessages {
  groupPageSetup: string;
  pageSetup: string;
}

// ---- Table tab --------------------------------------------------------------

export interface TableMessages {
  // Rows & Columns group:
  groupRowsCols: string;
  insertRowAbove: string;
  insertRowBelow: string;
  insertColLeft: string;
  insertColRight: string;
  deleteRow: string;
  deleteCol: string;
  deleteTable: string;
  // Merge group:
  groupMerge: string;
  mergeCells: string;
  unmergeCells: string;
  // Size group:
  groupSize: string;
  autofit: string;
  autofitTooltip: string;
  // AutoFit menu items:
  autofitContents: string;
  autofitWindow: string;
  fixedWidth: string;
  width25: string;
  width50: string;
  width75: string;
  widthFull: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
}

// ---- View tab ---------------------------------------------------------------

export interface ViewMessages {
  // Show group:
  groupShow: string;
  outline: string;
  bookmarks: string;
  horizontalRuler: string;
  verticalRuler: string;
  showGrid: string;
  snapToGrid: string;
  gridSpacing: string;
  activity: string;
  // Zoom group:
  groupZoom: string;
  zoomIn: string;
  zoomOut: string;
  zoomLevel: string;
}

// ---- Review header ----------------------------------------------------------

export interface ReviewMessages {
  /** "Review" button in the ribbon header. */
  reviewButton: string;
  reviewButtonTooltip: string;
  /** Start an anchored discussion at the current caret/selection. */
  addComment: string;
  addCommentTooltip: string;
  /** Mode selector tooltip. */
  editingMode: string;
  /** Mode option label: "Editing". */
  modeEditing: string;
  /** Mode option label: "Suggesting". */
  modeSuggesting: string;
  /** Mode option label: "Viewing". */
  modeViewing: string;
}

// ---- Developer tab ----------------------------------------------------------

export interface DeveloperMessages {
  groupInspect: string;
  inspectTree: string;
  inspectTreeTooltip: string;
}

// ---- Context menu -----------------------------------------------------------

export interface ContextMenuMessages {
  cut: string;
  copy: string;
  paste: string;
  /** Paste without formatting. */
  pasteText: string;
  comment: string;
  /** "Image" submenu label when right-clicking an image. */
  image: string;
  /** "Wrap: square" menu item. */
  wrapSquare: string;
  /** "Wrap: block" menu item. */
  wrapBlock: string;
  /** "Edit field" for a custom field. */
  editField: string;
  /** "Update field" for a custom field. */
  updateField: string;
  /** "Hyperlink" submenu label. */
  hyperlink: string;
  /** "Edit hyperlink" menu item. */
  editHyperlink: string;
  /** "Remove hyperlink" menu item. */
  removeHyperlink: string;
  /** "Open link in new tab" menu item. */
  openLink: string;
  /** "Table" submenu label. */
  tableMenu: string;
  /** "Table properties" menu item. */
  tableProperties: string;
  /** Accepted suggestion label prefix. */
  acceptSuggestion: string;
  /** Rejected suggestion label prefix. */
  rejectSuggestion: string;
  /** "Accept all suggestions" menu item. */
  acceptAll: string;
  /** "Reject all suggestions" menu item. */
  rejectAll: string;
  /** Bookmark submenu label. */
  bookmark: string;
  /** "Add bookmark" menu item. */
  addBookmark: string;
  /** "Remove bookmark" menu item. */
  removeBookmark: string;
  /** "Go to bookmark" menu item. */
  gotoBookmark: string;
}

// ---- Activity panel ---------------------------------------------------------

export interface ActivityMessages {
  /** Panel title "Activity". */
  title: string;
  /** "Created locally" when no remote author is known. */
  createdLocally: string;
  /** "Created by {name} · {time}" template prefix — use {name} and {time} as tokens. */
  createdByTemplate: string;
  /** "No edits yet." empty state. */
  noEdits: string;
  /** "Share the document … to track activity." */
  shareToTrack: string;
  /** Time label "just now". */
  justNow: string;
  // Origin labels used in the activity feed:
  originTyped: string;
  originPasted: string;
  originUndo: string;
  originRedo: string;
  originEdited: string;
}

// ---- Outline panel ----------------------------------------------------------

export interface OutlineMessages {
  /** Outline / navigation panel title. */
  title: string;
}

// ---- Busy overlay -----------------------------------------------------------

export interface BusyMessages {
  /** "Exporting…" busy overlay text. */
  exporting: string;
}

// ---- Font Dialog ------------------------------------------------------------

export interface FontDialogMessages {
  /** Dialog title "Font". */
  title: string;
  // Effects section:
  sectionEffects: string;
  allCaps: string;
  smallCaps: string;
  doubleStrikethrough: string;
  outline: string;
  shadow: string;
  emboss: string;
  engrave: string;
  // Underline section:
  sectionUnderline: string;
  underlineStyle: string;
  underlineColor: string;
  automatic: string;
  // Underline style options:
  ulNone: string;
  ulSingle: string;
  ulDouble: string;
  ulThick: string;
  ulDotted: string;
  ulDashed: string;
  ulDotDash: string;
  ulDotDotDash: string;
  ulWave: string;
  // Spacing section:
  sectionSpacing: string;
  position: string;
  scale: string;
  charSpacing: string;
  kerning: string;
  fitText: string;
  // Emphasis mark section:
  sectionEmphasis: string;
  emphasisMark: string;
  // Emphasis mark options:
  emNone: string;
  emDot: string;
  emComma: string;
  emCircle: string;
  emUnderDot: string;
  // Unit suffixes in rows:
  unitPx: string;
  unitPct: string;
}

// ---- Paragraph Dialog -------------------------------------------------------

export interface ParagraphDialogMessages {
  /** Dialog title "Paragraph". */
  title: string;
  // Borders section:
  sectionBorders: string;
  borderColor: string;
  borderWidth: string;
  borderStyle: string;
  // Shading section:
  sectionShading: string;
  fill: string;
  // Spacing & line breaks section:
  sectionSpacing: string;
  lineSpacing: string;
  lineSpacingAt: string;
  lineSpacingAtPx: string;
  // Line spacing rule options:
  lsMultiple: string;
  lsAtLeast: string;
  lsExactly: string;
  // Vertical alignment:
  verticalAlignment: string;
  vaBaseline: string;
  vaTop: string;
  vaCenter: string;
  vaBottom: string;
  // Flags:
  contextualSpacing: string;
  widowOrphan: string;
  mirrorIndents: string;
  suppressLineNumbers: string;
  adjustRightIndent: string;
  // Edge labels shared with borders:
  edgeTop: string;
  edgeRight: string;
  edgeBottom: string;
  edgeLeft: string;
  edgeBetween: string;
}

// ---- Page Layout Dialog -----------------------------------------------------

export interface PageLayoutMessages {
  /** Dialog title "Page Layout". */
  title: string;
  // Units toggle:
  labelInches: string;
  labelCm: string;
  // Tabs / sections:
  sectionSize: string;
  sectionMargins: string;
  sectionColumns: string;
  sectionHeaderFooter: string;
  sectionLineNumbers: string;
  sectionPageColor: string;
  sectionPageBorder: string;
  sectionBreak: string;
  // Size:
  paperSize: string;
  orientation: string;
  orientationPortrait: string;
  orientationLandscape: string;
  customSize: string;
  width: string;
  height: string;
  // Margins:
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  marginGutter: string;
  mirrorMargins: string;
  // Preset margin labels:
  marginNormal: string;
  marginNarrow: string;
  marginWide: string;
  // Columns:
  columnCount: string;
  columnSpacing: string;
  columnSeparatorLine: string;
  // Header / footer:
  headerDistance: string;
  footerDistance: string;
  // Line numbers:
  lineNumbersEnable: string;
  lineNumberStart: string;
  lineNumberStep: string;
  lineNumberRestart: string;
  // Page color:
  pageColor: string;
  // Page border:
  pageBorder: string;
  pageBorderStyle: string;
  pageBorderColor: string;
  pageBorderWidth: string;
  pageBorderApply: string;
  pageBorderApplyPage: string;
  pageBorderApplySection: string;
  // Section break:
  sectionBreakType: string;
  sectionBreakNextPage: string;
  sectionBreakContinuous: string;
  sectionBreakEvenPage: string;
  sectionBreakOddPage: string;
}

// ---- Table Properties Dialog ------------------------------------------------

export interface TablePropertiesMessages {
  /** Dialog title "Borders & Shading". */
  title: string;
  /** Close (Esc) tooltip. */
  closeTooltip: string;
  // Borders section:
  sectionBorders: string;
  borderColor: string;
  borderWidth: string;
  borderStyle: string;
  borderApplyTo: string;
  hint: string;
  individualEdges: string;
  // Preset button labels:
  presetAll: string;
  presetOutside: string;
  presetInside: string;
  presetNone: string;
  // Edge button labels:
  edgeTop: string;
  edgeBottom: string;
  edgeLeft: string;
  edgeRight: string;
  edgeInsideH: string;
  edgeInsideV: string;
  // Shading section:
  sectionShading: string;
  fill: string;
  applyFill: string;
  noFill: string;
  // Table size section:
  sectionTableSize: string;
  tableWidth: string;
  tableAlign: string;
  tableAlignLeft: string;
  tableAlignCenter: string;
  tableAlignRight: string;
  tableIndent: string;
  fullWidth: string;
  unitPercent: string;
  unitPx: string;
  unitInch: string;
  // Cell section:
  sectionCell: string;
  cellVAlign: string;
  cellVAlignTop: string;
  cellVAlignCenter: string;
  cellVAlignBottom: string;
  cellTextDir: string;
  cellTextDirLrTb: string;
  cellTextDirTbRl: string;
  cellTextDirBtLr: string;
  // Row section:
  sectionRow: string;
  rowHeight: string;
  rowHeightMin: string;
  rowHeightExact: string;
  rowKeepTogether: string;
  rowRepeatHeader: string;
  // Table defaults section:
  sectionTableDefaults: string;
  tableDefaultBorders: string;
  tableDefaultShading: string;
  tableDefaultCellMargin: string;
  cellMarginTop: string;
  cellMarginBottom: string;
  cellMarginLeft: string;
  cellMarginRight: string;
  // Done button:
  done: string;
}

// ---- Style Manager ----------------------------------------------------------

export interface StyleManagerMessages {
  /** Dialog title "Manage Styles". */
  title: string;
  /** Preview column header "Preview". */
  previewLabel: string;
  /** "New ▾" button face. */
  newStyle: string;
  /** "Delete" button face. */
  deleteStyle: string;
  /** "Merge duplicates" button face. */
  mergeDuplicates: string;
  /** "Merge duplicates" tooltip. */
  mergeDuplicatesTooltip: string;
  /** "Apply" button face. */
  apply: string;
  /** "Close" button face. */
  close: string;
  /** "default" badge on the default style card. */
  defaultBadge: string;
  /** "None yet" empty list state. */
  noneYet: string;
  // Style kind labels (section headers in the list):
  kindParagraph: string;
  kindCharacter: string;
  kindList: string;
  kindTable: string;
  // New style menu items:
  newParagraphStyle: string;
  newCharacterStyle: string;
  newListStyle: string;
  newTableStyle: string;
  // Context menu items on style cards:
  ctxModify: string;
  ctxDuplicate: string;
  ctxSetDefault: string;
  ctxDelete: string;
}

// ---- TOC Properties Dialog --------------------------------------------------

export interface TocPropertiesMessages {
  /** Dialog title. */
  title: string;
  // Checkboxes / fields:
  headingLevelsLabel: string;
  headingLevelsToggle: string;
  levelsFrom: string;
  levelsTo: string;
  optionsLabel: string;
  useOutlineLevels: string;
  makeHyperlinks: string;
  hideInWeb: string;
  separatorLabel: string;
  separatorPlaceholder: string;
  fieldInstructionLabel: string;
}

// ---- Symbol Picker ----------------------------------------------------------

export interface SymbolPickerMessages {
  /** Panel title "Insert symbol". */
  title: string;
  /** Font selector label. */
  font: string;
  /** "Recently used" section label. */
  recentlyUsed: string;
  /** "Symbols" grid section label. */
  symbols: string;
}

// ---- Comment / Review -------------------------------------------------------

export interface CommentMessages {
  /** "Comment" button label in the comment input UI. */
  submit: string;
  /** "Reply…" placeholder. */
  replyPlaceholder: string;
}

// ============================================================================
// Root catalog — the single object every caller uses.
// ============================================================================

export interface EditorMessages {
  common: DialogCommon;
  ribbon: RibbonMessages;
  fileGroup: FileGroupMessages;
  clipboard: ClipboardMessages;
  font: FontMessages;
  paragraph: ParagraphMessages;
  styles: StylesMessages;
  editing: EditingMessages;
  insert: InsertMessages;
  layout: LayoutMessages;
  table: TableMessages;
  view: ViewMessages;
  review: ReviewMessages;
  developer: DeveloperMessages;
  contextMenu: ContextMenuMessages;
  activity: ActivityMessages;
  outline: OutlineMessages;
  busy: BusyMessages;
  fontDialog: FontDialogMessages;
  paragraphDialog: ParagraphDialogMessages;
  pageLayout: PageLayoutMessages;
  tableProperties: TablePropertiesMessages;
  styleManager: StyleManagerMessages;
  tocProperties: TocPropertiesMessages;
  symbolPicker: SymbolPickerMessages;
  comment: CommentMessages;
}
