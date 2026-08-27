import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyOp, buildTableGrid, validateTableGrid, type Paragraph, type TableBlock } from "@kindy/shared";
import {
  canExecuteTableAction,
  deleteTableColumnCmd,
  deleteTableCmd,
  deleteTableRowCmd,
  insertTableColumnCmd,
  insertTableRowCmd,
} from "../../editor/commands";
import type { Command, EditorState } from "../../editor/state";
import { runImport } from "./pipeline";

const importedTableState = (): { state: EditorState; table: TableBlock } => {
  const bytes = new Uint8Array(readFileSync(new URL("./__fixtures__/real-word-basic.docx", import.meta.url)));
  const doc = runImport(bytes).doc;
  const table = doc.blocks.find((block): block is TableBlock => block.kind === "table");
  if (!table) throw new Error("fixture must contain a table");
  const paragraph = table.rows[0]?.cells[0]?.blocks.find((block): block is Paragraph => block.kind === "paragraph");
  if (!paragraph) throw new Error("fixture table must contain an editable paragraph");
  return {
    table,
    state: {
      doc,
      selection: {
        anchor: { blockId: paragraph.id, offset: 0 },
        focus: { blockId: paragraph.id, offset: 0 },
      },
      cellSelection: null,
      tableSelection: null,
    },
  };
};

const apply = (state: EditorState, command: Command): EditorState => {
  const transaction = command(state);
  if (!transaction) throw new Error("table command produced no transaction");
  let doc = state.doc;
  for (const op of transaction.ops) doc = applyOp(doc, op).doc;
  return { ...state, doc, selection: transaction.selection };
};

const firstTable = (state: EditorState): TableBlock | undefined =>
  state.doc.blocks.find((block): block is TableBlock => block.kind === "table");

describe("DOCX imported table structural editing", () => {
  it("produces a valid editable grid", () => {
    const { table } = importedTableState();
    expect(validateTableGrid(table)).toMatchObject({ valid: true, rows: 2, cols: 2, issues: [] });
  });

  it("enables and executes row and column insertion/deletion from a caret", () => {
    const { state } = importedTableState();
    for (const action of ["insertRowAbove", "insertRowBelow", "insertColumnLeft", "insertColumnRight", "deleteRow", "deleteColumn"] as const) {
      expect(canExecuteTableAction(state, action), action).toBe(true);
    }

    const rowInserted = apply(state, insertTableRowCmd("below"));
    expect(firstTable(rowInserted)?.rows).toHaveLength(3);
    expect(validateTableGrid(firstTable(rowInserted)!)).toMatchObject({ valid: true, rows: 3, cols: 2 });

    const columnInserted = apply(state, insertTableColumnCmd("right"));
    expect(buildTableGrid(firstTable(columnInserted)!).cols).toBe(3);
    expect(validateTableGrid(firstTable(columnInserted)!)).toMatchObject({ valid: true, rows: 2, cols: 3 });

    const rowDeleted = apply(state, deleteTableRowCmd());
    expect(firstTable(rowDeleted)?.rows).toHaveLength(1);

    const columnDeleted = apply(state, deleteTableColumnCmd());
    expect(buildTableGrid(firstTable(columnDeleted)!).cols).toBe(1);
  });

  it("deletes the imported table from a caret", () => {
    const { state } = importedTableState();
    expect(canExecuteTableAction(state, "deleteTable")).toBe(true);
    const deleted = apply(state, deleteTableCmd());
    expect(firstTable(deleted)).toBeUndefined();
  });
});
