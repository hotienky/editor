import { describe, expect, it } from "vitest";
import type { Document, SectionProps, TableBlock, TableCell } from "@kindy/shared";
import { canExecuteTableAction } from "./commands";
import type { EditorState, TablePath } from "./state";
import { findTablePathById, resolveTablePath, tableTargetResolver } from "./tableTargetResolver";

const SECTION: SectionProps = {
  pageWidthPx: 816,
  pageHeightPx: 1056,
  marginPx: { top: 96, right: 96, bottom: 96, left: 96 },
};
let id = 0;
const cell = (text: string, blocks?: TableCell["blocks"]): TableCell => ({
  id: `c${id++}`,
  blocks: blocks ?? [{ kind: "paragraph", id: `p${id++}`, revision: 0, runs: [{ text, style: {} as never }], style: {} as never }],
});
const grid = (tableId: string, rows = 2, cols = 2): TableBlock => ({
  kind: "table",
  id: tableId,
  revision: 0,
  rows: Array.from({ length: rows }, () => ({ cells: Array.from({ length: cols }, () => cell("x")) })),
});

describe("TableTargetResolver", () => {
  it("builds and verifies a stable nested table path", () => {
    const nested = grid("nested", 1, 1);
    const hostCell = cell("", [nested]);
    const outer: TableBlock = { kind: "table", id: "outer", revision: 0, rows: [{ cells: [hostCell] }] };
    const doc: Document = { section: SECTION, blocks: [outer] };

    const found = findTablePathById(doc, "nested");
    expect(found?.path).toEqual({
      story: { kind: "body" },
      ancestors: [{ tableId: "outer", cellId: hostCell.id }],
      tableId: "nested",
    });
    expect(resolveTablePath(doc, found!.path)?.table.id).toBe("nested");
    const stale: TablePath = { ...found!.path, ancestors: [{ tableId: "outer", cellId: "removed-cell" }] };
    expect(resolveTablePath(doc, stale)).toBeNull();
  });

  it("resolves semantic row selection without consulting a stale text caret", () => {
    const table = grid("t", 3, 2);
    const path: TablePath = { story: { kind: "body" }, ancestors: [], tableId: "t" };
    const state: EditorState = {
      doc: { section: SECTION, blocks: [table] },
      selection: null,
      tableSelection: { kind: "row", table: path, from: 1, to: 2 },
    };
    const target = tableTargetResolver.resolve(state);
    expect(target?.rect).toEqual({ r0: 1, c0: 0, r1: 2, c1: 1 });
    expect(canExecuteTableAction(state, "deleteRow")).toBe(true);
    expect(canExecuteTableAction(state, "mergeCells")).toBe(true);
  });

  it("resolves a paragraph inside a nested table but disables unsafe id-only structural ops", () => {
    const nested = grid("nested", 1, 1);
    const paragraph = nested.rows[0]!.cells[0]!.blocks[0]!;
    const outer: TableBlock = { kind: "table", id: "outer", revision: 0, rows: [{ cells: [cell("", [nested])] }] };
    const state: EditorState = {
      doc: { section: SECTION, blocks: [outer] },
      selection: { anchor: { blockId: paragraph.id, offset: 0 }, focus: { blockId: paragraph.id, offset: 0 } },
    };
    const target = tableTargetResolver.resolve(state);
    expect(target?.table.id).toBe("nested");
    expect(target?.structuralOpsSupported).toBe(false);
    expect(canExecuteTableAction(state, "deleteColumn")).toBe(false);
  });
});
