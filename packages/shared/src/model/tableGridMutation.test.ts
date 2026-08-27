import { describe, expect, it } from "vitest";
import type { Paragraph, TableBlock, TableCell } from "./document";
import { buildTableGrid } from "./tableGrid";
import { isRepairableTableGrid, repairTableGrid, TableGridMutationService, validateTableGrid } from "./tableGridMutation";

let nextId = 0;
const cell = (text: string, spans: { rowSpan?: number; colSpan?: number } = {}): TableCell => ({
  id: `c${nextId++}`,
  blocks: [{ kind: "paragraph", id: `p${nextId++}`, revision: 0, runs: [{ text, style: {} as never }], style: {} as never }],
  ...spans,
});
const table = (rows: TableCell[][], fractions?: number[]): TableBlock => ({
  kind: "table",
  id: "t",
  revision: 0,
  rows: rows.map((cells) => ({ cells })),
  ...(fractions ? { colFractions: fractions } : {}),
});
const empty = (_row: number, _col: number, proto?: TableCell): TableCell => cell(`new:${text(proto)}`);
const text = (value?: TableCell): string => value
  ? ((value.blocks.find((block): block is Paragraph => block.kind === "paragraph")?.runs[0]?.text) ?? "")
  : "";

describe("validateTableGrid", () => {
  it("reports holes and row-span overflow instead of silently clipping", () => {
    const malformed = table([[cell("a", { rowSpan: 3 }), cell("b")], [cell("c")]]);
    const result = validateTableGrid(malformed);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("ROWSPAN_OVERFLOW");
  });

  it("accepts a row fully continued from a vertical merge", () => {
    expect(validateTableGrid(table([[cell("a", { rowSpan: 2 })], []])).valid).toBe(true);
  });

  it("repairs legacy DOCX width metadata and ragged empty slots without losing cells", () => {
    const source = table([[cell("a"), cell("b")], [cell("c")]], [0.2, 0.3, 0.5]);
    const before = validateTableGrid(source);
    expect(before.valid).toBe(false);
    expect(isRepairableTableGrid(before)).toBe(true);

    const repaired = repairTableGrid(source, empty);
    expect(validateTableGrid(repaired)).toMatchObject({ valid: true, rows: 2, cols: 3, issues: [] });
    expect(repaired.rows[0]!.cells.slice(0, 2).map(text)).toEqual(["a", "b"]);
    expect(repaired.rows[1]!.cells[0] && text(repaired.rows[1]!.cells[0])).toBe("c");
    expect(repaired.rows[0]!.cells).toHaveLength(3);
    expect(repaired.rows[1]!.cells).toHaveLength(3);
  });

  it("refuses to guess when spans overflow", () => {
    const source = table([[cell("a", { rowSpan: 3 }), cell("b")], [cell("c")]]);
    const validation = validateTableGrid(source);
    expect(isRepairableTableGrid(validation)).toBe(false);
    expect(() => repairTableGrid(source, empty)).toThrow(/Cannot safely repair/);
  });
});

