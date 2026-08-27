// Composition root: model -> layout -> paint -> input -> editor core -> a11y.
// One-way data flow: input -> command -> transaction -> applyOp* -> new state
// -> incremental layout -> paint + caret + proxy reposition (same frame).

import type { Block, CharStyle, Document, EmphasisMark, ImageBlock, ParaStyle, TableBlock, UnderlineStyle } from "@kindy/shared";
import { BAND_CONTAINERS, parseTocInstruction } from "@kindy/shared";
import type { BookmarkRange, DocPosition, DocSelection, UserInfo } from "@kindy/shared";
import { isCollapsed, colorForId, userDisplayName, freshId, DEFAULT_CHAR_STYLE } from "@kindy/shared";
import type { ResolvedBehavior, ResolvedTheme } from "./config";
import { ZOOM_STEP } from "./uiConstants";
import { applyOp, containerBlocks, containerOf, effectiveFractions, locateImage, locateEquation, sliceRuns, type Op } from "@kindy/shared";
import { bandParagraphs, blockById, buildTableGrid, containerListOf, gridOriginOfCell, locateParagraph, normalizeRect, paragraphAt, paragraphsOf, styleAtRuns, styleOfCharAt, textOfRuns } from "@kindy/shared";
import type { CellBorders, CellMargin, TableBorders } from "@kindy/shared";
import { createLayoutEngine, type LayoutEngine } from "./layout/engine";
import {
  caretRect,
  cellRangeRects,
  comparePositions,
  hitTest,
  hitTestCell,
  hitTestEquation,
  inlineEquationAt,
  hitTestSelectableObject,
  linkAt,
  objectRect,
  selectionRects,
  type ColumnBoundaryHit,
  type RowBoundaryHit,
  type TableSelectionHandleHit,
  type GeoScope,
  type Rect,
} from "./layout/geometry";
import type { LayoutTree, Page, PlacedBlock } from "./layout/layoutTree";
import { computeTocEdits } from "./recalc/recalcToc";
import { createSdtPopup } from "./editor/sdtPopup";
import { createCommentController } from "./editor/commentController";
import { createPaintLayer, type RemoteCaret, type PaintLayerOptions } from "./paint/renderer";
import { createChildDocument, type ChildDocument, type StyleContext } from "./child/childDocument";
export type { ChildDocument, ChildContent, ChildRenderOptions, ChildEditorHandle, StyleContext } from "./child/childDocument";
import { createSelectionController } from "./input/selectionController";
import { createObjectFrame } from "./input/objectController";
import { createImeProxy } from "./input/imeProxy";
import { createKeymapHandler, type StyleKey } from "./input/keymap";
import { extractFragment, fragmentToHtml, fragmentToPlainText, htmlToFragment, tableRectToClipboard, type DocFragment } from "./input/clipboard";
import { parseOoxmlFragment } from "./import/docx/fragment";
import { mediaUrl, registerMediaBytes } from "./media/store";
import { importDocx } from "./import/docx/importDocx";
import { showContextMenu, type ContextMenuHandle, type MenuEntry } from "./ui/contextMenu";
import { createTableQuickActions, type TableQuickActionTarget } from "./ui/tableQuickActions";
import { showSdtInspector, type SdtInspectorData, type SdtInspectorHandle } from "./ui/sdtInspector";
import { showFieldConstructor } from "./ui/fieldConstructor";
import { showEquationEditor, equationToMathmlString } from "./ui/equationEditor";
import { showTocProperties } from "./ui/tocProperties";
import { showStyleManager, type StyleManagerHandle } from "./ui/styleManager";
import { showTableProperties, type BorderStyleName, type CellTextDir, type TablePropertiesHandle } from "./ui/tableProperties";
import { showImageDialog } from "./ui/imageDialog";
import { emptyParagraphFor } from "./builder/blockFactory";
import type { EditorMessages } from "./i18n/types";
import { defaultMessages } from "./i18n";
import { createA11yMirror } from "./a11y/mirror";
import {
  changeListLevel,
  applyTableStyle,
  canExecuteTableAction as canExecuteTableActionForState,
  deleteTableRowCmd,
  deleteTableColumnCmd,
  deleteTableCmd,
  findSdtRanges,
  findFieldRanges,
  fieldAtPosition,
  insertContentControl,
  insertText,
  insertFragment,
  deleteBackward,
  deleteForward,
  deleteImage,
  removeBlockObject,
  findTableById,
  insertTableColumnCmd,
  insertTableRowCmd,
  fieldAtBlock,
  insertFieldCmd,
  editFieldCmd,
  editEquationCmd,
  editInlineEquationCmd,
  removeInlineEquationCmd,
  setEquationAlignCmd,
  updateFieldCmd,
  updateTocFieldCmd,
  setTocSwitchesCmd,
  mergeCellsCmd,
  replaceFieldResultCmd,
  setCellsBordersCmd,
  setCellsShadingCmd,
  removeContentControl,
  wrapImageInContentControl,
  replaceBackAndInsert,
  replaceSdtContent,
  replaceSdtBlockSpan,
  replaceSdtCellContent,
  sdtAtPosition,
  inlineSdtAtPosition,
  sdtStackAtPosition,
  setAlignment,
  setCharStyle as setCharStyleCmd,
  setImageProps,
  setImageCropCmd,
  setImageLayer,
  bringImageToFront,
  sendImageToBack,
  moveAnchoredImage,
  setLinkCmd,
  setParaProps,
  setSdtContent,
  setRowHeightCmd,
  setTableColFractionsCmd,
  setTableWidthModeCmd,
  splitParagraph,
  toggleCharStyle,
  toggleList,
  toggleSdtCheckbox,
  unmergeCellCmd,
  setTableWidthModeAtSelectionCmd,
  setTablePreferredWidthAtSelectionCmd,
  setTableAlignAtSelectionCmd,
  setCellVAlignCmd,
  setCellTextDirectionCmd,
  setRowHeightAtSelectionCmd,
  setRowPropsCmd,
  setTablePropsAtSelectionCmd,
  type TableAction,
} from "./editor/commands";
import type { SdtType } from "@kindy/shared";
import { ICONS } from "./ui/icons";
import type { CellSelection, Command, EditMode, EditorState, Transaction } from "./editor/state";
import type { TableSelection } from "./editor/state";
import { findTablePathById as resolveTableIdPath, resolveTablePath } from "./editor/tableTargetResolver";
import { UndoManager } from "./editor/undo";
import { ChangeRecorder, type ChangeSink } from "./sync/changeRecorder";
import type { Change, ChangeOrigin } from "@kindy/shared";
import {
  applyReviewOp,
  emptyReview,
  gcStructuralReviewLayer,
  rebaseReview,
  type Fragment,
  type ReviewLayer,
  type ReviewOp,
  type ReviewOpEnvelope,
} from "@kindy/shared";
import { intercept } from "./review/intercept";
import { decorate } from "./review/decorate";
import { acceptSuggestion, rejectSuggestion, acceptAllSuggestions, rejectAllSuggestions, type Resolution } from "@kindy/shared";
import { defaultReviewAccessCan, type MentionPicker, type ReviewAccess, type ReviewAction } from "./review/integration";
export type { MentionPicker, MentionPickerRequest, MentionPickerContext, ReviewAccess, ReviewAction, ReviewActionContext } from "./review/integration";

/** Editor mode: edit (normal), suggest (edits become tracked-change records), or
 *  view (read-only — every mutation is a no-op; the old `readonly:true`).
 *  Defined in ./editor/state (imported above) and re-exported for the public API. */
export type { EditMode };

export type { ReviewOpEnvelope };

export interface CurrentFormat {
  styleId: string | null;
  fontFamily: string | null;
  fontSizePx: number | null;
  lineHeight: number | null;
  /** Character toggles at the caret (incl. the pending style) — drive the
   *  ribbon's pressed-button state. */
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  highlight: boolean;
  superscript: boolean;
  subscript: boolean;
  /** Run-level Font-dialog state at the caret (incl. the pending style): the
   *  caps / small-caps / double-strike quick-toggle pressed state, plus the
   *  initial values the Font dialog reads back. Booleans default false; the
   *  rest are null when unset (inherit/Word-default). */
  caps: boolean;
  smallCaps: boolean;
  doubleStrikethrough: boolean;
  underlineStyle: UnderlineStyle | null;
  underlineColor: string | null;
  positionPx: number | null;
  widthScalePct: number | null;
  letterSpacingPx: number | null;
  kerningMinPx: number | null;
  emphasisMark: EmphasisMark | null;
  outline: boolean;
  shadow: boolean;
  emboss: boolean;
  imprint: boolean;
  fitTextPx: number | null;
  /** Paragraph alignment, and which list (if any) the caret paragraph is in. */
  align: ParaStyle["align"] | null;
  /** Caret paragraph's base writing direction (RTL when w:bidi). null = mixed. */
  direction: ParaStyle["direction"] | null;
  listKind: "bullet" | "number" | null;
  /** Caret/selection context — drives which ribbon buttons are enabled. */
  imageSelected: boolean;
  inTable: boolean;
  inContentControl: boolean;
}

export interface SearchState {
  index: number; // 1-based current match (0 = none)
  total: number;
}

/** A node the develop-mode Document-tree inspector can point at — used by both
 *  `setInspectorHighlight` (paint its region) and `revealInspectorTarget` (scroll
 *  to it). Covers every tree-node kind, each resolved to rects via the matching
 *  geometry path (whole-block box, run range, table cell, content-control, field). */
export type InspectorTarget =
  | { kind: "block"; blockId: string }
  | { kind: "run"; blockId: string; start: number; end: number }
  | { kind: "cell"; tableId: string; ri: number; ci: number }
  | { kind: "row"; tableId: string; ri: number }
  | { kind: "sdt"; sdtId: string }
  | { kind: "field"; fieldId: string }
  /** A literal page-coordinate rect (Layout-tab geometry nodes). */
  | { kind: "rect"; pageIndex: number; x: number; y: number; width: number; height: number; label?: string };

/** What the develop-mode hit-test probe resolves under the pointer — the input
 *  layer's view of a page point (caret position, content-control chain, field,
 *  table cell). Powers the inspector's Probe readout. */
export interface InspectorProbe {
  pageIndex: number;
  /** Page-local coordinates (CSS px, zoom-agnostic). */
  x: number;
  y: number;
  /** Resolved caret position, or null when the point hits no text. */
  position: { blockId: string; offset: number } | null;
  /** Content-control ancestry at the position (outer→inner sdt ids). */
  sdtChain: string[];
  /** Field id whose result contains the position, or null. */
  fieldId: string | null;
  /** Table cell under the point, or null. */
  cell: { tableId: string; row: number; col: number } | null;
}

export interface Editor {
  focus(): void;
  getDocument(): Document;
  getSelection(): DocSelection | null;
  /** Active rectangular table-cell selection in span-aware grid coordinates. */
  getCellSelection(): CellSelection | null;
  /** Semantic cell/row/column/table selection used by structural commands. */
  getTableSelection(): TableSelection | null;
  setTableSelection(selection: TableSelection | null): void;
  /** Move the caret/selection programmatically (null clears it). Unlike
   *  revealBlock/revealBookmark this does NOT scroll — it just sets the anchor so
   *  a following command (insert/format) targets the range. Used by agent tools. */
  setSelection(sel: DocSelection | null): void;
  /** The current layout tree (pages, placed blocks, line boxes, fragments — all
   *  page-local geometry). Read-only snapshot for diagnostics/agent inspection of
   *  text placement and rendering. */
  getLayoutTree(): LayoutTree;
  /** A live snapshot of this document's style context (stylesheet, list defs,
   *  content-control + field maps, page section) — what a child document shares. */
  getStyleContext(): StyleContext;
  /** Create a child document that shares this editor's live styles/fonts/theme and
   *  renders or edits a content slice on canvas (see ./child/childDocument). */
  createChild(): ChildDocument;
  getSelectedObject(): string | null;
  selectObject(blockId: string | null): void;
  /** Execute a command and report whether it produced a transaction. */
  dispatch(cmd: Command): boolean;
  /** Whether a structural table action is valid for the semantic current target. */
  canExecuteTableAction(action: TableAction): boolean;
  toggleStyle(key: StyleKey): void;
  /** Absolute char patch: range -> restyle runs; collapsed -> pending style. */
  setCharStyle(patch: Partial<CharStyle>): void;
  /** Alignment routes to the selected image when one is selected. */
  align(align: ParaStyle["align"]): void;
  /** Formatting at the caret — drives toolbar control state. */
  currentFormat(): CurrentFormat;
  /** The caret paragraph's DIRECT style (what setParaProps patches), or null when
   *  there's no caret. Seeds the Paragraph dialog's controls with the current
   *  borders/shading/spacing/flags. */
  currentParaStyle(): ParaStyle | null;
  /** Open the content-control inspector for the active control — the one at the
   *  caret, or the one wrapping the selected image. Returns false when neither is
   *  in a content control. */
  inspectContentControl(): boolean;
  /** The innermost content-control id at the caret or around the selected image,
   *  or null. Drives ribbon buttons that act on "the current control" (e.g. Remove)
   *  for both text and object (image) selections. */
  activeContentControlId(): string | null;
  /** Update every TOC entry's page number to its target's current page (the
   *  imported pre-calculated numbers are shown until the user asks for this).
   *  Returns the count of entries whose number changed. */
  recalculateToc(): number;
  /** Drop all cached layout and re-lay-out + repaint. Call after a FontFace the
   *  document depends on finishes loading post-mount (e.g. the lazily-loaded CJK
   *  fallback) so text re-measures against the now-available face. */
  refreshFonts(): void;
  /** Presentational zoom (1 = 100%, clamped to [.25, 5]). No relayout. */
  setZoom(zoom: number): void;
  getZoom(): number;
  /** Drawing-grid overlay (light gridline mesh on every page) + snap-to-grid for
   *  dragging anchored objects. Presentational only — no layout/model change. */
  setShowGrid(show: boolean): void;
  getShowGrid(): boolean;
  setSnapToGrid(snap: boolean): void;
  getSnapToGrid(): boolean;
  /** Grid step in document px (96dpi); drives both the mesh and snapping. */
  setGridSpacing(px: number): void;
  getGridSpacing(): number;
  /** Non-printing formatting marks (space dots, tab arrows, pilcrows, line-break
   *  arrows). Presentational overlay only — no layout/model change. */
  setShowFormattingMarks(show: boolean): void;
  getShowFormattingMarks(): boolean;
  /** Format painter: capture caret formatting, apply on the next selection. */
  armFormatPainter(sticky: boolean): void;
  cancelFormatPainter(): void;
  /** Clipboard, mirroring the Ctrl+C/X/V handlers for ribbon buttons. */
  copy(): void;
  cut(): void;
  paste(): void;
  /** Move the caret to a block's start and scroll it into view (outline pane,
   *  navigation). No-op if the block id isn't in the current document. */
  revealBlock(blockId: string): void;
  /** Select a bookmark's range and scroll it into view (Bookmarks panel "Go To").
   *  No-op if the bookmark is missing or anchored in hidden/unplaced content. */
  revealBookmark(name: string): void;
  /** Select the whole document body (Select All button / Ctrl+A). */
  selectAll(): void;
  /** Layout summary for the status bar: total pages and the caret's 1-based page. */
  getLayoutInfo(): { pageCount: number; currentPage: number };
  /** Viewport rect of the selected image (anchor for a floating toolbar), or null. */
  getSelectedObjectRect(): { left: number; top: number; width: number; height: number } | null;
  /** Delete the selected image and clear the object selection. */
  deleteSelectedObject(): void;
  /** Enter Header / Footer band editing mode on a specified page. */
  editBand(band: "header" | "footer", pageIndex?: number): void;
  /** Close Header / Footer band editing mode, returning to body editing. */
  closeBand(): void;
  /** Currently active header/footer story scope, or null if editing the body. */
  getActiveStory(): GeoScope | null;
  // ---- develop-mode Document-tree inspector --------------------------------
  /** Paint a devtools-style highlight over an inspector node's region on the
   *  canvas (block, run range, table cell, content control, or field). Pass null
   *  to clear. Presentational only — no model/selection change. */
  setInspectorHighlight(target: InspectorTarget | null): void;
  /** Scroll an inspector node into view (and move the caret into text targets, so
   *  it mirrors clicking there). Handles every node kind — paragraphs, runs,
   *  images, tables, cells, content controls, and fields. */
  revealInspectorTarget(target: InspectorTarget): void;
  /** Turn the develop-mode hover signal (EditorOptions.onInspectorHover) on/off.
   *  The inspector panel enables it while open and disables it on close, so the
   *  canvas→tree reverse highlight costs nothing when no inspector is attached. */
  setInspectorActive(active: boolean): void;
  /** Turn the develop-mode hit-test probe (EditorOptions.onInspectorProbe) on/off. */
  setInspectorProbe(active: boolean): void;
  /** Develop-mode layout overlay toggle drawn on the canvas — kinds: blockBoxes,
   *  lineBoxes, fragments, baselines, margins, cells, pageInfo. Presentational. */
  setDebugOverlay(kind: string, on: boolean): void;
  /** Find & replace. search() highlights all matches and returns state. */
  search(query: string, opts?: { matchCase?: boolean; wholeWord?: boolean }): SearchState;
  searchNav(dir: 1 | -1): SearchState;
  searchReplaceCurrent(replacement: string): SearchState;
  searchReplaceAll(replacement: string): number;
  searchClear(): void;
  undo(): void;
  redo(): void;
  /** The document-history change log recorded this session (ordered). The base
   *  snapshot taken at load + this log reconstructs the current document. */
  getChangeLog(): Change[];
  /** The local version: number of changes recorded since load. */
  getChangeHead(): number;
  /** Apply ops received from a remote collaborator: mutates the document and
   *  rebases the local caret, without recording to the change log or undo stack. */
  applyRemoteOps(ops: Op[], change?: Change): void;
  /** Upsert a remote collaborator's caret (rebased through edits, rendered with
   *  their name). `selection` null hides their caret. */
  setPeerPresence(siteId: string, user: UserInfo | undefined, selection: DocSelection | null): void;
  /** Remove a collaborator's caret (they left). */
  removePeer(siteId: string): void;
  /** True when the editor was created in view-only mode (mutations are no-ops). */
  isReadonly(): boolean;
  // ---- review layer (track changes + comments) ----------------------------
  /** Current editor mode. */
  getMode(): EditMode;
  /** Switch mode. Returns false if `mode` isn't in `allowedModes`. */
  setMode(mode: EditMode): boolean;
  /** Read-only snapshot of the review overlay. */
  getReview(): ReviewLayer;
  /** Replace the review overlay (e.g. a rehydrated snapshot loaded on join) and
   *  repaint. Used by the collab join flow after the document is mounted. */
  seedReview(layer: ReviewLayer): void;
  /** Scroll to and select a suggestion or comment thread by id (panel "go to"). */
  revealReview(id: string): void;
  /** Reveal a comment's anchor and notify the host UI to focus its discussion. */
  openCommentThread(threadId: string): void;
  acceptSuggestion(id: string): void;
  rejectSuggestion(id: string): void;
  acceptAllSuggestions(): void;
  rejectAllSuggestions(): void;
  /** The roster of @-mentionable users (set in the constructor / setKnownUsers). */
  getKnownUsers(): UserInfo[];
  /** Update the @-mentionable user roster at runtime. */
  setKnownUsers(users: UserInfo[]): void;
  /** Add a comment thread anchored to the current selection (start===end ⇒ a
   *  point comment). `body` is a rich fragment; `mentions` are tagged users.
   *  Returns the new thread id, or null if there's no selection. */
  addComment(body: Fragment, mentions?: UserInfo[]): string | null;
  /** Open the floating comment composer anchored to the current selection
   *  (Google-Docs-style bubble). No-op in view mode or with no selection. */
  startComment(): void;
  replyToComment(threadId: string, body: Fragment, mentions?: UserInfo[]): void;
  editComment(threadId: string, commentId: string, body: Fragment, mentions?: UserInfo[]): void;
  deleteComment(threadId: string, commentId: string): void;
  resolveThread(threadId: string, resolved?: boolean): void;
  canReviewAction(action: ReviewAction, threadId?: string, commentId?: string): boolean;
  setReviewAccess(access?: ReviewAccess): void;
  /** Apply a review op that arrived from a collaborator (already anchor-rebased
   *  to the local doc by the caller). Not recorded/broadcast. */
  applyRemoteReviewOp(op: ReviewOp): void;
  destroy(): void;
}

