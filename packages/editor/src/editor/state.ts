// Layer 5: editor core. One-way data flow:
// input -> command -> transaction -> applyOp* -> new EditorState -> layout -> paint (rAF).

import type { BandContainer, CharStyle, Document } from "@kindy/shared";
import type { DocSelection } from "@kindy/shared";
import type { Op } from "@kindy/shared";

/** A rectangular block of table cells selected by dragging across them, in GRID
 *  coordinates (span-aware; see shared/tableGrid). Drives merge and the Borders &
 *  Shading editor. Distinct from the text `selection` — only one is active at a
 *  time. Body tables only for now. */
export interface CellSelection {
  tableId: string;
  /** Stable structural path. Optional while v3 clients migrate from tableId-only
   * selections; TableTargetResolver fills it on read. */
  tablePath?: TablePath;
  anchor: { row: number; col: number };
  focus: { row: number; col: number };
}

export type TableStoryPath = { kind: "body" } | { kind: "band"; band: BandContainer };

/** A table is addressed by story plus its ancestor table/cell chain. IDs keep
 * the path stable when rows or columns are inserted before the target. */
export interface TablePath {
  story: TableStoryPath;
  ancestors: Array<{ tableId: string; cellId: string }>;
  tableId: string;
}

export interface TableGridPoint { row: number; col: number }

/** Semantic table selection. This sits beside the text selection during the
 * migration, so text editing remains backward compatible while row/column/table
 * actions stop guessing intent from a stale caret. */
export type TableSelection =
  | { kind: "cell"; table: TablePath; anchor: TableGridPoint; focus: TableGridPoint }
  | { kind: "row"; table: TablePath; from: number; to: number }
  | { kind: "column"; table: TablePath; from: number; to: number }
  | { kind: "table"; table: TablePath };

/** Editing mode: full editing, suggestion/track-changes, or read-only view. */
export type EditMode = "edit" | "suggest" | "view";

export interface EditorState {
  doc: Document;
  selection: DocSelection | null;
  /** Active rectangular table-cell selection, if any (suppresses text selection). */
  cellSelection?: CellSelection | null;
  /** Semantic replacement for cellSelection. Both are accepted in v3; new UI
   * surfaces should write this field. */
  tableSelection?: TableSelection | null;
  /** Style toggled at a collapsed caret — applied to the NEXT typed text and
   *  dropped when the caret moves (Word behavior). */
  pendingStyle?: Partial<CharStyle> | null;
}

export type TransactionOrigin =
  | "typing" // coalesces into one undo step
  | "command"
  | "paste"
  | "transient" // IME composition preview — bypasses the undo stack
  | "undo"
  | "redo";

export interface Transaction {
  ops: Op[];
  selectionAfter: DocSelection | null;
  origin: TransactionOrigin;
  /** Optional semantic command name (e.g. insertText, mergeCells, acceptReview).
   * Operation consumers must still support its absence for older commands. */
  intent?: string;
}

/** Commands are pure (state) -> Transaction | null. Keymap entries and toolbar
 *  buttons share this single code path, so editing is testable headless. */
export type Command = (state: EditorState) => Transaction | null;