describe("TableGridMutationService", () => {
  const service = new TableGridMutationService();

  it("inserts through a rowSpan without creating overlap", () => {
    const source = table([[cell("A", { rowSpan: 2 }), cell("B")], [cell("C")]], [0.5, 0.5]);
    const result = service.insertRows(source, 1, 1, empty);
    const output = { ...source, rows: result.rows, colFractions: result.colFractions };
    expect(validateTableGrid(output).valid).toBe(true);
    const grid = buildTableGrid(output);
    expect(grid.rows).toBe(3);
    expect(grid.slots[1]![0]!.cell.id).toBe(source.rows[0]!.cells[0]!.id);
    expect(grid.slots[1]![1]!.cell.id).not.toBe(source.rows[0]!.cells[1]!.id);
    expect(grid.slots[2]![1]!.cell.id).toBe(source.rows[1]!.cells[0]!.id);
  });

  it("deletes the owner row of a rowSpan and preserves its content in the surviving row", () => {
    const owner = cell("keep me", { rowSpan: 3 });
    const source = table([[owner, cell("r0")], [cell("r1")], [cell("r2")]]);
    const result = service.deleteRows(source, 0, 0);
    const output = { ...source, rows: result.rows };
    expect(validateTableGrid(output).valid).toBe(true);
    const grid = buildTableGrid(output);
    expect(grid.slots[0]![0]!.cell.id).toBe(owner.id);
    expect(text(grid.slots[0]![0]!.cell)).toBe("keep me");
    expect(grid.slots[0]![0]!.rowSpan).toBe(2);
  });

  it("deletes multiple selected columns and repairs a crossing colSpan", () => {
    const wide = cell("wide", { colSpan: 4 });
    const source = table([[wide], [cell("a"), cell("b"), cell("c"), cell("d")]], [0.1, 0.2, 0.3, 0.4]);
    const result = service.deleteColumns(source, 1, 2);
    const output = { ...source, rows: result.rows, colFractions: result.colFractions };
    expect(validateTableGrid(output).valid).toBe(true);
    expect(buildTableGrid(output).cols).toBe(2);
    expect(output.rows[0]!.cells[0]!.id).toBe(wide.id);
    expect(output.rows[0]!.cells[0]!.colSpan).toBe(2);
    expect(result.colFractions?.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("keeps one undo-sized structure result for merge and unmerge", () => {
    const source = table([[cell("a"), cell("b")], [cell("c"), cell("d")]]);
    const merged = service.merge(source, { r0: 0, c0: 0, r1: 1, c1: 1 }, (cells) => ({ ...cells[0]!, blocks: cells.flatMap((item) => item.blocks) }));
    const mergedTable = { ...source, rows: merged.rows };
    expect(validateTableGrid(mergedTable).valid).toBe(true);
    expect(mergedTable.rows[0]!.cells[0]).toMatchObject({ rowSpan: 2, colSpan: 2 });
    const split = service.unmerge(mergedTable, 0, 0, empty);
    expect(validateTableGrid({ ...source, rows: split.rows }).valid).toBe(true);
    expect(buildTableGrid({ ...source, rows: split.rows }).slots.flat().filter(Boolean)).toHaveLength(4);
  });

  it("preserves invariants through a deterministic mixed-operation fuzz run", () => {
    let seed = 0x51f15e;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const apply = (source: TableBlock, result: { rows: TableBlock["rows"]; colFractions?: number[] }): TableBlock => {
      const { colFractions: _old, ...withoutFractions } = source;
      return { ...withoutFractions, rows: result.rows, ...(result.colFractions ? { colFractions: result.colFractions } : {}) };
    };
    let current = table(Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => cell("seed"))), [0.25, 0.25, 0.25, 0.25]);

    for (let step = 0; step < 250; step++) {
      const grid = buildTableGrid(current);
      const op = Math.floor(random() * 6);
      if (op === 0 && grid.rows < 10) {
        current = apply(current, service.insertRows(current, Math.floor(random() * (grid.rows + 1)), 1, empty));
      } else if (op === 1 && grid.rows > 1) {
        const row = Math.floor(random() * grid.rows);
        current = apply(current, service.deleteRows(current, row, row));
      } else if (op === 2 && grid.cols < 10) {
        current = apply(current, service.insertColumns(current, Math.floor(random() * (grid.cols + 1)), 1, empty));
      } else if (op === 3 && grid.cols > 1) {
        const col = Math.floor(random() * grid.cols);
        current = apply(current, service.deleteColumns(current, col, col));
      } else if (op === 4 && grid.rows * grid.cols > 1) {
        const r0 = Math.floor(random() * grid.rows);
        const c0 = Math.floor(random() * grid.cols);
        const r1 = Math.min(grid.rows - 1, r0 + (random() > 0.5 ? 1 : 0));
        const c1 = Math.min(grid.cols - 1, c0 + (random() > 0.5 ? 1 : 0));
        if (r0 !== r1 || c0 !== c1) {
          current = apply(current, service.merge(current, { r0, c0, r1, c1 }, (cells) => ({ ...cells[0]!, blocks: cells.flatMap((item) => item.blocks) })));
        }
      } else {
        const merged = buildTableGrid(current).slots.flat().find((slot) => slot && (slot.rowSpan > 1 || slot.colSpan > 1));
        if (merged) current = apply(current, service.unmerge(current, merged.originRow, merged.originCol, empty));
      }
      const validation = validateTableGrid(current);
      expect(validation.issues, `step ${step}`).toEqual([]);
    }
  });
});