export interface EditorOptions {
  /** Reuse a pre-warmed layout engine (its caches) instead of a fresh one. */
  engine?: LayoutEngine;
  /** Fires after any selection or document change (toolbar sync). */
  onChange?: () => void;
  /** Fires after the zoom changes (toolbar/wheel), for a zoom indicator. */
  onZoomChange?: (zoom: number) => void;
  /** Document id this editor session is editing — stamped onto every recorded
   *  Change. Defaults to "local". */
  docId?: string;
  /** Fires for each committed Change (the document-history log entry). The
   *  SyncClient subscribes here to ship edits to the server. */
  onChangeRecorded?: ChangeSink;
  /** Public integration seam after an operation group has been applied. Local
   * edits include their stable Change; remote edits include the server Change
   * when supplied by SyncClient. */
  onMutationApplied?: (event: {
    source: "local" | "remote";
    ops: Op[];
    origin: ChangeOrigin;
    intent?: string;
    selectionBefore: DocSelection | null;
    selectionAfter: DocSelection | null;
    change?: Change;
  }) => void;
  /** Fires whenever the local selection/caret moves (for presence broadcast). */
  onSelectionChange?: (selection: DocSelection | null) => void;
  /** View-only mode: the document renders and stays selectable/copyable, but
   *  every mutation (typing, paste, undo/redo, structural edits) is a no-op.
   *  Remote collaborator edits still apply — a read-only client tracks a live
   *  session, it just can't author. Equivalent to `mode: "view"`. */
  readonly?: boolean;
  /** Initial editor mode. Defaults to "view" when `readonly`, else "edit". */
  mode?: EditMode;
  /** Modes the user may switch to (the mode picker is constrained to these and
   *  setMode rejects others). Omit ⇒ all three. */
  allowedModes?: EditMode[];
  /** Local user identity — attributed onto suggestions/comments authored here.
   *  Without it, suggest mode falls back to anonymous attribution. */
  user?: UserInfo;
  /** Users that can be @-mentioned in comments (the embedder owns the roster).
   *  Updatable at runtime via setKnownUsers. */
  knownUsers?: UserInfo[];
  /** Optional host-rendered @mention picker; knownUsers remains the fallback. */
  mentionPicker?: MentionPicker;
  /** Client-side review capability gate. Backend authorization remains required. */
  reviewAccess?: ReviewAccess;
  /** Live document id for host mention/permission contexts. */
  getDocumentId?: () => string | null;
  /** UI hook used to focus the Comments panel/thread after creation or pin click. */
  onCommentThreadActivated?: (threadId: string) => void;
  /** Seed the review overlay (e.g. a layer loaded from the backend). */
  review?: ReviewLayer;
  /** Fires after the review overlay changes (suggestion/comment added, resolved,
   *  rebased) — for panels + the embedder. */
  onReviewChanged?: (review: ReviewLayer) => void;
  /** Fires for each locally-authored review op (suggest mode, accept/reject,
   *  comments). The SyncClient ships these on the review channel; persistence
   *  appends them. */
  onReviewOpRecorded?: (env: ReviewOpEnvelope) => void;
  /** Fires for every review operation after it is applied locally/remotely. */
  onReviewOpApplied?: (op: ReviewOp, remote: boolean) => void;
  /** Fires when the mode changes (picker / setMode). */
  onModeChanged?: (mode: EditMode) => void;
  /** Resolve a custom field's content from the host (e.g. its backend). Invoked by
   *  the "Update Field" context-menu action for a non-built-in field; the result is
   *  imported and spliced in as the field's new result. Absent ⇒ no refresh. */
  resolveField?: FieldResolver;
  /** Paint-surface tuning passed to the canvas layer — e.g. `{ chrome: false }`
   *  to drop page shadow/gaps for an embedded child-document editor. */
  paintOptions?: PaintLayerOptions;
  /** Resolved color theme (per-instance). Threaded into the paint layer; omit ⇒
   *  the library default look. */
  theme?: ResolvedTheme;
  /** Resolved behavior tuning (zoom step/clamp, indent step). Omit ⇒ defaults. */
  behavior?: ResolvedBehavior;
  /** Localized message catalog. Defaults to built-in English. */
  messages?: EditorMessages;
  /** Develop-mode hook: fires as the pointer moves over the page with the blockId
   *  of the top-level body block under the cursor (or null when over none). Only
   *  emitted while the Document-tree inspector is attached (see setInspectorActive)
   *  — it powers the canvas→tree reverse-highlight and stays dormant otherwise. */
  onInspectorHover?: (blockId: string | null) => void;
  /** Develop-mode hit-test probe: fires as the pointer moves with the resolved
   *  page point (caret position, sdt chain, field, cell), or null when off-page.
   *  Only emitted while `setInspectorProbe(true)` — dormant otherwise. */
  onInspectorProbe?: (probe: InspectorProbe | null) => void;
}

/** Request passed to a custom-field resolver. */
export interface FieldResolveRequest {
  /** The field's id (Document.fields key). */
  fieldId: string;
  /** Field keyword, uppercased (e.g. "MYCHART"). */
  name: string;
  /** The verbatim field instruction (e.g. ` MYCHART "sales-2026" `). */
  instruction: string;
  /** The collaboration doc id, when the session has one. */
  docId?: string;
}

/** What a field resolver returns:
 *  - a full **.docx** (ArrayBuffer / Uint8Array / Blob) — RECOMMENDED: imported
 *    through the same pipeline as opening a document, so images, tables, lists and
 *    styles all come through (media is content-addressed and survives export);
 *  - or an **OOXML fragment string** (w:p / w:tbl, or a w:document) for simple,
 *    text-only results (no embedded media). */
export type FieldResult = string | ArrayBuffer | Uint8Array | Blob;

/** Host hook: produce a field's result for the given request. */
export type FieldResolver = (req: FieldResolveRequest) => Promise<FieldResult>;

/** Turn a resolver result into model blocks: a .docx goes through the full import
 *  pipeline (worker + media re-homing, so images render and export); an OOXML
 *  fragment string is parsed media-free. */
async function fieldResultToBlocks(result: FieldResult): Promise<Block[]> {
  if (typeof result === "string") return result.trim() === "" ? [] : parseOoxmlFragment(result);
  // ArrayBuffer / Blob pass straight to importDocx; wrap a Uint8Array in a Blob
  // (sidesteps SharedArrayBuffer typing and any subarray view offset).
  const input =
    result instanceof ArrayBuffer || result instanceof Blob ? result : new Blob([new Uint8Array(result)]);
  return (await importDocx(input)).doc.blocks;
}

/** Deep-clone a block list with ONE content control's run markers removed, so the
 *  control's content can be edited as a plain mini-document in a child editor — no
 *  nested control frame, and no chance of producing a second copy of the SDT. The
 *  commit (replaceSdt*) re-applies the marker, re-wrapping the whole result. */
function stripSdtMarker(blocks: Block[], sdtId: string): Block[] {
  const clone = structuredClone(blocks);
  const strip = (path: string[] | undefined): string[] | undefined => {
    if (!path) return undefined;
    const next = path.filter((x) => x !== sdtId);
    return next.length > 0 ? next : undefined;
  };
  const walk = (bs: Block[]): void => {
    for (const b of bs) {
      const bp = strip(b.sdtPath);
      if (bp) b.sdtPath = bp;
      else delete b.sdtPath;
      if (b.kind === "paragraph") {
        for (const r of b.runs) {
          const rp = strip(r.style.sdtPath);
          if (rp) r.style.sdtPath = rp;
          else delete r.style.sdtPath;
        }
      } else if (b.kind === "table") {
        for (const row of b.rows) for (const c of row.cells) walk(c.blocks);
      }
    }
  };
  walk(clone);
  return clone;
}

export function createEditor(
  container: HTMLElement,
  initialDoc: Document,
  options: EditorOptions = {},
): Editor {
  const t = options.messages ?? defaultMessages;
  const engine = options.engine ?? createLayoutEngine();
  // Editor mode. "view" short-circuits the mutation pipeline (commit/undo/redo)
  // so the document can be read/selected/copied but never authored; remote ops
  // bypass it. "suggest" routes edits through the review interceptor. `readonly`
  // captures the INITIAL view state for construction-time affordance gating;
  // the mutation gates below check `mode` so a runtime switch to view is honored.
  let mode: EditMode = options.mode ?? (options.readonly ? "view" : "edit");
  const allowedModes = options.allowedModes;
  const readonly = mode === "view";
  // Multiplicative zoom step (toolbar +/- and Ctrl+wheel) — per-instance.
  const zoomStep = options.behavior?.zoomStep ?? ZOOM_STEP;
  const paint = createPaintLayer(container, {
    ...options.paintOptions,
    ...(options.theme ? { theme: options.theme } : {}),
    ...(options.behavior ? { zoomMin: options.behavior.zoomMin, zoomMax: options.behavior.zoomMax } : {}),
  });
  const undoMgr = new UndoManager();
  // Document history: every committed edit (and undo/redo, as forward ops) is
  // recorded as a Change. The base snapshot + this ordered log reconstructs any
  // version (see shared/replay).
  const recorder = new ChangeRecorder(options.docId ?? "local", options.onChangeRecorded);
  // Review overlay (track changes + comments) — a SIBLING of `doc`, never folded
  // into it. Anchors ride mapPosition exactly like bookmarks (rebaseReviewLayer).
  let review: ReviewLayer = options.review ?? emptyReview(options.docId ?? "local", recorder.head());

  let doc = initialDoc;
  let tree: LayoutTree = engine.layout(doc);
  let selection: DocSelection | null = null;
  let cellSelection: CellSelection | null = null; // rectangular table-cell selection
  let tableSelection: TableSelection | null = null;
  let pendingStyle: Partial<CharStyle> | null = null;
  let activeStory: GeoScope | null = null; // header/footer story-edit scope
  let savedBodySelection: DocSelection | null = null; // restored on story exit
  paint.setTree(tree);

  const state = (): EditorState => ({ doc, selection, cellSelection, tableSelection, pendingStyle });
  const scope = (): GeoScope | undefined => activeStory ?? undefined;

  // ---- selection visuals + proxy follow ----------------------------------

  const SDT_LABELS: Record<string, string> = {
    richText: "Rich Text",
    plainText: "Text",
    checkbox: "Check Box",
    dropDown: "Drop-Down List",
    comboBox: "Combo Box",
    date: "Date",
  };

  /** Vertical extent (top, bottom) a placed block occupies on its page —
   *  paragraphs measure their line stack, images/tables their box. */
  const placedBlockVBounds = (pb: PlacedBlock): [number, number] => {
    if (pb.table) return [pb.table.y, pb.table.y + pb.table.height];
    if (pb.image) return [pb.y, pb.y + pb.image.height];
    let top = pb.y;
    let bot = pb.y;
    for (const l of pb.lines) {
      const ly = pb.y + l.y;
      if (ly < top) top = ly;
      if (ly + l.height > bot) bot = ly + l.height;
    }
    return [top, bot];
  };

  /** Body block-level controls (those wrapping WHOLE paragraphs/tables, like
   *  Word's boundingBox appearance) draw ONE frame per page spanning the full
   *  content column from the first block's top to the last block's bottom — not
   *  ragged per-line rects. Returns null for inline / cell-hosted controls, which
   *  keep the text-shaped highlight.
   *
   *  The importer's block-level tag (tagBlockSdt) covers EVERY paragraph it
   *  touches in full — including all cells of a contained table — whereas an
   *  inline control leaves partial coverage. So "every range is whole-paragraph"
   *  means block-level; a cell paragraph's range maps back to its top-level table
   *  via locateParagraph, letting an SDT that wraps a heading + table be framed. */
  /** Union the vertical extent of a set of top-level body blocks into one framed
   *  box per page (a span can break across pages). */
  const boxRectsForBlockIds = (ids: Set<string>): Rect[] => {
    const byPage = new Map<number, { top: number; bot: number; page: Page }>();
    for (const page of tree.pages) {
      for (const pb of page.blocks) {
        if (!ids.has(pb.blockId)) continue;
        const [t, b] = placedBlockVBounds(pb);
        const cur = byPage.get(page.index);
        if (cur) {
          cur.top = Math.min(cur.top, t);
          cur.bot = Math.max(cur.bot, b);
        } else byPage.set(page.index, { top: t, bot: b, page });
      }
    }
    const rects: Rect[] = [];
    for (const { top, bot, page } of byPage.values()) {
      rects.push({ pageIndex: page.index, x: page.marginPx.left, y: top, width: page.widthPx - page.marginPx.left - page.marginPx.right, height: bot - top });
    }
    return rects;
  };

  const blockLevelSdtRects = (id: string): Rect[] | null => {
    const body = containerBlocks(doc, "body");
    // A control is block-level only when top-level body blocks (paragraph/table/
    // image) carry its id on Block.sdtPath — then frame the whole contiguous span
    // (incl. a wrapped table). Everything else — including an INLINE control that
    // happens to fill a whole cell paragraph — is text-shaped: return null so the
    // caller frames the run rects, not the containing block/table.
    const blockIdxs: number[] = [];
    body.forEach((b, i) => { if (b.sdtPath?.includes(id)) blockIdxs.push(i); });
    if (blockIdxs.length === 0) return null;
    const lo = Math.min(...blockIdxs);
    const hi = Math.max(...blockIdxs);
    const ids = new Set(body.slice(lo, hi + 1).map((b) => b.id));
    const rects = boxRectsForBlockIds(ids);
    return rects.length > 0 ? rects : null;
  };

  /** Image-only controls inside table cells: blockLevelSdtRects only scans body
   *  top-level blocks and findSdtRanges only walks paragraph runs, so a control
   *  whose sole content is an image sitting in a cell would frame nothing. Frame
   *  the image itself (a top-level image-only control already frames via the
   *  block-level path, since the image is a body block). */
  const cellImageSdtRects = (id: string): Rect[] => {
    const rects: Rect[] = [];
    for (const b of doc.blocks) {
      if (b.kind !== "table") continue;
      for (const row of b.rows)
        for (const cell of row.cells)
          for (const cb of cell.blocks)
            if (cb.kind === "image" && cb.sdtPath?.includes(id)) {
              const r = objectRect(tree, cb.id);
              if (r) rects.push(r);
            }
    }
    return rects;
  };

  /** Frame + label for one control id: a single bounding box for block-level
   *  controls (Word's boundingBox chrome), else text-shaped per-line rects. */
  const sdtLayerFor = (id: string): { rects: Rect[]; label: string } | null => {
    const props = doc.sdts?.[id];
    if (!props) return null;
    const rects =
      blockLevelSdtRects(id) ?? [
        ...findSdtRanges(doc, id).flatMap((r) =>
          selectionRects(tree, { anchor: { blockId: r.blockId, offset: r.start }, focus: { blockId: r.blockId, offset: r.end } }, scope()),
        ),
        ...cellImageSdtRects(id),
      ];
    if (rects.length === 0) return null;
    return { rects, label: props.alias ?? SDT_LABELS[props.type] ?? "Content control" };
  };

  /** SDT ancestry (outer→inner) of a selected image — the caret-less analogue of
   *  sdtStackAtPosition: the wrapping table's block path (for a cell image) then
   *  the image block's own path. Lets selecting an image inside a control still
   *  raise the control chrome + light up the ribbon, so its membership is visible. */
  const objectSdtChain = (blockId: string): string[] => {
    const loc = locateImage(doc, blockId);
    if (!loc) return [];
    const table = loc.kind === "cell" ? doc.blocks[loc.bi] : undefined;
    const tablePath = table?.kind === "table" ? table.sdtPath ?? [] : [];
    return [...tablePath, ...(loc.image.sdtPath ?? [])];
  };

  // Content-control chrome: an OUTER→INNER stack of frames (concentric, with a
  // breadcrumb tab) for the nested controls under the caret OR the pointer. Hover
  // takes precedence over the caret so the user can inspect any control by pointing.
  let caretSdtChain: string[] = [];
  let hoverSdtChain: string[] = [];
  const sdtChainKey = (ids: string[]): string => ids.join(">");
  const renderSdtAdornment = (): void => {
    const chain = hoverSdtChain.length > 0 ? hoverSdtChain : caretSdtChain;
    paint.setSdtAdornment(chain.length > 0 ? chain.map(sdtLayerFor).filter((l): l is { rects: Rect[]; label: string } => l !== null) : null);
  };

  /** Word's active-control chrome, recomputed from the caret — or, when an image
   *  object is selected (which clears the text caret), from that image's control
   *  ancestry, so a picture inside a control still shows its frame + breadcrumb.
   *  Cleared when neither is in a control (unless the pointer is hovering one). */
  const updateSdtAdornment = (): void => {
    const focus = selection?.focus;
    caretSdtChain = focus
      ? sdtStackAtPosition(doc, focus)
      : selectedObject
        ? objectSdtChain(selectedObject)
        : [];
    renderSdtAdornment();
  };

  let lastHoverKey = "";
  /** Highlight the nested control chain under the pointer (skipped while dragging
   *  or when an object is selected). */
  const updateHoverAdornment = (clientX: number, clientY: number, buttons: number): void => {
    let chain: string[] = [];
    if (buttons === 0 && !selectedObject) {
      const pt = paint.clientToPage(clientX, clientY);
      if (pt && pt.inside) {
        const pos = hitTest(tree, pt.pageIndex, pt.x, pt.y, scope());
        if (pos) chain = sdtStackAtPosition(doc, pos);
      }
    }
    const key = sdtChainKey(chain);
    if (key === lastHoverKey) return;
    lastHoverKey = key;
    hoverSdtChain = chain;
    renderSdtAdornment();
  };

  // ---- develop-mode Document-tree inspector --------------------------------
  // Two cooperating signals for the floating inspector panel: tree→canvas (paint a
  // node's region on demand) and canvas→tree (emit the block under the pointer).
  // Both are inert unless the panel turns the hover signal on via setInspectorActive,
  // so non-develop embeds pay nothing.
  let inspectorActive = false;
  let lastInspectorHover: string | null = null;
  let probeActive = false;
  let lastProbeKey = "";
  // Any-kind block lookup across body blocks + table cells (blockById finds only
  // paragraphs). Used to pick the right doc→rect strategy per node kind.
  const findBlockDeep = (blocks: Block[], id: string): Block | undefined => {
    for (const b of blocks) {
      if (b.id === id) return b;
      if (b.kind === "table") {
        for (const row of b.rows) for (const cell of row.cells) {
          const hit = findBlockDeep(cell.blocks, id);
          if (hit) return hit;
        }
      }
    }
    return undefined;
  };
  // Resolve any inspector node to its painted rects + a label, reusing the same
  // geometry the live adornments use (objectRect/selectionRects/cellRangeRects/
  // sdtLayerFor/field rects). Powers both the hover highlight and the scroll-to.
  const inspectorRectsFor = (t: InspectorTarget): { rects: Rect[]; label: string } | null => {
    if (t.kind === "block") {
      const block = findBlockDeep(doc.blocks, t.blockId);
      if (!block) return null;
      if (block.kind === "image") {
        const r = objectRect(tree, t.blockId);
        return r ? { rects: [r], label: "image" } : null;
      }
      if (block.kind === "equation") {
        const r = objectRect(tree, t.blockId);
        return r ? { rects: [r], label: "equation" } : null;
      }
      if (block.kind === "paragraph") {
        const len = textOfRuns(block.runs).length;
        const rects = selectionRects(tree, { anchor: { blockId: t.blockId, offset: 0 }, focus: { blockId: t.blockId, offset: len } }, scope());
        // Empty paragraph (no runs) — fall back to its full-width block box.
        const boxed = rects.length > 0 ? rects : boxRectsForBlockIds(new Set([t.blockId]));
        return boxed.length > 0 ? { rects: boxed, label: "¶" } : null;
      }
      // Table: the placed block's full-width box (selectionRects has no text anchor).
      const rects = boxRectsForBlockIds(new Set([t.blockId]));
      return rects.length > 0 ? { rects, label: "table" } : null;
    }
    if (t.kind === "run") {
      const rects = selectionRects(tree, { anchor: { blockId: t.blockId, offset: t.start }, focus: { blockId: t.blockId, offset: t.end } }, scope());
      return rects.length > 0 ? { rects, label: "run" } : null;
    }
    if (t.kind === "cell") {
      const found = findTableById(doc, t.tableId);
      if (!found) return null;
      const origin = gridOriginOfCell(buildTableGrid(found.table), t.ri, t.ci);
      if (!origin) return null;
      const cell = found.table.rows[t.ri]?.cells[t.ci];
      const rects = cellRangeRects(tree, t.tableId, origin.row, origin.col, origin.row + (cell?.rowSpan ?? 1) - 1, origin.col + (cell?.colSpan ?? 1) - 1);
      return rects.length > 0 ? { rects, label: "cell" } : null;
    }
    if (t.kind === "row") {
      const found = findTableById(doc, t.tableId);
      if (!found) return null;
      const grid = buildTableGrid(found.table);
      const rects: Rect[] = [];
      (found.table.rows[t.ri]?.cells ?? []).forEach((cell, ci) => {
        const origin = gridOriginOfCell(grid, t.ri, ci);
        if (origin) rects.push(...cellRangeRects(tree, t.tableId, origin.row, origin.col, origin.row + (cell.rowSpan ?? 1) - 1, origin.col + (cell.colSpan ?? 1) - 1));
      });
      return rects.length > 0 ? { rects, label: "row" } : null;
    }
    if (t.kind === "rect") {
      return { rects: [{ pageIndex: t.pageIndex, x: t.x, y: t.y, width: t.width, height: t.height }], label: t.label ?? "rect" };
    }
    if (t.kind === "sdt") {
      return sdtLayerFor(t.sdtId);
    }
    // field: block-region (Block.fieldId) or inline (CharStyle.fieldId).
    const def = doc.fields?.[t.fieldId];
    const isBlock = containerBlocks(doc, "body").some((b) => b.fieldId === t.fieldId);
    const rects = isBlock
      ? blockLevelFieldRects(t.fieldId)
      : findFieldRanges(doc, t.fieldId).flatMap((r) => selectionRects(tree, { anchor: { blockId: r.blockId, offset: r.start }, focus: { blockId: r.blockId, offset: r.end } }, scope()));
    return rects.length > 0 ? { rects, label: def?.name ?? "field" } : null;
  };
  // Scroll an inspector node into view; move the caret into text targets so the
  // reveal matches clicking there (images/tables/cells just scroll).
  const revealInspector = (t: InspectorTarget): void => {
    if (t.kind === "run") {
      setSelection({ anchor: { blockId: t.blockId, offset: t.start }, focus: { blockId: t.blockId, offset: t.end } });
    } else if (t.kind === "block" && findBlockDeep(doc.blocks, t.blockId)?.kind === "paragraph") {
      setSelection({ anchor: { blockId: t.blockId, offset: 0 }, focus: { blockId: t.blockId, offset: 0 } });
    } else if (t.kind === "cell" || t.kind === "row") {
      const ci = t.kind === "cell" ? t.ci : 0;
      const firstPara = findTableById(doc, t.tableId)?.table.rows[t.ri]?.cells[ci]?.blocks.find((b) => b.kind === "paragraph");
      if (firstPara) setSelection({ anchor: { blockId: firstPara.id, offset: 0 }, focus: { blockId: firstPara.id, offset: 0 } });
    }
    const r = inspectorRectsFor(t)?.rects[0];
    if (r) paint.ensureVisible({ pageIndex: r.pageIndex, x: r.x, y: r.y, height: r.height }, "center");
  };
  const updateInspectorHover = (clientX: number, clientY: number, buttons: number): void => {
    if (!inspectorActive && !probeActive) return;
    const pt = buttons === 0 && !selectedObject ? paint.clientToPage(clientX, clientY) : null;
    const inside = pt !== null && pt.inside;
    // Reverse highlight: emit the block under the pointer.
    if (inspectorActive) {
      const blockId = inside ? hitTest(tree, pt!.pageIndex, pt!.x, pt!.y, scope())?.blockId ?? null : null;
      if (blockId !== lastInspectorHover) { lastInspectorHover = blockId; options.onInspectorHover?.(blockId); }
    }
    // Hit-test probe: emit the resolved page point (position, sdt chain, field, cell).
    if (probeActive) {
      let probe: InspectorProbe | null = null;
      if (inside) {
        const pos = hitTest(tree, pt!.pageIndex, pt!.x, pt!.y, scope()) ?? null;
        const cellHit = hitTestCell(tree, pt!.pageIndex, pt!.x, pt!.y);
        probe = {
          pageIndex: pt!.pageIndex,
          x: Math.round(pt!.x),
          y: Math.round(pt!.y),
          position: pos ? { blockId: pos.blockId, offset: pos.offset } : null,
          sdtChain: pos ? sdtStackAtPosition(doc, pos) : [],
          fieldId: pos ? fieldAtPosition(doc, pos) ?? null : null,
          cell: cellHit ? { tableId: cellHit.tableId, row: cellHit.row, col: cellHit.col } : null,
        };
      }
      const key = probe ? JSON.stringify(probe) : "";
      if (key !== lastProbeKey) { lastProbeKey = key; options.onInspectorProbe?.(probe); }
    }
  };

  /** Block-region field (contiguous top-level blocks sharing Block.fieldId): one
   *  framed box per page spanning the content column. */
  const blockLevelFieldRects = (id: string): Rect[] => {
    const ids = new Set(containerBlocks(doc, "body").filter((b) => b.fieldId === id).map((b) => b.id));
    if (ids.size === 0) return [];
    const byPage = new Map<number, { top: number; bot: number; page: Page }>();
    for (const page of tree.pages) {
      for (const pb of page.blocks) {
        if (!ids.has(pb.blockId)) continue;
        const [t, b] = placedBlockVBounds(pb);
        const cur = byPage.get(page.index);
        if (cur) {
          cur.top = Math.min(cur.top, t);
          cur.bot = Math.max(cur.bot, b);
        } else byPage.set(page.index, { top: t, bot: b, page });
      }
    }
    const rects: Rect[] = [];
    for (const { top, bot, page } of byPage.values()) {
      rects.push({ pageIndex: page.index, x: page.marginPx.left, y: top, width: page.widthPx - page.marginPx.left - page.marginPx.right, height: bot - top });
    }
    return rects;
  };

  /** Word's field highlight: gray field shading + a labelled tab around the field
   *  (inline runs, or a block region) containing the caret. Cleared when it leaves. */
  const updateFieldAdornment = (): void => {
    const focus = selection?.focus;
    const inlineId = focus ? fieldAtPosition(doc, focus) : null;
    const blockFieldId = !inlineId && focus ? blockById(doc, focus.blockId)?.fieldId ?? null : null;
    const id = inlineId ?? blockFieldId;
    const def = id ? doc.fields?.[id] : undefined;
    if (!id || !def) {
      paint.setFieldAdornment(null);
      return;
    }
    const rects = inlineId
      ? findFieldRanges(doc, id).flatMap((r) =>
          selectionRects(
            tree,
            { anchor: { blockId: r.blockId, offset: r.start }, focus: { blockId: r.blockId, offset: r.end } },
            scope(),
          ),
        )
      : blockLevelFieldRects(id);
    paint.setFieldAdornment({ rects, label: def.name });
  };

  /** Pixel rects for the active cell selection, normalized to whole merged cells. */
  const cellSelectionRects = (): Rect[] => {
    if (!cellSelection) return [];
    const found = findTableById(doc, cellSelection.tableId);
    if (!found) return [];
    const grid = buildTableGrid(found.table);
    const rect = normalizeRect(grid, {
      r0: cellSelection.anchor.row,
      c0: cellSelection.anchor.col,
      r1: cellSelection.focus.row,
      c1: cellSelection.focus.col,
    });
    return cellRangeRects(tree, cellSelection.tableId, rect.r0, rect.c0, rect.r1, rect.c1);
  };

  const tableSelectionHandleRects = (rects: Rect[]): Rect[] => {
    if (!tableSelection) return [];
    if (tableSelection.kind === "row") {
      return rects.map((rect) => ({ pageIndex: rect.pageIndex, x: rect.x - 9, y: rect.y, width: 7, height: rect.height }));
    }
    if (tableSelection.kind === "column") {
      return rects.map((rect) => ({ pageIndex: rect.pageIndex, x: rect.x, y: rect.y - 9, width: rect.width, height: 7 }));
    }
    const first = rects[0];
    return first ? [{ pageIndex: first.pageIndex, x: first.x - 9, y: first.y - 9, width: 7, height: 7 }] : [];
  };

  // Assigned in the review section below; called from refreshSelectionVisuals.
  let updateCommentAffordance: () => void = () => {};

  const applySelectionVisuals = (): void => {
    updateSdtAdornment();
    updateFieldAdornment();
    // A rectangular cell selection paints filled cell rects and hides the caret;
    // it supersedes any lingering text selection visual.
    if (cellSelection) {
      const rects = cellSelectionRects();
      paint.setSelectionRects(rects);
      paint.setTableSelectionHandles(tableSelectionHandleRects(rects));
      paint.setCaret(null);
      return;
    }
    paint.setTableSelectionHandles([]);
    if (!selection) {
      paint.setSelectionRects([]);
      paint.setCaret(null);
      return;
    }
    if (isCollapsed(selection)) {
      paint.setSelectionRects([]);
      const caret = caretRect(tree, selection.focus, scope());
      paint.setCaret(caret);
      if (caret) {
        const at = paint.caretToContainer(caret);
        if (at) proxy.moveTo(at.left, at.top, caret.height);
      }
    } else {
      paint.setSelectionRects(selectionRects(tree, selection, scope()));
      paint.setCaret(null); // Word hides the caret while a range is selected
    }
  };

  const refreshSelectionVisuals = (): void => {
    applySelectionVisuals();
    updateCommentAffordance(); // float the comment chip beside a suggest-mode selection
  };

  const notifyChange = (): void => {
    options.onChange?.();
  };

  // ---- remote collaborator presence (live carets) -------------------------
  interface RemotePeer {
    user: UserInfo | undefined;
    color: string;
    selection: DocSelection | null;
  }
  const remotePeers = new Map<string, RemotePeer>();

  const paintRemoteCarets = (): void => {
    const list: RemoteCaret[] = [];
    for (const [siteId, peer] of remotePeers) {
      if (!peer.selection) continue;
      const label = peer.user ? userDisplayName(peer.user) : "";
      const rect = caretRect(tree, peer.selection.focus, scope());
      // A range selection also draws translucent highlight rects (text, table
      // cells, SDT content — anything expressible as a DocSelection).
      const rects = isCollapsed(peer.selection) ? [] : selectionRects(tree, peer.selection, scope());
      if (rect || rects.length) list.push({ siteId, color: peer.color, label, rect, rects });
    }
    paint.setRemoteCarets(list);
  };

  // Rebase peer caret positions through an applied op (same mapper as the local
  // selection), so their carets travel with the text everyone is editing.
  const rebasePeers = (mapPosition: (p: DocPosition) => DocPosition): void => {
    for (const peer of remotePeers.values()) {
      if (peer.selection) {
        peer.selection = {
          anchor: mapPosition(peer.selection.anchor),
          focus: mapPosition(peer.selection.focus),
        };
      }
    }
  };

  const setSelection = (next: DocSelection | null): void => {
    // Word: entering a placeholder control selects its whole content, so the
    // first keystroke replaces the prompt text.
    if (next && isCollapsed(next)) {
      const focus = next.focus;
      const id = sdtAtPosition(doc, focus);
      const props = id ? doc.sdts?.[id] : undefined;
      if (id && props?.placeholder) {
        const r = findSdtRanges(doc, id).find(
          (rr) => rr.blockId === focus.blockId && focus.offset >= rr.start && focus.offset <= rr.end,
        );
        if (r && r.end > r.start) {
          next = {
            anchor: { blockId: r.blockId, offset: r.start },
            focus: { blockId: r.blockId, offset: r.end },
          };
        }
      }
    }
    selection = next;
    cellSelection = null; // a text caret/selection supersedes a cell selection
    tableSelection = null;
    pendingStyle = null; // moving the caret drops the pending typing style
    refreshSelectionVisuals();
    mirror.sync(state());
    notifyChange();
    options.onSelectionChange?.(selection);
  };

  /** Set (or clear) the rectangular table-cell selection. Repaints the cell rects
   *  and updates the menu/toolbar context. */
  const setCellSelection = (next: CellSelection | null): void => {
    if (!next && !cellSelection && !tableSelection) return;
    cellSelection = next;
    const resolved = next
      ? (next.tablePath ? resolveTablePath(doc, next.tablePath) : resolveTableIdPath(doc, next.tableId))
      : null;
    tableSelection = next && resolved
      ? { kind: "cell", table: resolved.path, anchor: next.anchor, focus: next.focus }
      : null;
    refreshSelectionVisuals();
    mirror.sync(state());
    // A drag can be the first interaction that establishes table context (for
    // example after import or after a programmatic selection). Refresh ribbon
    // capability predicates here as well as on ordinary caret moves; otherwise
    // row/column/delete buttons can stay visibly disabled despite a live range.
    notifyChange();
    options.onSelectionChange?.(selection);
  };

  const setSemanticTableSelection = (next: TableSelection | null): void => {
    tableSelection = next;
    if (!next) {
      cellSelection = null;
    } else {
      const resolved = resolveTablePath(doc, next.table);
      if (!resolved) {
        tableSelection = null;
        cellSelection = null;
      } else {
        const grid = buildTableGrid(resolved.table);
        const point = (row: number, col: number) => ({
          row: Math.max(0, Math.min(grid.rows - 1, row)),
          col: Math.max(0, Math.min(grid.cols - 1, col)),
        });
        if (next.kind === "cell") {
          cellSelection = { tableId: next.table.tableId, tablePath: next.table, anchor: point(next.anchor.row, next.anchor.col), focus: point(next.focus.row, next.focus.col) };
        } else if (next.kind === "row") {
          cellSelection = { tableId: next.table.tableId, tablePath: next.table, anchor: point(next.from, 0), focus: point(next.to, grid.cols - 1) };
        } else if (next.kind === "column") {
          cellSelection = { tableId: next.table.tableId, tablePath: next.table, anchor: point(0, next.from), focus: point(grid.rows - 1, next.to) };
        } else {
          cellSelection = { tableId: next.table.tableId, tablePath: next.table, anchor: point(0, 0), focus: point(grid.rows - 1, grid.cols - 1) };
        }
      }
    }
    refreshSelectionVisuals();
    mirror.sync(state());
    notifyChange();
  };

  const selectTableHandle = (hit: TableSelectionHandleHit): void => {
    const resolved = resolveTableIdPath(doc, hit.tableId);
    if (!resolved) return;
    if (hit.kind === "row") setSemanticTableSelection({ kind: "row", table: resolved.path, from: hit.index, to: hit.index });
    else if (hit.kind === "column") setSemanticTableSelection({ kind: "column", table: resolved.path, from: hit.index, to: hit.index });
    else setSemanticTableSelection({ kind: "table", table: resolved.path });
  };

  // ---- story mode (header/footer band editing) ----------------------------

  const relayout = (): void => {
    tree = engine.layout(doc, undefined, { rawBand: activeStory?.band ?? null });
    paint.setTree(tree);
  };

  const targetBandContainer = (
    band: "header" | "footer",
    pageIndex: number,
  ): (typeof BAND_CONTAINERS)[number] => {
    const isFirst = pageIndex === 0;
    const isEven = (pageIndex + 1) % 2 === 0;
    const firstKey = band === "header" ? "headerFirst" : "footerFirst";
    const evenKey = band === "header" ? "headerEven" : "footerEven";
    if (isFirst && doc.section[firstKey] !== undefined) return firstKey;
    if (isEven && doc.section[evenKey] !== undefined) return evenKey;
    return band;
  };

  const setStory = (next: GeoScope | null): void => {
    const changingBand = (activeStory?.band ?? null) !== (next?.band ?? null);
    if (!changingBand && activeStory?.pageIndex === next?.pageIndex) return;
    if (next) selectObject(null); // objects and band stories are exclusive modes
    if (next && !activeStory) savedBodySelection = selection;
    activeStory = next;
    pendingStyle = null;
    paint.setBandEditMode(next?.band ?? null);

    if (next) {
      const target = targetBandContainer(next.band, next.pageIndex);
      const existing = containerBlocks(doc, target);
      if (existing.length === 0) {
        const p = emptyParagraphFor(doc, freshId());
        commit({
          ops: [{ type: "insertBlock", index: 0, block: p, where: target }],
          selectionAfter: { anchor: { blockId: p.id, offset: 0 }, focus: { blockId: p.id, offset: 0 } },
          origin: "command",
        });
      } else if (changingBand || !selection) {
        const firstPara = existing.find((b) => b.kind === "paragraph");
        if (firstPara) {
          selection = { anchor: { blockId: firstPara.id, offset: 0 }, focus: { blockId: firstPara.id, offset: 0 } };
        }
      }
    }

    if (changingBand) {
      relayout(); // the edited band switches between raw and substituted text
      if (!next) selection = savedBodySelection;
    }
    refreshSelectionVisuals();
    mirror.sync(state());
  };

  // ---- object selection (images): frame, resize, alignment, delete --------

  let selectedObject: string | null = null;
  // Crop session baseline: the image's crop when crop mode was entered (to revert
  // the live transient preview on exit) + whether any live preview was written.
  const cropOrigin = { crop: null as NonNullable<ImageBlock["crop"]> | null, previewed: false };

  const contentWidth = (): number =>
    doc.section.pageWidthPx - doc.section.marginPx.left - doc.section.marginPx.right;

  const objectFrame = createObjectFrame({
    getPageElement: (i) => paint.getPageElement(i),
    getZoom: () => paint.getZoom(),
    // The whole drag previews in the DOM overlay (objectController paints a scaled
    // ghost) — no per-frame model ops or relayout. The model is mutated ONCE here,
    // on mouseup, as a single undoable op.
    onResizeCommit: (w, h) => {
      if (!selectedObject) return;
      dispatch(setImageProps(selectedObject, { widthPx: w, heightPx: h }));
    },
    // Live crop preview: each crop-handle release writes the crop field as a
    // TRANSIENT op (outside undo). exitCropMode reverts it and commits once.
    onCropPreview: (crop) => {
      if (!selectedObject) return;
      cropOrigin.previewed = true;
      dispatch(setImageCropCmd(selectedObject, crop, "transient"));
    },
  });

  const refreshObjectFrame = (): void => {
    if (!selectedObject) {
      if (objectFrame.isCropping()) exitCropMode(false); // selection gone — drop crop, no commit
      objectFrame.hide();
      return;
    }
    const rect = objectRect(tree, selectedObject);
    if (!rect) {
      if (objectFrame.isCropping()) exitCropMode(false);
      selectedObject = null;
      objectFrame.hide();
      return;
    }
    // Crop mode owns the overlay: re-pin it to the (possibly reflowed/zoomed) rect
    // instead of the resize frame. The live crop window survives the rescale.
    if (objectFrame.isCropping()) {
      objectFrame.refreshCrop(rect);
      return;
    }
    // locateImage (not doc.blocks) so in-cell images resolve too — needed for both
    // the anchor check and the ghost bitmap src.
    const img = locateImage(doc, selectedObject)?.image;
    // Anchored (out-of-flow) images may bleed past the margins, so they resize up
    // to the full page width; in-flow images stay within the content box.
    const maxW = img?.anchor ? doc.section.pageWidthPx : contentWidth();
    // In-flow images re-align on resize (the engine re-centers/right-aligns from
    // remaining slack), so the ghost must hold the same edge fixed; anchored
    // images are offset-positioned and keep their left edge.
    const anchor = !img || img.anchor ? "left" : img.align;
    // Non-image objects (equations) are selectable but NOT resizable — show a plain
    // selection box with no handles.
    objectFrame.show(rect, maxW, img?.src, anchor, !!img);
  };

  /** Is the current object selection an image (vs an equation / other block)? */
  const selectedIsImage = (): boolean => !!selectedObject && locateImage(doc, selectedObject) !== null;

  /** Delete the selected object — image or equation — and clear the selection. */
  const deleteSelectedObjectInternal = (): void => {
    if (!selectedObject) return;
    const id = selectedObject;
    selectObject(null);
    dispatch(locateImage(doc, id) ? deleteImage(id) : removeBlockObject(id));
  };

  const selectObject = (blockId: string | null): void => {
    // View-only: never raise the image frame (resize handles) — clearing (null)
    // still runs so any stale frame can be torn down.
    if (readonly && blockId !== null) return;
    // Changing the object selection ends any crop in progress (committing it).
    if (objectFrame.isCropping() && blockId !== selectedObject) exitCropMode(true);
    if (blockId === selectedObject) {
      if (blockId) refreshObjectFrame();
      return;
    }
    selectedObject = blockId;
    if (blockId) selection = null; // object selection replaces the text selection (Word)
    // Always refresh: selecting an image raises its control chrome (if any), and
    // deselecting must tear that chrome back down (recomputed from the caret, which
    // may be null). Previously only the select path refreshed.
    refreshSelectionVisuals();
    refreshObjectFrame();
    notifyChange(); // object selection drives the floating image toolbar
  };

  // ---- image crop mode -----------------------------------------------------
  // Enter: drag the 8 crop handles to set the visible window. Each handle release
  // writes the crop field LIVE via a transient op (so the model tracks the crop as
  // the user works, mirroring the drag-to-resize-row-height protocol #79); exit
  // (Esc / click-away / a new selection) reverts the transient preview and commits
  // the final insets as ONE undoable op. Crop is editing-only, session/UI state.
  const enterCropMode = (imgId: string): void => {
    if (mode === "view") return; // editing-only; gate on the LIVE mode, not frozen readonly
    selectObject(imgId);
    const rect = objectRect(tree, imgId);
    const img = locateImage(doc, imgId)?.image;
    if (!rect || !img) return;
    cropOrigin.crop = img.crop ?? null; // the session baseline to revert the preview to
    cropOrigin.previewed = false;
    objectFrame.beginCrop(rect, img.src, img.crop ?? null);
    notifyChange(); // refresh the context-menu "Crop"/"Reset Crop" state
  };

  const cropEq = (a: ImageBlock["crop"] | null, b: ImageBlock["crop"] | null): boolean => {
    if (!a || !b) return !a === !b; // both absent → equal; one absent → differ
    return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
  };

  const exitCropMode = (commit: boolean): void => {
    if (!objectFrame.isCropping()) return;
    const id = selectedObject;
    const next = objectFrame.endCrop(); // hides the overlay; null = clear the crop
    const previewed = cropOrigin.previewed;
    cropOrigin.previewed = false;
    // Roll the live transient preview back to the session baseline so the committed
    // op below (or the cancel) is the only entry on the undo stack.
    if (previewed && id) dispatch(setImageCropCmd(id, cropOrigin.crop, "transient"));
    if (commit && id && !cropEq(cropOrigin.crop, next)) dispatch(setImageCropCmd(id, next));
    else refreshObjectFrame(); // no net change → repaint the resize frame ourselves
  };

  // ---- table column-boundary drag ------------------------------------------

  const startColumnDrag = (hit: ColumnBoundaryHit, ev: MouseEvent): void => {
    const table = doc.blocks.find((b) => b.id === hit.tableId);
    if (table?.kind !== "table") return;
    // Manual column resize cancels autofit (Word): pin the table to fixed widths.
    // Freeze the CURRENTLY RENDERED column proportions (solved from content), not
    // effectiveFractions() — that returns the stale colFractions snapshot (an equal
    // split when absent), which would snap the columns before the drag.
    let base: number[];
    if (table.widthMode && table.widthMode !== "fixed") {
      const total = hit.colWidths.reduce((s, w) => s + w, 0) || 1;
      base = hit.colWidths.map((w) => w / total);
      dispatch(setTableWidthModeCmd(hit.tableId, "fixed", base));
    } else {
      base = effectiveFractions(table);
    }
    const minFrac = 24 / hit.tableWidth; // columns never shrink below 24px
    const startX = ev.clientX;
    let lastFractions = base;

    const fractionsFor = (e: MouseEvent): number[] => {
      // Under bidiVisual the grid is mirrored, so model column boundaryIndex sits
      // to the RIGHT of boundaryIndex+1 on screen: a rightward drag must shrink the
      // left-of-boundary model column (boundaryIndex), i.e. flip the delta sign.
      const df = ((e.clientX - startX) / hit.tableWidth) * (hit.bidiVisual ? -1 : 1);
      const f = base.slice();
      const a = hit.boundaryIndex;
      const b = a + 1;
      const shift = Math.max(-(f[a]! - minFrac), Math.min(f[b]! - minFrac, df));
      f[a] = f[a]! + shift;
      f[b] = f[b]! - shift;
      return f;
    };

    // Coalesce preview relayouts to one per animation frame: each transient op runs
    // a full relayout, and mousemove fires faster than a big table re-measures, so
    // dispatching per event backs up a queue and the boundary lags the cursor (same
    // backlog as image resize). Keep only the latest fractions per frame.
    let pendingFractions: number[] | null = null;
    let moveRaf = 0;
    const flushMove = (): void => {
      moveRaf = 0;
      if (pendingFractions) dispatch(setTableColFractionsCmd(hit.tableId, pendingFractions, "transient"));
      pendingFractions = null;
    };
    const onMove = (e: MouseEvent): void => {
      lastFractions = fractionsFor(e);
      pendingFractions = lastFractions;
      if (!moveRaf) moveRaf = requestAnimationFrame(flushMove);
    };
    const onUp = (e: MouseEvent): void => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moveRaf) cancelAnimationFrame(moveRaf); // drop any queued preview
      moveRaf = 0;
      pendingFractions = null;
      lastFractions = fractionsFor(e);
      // Revert preview, commit one undoable op.
      dispatch(setTableColFractionsCmd(hit.tableId, base, "transient"));
      dispatch(setTableColFractionsCmd(hit.tableId, lastFractions));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ---- table row-boundary drag ---------------------------------------------

  const startRowDrag = (hit: RowBoundaryHit, ev: MouseEvent): void => {
    const table = doc.blocks.find((b) => b.id === hit.tableId);
    if (table?.kind !== "table") return;
    const row = table.rows[hit.rowIndex];
    if (!row) return;
    // Preserve an existing rule ("exact" stays exact); a fresh drag defaults to
    // "atLeast" (#76), where layout still floors the row at its content height.
    const oldHeight = row.props?.height ?? null;
    const rule: "atLeast" | "exact" = oldHeight?.rule ?? "atLeast";
    const baseHeight = hit.y - hit.rowTop; // currently rendered row height (doc px)
    const startY = ev.clientY;
    const zoom = paint.getZoom() || 1; // client px → doc px (zoom-correct, unlike a raw delta)
    const MIN_ROW_PX = 4;

    const heightFor = (e: MouseEvent): NonNullable<typeof oldHeight> => ({
      value: Math.max(MIN_ROW_PX, Math.round(baseHeight + (e.clientY - startY) / zoom)),
      rule,
    });
    const baseValue = heightFor(ev).value; // committed value at zero drag (rounded)

    // Coalesce preview relayouts to one per frame (a tall table re-measures slower
    // than mousemove fires) — mirrors the column drag's RAF throttle.
    let pendingHeight: NonNullable<typeof oldHeight> | null = null;
    let moveRaf = 0;
    let moved = false; // a plain click on the grip must not write a no-op height
    let lastHeight = heightFor(ev);
    const flushMove = (): void => {
      moveRaf = 0;
      if (pendingHeight) dispatch(setRowHeightCmd(hit.tableId, hit.rowIndex, pendingHeight, "transient"));
      pendingHeight = null;
    };
    const onMove = (e: MouseEvent): void => {
      moved = true;
      lastHeight = heightFor(e);
      pendingHeight = lastHeight;
      if (!moveRaf) moveRaf = requestAnimationFrame(flushMove);
    };
    const onUp = (e: MouseEvent): void => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moveRaf) cancelAnimationFrame(moveRaf); // drop any queued preview
      moveRaf = 0;
      pendingHeight = null;
      if (!moved) return; // click without a drag — leave the row height untouched
      lastHeight = heightFor(e);
      // A tiny drag that rounds back to the starting height is a no-op: don't
      // materialize a new height (when there was none) or add an empty undo step.
      const unchanged =
        (oldHeight?.rule ?? "atLeast") === lastHeight.rule &&
        (oldHeight?.value ?? baseValue) === lastHeight.value;
      if (unchanged) return;
      // Revert preview to the prior height, then commit one undoable op.
      dispatch(setRowHeightCmd(hit.tableId, hit.rowIndex, oldHeight, "transient"));
      dispatch(setRowHeightCmd(hit.tableId, hit.rowIndex, lastHeight));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ---- Tab navigation between table cells ----------------------------------

  const tabInTable = (backward: boolean): boolean => {
    if (!selection) return false;
    // Lists win: Tab at the START of a list paragraph changes its level.
    if (isCollapsed(selection) && selection.focus.offset === 0) {
      const blk = doc.blocks.find((b) => b.id === selection!.focus.blockId);
      if (blk?.kind === "paragraph" && blk.style.list) {
        dispatch(changeListLevel(backward ? -1 : 1));
        return true;
      }
    }
    const loc = locateParagraph(doc, selection.focus.blockId);
    if (loc?.kind !== "cell") return false;
    const table = containerListOf(doc, loc.where)[loc.bi] as TableBlock;
    const flat: { ri: number; ci: number }[] = [];
    table.rows.forEach((row, ri) => row.cells.forEach((_, ci) => flat.push({ ri, ci })));
    const pos = flat.findIndex((c) => c.ri === loc.ri && c.ci === loc.ci);
    const target = pos + (backward ? -1 : 1);
    if (target < 0) return true; // Shift+Tab in the first cell: stay (Word)
    if (target >= flat.length) {
      // Tab in the last cell appends a row and moves into it (Word behavior).
      dispatch(insertTableRowCmd("below"));
      return true;
    }
    const cell = table.rows[flat[target]!.ri]!.cells[flat[target]!.ci]!;
    const paras = cell.blocks.filter((b): b is import("@kindy/shared").Paragraph => b.kind === "paragraph");
    const first = paras[0];
    const last = paras[paras.length - 1];
    if (!first || !last) return true; // image-only cell: consume Tab, nowhere to caret
    // Word selects the target cell's content.
    setSelection({
      anchor: { blockId: first.id, offset: 0 },
      focus: { blockId: last.id, offset: textOfRuns(last.runs).length },
    });
    return true;
  };

  const toggleStyle = (key: StyleKey): void => {
    if (selection && !isCollapsed(selection)) {
      dispatch(toggleCharStyle(key));
      return;
    }
    if (!selection) return;
    const block = blockById(doc, selection.focus.blockId);
    const inherited = block ? styleAtRuns(block.runs, selection.focus.offset) : undefined;
    const effective = { ...(inherited ?? {}), ...(pendingStyle ?? {}) } as Partial<CharStyle>;
    pendingStyle = { ...(pendingStyle ?? {}), [key]: !effective[key] };
    mirror.announce(`${key} ${pendingStyle[key] ? "on" : "off"}`);
    notifyChange(); // pending toggle drives the ribbon's pressed state
  };

  // ---- transaction pipeline ------------------------------------------------

  /** Bookmark ranges are offset-precise, so they travel with edits — mapped
   *  through each applied op exactly like the selection and peer carets. */
  const rebaseBookmarks = (mapPosition: (p: DocPosition) => DocPosition): void => {
    if (!doc.bookmarks) return;
    const next: Record<string, BookmarkRange> = {};
    let changed = false;
    for (const [name, r] of Object.entries(doc.bookmarks)) {
      const start = mapPosition(r.start);
      const end = mapPosition(r.end);
      if (start.blockId !== r.start.blockId || start.offset !== r.start.offset || end.blockId !== r.end.blockId || end.offset !== r.end.offset) {
        changed = true;
      }
      next[name] = { start, end };
    }
    if (changed) doc = { ...doc, bookmarks: next };
  };

  // Review anchors ride the SAME position-mapper as bookmarks (REVIEW.md §5.1):
  // suggestion + comment ranges travel through every applied core op, then GC
  // drops records whose text was removed.
  const rebaseReviewLayer = (mapPosition: (p: DocPosition) => DocPosition): void => {
    review = rebaseReview(review, mapPosition);
  };

  let refreshCommentOverlay: () => void = () => {};
  const notifyReviewChanged = (): void => {
    options.onReviewChanged?.(review);
    refreshCommentOverlay();
  };

  const reviewAuthor = (): UserInfo => options.user ?? { id: "anon", firstName: "Anonymous", lastName: "" };

  /** Apply one locally-authored review op: mutate the layer and broadcast/persist
   *  it via the sink (with the core version it depends on). Returns its inverse
   *  for the undo coupling. */
  const applyLocalReviewOp = (op: ReviewOp): ReviewOp => {
    const res = applyReviewOp(review, op);
    review = res.layer;
    options.onReviewOpRecorded?.({ op, dependsOnSeq: recorder.head(), ...(options.user ? { author: options.user } : {}) });
    options.onReviewOpApplied?.(op, false);
    return res.inverse;
  };

  /** Recompute + repaint review decorations from the current layer + layout
   *  tree (metric-neutral → repaint only, like search highlights). */
  const refreshReviewDecorations = (): void => {
    paint.setReviewDecorations(decorate(review, tree, scope()));
  };

  const runOps = (ops: Op[]): Op[] => {
    const inverses: Op[] = [];
    for (const op of ops) {
      const res = applyOp(doc, op);
      doc = res.doc;
      rebasePeers(res.mapPosition); // keep peer carets aligned with the edited text
      rebaseBookmarks(res.mapPosition);
      rebaseReviewLayer(res.mapPosition); // suggestion/comment anchors travel too
      inverses.unshift(res.inverse);
    }
    // Structural records are block-keyed (no text range to ride mapPosition), so
    // GC them by block existence once the doc reaches its new shape.
    review = gcStructuralReviewLayer(review, doc);
    return inverses;
  };

  // `transient` marks a live drag/composition frame (column-grip drag, IME
  // preview): the drag always ends in a non-transient commit that runs the full
  // pass, so per-frame we relayout + repaint + reposition the caret/frame but
  // DEFER the heavy, drag-irrelevant work (search re-run, peer-caret and
  // review-overlay re-measurement) to that final commit.
  const afterMutation = (selectionAfter: DocSelection | null, transient = false): void => {
    const prevSelection = selection;
    relayout();
    selection = selectionAfter;
    cellSelection = null; // grid coords are invalidated by any structural change
    tableSelection = null;
    refreshSelectionVisuals();
    refreshObjectFrame(); // images move/resize with reflow; frame follows
    if (searchQuery && !transient) {
      runSearch(); // live re-search while the find bar is open
      paintSearch();
    }
    // Only chase the caret into view when the mutation actually MOVED it.
    // Edits that leave the caret where it is — e.g. dragging a table column
    // grip, which keeps the selection untouched — must not yank the viewport
    // back to a caret parked on another page (the resize "scroll jump" bug).
    const caretMoved =
      !prevSelection ||
      !selection ||
      prevSelection.focus.blockId !== selection.focus.blockId ||
      prevSelection.focus.offset !== selection.focus.offset;
    if (selection && isCollapsed(selection) && caretMoved) {
      const caret = caretRect(tree, selection.focus, scope());
      if (caret) paint.ensureVisible(caret);
    }
    if (!transient) {
      paintRemoteCarets(); // peers' carets re-measured against the new layout
      refreshReviewDecorations(); // suggestion/comment overlays re-measured too
    }
    mirror.sync(state());
    notifyChange();
    options.onSelectionChange?.(selection);
  };

  /** Raw commit: applies core ops + already-decided review ops WITHOUT mode
   *  interception. Couples the review ops into the undo entry so Ctrl+Z reverses
   *  text + records as one action. Used by the mode-aware commit (after
   *  intercept) and by accept/reject. */
  const commitCore = (trn: Transaction, reviewOps: ReviewOp[]): void => {
    const selectionBefore = selection;
    const inverses = runOps(trn.ops);
    let recordedChange: Change | null = null;
    // Review ops apply AFTER core ops, so their anchors are in post-core coords.
    const reviewInverses: ReviewOp[] = [];
    for (const rop of reviewOps) reviewInverses.unshift(applyLocalReviewOp(rop));
    if (trn.origin !== "transient" && (trn.ops.length > 0 || reviewOps.length > 0)) {
      undoMgr.record({
        ops: trn.ops,
        inverseOps: inverses,
        reviewOps,
        reviewInverses,
        selectionBefore,
        selectionAfter: trn.selectionAfter,
        origin: trn.origin,
        time: Date.now(),
      });
      // Mirror the core edit into the document-history log (empty for a pure
      // deletion-suggestion; the recorder no-ops on empty ops).
      recordedChange = recorder.record(trn.ops, trn.origin as ChangeOrigin, trn.selectionAfter, Date.now());
    }
    if (reviewOps.length > 0) notifyReviewChanged();
    afterMutation(trn.selectionAfter, trn.origin === "transient");
    if (recordedChange) {
      const inferredIntent = [...new Set(trn.ops.map((op) => op.type))].join("+");
      options.onMutationApplied?.({
        source: "local",
        ops: trn.ops,
        origin: trn.origin as ChangeOrigin,
        ...((trn.intent ?? inferredIntent) ? { intent: trn.intent ?? inferredIntent } : {}),
        selectionBefore,
        selectionAfter: trn.selectionAfter,
        change: recordedChange,
      });
    }
  };

  const commit = (trn: Transaction): void => {
    if (mode === "view") return; // view-only: drop every local mutation
    if (mode === "suggest" && trn.origin !== "transient") {
      // Rewrite destructive edits into non-destructive review records.
      const r = intercept(trn, review, doc, reviewAuthor(), Date.now());
      commitCore(r.core, r.reviewOps);
      return;
    }
    commitCore(trn, []);
  };

  const dispatch = (cmd: Command): boolean => {
    const trn = cmd(state());
    if (!trn) return false;
    commit(trn);
    return true;
  };

  const undo = (): void => {
    if (mode === "view") return; // undo/redo bypass commit() — gate them directly
    const entry = undoMgr.popUndo();
    if (!entry) return;
    runOps(entry.inverseOps);
    // Review inverses AFTER the text inverses, so anchors are valid when records
    // are restored (reverse application order — they were unshifted on record).
    if (entry.reviewInverses?.length) {
      for (const rop of entry.reviewInverses) applyLocalReviewOp(rop);
      notifyReviewChanged();
    }
    // Undo is a real forward edit in history terms — record the inverse ops it
    // applied so the log faithfully replays the same end state.
    const selectionBefore = selection;
    const change = recorder.record(entry.inverseOps, "undo", entry.selectionBefore, Date.now());
    afterMutation(entry.selectionBefore);
    if (change) options.onMutationApplied?.({
      source: "local",
      ops: entry.inverseOps,
      origin: "undo",
      intent: "undo",
      selectionBefore,
      selectionAfter: entry.selectionBefore,
      change,
    });
  };

  const redo = (): void => {
    if (mode === "view") return;
    const entry = undoMgr.popRedo();
    if (!entry) return;
    runOps(entry.ops);
    if (entry.reviewOps?.length) {
      for (const rop of entry.reviewOps) applyLocalReviewOp(rop);
      notifyReviewChanged();
    }
    const selectionBefore = selection;
    const change = recorder.record(entry.ops, "redo", entry.selectionAfter, Date.now());
    afterMutation(entry.selectionAfter);
    if (change) options.onMutationApplied?.({
      source: "local",
      ops: entry.ops,
      origin: "redo",
      intent: "redo",
      selectionBefore,
      selectionAfter: entry.selectionAfter,
      change,
    });
  };

  // Apply ops that arrived from another collaborator. Unlike commit(), these are
  // NOT recorded (the server's log already holds them) and do NOT enter the undo
  // stack (a user can't undo a peer's edit). The local caret is rebased through
  // each op's position mapper so it survives the remote insert/delete.
  const applyRemoteOps = (ops: Op[], change?: Change): void => {
    const selectionBefore = selection;
    let sel = selection;
    for (const op of ops) {
      const res = applyOp(doc, op);
      doc = res.doc;
      rebasePeers(res.mapPosition); // peers' carets travel with the remote edit too
      rebaseBookmarks(res.mapPosition);
      rebaseReviewLayer(res.mapPosition); // remote insert shifts everyone's pins
      if (sel) {
        sel = {
          anchor: res.mapPosition(sel.anchor),
          focus: res.mapPosition(sel.focus),
          ...(sel.goalX !== undefined ? { goalX: sel.goalX } : {}),
        };
      }
    }
    review = gcStructuralReviewLayer(review, doc); // remote removeBlock kills its record
    if (ops.length > 0) notifyReviewChanged();
    afterMutation(sel);
    if (ops.length > 0) options.onMutationApplied?.({
      source: "remote",
      ops,
      origin: change?.origin ?? "command",
      intent: [...new Set(ops.map((op) => op.type))].join("+"),
      selectionBefore,
      selectionAfter: sel,
      ...(change ? { change } : {}),
    });
  };

  // ---- review actions (track changes + comments) --------------------------

  /** Pure review-layer action (comments, status) — no core ops. Undoable as a
   *  coupled review-only entry; repaints decorations (no relayout). */
  const recordReviewOnly = (ops: ReviewOp[]): void => {
    if (mode === "view" || ops.length === 0) return;
    const reviewInverses: ReviewOp[] = [];
    for (const op of ops) reviewInverses.unshift(applyLocalReviewOp(op));
    undoMgr.record({
      ops: [],
      inverseOps: [],
      reviewOps: ops,
      reviewInverses,
      selectionBefore: selection,
      selectionAfter: selection,
      origin: "command",
      time: Date.now(),
    });
    notifyReviewChanged();
    refreshReviewDecorations();
  };

  const commitResolution = (r: Resolution | null): void => {
    if (!r) return;
    commitCore({ ops: r.ops, selectionAfter: selection, origin: "command" }, r.reviewOps);
  };

  /** Ordered [start,end] of the current selection (anchor/focus in doc order). */
  const orderedSelectionRange = (): { start: DocPosition; end: DocPosition } | null => {
    if (!selection) return null;
    const cmp = comparePositions(tree, selection.anchor, selection.focus, scope());
    return cmp <= 0
      ? { start: selection.anchor, end: selection.focus }
      : { start: selection.focus, end: selection.anchor };
  };

  // The @-mentionable roster = the embedder's configured base PLUS whoever is
  // live-editing the document right now (reusing presence: remotePeers already
  // carries each peer's UserInfo, maintained by setPeerPresence/removePeer).
  let knownUsers: UserInfo[] = options.knownUsers ?? [];
  let reviewAccess = options.reviewAccess;
  const dedupeById = (users: UserInfo[]): UserInfo[] => {
    const seen = new Map<string, UserInfo>();
    for (const u of users) if (u.id && !seen.has(u.id)) seen.set(u.id, u);
    return [...seen.values()];
  };
  const mentionableUsers = (): UserInfo[] =>
    dedupeById([
      ...knownUsers,
      ...[...remotePeers.values()].map((p) => p.user).filter((u): u is UserInfo => !!u),
    ]);
  const mentionField = (mentions?: UserInfo[]) => (mentions && mentions.length > 0 ? { mentions } : {});

  const reviewContext = (threadId?: string, commentId?: string) => {
    const thread = threadId ? review.threads.find((item) => item.id === threadId) : undefined;
    const comment = commentId ? thread?.comments.find((item) => item.id === commentId) : undefined;
    return {
      documentId: options.getDocumentId?.() ?? options.docId ?? null,
      mode,
      actor: reviewAuthor(),
      ...(thread ? { thread } : {}),
      ...(comment ? { comment } : {}),
    };
  };

  const canReviewAction = (action: ReviewAction, threadId?: string, commentId?: string): boolean => {
    if (mode === "view") return false;
    const context = reviewContext(threadId, commentId);
    if (reviewAccess) {
      try {
        return reviewAccess.can(action, context);
      } catch (error) {
        console.error("[kindy-editor:reviewAccess]", error);
        return false;
      }
    }
    return defaultReviewAccessCan(action, context);
  };

  const revealReviewAnchor = (id: string): void => {
    const anchor = (review.suggestions.find((s) => s.id === id) ?? review.threads.find((t) => t.id === id))?.anchor;
    if (!anchor || !blockById(doc, anchor.start.blockId)) return;
    const rect = caretRect(tree, anchor.start, scope());
    if (!rect) return;
    setSelection({ anchor: anchor.start, focus: anchor.end });
    paint.ensureVisible(rect, "center");
  };

  let openInlineThread: (threadId: string) => void = () => {};
  const openCommentThread = (threadId: string): void => {
    if (!review.threads.some((thread) => thread.id === threadId)) return;
    revealReviewAnchor(threadId);
    openInlineThread(threadId);
    options.onCommentThreadActivated?.(threadId);
  };

  const addComment = (body: Fragment, mentions?: UserInfo[]): string | null => {
    if (!canReviewAction("comment.create")) return null;
    const range = orderedSelectionRange();
    if (!range) return null;
    const author = reviewAuthor();
    const now = Date.now();
    const thread = {
      id: freshId(),
      anchor: { start: range.start, end: range.end },
      status: "open" as const,
      comments: [{ id: freshId(), author, body, createdAt: now, ...mentionField(mentions) }],
    };
    recordReviewOnly([{ type: "addThread", t: thread }]);
    openInlineThread(thread.id);
    options.onCommentThreadActivated?.(thread.id);
    return thread.id;
  };

  const replyToComment = (threadId: string, body: Fragment, mentions?: UserInfo[]): void => {
    const thread = review.threads.find((item) => item.id === threadId);
    if (!thread || thread.status !== "open" || !canReviewAction("comment.reply", threadId)) return;
    recordReviewOnly([
      { type: "addComment", threadId, c: { id: freshId(), author: reviewAuthor(), body, createdAt: Date.now(), ...mentionField(mentions) } },
    ]);
  };

  const editComment = (threadId: string, commentId: string, body: Fragment, mentions?: UserInfo[]): void => {
    const thread = review.threads.find((item) => item.id === threadId);
    const comment = thread?.comments.find((item) => item.id === commentId);
    if (!thread || !comment || comment.deletedAt || !canReviewAction("comment.edit", threadId, commentId)) return;
    const oldIds = new Set((comment.mentions ?? []).map((user) => user.id));
    const nextMentions = mentions ?? [];
    recordReviewOnly([{
      type: "editComment",
      threadId,
      commentId,
      body,
      mentions: nextMentions,
      editedAt: Date.now(),
      newlyMentionedUserIds: nextMentions.filter((user) => !oldIds.has(user.id)).map((user) => user.id),
    }]);
  };

  const deleteComment = (threadId: string, commentId: string): void => {
    const comment = review.threads.find((item) => item.id === threadId)?.comments.find((item) => item.id === commentId);
    if (!comment || comment.deletedAt || !canReviewAction("comment.delete", threadId, commentId)) return;
    recordReviewOnly([{
      type: "deleteComment",
      threadId,
      commentId,
      deletedAt: Date.now(),
      deletedBy: reviewAuthor(),
    }]);
  };

  const resolveThread = (threadId: string, resolved = true): void => {
    const thread = review.threads.find((item) => item.id === threadId);
    const action: ReviewAction = resolved ? "thread.resolve" : "thread.reopen";
    if (!thread || !canReviewAction(action, threadId)) return;
    recordReviewOnly([{ type: "setThreadStatus", threadId, status: resolved ? "resolved" : "open" }]);
  };

  // Google-Docs-style comment affordance: in suggest mode, selecting text shows a
  // small floating "comment" chip next to the selection; clicking it expands into
  // the full composer. No ribbon icon needed.
  const comments = createCommentController({
    container,
    caretToContainer: (rect) => paint.caretToContainer(rect),
    getSelection: () => selection,
    getCellSelection: () => cellSelection,
    getTree: () => tree,
    getDoc: () => doc,
    getReview: () => review,
    getMode: () => mode,
    scope,
    reviewAuthor,
    mentionableUsers,
    ...(options.mentionPicker ? { mentionPicker: options.mentionPicker } : {}),
    getDocumentId: () => options.getDocumentId?.() ?? options.docId ?? null,
    canCreateComment: () => canReviewAction("comment.create"),
    addComment,
    replyToComment,
    resolveThread,
    canReviewAction,
    focusProxy: () => proxy.focus(),
  });
  // Public: open the composer directly (kept for API parity).
  const startComment = comments.openComposer;
  openInlineThread = comments.openThread;
  refreshCommentOverlay = comments.refresh;
  // The chip refresh is forward-declared (called from refreshSelectionVisuals + setMode).
  updateCommentAffordance = comments.updateAffordance;

  const onReviewPinPointerDown = (event: PointerEvent): void => {
    const threadId = paint.reviewPinAt(event.clientX, event.clientY);
    if (!threadId) return;
    event.preventDefault();
    event.stopPropagation();
    openCommentThread(threadId);
  };
  container.addEventListener("pointerdown", onReviewPinPointerDown, true);

  const applyRemoteReviewOp = (op: ReviewOp): void => {
    review = applyReviewOp(review, op).layer;
    options.onReviewOpApplied?.(op, true);
    notifyReviewChanged();
    refreshReviewDecorations();
  };

  const seedReview = (layer: ReviewLayer): void => {
    review = layer;
    notifyReviewChanged();
    refreshReviewDecorations();
  };

  const setMode = (next: EditMode): boolean => {
    if (allowedModes && !allowedModes.includes(next)) return false;
    if (next === mode) return true;
    // End any crop session BEFORE the switch so it commits under the still-active
    // editable mode and never outlives it (crop is editing-only, session/UI state).
    if (objectFrame.isCropping()) exitCropMode(true);
    mode = next;
    pendingStyle = null; // clear pending preview on switch
    if (mode === "view") {
      comments.hideChip();
      comments.closeComposer();
    }
    updateCommentAffordance(); // reflect the new mode immediately
    options.onModeChanged?.(mode);
    notifyChange();
    return true;
  };

  // Paint any seeded review overlay once at startup (pages pick it up on mount).
  if (review.suggestions.length > 0 || review.threads.length > 0) refreshReviewDecorations();

  const setPeerPresence = (siteId: string, user: UserInfo | undefined, selection: DocSelection | null): void => {
    remotePeers.set(siteId, { user, color: colorForId(user?.id ?? siteId), selection });
    paintRemoteCarets();
  };

  const removePeer = (siteId: string): void => {
    remotePeers.delete(siteId);
    paintRemoteCarets();
  };

  // ---- AutoCorrect (typographic) -------------------------------------------

  const autoCorrect = { quotes: true, dashes: true, symbols: true };

  // ---- Content controls (SDT): popups, typing rules ------------------------

  /** The control + props under the caret (focus side). */
  const sdtAtCaret = (): { id: string; props: NonNullable<Document["sdts"]>[string] } | null => {
    const focus = selection?.focus;
    const id = focus ? sdtAtPosition(doc, focus) : null;
    const props = id ? doc.sdts?.[id] : undefined;
    return id && props ? { id, props } : null;
  };

  // Dropdown / combo / date chooser shown beside a content control (see ./sdtPopup).
  const sdtPopupCtl = createSdtPopup({
    container,
    caretToContainer: (rect) => paint.caretToContainer(rect),
    getDoc: () => doc,
    getTree: () => tree,
    scope,
    dispatch,
    focusProxy: () => proxy.focus(),
  });
  container.addEventListener("mousedown", () => sdtPopupCtl.close());

  const insertWithAutoCorrect = (data: string): void => {
    const sdt = sdtAtCaret();
    if (sdt) {
      const { id, props } = sdt;
      // Not text-editable: locked content, pure dropdowns, checkboxes.
      if (props.lockContent || props.type === "dropDown" || props.type === "checkbox") return;
      if (props.placeholder) {
        // First keystroke replaces the gray prompt with real content.
        dispatch(setSdtContent(id, data));
        return;
      }
    }
    if (data.length === 1 && selection && isCollapsed(selection)) {
      const block = blockById(doc, selection.focus.blockId);
      const prev = block ? textOfRuns(block.runs).slice(0, selection.focus.offset) : "";
      if (autoCorrect.quotes && (data === '"' || data === "'")) {
        const before = prev.slice(-1);
        const open = before === "" || /[\s([{‘“—-]/.test(before);
        dispatch(insertText(data === '"' ? (open ? "“" : "”") : open ? "‘" : "’"));
        return;
      }
      if (autoCorrect.dashes && data === "-" && prev.endsWith("-") && !prev.endsWith("--")) {
        dispatch(replaceBackAndInsert(1, "—")); // -- → em dash
        return;
      }
      if (autoCorrect.symbols && data === ")") {
        if (/\(c$/i.test(prev)) return dispatch(replaceBackAndInsert(2, "©"));
        if (/\(r$/i.test(prev)) return dispatch(replaceBackAndInsert(2, "®"));
        if (/\(tm$/i.test(prev)) return dispatch(replaceBackAndInsert(3, "™"));
      }
    }
    dispatch(insertText(data));
  };

  // ---- Format painter --------------------------------------------------------

  let painter: { char: CharStyle; para: Partial<ParaStyle>; sticky: boolean } | null = null;
  let painterMouseUp: (() => void) | null = null;

  const cancelFormatPainter = (): void => {
    painter = null;
    delete container.dataset["painter"];
    container.style.cursor = "text";
    if (painterMouseUp) {
      window.removeEventListener("mouseup", painterMouseUp);
      painterMouseUp = null;
    }
  };

  const armFormatPainter = (sticky: boolean): void => {
    if (readonly) return; // view-only: the painter would only ever apply no-op edits
    if (painter) {
      cancelFormatPainter(); // pressing the button again disarms
      return;
    }
    if (!selection) return;
    const block = blockById(doc, selection.focus.blockId);
    const char = block ? styleAtRuns(block.runs, selection.focus.offset) : undefined;
    if (!block || !char) return;
    const { namedStyle: _ns, list: _list, ...para } = block.style;
    painter = { char: { ...char }, para, sticky };
    container.dataset["painter"] = "1";
    container.style.cursor = "copy";
    // Arming runs in the toolbar button's `click` (after its mouseup), so the
    // next mouseup IS the user's apply gesture — no skip needed.
    painterMouseUp = (): void => {
      setTimeout(() => {
        if (!painter || !selection) return;
        // range gesture → char + para; bare click → para only (Word)
        if (!isCollapsed(selection)) dispatch(setCharStyleCmd(painter.char));
        dispatch(setParaProps(painter.para));
        if (!painter.sticky) cancelFormatPainter();
      }, 0);
    };
    window.addEventListener("mouseup", painterMouseUp);
  };

  // ---- Find & replace ---------------------------------------------------------

  interface Match {
    blockId: string;
    start: number;
    end: number;
  }
  let searchQuery: { q: string; matchCase: boolean; wholeWord: boolean } | null = null;
  let matches: Match[] = [];
  let matchIndex = -1;

  const isWordChar = (c: string | undefined): boolean => c !== undefined && /[\p{L}\p{N}]/u.test(c);

  const runSearch = (): void => {
    matches = [];
    if (!searchQuery || searchQuery.q.length === 0) return;
    const { q, matchCase, wholeWord } = searchQuery;
    const needle = matchCase ? q : q.toLowerCase();
    // Body + cell paragraphs; band stories are excluded (their selection needs
    // story scope — find lands in the body, like Word's default scope).
    const bandIds = new Set(
      BAND_CONTAINERS.flatMap((band) => bandParagraphs(doc, band)).map((p) => p.id),
    );
    for (const p of paragraphsOf(doc)) {
      if (bandIds.has(p.id)) continue;
      const text = textOfRuns(p.runs);
      const hay = matchCase ? text : text.toLowerCase();
      let from = 0;
      for (;;) {
        const i = hay.indexOf(needle, from);
        if (i < 0) break;
        const ok = !wholeWord || (!isWordChar(text[i - 1]) && !isWordChar(text[i + needle.length]));
        if (ok) matches.push({ blockId: p.id, start: i, end: i + needle.length });
        from = i + Math.max(1, needle.length);
      }
    }
  };

  const paintSearch = (): void => {
    const rects = matches.flatMap((m) =>
      selectionRects(tree, {
        anchor: { blockId: m.blockId, offset: m.start },
        focus: { blockId: m.blockId, offset: m.end },
      }),
    );
    paint.setSearchRects(rects);
  };

  const searchState = (): SearchState => ({ index: matchIndex + 1, total: matches.length });

  const gotoMatch = (i: number): void => {
    if (matches.length === 0) {
      matchIndex = -1;
      return;
    }
    matchIndex = ((i % matches.length) + matches.length) % matches.length;
    const m = matches[matchIndex]!;
    setSelection({
      anchor: { blockId: m.blockId, offset: m.start },
      focus: { blockId: m.blockId, offset: m.end },
    });
    const rect = caretRect(tree, { blockId: m.blockId, offset: m.start });
    if (rect) paint.ensureVisible(rect);
  };

  const search: Editor["search"] = (query, opts = {}) => {
    searchQuery = { q: query, matchCase: opts.matchCase ?? false, wholeWord: opts.wholeWord ?? false };
    runSearch();
    matchIndex = matches.length > 0 ? -1 : -1;
    paintSearch();
    if (matches.length > 0) gotoMatch(0);
    return searchState();
  };

  const searchNav: Editor["searchNav"] = (dir) => {
    if (matches.length > 0) gotoMatch(matchIndex + dir);
    return searchState();
  };

  const replaceMatchTr = (m: Match, replacement: string): Command => (state) => ({
    ops: [
      { type: "deleteRange", blockId: m.blockId, start: m.start, end: m.end },
      ...(replacement.length > 0
        ? ([{ type: "insertText", at: { blockId: m.blockId, offset: m.start }, text: replacement }] as Op[])
        : []),
    ],
    selectionAfter: {
      anchor: { blockId: m.blockId, offset: m.start },
      focus: { blockId: m.blockId, offset: m.start + replacement.length },
    },
    origin: "command",
  });
  const searchReplaceCurrent: Editor["searchReplaceCurrent"] = (replacement) => {
    if (matchIndex < 0 || !matches[matchIndex]) return searchState();
    dispatch(replaceMatchTr(matches[matchIndex]!, replacement));
    // afterMutation re-ran the search; land on the match now nearest that spot
    if (matches.length > 0) gotoMatch(Math.min(matchIndex, matches.length - 1));
    return searchState();
  };

  const searchReplaceAll: Editor["searchReplaceAll"] = (replacement) => {
    if (matches.length === 0) return 0;
    const count = matches.length;
    // Back-to-front so earlier offsets stay valid — ONE transaction, one undo.
    const all = [...matches].reverse();
    const cmd: Command = () => ({
      ops: all.flatMap((m): Op[] => [
        { type: "deleteRange", blockId: m.blockId, start: m.start, end: m.end },
        ...(replacement.length > 0
          ? ([{ type: "insertText", at: { blockId: m.blockId, offset: m.start }, text: replacement }] as Op[])
          : []),
      ]),
      selectionAfter: selection,
      origin: "command",
    });
    dispatch(cmd);
    return count;
  };

  const searchClear = (): void => {
    searchQuery = null;
    matches = [];
    matchIndex = -1;
    paint.setSearchRects([]);
  };

  // ---- IME composition: transient preview edits outside the undo stack -----

  let transient: { at: DocPosition; len: number } | null = null;

  const compositionStyle = (at: DocPosition): CharStyle | undefined => {
    const block = blockById(doc, at.blockId);
    const inherited = block ? styleAtRuns(block.runs, at.offset) : undefined;
    return inherited ? { ...inherited, underline: true } : undefined;
  };

  const onCompositionStart = (): void => {
    // A range selection is consumed by the composition (undoable, like typing over it).
    if (selection && !isCollapsed(selection)) dispatch(deleteBackward());
    transient = selection ? { at: selection.focus, len: 0 } : null;
  };

  const onCompositionUpdate = (data: string): void => {
    if (!transient) return;
    const ops: Op[] = [];
    if (transient.len > 0) {
      ops.push({
        type: "deleteRange",
        blockId: transient.at.blockId,
        start: transient.at.offset,
        end: transient.at.offset + transient.len,
      });
    }
    const style = compositionStyle(transient.at);
    if (data.length > 0) {
      const op: Op = { type: "insertText", at: transient.at, text: data };
      if (style) op.style = style;
      ops.push(op);
    }
    transient.len = data.length;
    const caretPos = {
      blockId: transient.at.blockId,
      offset: transient.at.offset + data.length,
    };
    commit({ ops, selectionAfter: { anchor: caretPos, focus: caretPos }, origin: "transient" });
  };

  const onCompositionEnd = (data: string): void => {
    if (!transient) return;
    // Remove the transient preview, then commit the final text as ONE undoable insert.
    if (transient.len > 0) {
      commit({
        ops: [
          {
            type: "deleteRange",
            blockId: transient.at.blockId,
            start: transient.at.offset,
            end: transient.at.offset + transient.len,
          },
        ],
        selectionAfter: { anchor: transient.at, focus: transient.at },
        origin: "transient",
      });
    }
    transient = null;
    if (data.length > 0) dispatch(insertText(data));
  };

  // ---- input layer wiring ---------------------------------------------------

  /** True when the caret sits in a control whose content must not be edited. */
  const sdtBlocksEdit = (): boolean => {
    const sdt = sdtAtCaret();
    return !!sdt && (sdt.props.lockContent === true || sdt.props.type === "dropDown");
  };

  const proxy = createImeProxy(container, {
    readonly,
    onInsertText: (text) => insertWithAutoCorrect(text),
    onDeleteBackward: () => {
      if (sdtBlocksEdit()) return;
      dispatch(deleteBackward());
    },
    onDeleteForward: () => {
      if (sdtBlocksEdit()) return;
      dispatch(deleteForward());
    },
    onSplitParagraph: () => {
      // Only INLINE controls block Enter (they can't span a paragraph break).
      // Block-level controls wrap whole paragraphs/tables and may hold several
      // paragraphs (Word's behaviour), so Enter splits and the new paragraph
      // stays inside the control — see splitParagraph / the splitParagraph op.
      const focus = selection?.focus;
      if (focus && inlineSdtAtPosition(doc, focus)) return;
      dispatch(splitParagraph());
    },
    onPaste: ({ html, text }) => {
      if (sdtBlocksEdit()) return;
      if (html) {
        const fragment = htmlToFragment(html);
        if (fragment) {
          dispatch(insertFragment(fragment));
          return;
        }
      }
      if (!text) return;
      // Plain text: insert through insertText so it inherits the caret style.
      const parts = text.replace(/\r\n?/g, "\n").split("\n");
      dispatch(insertText(parts[0] ?? "", "paste"));
      for (let i = 1; i < parts.length; i++) {
        dispatch(splitParagraph());
        if (parts[i]!.length > 0) dispatch(insertText(parts[i]!, "paste"));
      }
    },
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
  });

  const mirror = createA11yMirror(proxy.el);

  const controller = createSelectionController({
    container,
    getTree: () => tree,
    getDoc: () => doc,
    getSelection: () => selection,
    setSelection,
    getCellSelection: () => cellSelection,
    setCellSelection,
    onTableSelectionHandle: selectTableHandle,
    clientToPage: (x, y) => paint.clientToPage(x, y),
    getGridSpacing: () => paint.getGridSpacing(),
    isSnapToGrid: () => paint.getSnapToGrid(),
    focusProxy: () => proxy.focus(),
    onDeleteSelection: () => dispatch(deleteBackward()),
    getStory: () => activeStory,
    setStory,
    selectObject,
    hasSelectedObject: () => selectedObject !== null,
    deleteSelectedObject: deleteSelectedObjectInternal,
    startColumnDrag,
    setColumnGuide: (guide) => paint.setColumnGuide(guide),
    startRowDrag,
    setRowGuide: (guide) => paint.setRowGuide(guide),
    applyObjectMove: (blockId, x, y, transient) =>
      dispatch(moveAnchoredImage(blockId, x, y, transient ? "transient" : "command")),
    onTab: tabInTable,
    onSdtPress: sdtPopupCtl.handlePress,
    jumpToBlock: (blockId: string): void => {
      // Word: Ctrl+click on a TOC entry moves the caret to the heading.
      if (!blockById(doc, blockId)) return;
      setSelection({ anchor: { blockId, offset: 0 }, focus: { blockId, offset: 0 } });
      const rect = caretRect(tree, { blockId, offset: 0 });
      if (rect) paint.ensureVisible(rect);
    },
    onAnchorJump: (anchorName: string, fromBlockId: string | null): void => {
      const target = resolveAnchorTarget(anchorName, fromBlockId);
      if (!target) return;
      setSelection({ anchor: { blockId: target, offset: 0 }, focus: { blockId: target, offset: 0 } });
      const rect = caretRect(tree, { blockId: target, offset: 0 });
      if (rect) paint.ensureVisible(rect);
    },
  });

  const keymapHandler = createKeymapHandler({ dispatch, undo, redo, toggleStyle });
  container.addEventListener("keydown", keymapHandler);

  // ---- clipboard (context-menu Cut/Copy/Paste) -----------------------------
  // Copy/cut serialize the model fragment to the async Clipboard API; paste
  // reads it back. The keyboard path still flows through the native copy/cut
  // events on the controller — these are the menu's gesture-driven equivalents.

  const orderedSelection = (): [DocPosition, DocPosition] | null => {
    if (!selection || isCollapsed(selection)) return null;
    const cmp = comparePositions(tree, selection.anchor, selection.focus, scope());
    return cmp <= 0 ? [selection.anchor, selection.focus] : [selection.focus, selection.anchor];
  };

  // The clipboard flavors for the active selection: a rectangular cell selection
  // serializes as an HTML table + tab-separated text; otherwise the text range.
  const clipboardPayload = (): { html: string; text: string } | null => {
    if (cellSelection) {
      const found = findTableById(doc, cellSelection.tableId);
      if (!found) return null;
      return tableRectToClipboard(found.table, {
        r0: cellSelection.anchor.row,
        c0: cellSelection.anchor.col,
        r1: cellSelection.focus.row,
        c1: cellSelection.focus.col,
      });
    }
    const o = orderedSelection();
    if (!o) return null;
    const fragment = extractFragment(paragraphsOf(doc), o[0], o[1]);
    return { html: fragmentToHtml(fragment), text: fragmentToPlainText(fragment) };
  };

  const copySelection = async (): Promise<void> => {
    const payload = clipboardPayload();
    if (!payload) return;
    const { html, text } = payload;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* clipboard unavailable (no permission / insecure context) */
      }
    }
  };

  const pasteText = (text: string): void => {
    const parts = text.replace(/\r\n?/g, "\n").split("\n");
    dispatch(insertText(parts[0] ?? "", "paste"));
    for (let i = 1; i < parts.length; i++) {
      dispatch(splitParagraph());
      if (parts[i]!.length > 0) dispatch(insertText(parts[i]!, "paste"));
    }
  };

  const pasteFromClipboard = async (): Promise<void> => {
    if (sdtBlocksEdit()) return;
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        if (it.types.includes("text/html")) {
          const html = await (await it.getType("text/html")).text();
          const frag = htmlToFragment(html);
          if (frag) {
            dispatch(insertFragment(frag));
            return;
          }
        }
      }
      for (const it of items) {
        if (it.types.includes("text/plain")) {
          pasteText(await (await it.getType("text/plain")).text());
          return;
        }
      }
    } catch {
      try {
        pasteText(await navigator.clipboard.readText());
      } catch {
        /* clipboard read blocked */
      }
    }
  };

  // ---- contextual right-click menu -----------------------------------------
  // Composition matrix (sections concatenated, only present targets emitted):
  //   always              → Clipboard (Cut/Copy/Paste)
  //   hyperlink           → Link (Open/Edit/Remove)
  //   image object        → Image (Wrap/Align/Delete)
  //   content control     → Control (Toggle|Choose/Remove)
  //   editable text       → Font, Paragraph, Insert
  //   list paragraph      → List (level up/down, remove)
  //   table cell          → Table (Insert/Delete/Merge/Unmerge)
  //   header/footer band  → Band (Edit / Close)
  let contextMenu: ContextMenuHandle | null = null;
  const closeContextMenu = (): void => {
    contextMenu?.close();
    contextMenu = null;
  };

  // Content-control inspector: gather an SDT's content and show its properties
  // + a faithful preview. Block-level controls render their whole block range
  // (paragraphs, images, tables, blank lines) so the preview mirrors the page;
  // inline controls render just their run slice.
  let sdtInspector: SdtInspectorHandle | null = null;

  /** Plain-text summary of a block list — drives the inspector's empty check,
   *  copy button, and char/paragraph counts. The preview itself is canvas-rendered
   *  by a child document (real fonts/metrics), not an HTML approximation. */
  const blocksSummary = (blocks: Block[]): { text: string; paraCount: number; charCount: number } => {
    let text = "";
    let paraCount = 0;
    let charCount = 0;
    for (const b of blocks) {
      if (b.kind === "paragraph") {
        paraCount++;
        const t = textOfRuns(b.runs);
        charCount += t.length;
        text += t + "\n";
      } else {
        text += (b.kind === "image" ? "[image]" : "[table]") + "\n";
      }
    }
    return { text: text.replace(/\n+$/, ""), paraCount, charCount };
  };

  /** The control's content as model blocks + how it must be committed. Block-level
   *  controls preview/edit their whole top-level block span (paragraphs, images,
   *  tables, blank lines); inline / cell-hosted controls use per-range paragraph
   *  slices. The blocks are rendered by a child document, and read back from the
   *  child editor on Save — no HTML round-trip. */
  type SdtData = SdtInspectorData & { blocks: Block[]; blockLevel: boolean; multiBlock: boolean };
  const sdtInspectorData = (id: string): SdtData | null => {
    const props = doc.sdts?.[id];
    if (!props) return null;
    const ranges = findSdtRanges(doc, id);
    if (ranges.length === 0) {
      return { id, props, text: "", paragraphCount: 0, charCount: 0, blocks: [], blockLevel: false, multiBlock: false };
    }
    const first = ranges[0]!;
    const last = ranges[ranges.length - 1]!;
    const firstBlock = blockById(doc, first.blockId);
    const inlinePartial =
      ranges.length === 1 &&
      firstBlock !== undefined &&
      (first.start > 0 || first.end < textOfRuns(firstBlock.runs).length);
    // Block-level control: its whole top-level block span (images + blank lines
    // between tagged paragraphs survive).
    if (!inlinePartial) {
      const fc = containerOf(doc, first.blockId);
      const lc = containerOf(doc, last.blockId);
      if (fc && lc && fc.where === lc.where) {
        const span = containerBlocks(doc, fc.where).slice(fc.index, lc.index + 1);
        const s = blocksSummary(span);
        return { id, props, text: s.text, paragraphCount: s.paraCount, charCount: s.charCount, blocks: span, blockLevel: true, multiBlock: false };
      }
    }
    // Inline / cell-hosted: one paragraph per tagged range (text only).
    const paras: import("@kindy/shared").Paragraph[] = ranges
      .map((rr): import("@kindy/shared").Paragraph | null => {
        const block = blockById(doc, rr.blockId);
        return block
          ? { kind: "paragraph", id: `ked-sdt-${rr.blockId}-${rr.start}`, revision: 0, runs: sliceRuns(block.runs, rr.start, rr.end), style: { ...block.style } }
          : null;
      })
      .filter((b): b is import("@kindy/shared").Paragraph => b !== null);
    const s = blocksSummary(paras);
    const multiBlock = new Set(ranges.map((r) => r.blockId)).size > 1;
    return { id, props, text: s.text, paragraphCount: s.paraCount, charCount: s.charCount, blocks: paras, blockLevel: false, multiBlock };
  };
  const openSdtInspector = (id: string): void => {
    const data = sdtInspectorData(id);
    if (!data) return;
    const props = data.props;
    // Editable for unlocked text controls; value-driven (checkbox/dropDown) and
    // locked controls stay read-only.
    const editable =
      !props.lockContent &&
      props.type !== "checkbox" &&
      props.type !== "dropDown";
    sdtInspector?.close();
    // A child document sharing this editor's live styles renders the preview and
    // hosts the canvas-native editor; Save reads the edited blocks straight back.
    const child = createChildDocument({ getStyleContext, makeEditor: createEditor });
    const commit = (blocks: Block[]): boolean => {
      const before = doc;
      const ranges = findSdtRanges(doc, id);
      if (data.blockLevel) {
        // Body/band block-level control: whole-span replacement (objects survive).
        dispatch(replaceSdtBlockSpan(id, blocks));
      } else if (data.multiBlock) {
        // Cell-hosted control spanning several cells: rewrite each range in place.
        dispatch(replaceSdtCellContent(id, ranges.map((_, i) => {
          const b = blocks[i];
          return b && b.kind === "paragraph" ? b.runs : [];
        })));
      } else {
        // True inline control (one paragraph): fragment replacement.
        const paras = blocks.filter((b): b is import("@kindy/shared").Paragraph => b.kind === "paragraph");
        const fragment: DocFragment = paras.length
          ? { inline: paras.length === 1, blocks: paras.map((p) => ({ runs: p.runs, style: p.style })) }
          : emptyFragmentLike(id);
        dispatch(replaceSdtContent(id, fragment));
      }
      return doc !== before; // dispatch swapped doc iff the edit applied
    };
    // Edit/preview the content in isolation: a clone with THIS control's marker
    // stripped, so the surface shows plain content (no nested control frame) and
    // can't yield a second copy of the SDT. The commit re-wraps it.
    const editBlocks = stripSdtMarker(data.blocks, id);
    sdtInspector = showSdtInspector(data, {
      editable,
      // Images only round-trip through the block-level (whole-span) commit path.
      allowImages: editable && data.blockLevel,
      renderPreview: (host) => child.render(host, { kind: "blocks", blocks: editBlocks }),
      mountEditor: (host) => {
        const h = child.mountEditor(host, { kind: "blocks", blocks: editBlocks });
        return {
          getBlocks: (): Block[] => h.getBlocks(),
          insertImage: (bytes, mime, imgOpts) => h.insertImage(bytes, mime, imgOpts),
        };
      },
      onSave: commit,
      onClose: () => child.destroy(),
    });
  };
  /** A one-empty-run fragment carrying the control's base style — used when the
   *  user clears the editable content entirely (htmlToFragment returns null). */
  const emptyFragmentLike = (id: string): DocFragment => {
    const r = findSdtRanges(doc, id)[0];
    const block = r ? blockById(doc, r.blockId) : undefined;
    const style = block ? (styleAtRuns(block.runs, r!.start + 1) ?? block.runs[0]?.style) : undefined;
    const para: ParaStyle = block?.style ?? {
      align: "left", lineHeight: 1.5, spaceBeforePx: 0, spaceAfterPx: 0,
      indentFirstLinePx: 0, indentLeftPx: 0,
    };
    const fallbackChar: CharStyle = { ...DEFAULT_CHAR_STYLE };
    return {
      inline: true,
      blocks: [{ runs: [{ text: "", style: style ?? fallbackChar }], style: para }],
    };
  };
  /** Open the field constructor with its result preview rendered by a child
   *  document (the field's result in the document's real font, not plain text). */
  const openFieldConstructor = (
    config: Pick<Parameters<typeof showFieldConstructor>[0], "initial" | "baseStyle" | "onApply">,
  ): void => {
    const child = createChildDocument({ getStyleContext, makeEditor: createEditor });
    showFieldConstructor({
      ...config,
      renderResult: (host, runs) => child.render(host, { kind: "runs", runs }),
      onClose: () => child.destroy(),
    });
  };
  /** The innermost content-control id at the caret OR around the selected image —
   *  the single "active control" the ribbon's inspect/remove buttons act on. */
  const activeSdtId = (): string | null => {
    if (selectedObject) {
      const chain = objectSdtChain(selectedObject);
      return chain[chain.length - 1] ?? null;
    }
    const focus = selection?.focus;
    return focus ? sdtAtPosition(doc, focus) : null;
  };

  /** Inspect the active control (ribbon button). Returns false if none. */
  const inspectSdtAtCaret = (): boolean => {
    const id = activeSdtId();
    if (!id || !doc.sdts?.[id]) return false;
    openSdtInspector(id);
    return true;
  };

  const positionWithinSelection = (pos: DocPosition): boolean => {
    if (!selection || isCollapsed(selection)) return false;
    const cmp = comparePositions(tree, selection.anchor, selection.focus, scope());
    const [min, max] = cmp <= 0 ? [selection.anchor, selection.focus] : [selection.focus, selection.anchor];
    return (
      comparePositions(tree, min, pos, scope()) <= 0 &&
      comparePositions(tree, pos, max, scope()) <= 0
    );
  };

  const bandAtPoint = (pt: { pageIndex: number; y: number }): "header" | "footer" | null => {
    const pg = tree.pages[pt.pageIndex];
    if (!pg) return null;
    if (pt.y < pg.contentTopPx) return "header";
    if (pt.y > pg.contentBottomPx) return "footer";
    return null;
  };

  /** First caret-capable paragraph of the cell holding `imageId` (so the Table
   *  section's commands, which read the caret's cell, apply to an image's cell). */
  const caretIntoImageCell = (imageId: string): void => {
    const loc = locateImage(doc, imageId);
    if (loc?.kind !== "cell") return;
    const table = doc.blocks[loc.bi] as TableBlock;
    const para = table.rows[loc.ri]!.cells[loc.ci]!.blocks.find((b) => b.kind === "paragraph");
    if (para) {
      selection = { anchor: { blockId: para.id, offset: 0 }, focus: { blockId: para.id, offset: 0 } };
    }
  };

  const listKindOf = (p: import("@kindy/shared").Paragraph): "bullet" | "decimal" | null => {
    const ref = p.style.list;
    if (!ref) return null;
    const def = doc.lists?.[ref.listId];
    const level = def?.levels[Math.min(ref.level, def.levels.length - 1)];
    return level?.format === "bullet" ? "bullet" : "decimal";
  };

  // ---- Style Manager -----------------------------------------------------

  let styleMgr: StyleManagerHandle | null = null;
  const openStyleManager = (initialSelection?: { kind: "paragraph" | "character" | "list" | "table"; id: string }): void => {
    if (styleMgr) { styleMgr.refresh(); return; }
    styleMgr = showStyleManager({
      editor: {
        getDocument: () => doc,
        dispatch,
        createChild: () => createChildDocument({ getStyleContext, makeEditor: createEditor }),
        focus: () => proxy.focus(),
      },
      ...(initialSelection ? { initialSelection } : {}),
      messages: t.styleManager,
      common: t.common,
      onClose: () => { styleMgr = null; },
    });
  };

  // ---- Borders & Shading modal -------------------------------------------

  let tableProps: TablePropertiesHandle | null = null;

  /** True when a page point lands within the active rectangular cell selection. */
  const pointInCellSelection = (pt: { pageIndex: number; x: number; y: number }): boolean => {
    if (!cellSelection) return false;
    const hit = hitTestCell(tree, pt.pageIndex, pt.x, pt.y);
    if (!hit || hit.tableId !== cellSelection.tableId) return false;
    const found = findTableById(doc, cellSelection.tableId);
    if (!found) return false;
    const rect = normalizeRect(buildTableGrid(found.table), {
      r0: cellSelection.anchor.row,
      c0: cellSelection.anchor.col,
      r1: cellSelection.focus.row,
      c1: cellSelection.focus.col,
    });
    return hit.row >= rect.r0 && hit.row <= rect.r1 && hit.col >= rect.c0 && hit.col <= rect.c1;
  };

  /** A single-cell selection at the caret's cell (when no rectangular cell
   *  selection is active), so the modal can target the cell the caret sits in. */
  const singleCellAtCaret = (): CellSelection | null => {
    const focus = selection?.focus;
    if (!focus) return null;
    const loc = locateParagraph(doc, focus.blockId);
    if (loc?.kind !== "cell") return null;
    const table = containerListOf(doc, loc.where)[loc.bi];
    if (!table || table.kind !== "table") return null;
    const origin = gridOriginOfCell(buildTableGrid(table), loc.ri, loc.ci);
    if (!origin) return null;
    return { tableId: table.id, anchor: { row: origin.row, col: origin.col }, focus: { row: origin.row, col: origin.col } };
  };

  /** Seed the modal's border controls from an existing edge, else a 1px black line. */
  const borderSeed = (b: CellBorders | undefined): { color: string; widthPx: number; style: BorderStyleName } => {
    const e = b && (b.top ?? b.right ?? b.bottom ?? b.left);
    return { color: e?.color ?? "#000000", widthPx: e?.widthPx ?? 1, style: e?.style ?? "single" };
  };

  const openTableProperties = (): void => {
    const captured = cellSelection ?? singleCellAtCaret();
    if (!captured) return;
    const found = findTableById(doc, captured.tableId);
    if (!found) return;
    const grid = buildTableGrid(found.table);
    const rect = normalizeRect(grid, {
      r0: captured.anchor.row,
      c0: captured.anchor.col,
      r1: captured.focus.row,
      c1: captured.focus.col,
    });
    const topLeft = grid.slots[rect.r0]?.[rect.c0]?.cell;
    const multiCell = rect.r1 > rect.r0 || rect.c1 > rect.c0;
    const seed = borderSeed(topLeft?.borders);
    const anchorRow = found.table.rows[rect.r0];
    const dirRaw = topLeft?.textDirection;
    const textDir: CellTextDir = dirRaw === "tbRl" || dirRaw === "btLr" ? dirRaw : "lrTb";
    tableProps?.close();
    tableProps = showTableProperties(
      {
        color: seed.color,
        widthPx: seed.widthPx,
        style: seed.style,
        shading: topLeft?.shading ?? null,
        rangeLabel: multiCell ? "Selected cells" : "1 cell",
        multiCell,
        tableWidth: found.table.preferredWidth ?? null,
        tableAlign: found.table.align ?? "left",
        vAlign: topLeft?.vAlign ?? "top",
        textDir,
        rowHeight: anchorRow?.props?.height ?? null,
        cantSplit: anchorRow?.props?.cantSplit ?? false,
        repeatHeader: anchorRow?.props?.repeatHeader ?? false,
        tableIndentPx: found.table.indentPx ?? 0,
        hasTableDefaultBorders: !!found.table.defaultBorders,
        tableDefaultShading: found.table.defaultShading ?? null,
        tableDefaultCellMargin: found.table.defaultCellMargin ?? null,
      },
      {
        applyBorders: (spec, edges) => {
          dispatch(setCellsBordersCmd(spec, edges, captured));
          keepCellSelection(captured); // border edits don't change the grid — keep the highlight
        },
        applyShading: (fill) => {
          dispatch(setCellsShadingCmd(fill, captured));
          keepCellSelection(captured);
        },
        applyTableWidth: (width) => {
          dispatch(setTablePreferredWidthAtSelectionCmd(width));
          keepCellSelection(captured);
        },
        applyTableAlign: (align) => {
          dispatch(setTableAlignAtSelectionCmd(align));
          keepCellSelection(captured);
        },
        applyVAlign: (vAlign) => {
          dispatch(setCellVAlignCmd(vAlign, captured));
          keepCellSelection(captured);
        },
        applyTextDir: (dir) => {
          dispatch(setCellTextDirectionCmd(dir, captured));
          keepCellSelection(captured);
        },
        applyRowHeight: (height) => {
          dispatch(setRowHeightAtSelectionCmd(height, captured));
          keepCellSelection(captured);
        },
        applyRowFlag: (flag, on) => {
          dispatch(setRowPropsCmd({ [flag]: on }, captured));
          keepCellSelection(captured);
        },
        applyTableIndent: (px) => {
          dispatch(setTablePropsAtSelectionCmd({ indentPx: px > 0 ? px : null }));
          keepCellSelection(captured);
        },
        applyTableDefaultBorders: (spec) => {
          const borders: TableBorders | null = spec
            ? { top: spec, right: spec, bottom: spec, left: spec, insideH: spec, insideV: spec }
            : null;
          dispatch(setTablePropsAtSelectionCmd({ defaultBorders: borders }));
          keepCellSelection(captured);
        },
        applyTableDefaultShading: (fill) => {
          dispatch(setTablePropsAtSelectionCmd({ defaultShading: fill }));
          keepCellSelection(captured);
        },
        applyTableDefaultCellMargin: (margin: CellMargin | null) => {
          dispatch(setTablePropsAtSelectionCmd({ defaultCellMargin: margin }));
          keepCellSelection(captured);
        },
      },
      {
        messages: t.tableProperties,
        common: t.common,
      },
    );
  };

  /** Re-assert a cell selection after a property edit that left the grid intact
   *  (afterMutation clears it defensively), so the highlight stays put while the
   *  modal is open. */
  const keepCellSelection = (cs: CellSelection): void => {
    cellSelection = cs;
    const resolved = cs.tablePath ? resolveTablePath(doc, cs.tablePath) : resolveTableIdPath(doc, cs.tableId);
    tableSelection = resolved ? { kind: "cell", table: resolved.path, anchor: cs.anchor, focus: cs.focus } : null;
    refreshSelectionVisuals();
  };

  const buildContextEntries = (pt: { pageIndex: number; x: number; y: number }): MenuEntry[] => {
    const item = (
      label: string,
      onClick: () => void,
      opts: { icon?: string; shortcut?: string; disabled?: boolean; danger?: boolean } = {},
    ): MenuEntry => ({ kind: "item", label, onClick, ...opts });
    const sep: MenuEntry = { kind: "sep" };

    const hasSel = (!!selection && !isCollapsed(selection)) || !!cellSelection;

    // View-only (checked dynamically so a runtime switch to view mode applies):
    // only the non-mutating actions (copy text, follow a link).
    if (mode === "view") {
      const url = linkAt(tree, pt.pageIndex, pt.x, pt.y, scope());
      const ro: MenuEntry[] = [
        item(t.contextMenu.copy, () => void copySelection(), { shortcut: "Ctrl+C", disabled: !hasSel }),
      ];
      if (url) ro.push(sep, item(t.contextMenu.openHyperlink, () => window.open(url, "_blank", "noopener"), { icon: ICONS.link }));
      return ro;
    }

    // Suggesting: don't expose the full editing menu (paste, table/object edits
    // and other structural actions aren't tracked as suggestions in V1 and would
    // mutate the document directly). Offer only the tracking-safe + non-mutating
    // actions — Cut becomes a tracked deletion, plus Comment (Google-Docs style).
    if (mode === "suggest") {
      const url = linkAt(tree, pt.pageIndex, pt.x, pt.y, scope());
      const m: MenuEntry[] = [
        item(t.contextMenu.cut, () => void copySelection().then(() => dispatch(deleteBackward())), { shortcut: "Ctrl+X", disabled: !hasSel }),
        item(t.contextMenu.copy, () => void copySelection(), { shortcut: "Ctrl+C", disabled: !hasSel }),
        sep,
        item(t.contextMenu.comment, () => startComment(), { icon: ICONS.comment, disabled: !hasSel }),
      ];
      if (url) m.push(sep, item(t.contextMenu.openHyperlink, () => window.open(url, "_blank", "noopener"), { icon: ICONS.link }));
      return m;
    }

    const hasCellSel = !!cellSelection;
    const focus = selection?.focus ?? null;
    const para = focus ? blockById(doc, focus.blockId) : undefined;
    const loc = focus ? locateParagraph(doc, focus.blockId) : null;
    // Image-specific menu items key on imgId — only when the selection is an image
    // (an equation selection is handled by its own "Edit/Delete Equation" entries).
    const imgId = selectedObject && locateImage(doc, selectedObject) ? selectedObject : null;
    const imgInCell = imgId ? locateImage(doc, imgId)?.kind === "cell" : false;
    const inCell = loc?.kind === "cell" || imgInCell || hasCellSel;
    // The active control: around a selected image, or at the caret.
    const imgSdtChain = imgId ? objectSdtChain(imgId) : [];
    const sdtId = imgId ? imgSdtChain[imgSdtChain.length - 1] ?? null : focus ? sdtAtPosition(doc, focus) : null;
    const linkUrl = linkAt(tree, pt.pageIndex, pt.x, pt.y, scope());
    const band = bandAtPoint(pt);

    const entries: MenuEntry[] = [];

    // Clipboard — always.
    entries.push(
      item(t.contextMenu.cut, () => void copySelection().then(() => dispatch(deleteBackward())), {
        shortcut: "Ctrl+X",
        disabled: !hasSel || sdtBlocksEdit(),
      }),
      item(t.contextMenu.copy, () => void copySelection(), { shortcut: "Ctrl+C", disabled: !hasSel }),
      item(t.contextMenu.paste, () => void pasteFromClipboard(), { shortcut: "Ctrl+V", disabled: sdtBlocksEdit() }),
    );

    // Comment on the selection (edit mode has no floating chip — suggest mode does).
    entries.push(sep, item(t.contextMenu.comment, () => startComment(), { icon: ICONS.comment, disabled: !hasSel }));

    // Styles — open the manager, seeded to the caret paragraph's style.
    {
      const styleId = para?.kind === "paragraph" ? para.style.namedStyle : undefined;
      entries.push(item(t.contextMenu.styles, () => openStyleManager(styleId ? { kind: "paragraph", id: styleId } : undefined), { icon: ICONS.stylePencil }));
    }

    // Link.
    if (linkUrl) {
      entries.push(
        sep,
        item(t.contextMenu.openHyperlink, () => window.open(linkUrl, "_blank", "noopener"), { icon: ICONS.link }),
        item(t.contextMenu.editHyperlink, () => {
          const u = prompt("Link URL:", linkUrl);
          if (u !== null) dispatch(setLinkCmd(u.trim() === "" ? null : u.trim()));
        }),
        item(t.contextMenu.removeHyperlink, () => dispatch(setLinkCmd(null)), { danger: true }),
      );
    }

    // Field — regenerate a TOC (Word's F9) or refresh a custom field from the host
    // via the resolveField hook (parse its OOXML, splice in as the new result).
    const field = focus ? fieldAtBlock(doc, focus.blockId) : null;
    if (field?.kind === "toc") {
      entries.push(
        sep,
        item("Update Field (TOC)", () => dispatch(updateTocFieldCmd())),
        item("Table of Contents options…", () =>
          showTocProperties({
            initial: parseTocInstruction(doc.tocInstruction ?? ' TOC \\o "1-3" \\h \\z '),
            onApply: (sw) => dispatch(setTocSwitchesCmd(sw)),
            messages: t.tocProperties,
            common: t.common,
          }),
        ),
      );
    } else if (field?.kind === "custom") {
      const def = field.def;
      const resolve = options.resolveField;
      entries.push(
        sep,
        item(
          `Update Field (${def.name})`,
          () => {
            if (!resolve) return;
            void (async () => {
              try {
                const result = await resolve({
                  fieldId: def.id,
                  name: def.name,
                  instruction: def.instruction,
                  ...(options.docId ? { docId: options.docId } : {}),
                });
                const blocks = await fieldResultToBlocks(result);
                if (blocks.length > 0) dispatch(replaceFieldResultCmd(def.id, blocks));
              } catch (err) {
                console.error("resolveField failed", err);
              }
            })();
          },
          { disabled: !resolve },
        ),
      );
    }

    // Inline built-in field (PAGE/NUMPAGES/DATE/TIME/IF) at the caret — edit its
    // definition in the constructor, or recompute its result (Word's F9).
    const caretStyle = (pos: { blockId: string; offset: number }): CharStyle => {
      const b = blockById(doc, pos.blockId);
      const s = b ? styleAtRuns(b.runs, pos.offset) ?? b.runs[0]?.style : undefined;
      if (s) return s;
      for (const blk of doc.blocks) if (blk.kind === "paragraph" && blk.runs[0]) return blk.runs[0]!.style;
      return { fontFamily: "Arial, sans-serif", fontSizePx: 16, bold: false, italic: false, underline: false, strikethrough: false, color: "#000000" };
    };
    const inlineFieldId = focus ? fieldAtPosition(doc, focus) : null;
    const inlineFieldDef = inlineFieldId ? doc.fields?.[inlineFieldId] : undefined;
    if (focus && inlineFieldDef?.kind === "builtin" && inlineFieldDef.spec) {
      const def = inlineFieldDef;
      const spec = def.spec!;
      const f = focus;
      entries.push(sep, item(`Edit Field (${def.name})…`, () =>
        openFieldConstructor({ initial: spec, baseStyle: caretStyle(f), onApply: (s) => dispatch(editFieldCmd(def.id, s)) }),
      ));
      if (spec.type !== "PAGE" && spec.type !== "NUMPAGES") {
        entries.push(item(`Update Field (${def.name})`, () => dispatch(updateFieldCmd(def.id))));
      }
    } else if (focus) {
      entries.push(sep, item("Insert Field…", () =>
        openFieldConstructor({ baseStyle: caretStyle(focus), onApply: (s) => dispatch(insertFieldCmd(s)) }),
      ));
    }

    // Display equation under the pointer — edit its MathML in the equation editor.
    const eqHit = hitTestEquation(tree, pt.pageIndex, pt.x, pt.y);
    if (eqHit) {
      // Container-aware: equations imported into table cells or header/footer
      // bands resolve too (doc.blocks.find would only catch top-level body ones).
      const eqBlock = locateEquation(doc, eqHit.blockId)?.block;
      if (eqBlock) {
        const blk = eqBlock;
        entries.push(
          sep,
          item(t.contextMenu.editEquation, () =>
            showEquationEditor({
              editing: true,
              initialDisplay: true, // a display-equation block
              initialMathml: equationToMathmlString(blk.equation),
              onApply: (eq) => dispatch(editEquationCmd(blk.id, eq)),
            }),
          ),
          {
            kind: "submenu",
            label: t.contextMenu.align,
            icon: ICONS.alignCenter,
            items: [
              { kind: "item", label: t.contextMenu.alignLeft, icon: ICONS.alignLeft, onClick: () => dispatch(setEquationAlignCmd(blk.id, "left")) },
              { kind: "item", label: t.contextMenu.alignCenter, icon: ICONS.alignCenter, onClick: () => dispatch(setEquationAlignCmd(blk.id, "center")) },
              { kind: "item", label: t.contextMenu.alignRight, icon: ICONS.alignRight, onClick: () => dispatch(setEquationAlignCmd(blk.id, "right")) },
            ],
          },
          item(t.contextMenu.deleteEquation, () => { selectObject(null); dispatch(removeBlockObject(blk.id)); }, { danger: true }),
        );
      }
    } else {
      // Inline equation under the pointer — match the whole equation BOX (not a
      // caret offset, which only resolves on one half), then read the equation
      // from the run AT that index.
      const eqInline = inlineEquationAt(tree, pt.pageIndex, pt.x, pt.y, scope());
      const pblk = eqInline ? blockById(doc, eqInline.blockId) : undefined;
      const eqStyle = eqInline && pblk?.kind === "paragraph" ? styleOfCharAt(pblk.runs, eqInline.start) : undefined;
      if (eqInline && eqStyle?.equation) {
        const off = eqInline.start;
        const blockId = eqInline.blockId;
        const equation = eqStyle.equation;
        entries.push(
          sep,
          item(t.contextMenu.editEquation, () =>
            showEquationEditor({
              editing: true,
              initialDisplay: false, // an inline equation — don't flip it to display
              initialMathml: equationToMathmlString(equation),
              onApply: (eq) => dispatch(editInlineEquationCmd(blockId, off, eq)),
            }),
          ),
          item(t.contextMenu.deleteEquation, () => dispatch(removeInlineEquationCmd(blockId, off)), { danger: true }),
        );
      }
    }

    // Image.
    if (imgId) {
      entries.push(
        sep,
        {
          kind: "submenu",
          label: t.contextMenu.wrapText,
          icon: ICONS.wrapSquare,
          items: [
            { kind: "item", label: t.contextMenu.wrapInline, icon: ICONS.wrapInline, onClick: () => dispatch(setImageProps(imgId, { wrap: "block", align: "center", anchor: null })) },
            { kind: "item", label: t.contextMenu.wrapSquare, icon: ICONS.wrapSquare, onClick: () => dispatch(setImageProps(imgId, { wrap: "square", align: "left", anchor: null })) },
            { kind: "sep" },
            { kind: "item", label: t.contextMenu.behindText, onClick: () => dispatch(setImageLayer(imgId, true)) },
            { kind: "item", label: t.contextMenu.inFrontOfText, onClick: () => dispatch(setImageLayer(imgId, false)) },
          ],
        },
        {
          kind: "submenu",
          label: t.contextMenu.align,
          icon: ICONS.alignLeft,
          items: [
            { kind: "item", label: t.contextMenu.alignLeft, icon: ICONS.alignLeft, onClick: () => dispatch(setImageProps(imgId, { align: "left" })) },
            { kind: "item", label: t.contextMenu.alignCenter, icon: ICONS.alignCenter, onClick: () => dispatch(setImageProps(imgId, { align: "center" })) },
            { kind: "item", label: t.contextMenu.alignRight, icon: ICONS.alignRight, onClick: () => dispatch(setImageProps(imgId, { align: "right" })) },
          ],
        },
        item(t.contextMenu.crop, () => enterCropMode(imgId)),
        ...(locateImage(doc, imgId)?.image.crop ? [item(t.contextMenu.resetCrop, () => dispatch(setImageCropCmd(imgId, null)))] : []),
        item("Image Properties…", () => {
          const loc = locateImage(doc, imgId);
          if (!loc) return;
          showImageDialog({
            initial: {
              widthPx: loc.image.widthPx,
              heightPx: loc.image.heightPx,
              align: loc.image.align,
              wrap: loc.image.wrap,
            },
            onApply: (patch) => {
              dispatch(setImageProps(imgId, patch));
            },
          });
        }, { icon: ICONS.imageProps }),
        item(t.contextMenu.bringToFront, () => dispatch(bringImageToFront(imgId))),
        item(t.contextMenu.sendToBack, () => dispatch(sendImageToBack(imgId))),
        item(t.contextMenu.wrapInContentControl, () => dispatch(wrapImageInContentControl(imgId, "richText", { alias: "Text" })), { icon: ICONS.sdtText }),
        item(t.contextMenu.deleteImage, () => {
          selectObject(null);
          dispatch(deleteImage(imgId));
        }, { icon: ICONS.image, danger: true }),
      );
    }

    // Content control.
    if (sdtId) {
      const props = doc.sdts?.[sdtId];
      if (props) {
        entries.push(sep);
        if (props.type === "checkbox") {
          entries.push(item(t.contextMenu.toggleCheckbox, () => dispatch(toggleSdtCheckbox(sdtId)), { icon: ICONS.sdtCheckbox }));
        }
        if ((props.type === "dropDown" || props.type === "comboBox") && (props.listItems?.length ?? 0) > 0) {
          entries.push({
            kind: "submenu",
            label: t.contextMenu.chooseItem,
            icon: ICONS.sdtDropdown,
            items: props.listItems!.map((li) => ({ kind: "item", label: li.display, onClick: () => dispatch(setSdtContent(sdtId, li.display)) })),
          });
        }
        entries.push(
          item(t.contextMenu.properties, () => openSdtInspector(sdtId), { icon: ICONS.sdtText }),
        );
        if (!props.lockControl) {
          entries.push(item(t.contextMenu.removeContentControl, () => dispatch(removeContentControl(sdtId, false)), { icon: ICONS.sdtRemove, danger: true }));
        }
      }
    }

    // Text formatting — not for a selected image.
    if (!imgId && focus) {
      entries.push(
        sep,
        item(t.contextMenu.bold, () => toggleStyle("bold"), { shortcut: "Ctrl+B" }),
        item(t.contextMenu.italic, () => toggleStyle("italic"), { shortcut: "Ctrl+I" }),
        item(t.contextMenu.underline, () => toggleStyle("underline"), { shortcut: "Ctrl+U" }),
        {
          kind: "submenu",
          label: t.contextMenu.alignment,
          icon: ICONS.alignLeft,
          items: [
            { kind: "item", label: t.contextMenu.alignLeft, icon: ICONS.alignLeft, onClick: () => dispatch(setAlignment("left")) },
            { kind: "item", label: t.contextMenu.alignCenter, icon: ICONS.alignCenter, onClick: () => dispatch(setAlignment("center")) },
            { kind: "item", label: t.contextMenu.alignRight, icon: ICONS.alignRight, onClick: () => dispatch(setAlignment("right")) },
            { kind: "item", label: t.contextMenu.alignJustify, icon: ICONS.alignJustify, onClick: () => dispatch(setAlignment("justify")) },
          ],
        },
        item(t.contextMenu.bullets, () => dispatch(toggleList("bullet")), { icon: ICONS.bullets }),
        item(t.contextMenu.numbering, () => dispatch(toggleList("decimal")), { icon: ICONS.numbering }),
        sep,
        item(t.contextMenu.insertHyperlink, () => {
          const u = prompt("Link URL:");
          if (u !== null && u.trim() !== "") dispatch(setLinkCmd(u.trim()));
        }, { icon: ICONS.link }),
        {
          kind: "submenu",
          label: t.contextMenu.insertContentControl,
          icon: ICONS.sdtText,
          items: (["richText", "checkbox", "dropDown", "date"] as SdtType[]).map((type) => ({
            kind: "item" as const,
            label: (
              { richText: "Rich Text", checkbox: "Check Box", dropDown: "Drop-Down List", date: "Date Picker" } as Record<string, string>
            )[type] ?? type,
            onClick: () => {
              const props: Parameters<typeof insertContentControl>[1] =
                type === "dropDown"
                  ? { listItems: [{ display: "Item 1", value: "Item 1" }, { display: "Item 2", value: "Item 2" }] }
                  : type === "date"
                    ? { dateFormat: "M/d/yyyy" }
                    : {};
              dispatch(insertContentControl(type, props));
            },
          })),
        },
      );
    }

    // List.
    if (!imgId && para?.style.list) {
      const kind = listKindOf(para) ?? "bullet";
      entries.push(
        sep,
        item(t.contextMenu.increaseListLevel, () => dispatch(changeListLevel(1))),
        item(t.contextMenu.decreaseListLevel, () => dispatch(changeListLevel(-1))),
        item(t.contextMenu.removeList, () => dispatch(toggleList(kind)), { danger: true }),
      );
    }

    // Table.
    if (inCell) {
      entries.push(
        sep,
        {
          kind: "submenu",
          label: t.contextMenu.insertTableElem,
          icon: ICONS.rowBelow,
          items: [
            { kind: "item", label: t.contextMenu.insertRowAbove, icon: ICONS.rowAbove, disabled: !canExecuteTableActionForState(state(), "insertRowAbove"), onClick: () => dispatch(insertTableRowCmd("above")) },
            { kind: "item", label: t.contextMenu.insertRowBelow, icon: ICONS.rowBelow, disabled: !canExecuteTableActionForState(state(), "insertRowBelow"), onClick: () => dispatch(insertTableRowCmd("below")) },
            { kind: "item", label: t.contextMenu.insertColLeft, icon: ICONS.colLeft, disabled: !canExecuteTableActionForState(state(), "insertColumnLeft"), onClick: () => dispatch(insertTableColumnCmd("left")) },
            { kind: "item", label: t.contextMenu.insertColRight, icon: ICONS.colRight, disabled: !canExecuteTableActionForState(state(), "insertColumnRight"), onClick: () => dispatch(insertTableColumnCmd("right")) },
          ],
        },
        {
          kind: "submenu",
          label: t.contextMenu.deleteTableElem,
          icon: ICONS.deleteRow,
          items: [
            { kind: "item", label: t.contextMenu.deleteRow, icon: ICONS.deleteRow, danger: true, disabled: !canExecuteTableActionForState(state(), "deleteRow"), onClick: () => dispatch(deleteTableRowCmd()) },
            { kind: "item", label: t.contextMenu.deleteCol, icon: ICONS.deleteCol, danger: true, disabled: !canExecuteTableActionForState(state(), "deleteColumn"), onClick: () => dispatch(deleteTableColumnCmd()) },
            { kind: "item", label: t.contextMenu.deleteTable, icon: ICONS.deleteTable, danger: true, disabled: !canExecuteTableActionForState(state(), "deleteTable"), onClick: () => dispatch(deleteTableCmd()) },
          ],
        },
        item(t.contextMenu.mergeCells, () => dispatch(mergeCellsCmd()), { icon: ICONS.mergeCells, disabled: !canExecuteTableActionForState(state(), "mergeCells") }),
        item(t.contextMenu.unmergeCell, () => dispatch(unmergeCellCmd()), { icon: ICONS.unmergeCells, disabled: !canExecuteTableActionForState(state(), "unmergeCell") }),
        (() => {
          const captured = cellSelection ?? singleCellAtCaret();
          const tbl = captured ? findTableById(doc, captured.tableId)?.table : undefined;
          const curMode = tbl?.widthMode ?? "fixed";
          const pref = tbl?.preferredWidth;
          const curAlign = tbl?.align ?? "left";
          const check = (label: string, active: boolean): string => (active ? `${label} ✓` : label);
          const fit = (label: string, mode: "fixed" | "autofitContents" | "autofitWindow"): MenuEntry => ({
            kind: "item",
            label: check(label, curMode === mode),
            onClick: () => dispatch(setTableWidthModeAtSelectionCmd(mode)),
          });
          // Quick width presets (percent of the page); the dialog offers free-form values.
          const widthItem = (label: string, value: number | null): MenuEntry => ({
            kind: "item",
            label: check(
              label,
              value === null ? !pref : pref?.type === "pct" && Math.round(pref.value) === value,
            ),
            onClick: () =>
              dispatch(setTablePreferredWidthAtSelectionCmd(value === null ? null : { type: "pct", value })),
          });
          const alignItem = (label: string, a: "left" | "center" | "right"): MenuEntry => ({
            kind: "item",
            label: check(label, curAlign === a),
            onClick: () => dispatch(setTableAlignAtSelectionCmd(a)),
          });
          return {
            kind: "submenu",
            label: t.contextMenu.autofitAndSize,
            icon: ICONS.table,
            items: [
              fit(t.table.autofitContents, "autofitContents"),
              fit(t.table.autofitWindow, "autofitWindow"),
              fit(t.table.fixedWidth, "fixed"),
              sep,
              widthItem(t.table.width25, 25),
              widthItem(t.table.width50, 50),
              widthItem(t.table.width75, 75),
              widthItem(t.table.widthFull, null),
              sep,
              alignItem(t.table.alignLeft, "left"),
              alignItem(t.table.alignCenter, "center"),
              alignItem(t.table.alignRight, "right"),
            ],
          } as MenuEntry;
        })(),
        sep,
        item(t.contextMenu.bordersAndShading, () => openTableProperties(), { icon: ICONS.borders }),
        // Quick cell vAlign + row toggles (issue #86); the dialog has the full set.
        (() => {
          const captured = cellSelection ?? singleCellAtCaret();
          const found = captured ? findTableById(doc, captured.tableId) : undefined;
          let curVAlign: "top" | "center" | "bottom" = "top";
          if (found && captured) {
            const g = buildTableGrid(found.table);
            const r = normalizeRect(g, { r0: captured.anchor.row, c0: captured.anchor.col, r1: captured.focus.row, c1: captured.focus.col });
            curVAlign = g.slots[r.r0]?.[r.c0]?.cell.vAlign ?? "top";
          }
          const check = (label: string, active: boolean): string => (active ? `${label} ✓` : label);
          const vItem = (label: string, a: "top" | "center" | "bottom"): MenuEntry => ({
            kind: "item",
            label: check(label, curVAlign === a),
            onClick: () => dispatch(setCellVAlignCmd(a, captured)),
          });
          return {
            kind: "submenu",
            label: t.contextMenu.cellAlignment,
            icon: ICONS.alignLeft,
            items: [vItem(t.tableProperties.cellVAlignTop, "top"), vItem(t.tableProperties.cellVAlignCenter, "center"), vItem(t.tableProperties.cellVAlignBottom, "bottom")],
          } as MenuEntry;
        })(),
        (() => {
          const captured = cellSelection ?? singleCellAtCaret();
          const found = captured ? findTableById(doc, captured.tableId) : undefined;
          let cantSplit = false;
          let repeatHeader = false;
          if (found && captured) {
            const g = buildTableGrid(found.table);
            const r = normalizeRect(g, { r0: captured.anchor.row, c0: captured.anchor.col, r1: captured.focus.row, c1: captured.focus.col });
            const row = found.table.rows[r.r0];
            cantSplit = row?.props?.cantSplit ?? false;
            repeatHeader = row?.props?.repeatHeader ?? false;
          }
          const check = (label: string, active: boolean): string => (active ? `${label} ✓` : label);
          return {
            kind: "submenu",
            label: t.tableProperties.sectionRow,
            icon: ICONS.rowBelow,
            items: [
              { kind: "item", label: check(t.tableProperties.rowKeepTogether, cantSplit), onClick: () => dispatch(setRowPropsCmd({ cantSplit: !cantSplit }, captured)) },
              { kind: "item", label: check(t.tableProperties.rowRepeatHeader, repeatHeader), onClick: () => dispatch(setRowPropsCmd({ repeatHeader: !repeatHeader }, captured)) },
              { kind: "sep" },
              { kind: "item", label: t.contextMenu.tableProperties, onClick: () => openTableProperties() },
            ],
          } as MenuEntry;
        })(),
        (() => {
          const captured = cellSelection ?? singleCellAtCaret();
          const curStyleId = captured ? findTableById(doc, captured.tableId)?.table.styleId : undefined;
          const styleItems: MenuEntry[] = Object.values(doc.tableStyles ?? {}).map((ts) => ({
            kind: "item",
            label: ts.id === curStyleId ? `${ts.name} ✓` : ts.name,
            onClick: () => dispatch(applyTableStyle(ts.id)),
          }));
          return {
            kind: "submenu",
            label: "Table Style",
            icon: ICONS.stylePencil,
            items: [
              ...(styleItems.length > 0 ? [...styleItems, { kind: "sep" } as MenuEntry] : []),
              { kind: "item", label: "New Table Style…", onClick: () => openStyleManager(curStyleId ? { kind: "table", id: curStyleId } : undefined) },
              { kind: "item", label: "Manage Styles…", onClick: () => openStyleManager(curStyleId ? { kind: "table", id: curStyleId } : undefined) },
            ],
          } as MenuEntry;
        })(),
      );
    }

    // Header/footer band.
    if (activeStory) {
      entries.push(sep, item("Close Header/Footer", () => setStory(null)));
    } else if (band) {
      entries.push(
        sep,
        item(`Edit ${band === "header" ? "Header" : "Footer"}`, () => setStory({ band, pageIndex: pt.pageIndex })),
      );
    }

    return entries;
  };

  /** Resolve an in-document anchor (TOC entry / cross-ref) to a target block
   *  via the modeled bookmarks (docx w:bookmarkStart). */
  const resolveAnchorTarget = (anchorName: string, _fromBlockId: string | null): string | null => {
    const target = doc.bookmarks?.[anchorName]?.start.blockId;
    return target && blockById(doc, target) ? target : null;
  };

  /** Imported TOC entries keep their pre-calculated page numbers; this rewrites
   *  each to the target heading's CURRENT page (from the live layout). An entry
   *  is "label <tab> number" with an in-document anchor link to its heading. */
  const recalculateToc = (): number => {
    // The page-number mapping lives in the shared, headless core (also used by the
    // backend recalc route). The editor owns only the dispatch wrapping so the
    // rewrite is undoable and replays to collaborators.
    const edits = computeTocEdits(doc, tree);
    if (edits.length === 0) return 0;

    dispatch((state) => {
      const ops: import("@kindy/shared").Op[] = [];
      for (const e of edits) {
        const block = blockById(state.doc, e.blockId);
        if (!block) continue;
        // Re-resolve style against current state for collab-safety, else the
        // style captured by the core (against the laid-out doc).
        const style = styleAtRuns(block.runs, e.start) ?? e.style;
        ops.push({ type: "deleteRange", blockId: e.blockId, start: e.start, end: e.end });
        ops.push({ type: "insertText", at: { blockId: e.blockId, offset: e.start }, text: e.text, ...(style ? { style } : {}) });
      }
      return { ops, selectionAfter: state.selection, origin: "command" };
    });
    return edits.length;
  };

  /** Make the hovered/right-clicked canvas cell the semantic command target.
   *  This is intentionally independent of text hit-testing: blank cells, cell
   *  padding and imported cells without a paragraph still need table actions. */
  const selectTableCellTarget = (target: TableQuickActionTarget): boolean => {
    const resolved = resolveTableIdPath(doc, target.tableId);
    if (!resolved) return false;
    setSemanticTableSelection({
      kind: "cell",
      table: resolved.path,
      anchor: { row: target.row, col: target.col },
      focus: { row: target.row, col: target.col },
    });
    return true;
  };

  const quickTableMenuEntries = (): MenuEntry[] => {
    const action = (label: string, icon: string, run: () => void, enabled: boolean, danger = false): MenuEntry => ({
      kind: "item",
      label,
      icon,
      disabled: !enabled,
      danger,
      onClick: run,
    });
    return [
      { kind: "header", label: t.ribbon.table },
      action(t.table.insertRowAbove, ICONS.rowAbove, () => dispatch(insertTableRowCmd("above")), canExecuteTableActionForState(state(), "insertRowAbove")),
      action(t.table.insertRowBelow, ICONS.rowBelow, () => dispatch(insertTableRowCmd("below")), canExecuteTableActionForState(state(), "insertRowBelow")),
      action(t.table.insertColLeft, ICONS.colLeft, () => dispatch(insertTableColumnCmd("left")), canExecuteTableActionForState(state(), "insertColumnLeft")),
      action(t.table.insertColRight, ICONS.colRight, () => dispatch(insertTableColumnCmd("right")), canExecuteTableActionForState(state(), "insertColumnRight")),
      { kind: "sep" },
      action(t.table.mergeCells, ICONS.mergeCells, () => dispatch(mergeCellsCmd()), canExecuteTableActionForState(state(), "mergeCells")),
      action(t.table.unmergeCells, ICONS.unmergeCells, () => dispatch(unmergeCellCmd()), canExecuteTableActionForState(state(), "unmergeCell")),
      { kind: "sep" },
      action(t.table.deleteRow, ICONS.deleteRow, () => dispatch(deleteTableRowCmd()), canExecuteTableActionForState(state(), "deleteRow"), true),
      action(t.table.deleteCol, ICONS.deleteCol, () => dispatch(deleteTableColumnCmd()), canExecuteTableActionForState(state(), "deleteColumn"), true),
      action(t.table.deleteTable, ICONS.deleteTable, () => dispatch(deleteTableCmd()), canExecuteTableActionForState(state(), "deleteTable"), true),
    ];
  };

  const tableQuickActions = createTableQuickActions({
    labels: {
      insertRow: t.table.insertRowBelow,
      insertColumn: t.table.insertColRight,
      more: t.ribbon.table,
    },
    icons: { insertRow: ICONS.rowBelow, insertColumn: ICONS.colRight },
    onInsertRow: (target) => {
      if (selectTableCellTarget(target)) dispatch(insertTableRowCmd("below"));
    },
    onInsertColumn: (target) => {
      if (selectTableCellTarget(target)) dispatch(insertTableColumnCmd("right"));
    },
    onMore: (target, anchor) => {
      if (!selectTableCellTarget(target)) return;
      closeContextMenu();
      contextMenu = showContextMenu(anchor.right - 2, anchor.bottom + 4, quickTableMenuEntries());
    },
  });

  /** Convert a placed canvas cell to a viewport anchor for the fixed-size DOM
   *  action bar. This keeps controls crisp and stable at 25–500% document zoom. */
  const tableCellClientAnchor = (
    pageIndex: number,
    target: TableQuickActionTarget,
    pageX: number,
    pageY: number,
  ): { left: number; top: number; right: number; bottom: number } | null => {
    const page = tree.pages[pageIndex];
    const pageEl = paint.getPageElement(pageIndex);
    if (!page || !pageEl) return null;
    for (const block of page.blocks) {
      const table = block.table;
      if (!table || block.blockId !== target.tableId) continue;
      for (const row of table.rows) {
        for (const cell of row.cells) {
          if (cell.originRow !== target.row || cell.originCol !== target.col) continue;
          if (pageX < cell.x || pageX > cell.x + cell.width || pageY < cell.y || pageY > cell.y + cell.height) continue;
          const rect = pageEl.getBoundingClientRect();
          const zoom = paint.getZoom();
          return {
            left: rect.left + cell.x * zoom,
            top: rect.top + cell.y * zoom,
            right: rect.left + (cell.x + cell.width) * zoom,
            bottom: rect.top + (cell.y + cell.height) * zoom,
          };
        }
      }
    }
    return null;
  };

  const updateTableQuickActions = (ev: MouseEvent): void => {
    if (mode !== "edit" || activeStory || ev.buttons !== 0) {
      tableQuickActions.scheduleHide();
      return;
    }
    const pt = paint.clientToPage(ev.clientX, ev.clientY);
    const hit = pt?.inside ? hitTestCell(tree, pt.pageIndex, pt.x, pt.y) : null;
    if (!pt || !hit) {
      tableQuickActions.scheduleHide();
      return;
    }
    const anchor = tableCellClientAnchor(pt.pageIndex, hit, pt.x, pt.y);
    if (!anchor) {
      tableQuickActions.scheduleHide();
      return;
    }
    tableQuickActions.show(hit, anchor);
  };

  const onContextMenu = (ev: MouseEvent): void => {
    const pt = paint.clientToPage(ev.clientX, ev.clientY);
    if (!pt) return;
    ev.preventDefault();
    closeContextMenu();
    tableQuickActions.hide();
    proxy.focus();

    // Word: right-click places focus unless it lands inside an existing range —
    // including a rectangular cell selection, which must survive so Merge /
    // Borders act on the whole dragged block, not just the clicked cell.
    if (!pointInCellSelection(pt)) {
      // Off-page right-clicks are clamped onto the edge — don't let them "hit" a
      // background image there (mirrors the left-click rule).
      const imageId = pt.inside ? hitTestSelectableObject(tree, pt.pageIndex, pt.x, pt.y, scope())?.blockId ?? null : null;
      if (imageId) {
        selectObject(imageId);
        caretIntoImageCell(imageId); // lets the Table section act on the image's cell
      } else {
        selectObject(null);
        const pos = hitTest(tree, pt.pageIndex, pt.x, pt.y, scope());
        if (pos && !positionWithinSelection(pos)) {
          setSelection({ anchor: pos, focus: pos });
        } else if (!pos) {
          const cell = hitTestCell(tree, pt.pageIndex, pt.x, pt.y);
          if (cell) selectTableCellTarget(cell);
        }
      }
      refreshSelectionVisuals();
    }

    const entries = buildContextEntries(pt);
    if (entries.length > 0) contextMenu = showContextMenu(ev.clientX, ev.clientY, entries);
  };
  container.addEventListener("contextmenu", onContextMenu);

  // Esc while cropping commits the crop and stays on the image (keeps it selected),
  // rather than falling through to the object-deselect Escape in selectionController.
  // Capture phase so it pre-empts that bubble-phase handler on the same container.
  const onCropKeyCapture = (ev: KeyboardEvent): void => {
    if (ev.key === "Escape" && objectFrame.isCropping()) {
      exitCropMode(true);
      ev.preventDefault();
      ev.stopPropagation();
    }
  };
  container.addEventListener("keydown", onCropKeyCapture, true);

  // Hover highlighting for content controls (incl. nested) — point at any control
  // to see its frame(s) and breadcrumb, without moving the caret.
  const onSdtHoverMove = (ev: MouseEvent): void => {
    updateTableQuickActions(ev);
    updateHoverAdornment(ev.clientX, ev.clientY, ev.buttons);
    updateInspectorHover(ev.clientX, ev.clientY, ev.buttons);
  };
  const onSdtHoverLeave = (): void => {
    tableQuickActions.scheduleHide();
    if (inspectorActive && lastInspectorHover !== null) {
      lastInspectorHover = null;
      options.onInspectorHover?.(null);
    }
    // Mirror the hover clear for the probe: leaving the container skips the
    // off-page path in updateInspectorHover, so clear it here to avoid a stale read.
    if (probeActive && lastProbeKey !== "") {
      lastProbeKey = "";
      options.onInspectorProbe?.(null);
    }
    if (hoverSdtChain.length === 0) return;
    hoverSdtChain = [];
    lastHoverKey = "";
    renderSdtAdornment();
  };
  container.addEventListener("mousemove", onSdtHoverMove);
  container.addEventListener("mouseleave", onSdtHoverLeave);
  const onTableViewportMove = (): void => tableQuickActions.hide();
  container.addEventListener("scroll", onTableViewportMove, { passive: true });

  const applyZoom = (next: number, anchorClientY?: number): void => {
    const before = paint.getZoom();
    paint.setZoom(next);
    const after = paint.getZoom();
    if (after === before) return;
    refreshObjectFrame(); // the selection frame's geometry is zoom-scaled
    // Keep the anchored point (cursor, or viewport center) stationary.
    const rect = container.getBoundingClientRect();
    const anchorY = anchorClientY ?? rect.top + rect.height / 2;
    const yInContent = container.scrollTop + (anchorY - rect.top);
    container.scrollTop = (yInContent * after) / before - (anchorY - rect.top);
    options.onZoomChange?.(after);
  };

  // Ctrl/Cmd + wheel zooms (Word/browser convention), anchored on the cursor so
  // the point under the pointer stays put across the zoom.
  container.addEventListener(
    "wheel",
    (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      applyZoom(paint.getZoom() * (ev.deltaY < 0 ? zoomStep : 1 / zoomStep), ev.clientY);
    },
    { passive: false },
  );

  // Soft keyboard: when it opens, the VISUAL viewport shrinks but the document's
  // native scroll doesn't know the caret is now behind it. On a visualViewport
  // resize/scroll, re-center a focused, collapsed caret so it stays readable
  // above the keyboard. (Android resizes the layout viewport so centering is
  // exact; iOS overlays the keyboard, where centering keeps the caret in the
  // upper half, clear of a typical keyboard.)
  const vv = window.visualViewport;
  const onViewportChange = (): void => {
    if (!proxy.hasFocus() || !selection || !isCollapsed(selection)) return;
    const caret = caretRect(tree, selection.focus, scope());
    if (caret) paint.ensureVisible(caret, "center");
  };
  if (vv) {
    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
  }

  // Pinch-to-zoom (touch): two fingers zoom the DOCUMENT through the same
  // anchor-aware applyZoom the wheel uses — not the browser chrome (#app has
  // touch-action that disables native pinch there). The pinch MIDPOINT Y is the
  // zoom anchor, so the point between the fingers stays put. applyZoom calls are
  // throttled to one per frame to avoid relayout/paint thrash.
  const pinchPts = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let pinchZoom = 1;
  let pinchRaf: number | null = null;
  let pinchNext: { scale: number; midY: number } | null = null;
  const pinchPair = (): [{ x: number; y: number }, { x: number; y: number }] | null => {
    if (pinchPts.size !== 2) return null;
    const it = pinchPts.values();
    return [it.next().value!, it.next().value!];
  };
  const flushPinch = (): void => {
    pinchRaf = null;
    if (!pinchNext) return;
    applyZoom(pinchZoom * pinchNext.scale, pinchNext.midY);
    pinchNext = null;
  };
  const onPinchDown = (ev: PointerEvent): void => {
    if (ev.pointerType === "mouse") return;
    pinchPts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const pair = pinchPair();
    if (pair) {
      pinchDist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
      pinchZoom = paint.getZoom();
    }
  };
  const onPinchMove = (ev: PointerEvent): void => {
    if (!pinchPts.has(ev.pointerId)) return;
    pinchPts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const pair = pinchPair();
    if (!pair || pinchDist === 0) return;
    ev.preventDefault();
    const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
    pinchNext = { scale: dist / pinchDist, midY: (pair[0].y + pair[1].y) / 2 };
    if (pinchRaf === null) pinchRaf = requestAnimationFrame(flushPinch);
  };
  const onPinchUp = (ev: PointerEvent): void => {
    if (!pinchPts.delete(ev.pointerId)) return;
    if (pinchPts.size < 2) pinchDist = 0; // a finger lifted: end this pinch
  };
  container.addEventListener("pointerdown", onPinchDown);
  container.addEventListener("pointermove", onPinchMove, { passive: false });
  container.addEventListener("pointerup", onPinchUp);
  container.addEventListener("pointercancel", onPinchUp);

  // Live style context for child documents — read off the CURRENT doc each call
  // so children reflect edits (e.g. a redefined style) the moment they re-render.
  const getStyleContext = (): StyleContext => {
    const ctx: StyleContext = { section: doc.section };
    if (doc.stylesheet) ctx.stylesheet = doc.stylesheet;
    if (doc.lists) ctx.lists = doc.lists;
    if (doc.sdts) ctx.sdts = doc.sdts;
    if (doc.fields) ctx.fields = doc.fields;
    ctx.defaultStyleId = doc.stylesheet?.defaultStyleId;
    // Proxy over this document's media/relationships: the session store is shared,
    // so a child resolves the parent's images and registers new ones back into it.
    ctx.media = { resolve: (id) => mediaUrl(id), register: (bytes, mime) => registerMediaBytes(bytes, mime) };
    return ctx;
  };

  return {
    focus(): void {
      proxy.focus();
    },
    getDocument(): Document {
      return doc;
    },
    getSelection(): DocSelection | null {
      return selection;
    },
    getCellSelection(): CellSelection | null {
      return cellSelection;
    },
    getTableSelection(): TableSelection | null {
      return tableSelection;
    },
    setTableSelection(next: TableSelection | null): void {
      setSemanticTableSelection(next);
    },
    setSelection(sel: DocSelection | null): void {
      setSelection(sel);
    },
    getLayoutTree(): LayoutTree {
      return tree;
    },
    getStyleContext,
    createChild: (): ChildDocument =>
      createChildDocument({
        getStyleContext,
        makeEditor: createEditor,
        ...(options.theme ? { theme: options.theme } : {}),
        ...(options.behavior ? { behavior: options.behavior } : {}),
      }),
    getSelectedObject(): string | null {
      return selectedObject;
    },
    selectObject,
    getChangeLog(): Change[] {
      return recorder.changes();
    },
    getChangeHead(): number {
      return recorder.head();
    },
    applyRemoteOps,
    setPeerPresence,
    removePeer,
    isReadonly: (): boolean => mode === "view",
    getMode: (): EditMode => mode,
    setMode,
    getReview: (): ReviewLayer => review,
    seedReview,
    openCommentThread,
    // The effective roster: configured base + live editors (presence-merged).
    getKnownUsers: (): UserInfo[] => mentionableUsers(),
    setKnownUsers: (users: UserInfo[]): void => { knownUsers = users; },
    acceptSuggestion: (id: string): void => commitResolution(acceptSuggestion(doc, review, id)),
    rejectSuggestion: (id: string): void => commitResolution(rejectSuggestion(doc, review, id)),
    acceptAllSuggestions: (): void => commitResolution(acceptAllSuggestions(doc, review)),
    rejectAllSuggestions: (): void => commitResolution(rejectAllSuggestions(doc, review)),
    addComment,
    startComment,
    replyToComment,
    editComment,
    deleteComment,
    resolveThread,
    canReviewAction,
    setReviewAccess: (access?: ReviewAccess): void => {
      reviewAccess = access;
      updateCommentAffordance();
      notifyReviewChanged();
    },
    applyRemoteReviewOp,
    dispatch,
    canExecuteTableAction(action: TableAction): boolean {
      return mode !== "view" && canExecuteTableActionForState(state(), action);
    },
    toggleStyle,
    setCharStyle(patch: Partial<CharStyle>): void {
      if (selection && !isCollapsed(selection)) {
        dispatch(setCharStyleCmd(patch));
        return;
      }
      if (!selection) return;
      pendingStyle = { ...(pendingStyle ?? {}), ...patch }; // applies to next typed text
      mirror.announce("formatting set for next text");
      notifyChange(); // keep the ribbon's font/size controls in sync
    },
    currentFormat(): CurrentFormat {
      const focus = selection?.focus;
      const block = focus ? blockById(doc, focus.blockId) : undefined;
      const char = block && focus ? styleAtRuns(block.runs, focus.offset) : undefined;
      const effective = { ...(char ?? {}), ...(pendingStyle ?? {}) };
      const list = block?.style.list;
      let listKind: CurrentFormat["listKind"] = null;
      if (list) {
        const def = doc.lists?.[list.listId];
        const level = def?.levels[Math.min(list.level, def.levels.length - 1)];
        if (level) listKind = level.format === "bullet" ? "bullet" : "number";
      }
      return {
        styleId: block?.style.namedStyle ?? (block ? "Normal" : null),
        fontFamily: effective.fontFamily ?? null,
        fontSizePx: effective.fontSizePx ?? null,
        lineHeight: block?.style.lineHeight ?? null,
        bold: effective.bold === true,
        italic: effective.italic === true,
        underline: effective.underline === true,
        strikethrough: effective.strikethrough === true,
        highlight: effective.highlightColor !== undefined && effective.highlightColor !== null,
        superscript: effective.verticalAlign === "super",
        subscript: effective.verticalAlign === "sub",
        caps: effective.caps === true,
        smallCaps: effective.smallCaps === true,
        doubleStrikethrough: effective.doubleStrikethrough === true,
        underlineStyle: effective.underlineStyle ?? null,
        underlineColor: effective.underlineColor ?? null,
        positionPx: effective.positionPx ?? null,
        widthScalePct: effective.widthScalePct ?? null,
        letterSpacingPx: effective.letterSpacingPx ?? null,
        kerningMinPx: effective.kerningMinPx ?? null,
        emphasisMark: effective.emphasisMark ?? null,
        outline: effective.outline === true,
        shadow: effective.shadow === true,
        emboss: effective.emboss === true,
        imprint: effective.imprint === true,
        fitTextPx: effective.fitTextPx ?? null,
        align: block?.style.align ?? null,
        direction: block?.style.direction ?? null,
        listKind,
        imageSelected: selectedIsImage(),
        inTable: !!cellSelection || (focus ? locateParagraph(doc, focus.blockId)?.kind === "cell" : false),
        // A selected image inside a control counts too (its caret is cleared), so
        // the Controls ribbon group lights up instead of leaving the user no clue.
        inContentControl: selectedObject
          ? objectSdtChain(selectedObject).length > 0
          : focus
            ? sdtAtPosition(doc, focus) !== null
            : false,
      };
    },
    currentParaStyle(): ParaStyle | null {
      const focus = selection?.focus;
      if (!focus) return null;
      const loc = locateParagraph(doc, focus.blockId);
      return loc ? paragraphAt(doc, loc).style : null;
    },
    align(align: ParaStyle["align"]): void {
      if (selectedObject) {
        if (align === "justify") return; // objects don't justify
        if (selectedIsImage()) dispatch(setImageProps(selectedObject, { align }));
        else dispatch(setEquationAlignCmd(selectedObject, align)); // display equation
        return;
      }
      dispatch(setAlignment(align));
    },
    inspectContentControl: inspectSdtAtCaret,
    activeContentControlId: activeSdtId,
    recalculateToc,
    /** Drop all cached layout and re-lay-out + repaint. Call after a FontFace the
     *  document depends on finishes loading post-mount (e.g. the lazily-loaded CJK
     *  fallback), so widths re-measure against the now-available face instead of the
     *  browser's interim system substitute. */
    refreshFonts(): void {
      engine.reset();
      relayout();
      // Re-measure every geometry-dependent overlay against the new layout (mirror
      // afterMutation's overlay pass), so review pins, search highlights, peer
      // carets, and the object frame don't keep stale positions until the next edit.
      // No model change occurred, so DON'T call notifyChange() (it fires onChange)
      // and DON'T chase the caret into view (the load mustn't scroll the viewport).
      refreshSelectionVisuals();
      refreshObjectFrame();
      if (searchQuery) {
        runSearch();
        paintSearch();
      }
      paintRemoteCarets();
      refreshReviewDecorations();
      mirror.sync(state());
    },
    setZoom: (z: number): void => applyZoom(z),
    getZoom: () => paint.getZoom(),
    setShowGrid: (show: boolean): void => paint.setShowGrid(show),
    getShowGrid: () => paint.getShowGrid(),
    setDebugOverlay: (kind: string, on: boolean): void => paint.setDebugOverlay(kind, on),
    setSnapToGrid: (snap: boolean): void => paint.setSnapToGrid(snap),
    getSnapToGrid: () => paint.getSnapToGrid(),
    setGridSpacing: (px: number): void => paint.setGridSpacing(px),
    getGridSpacing: () => paint.getGridSpacing(),
    setShowFormattingMarks: (show: boolean): void => paint.setShowFormattingMarks(show),
    getShowFormattingMarks: () => paint.getShowFormattingMarks(),
    armFormatPainter,
    cancelFormatPainter,
    copy: (): void => {
      // extractFragment runs synchronously inside copySelection, so the
      // clipboard write captures the selection before any later edit.
      void copySelection();
    },
    cut: (): void => {
      void copySelection();
      dispatch(deleteBackward());
    },
    paste: (): void => {
      void pasteFromClipboard();
    },
    revealBlock: (blockId: string): void => {
      if (!blockById(doc, blockId)) return;
      setSelection({ anchor: { blockId, offset: 0 }, focus: { blockId, offset: 0 } });
      const rect = caretRect(tree, { blockId, offset: 0 });
      if (rect) paint.ensureVisible(rect, "center");
    },
    revealBookmark: (name: string): void => {
      const range = doc.bookmarks?.[name];
      if (!range || !blockById(doc, range.start.blockId)) return;
      const rect = caretRect(tree, range.start, scope());
      if (!rect) return; // anchored in hidden/unplaced content — nothing to show
      setSelection({ anchor: range.start, focus: range.end });
      paint.ensureVisible(rect, "center");
    },
    revealReview: revealReviewAnchor,
    selectAll: (): void => {
      const paras = doc.blocks.filter((b): b is import("@kindy/shared").Paragraph => b.kind === "paragraph");
      const first = paras[0];
      const last = paras[paras.length - 1];
      if (!first || !last) return;
      setSelection({
        anchor: { blockId: first.id, offset: 0 },
        focus: { blockId: last.id, offset: textOfRuns(last.runs).length },
      });
      proxy.focus();
    },
    getLayoutInfo: (): { pageCount: number; currentPage: number } => {
      const pageCount = tree.pages.length;
      let currentPage = 1;
      if (selection) {
        const r = caretRect(tree, selection.focus, scope());
        if (r) currentPage = r.pageIndex + 1;
      }
      return { pageCount, currentPage };
    },
    getSelectedObjectRect: (): { left: number; top: number; width: number; height: number } | null => {
      // Only images get the floating image toolbar; an equation still shows its
      // selection frame (driven by objectRect directly, not this method).
      if (!selectedIsImage()) return null;
      const r = objectRect(tree, selectedObject!);
      if (!r) return null;
      const ph = paint.getPageElement(r.pageIndex);
      if (!ph) return null;
      const z = paint.getZoom();
      const pr = ph.getBoundingClientRect();
      return { left: pr.left + r.x * z, top: pr.top + r.y * z, width: r.width * z, height: r.height * z };
    },
    deleteSelectedObject: deleteSelectedObjectInternal,
    editBand: (band: "header" | "footer", pageIndex?: number): void => {
      const pi = pageIndex ?? (selection ? (caretRect(tree, selection.focus, scope())?.pageIndex ?? 0) : 0);
      setStory({ band, pageIndex: pi });
    },
    closeBand: (): void => setStory(null),
    getActiveStory: (): GeoScope | null => activeStory,
    setInspectorHighlight: (target: InspectorTarget | null): void => {
      paint.setInspectorRects(target ? inspectorRectsFor(target) : null);
    },
    revealInspectorTarget: (target: InspectorTarget): void => {
      revealInspector(target);
    },
    setInspectorActive: (active: boolean): void => {
      if (active === inspectorActive) return;
      inspectorActive = active;
      if (!active) {
        lastInspectorHover = null;
        paint.setInspectorRects(null);
      }
    },
    setInspectorProbe: (active: boolean): void => {
      if (active === probeActive) return;
      probeActive = active;
      if (!active) { lastProbeKey = ""; options.onInspectorProbe?.(null); }
    },
    search,
    searchNav,
    searchReplaceCurrent,
    searchReplaceAll,
    searchClear,
    undo,
    redo,
    destroy(): void {
      cancelFormatPainter();
      searchClear();
      closeContextMenu();
      sdtInspector?.close();
      tableProps?.close();
      container.removeEventListener("keydown", keymapHandler);
      container.removeEventListener("keydown", onCropKeyCapture, true);
      container.removeEventListener("contextmenu", onContextMenu);
      container.removeEventListener("mousemove", onSdtHoverMove);
      container.removeEventListener("mouseleave", onSdtHoverLeave);
      container.removeEventListener("scroll", onTableViewportMove);
      if (vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
      if (pinchRaf !== null) cancelAnimationFrame(pinchRaf);
      container.removeEventListener("pointerdown", onPinchDown);
      container.removeEventListener("pointermove", onPinchMove);
      container.removeEventListener("pointerup", onPinchUp);
      container.removeEventListener("pointercancel", onPinchUp);
      container.removeEventListener("pointerdown", onReviewPinPointerDown, true);
      comments.destroy();
      controller.destroy();
      objectFrame.destroy();
      tableQuickActions.destroy();
      mirror.destroy();
      proxy.destroy();
      paint.destroy();
    },
  };
}

export { resolveMessages, defaultMessages, en, vi } from "./i18n";
export type {
  EditorMessages,
  FontDialogMessages,
  ParagraphDialogMessages,
  PageLayoutMessages,
  TablePropertiesMessages,
  StyleManagerMessages,
  TocPropertiesMessages,
  SymbolPickerMessages,
} from "./i18n";
