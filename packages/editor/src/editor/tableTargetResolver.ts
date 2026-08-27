import type { Block, Container, Document, Paragraph, TableBlock, TableCell, TableGrid, TableRow } from "@kindy/shared";
import { BAND_CONTAINERS, buildTableGrid, containerBlocks, gridOriginOfCell, normalizeRect } from "@kindy/shared";
import type { GridRect } from "@kindy/shared";
import type { EditorState, TablePath, TableSelection, TableStoryPath } from "./state";

export interface ResolvedTablePath {
  path: TablePath;
  table: TableBlock;
  where: Container;
  /** Index of the outermost table in its body/header/footer story. */
  topLevelIndex: number;
  /** Parent tables, outermost first. Empty for a top-level table. */
  parents: Array<{ table: TableBlock; cell: TableCell; row: TableRow }>;
}

export interface TableTarget extends ResolvedTablePath {
  grid: TableGrid;
  selection: TableSelection;
  rect: GridRect;
  active: { row: number; col: number };
  /** Existing shared ops address top-level tables by id. Nested targets resolve
   * correctly, but structural commands remain disabled until path-based ops land. */
  structuralOpsSupported: boolean;
}

const storyOf = (where: Container): TableStoryPath => where === "body" ? { kind: "body" } : { kind: "band", band: where };
const containerOfStory = (story: TableStoryPath): Container => story.kind === "body" ? "body" : story.band;

function samePath(a: TablePath, b: TablePath): boolean {
  if (a.tableId !== b.tableId || containerOfStory(a.story) !== containerOfStory(b.story) || a.ancestors.length !== b.ancestors.length) return false;
  return a.ancestors.every((part, index) => part.tableId === b.ancestors[index]?.tableId && part.cellId === b.ancestors[index]?.cellId);
}

function findInBlocks(
  blocks: Block[],
  where: Container,
  predicate: (table: TableBlock) => boolean,
  ancestors: TablePath["ancestors"] = [],
  parents: ResolvedTablePath["parents"] = [],
  topLevelIndex = -1,
): ResolvedTablePath | null {
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]!;
    if (block.kind !== "table") continue;
    const rootIndex = topLevelIndex >= 0 ? topLevelIndex : bi;
    const path: TablePath = { story: storyOf(where), ancestors: ancestors.slice(), tableId: block.id };
    if (predicate(block)) return { path, table: block, where, topLevelIndex: rootIndex, parents: parents.slice() };
    for (const row of block.rows) {
      for (const cell of row.cells) {
        const nested = findInBlocks(
          cell.blocks,
          where,
          predicate,
          [...ancestors, { tableId: block.id, cellId: cell.id }],
          [...parents, { table: block, cell, row }],
          rootIndex,
        );
        if (nested) return nested;
      }
    }
  }
  return null;
}

export function findTablePathById(doc: Document, tableId: string): ResolvedTablePath | null {
  for (const where of ["body", ...BAND_CONTAINERS] as Container[]) {
    const found = findInBlocks(containerBlocks(doc, where), where, (table) => table.id === tableId);
    if (found) return found;
  }
  return null;
}

export function resolveTablePath(doc: Document, path: TablePath): ResolvedTablePath | null {
  const where = containerOfStory(path.story);
  const found = findInBlocks(containerBlocks(doc, where), where, (table) => table.id === path.tableId);
  return found && samePath(found.path, path) ? found : null;
}

interface ParagraphInTable extends ResolvedTablePath {
  paragraph: Paragraph;
  cell: TableCell;
  physicalRow: number;
  physicalCol: number;
}

function findParagraphInBlocks(
  blocks: Block[],
  where: Container,
  paragraphId: string,
  ancestors: TablePath["ancestors"] = [],
  parents: ResolvedTablePath["parents"] = [],
  topLevelIndex = -1,
): ParagraphInTable | null {
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi]!;
    if (block.kind !== "table") continue;
    const rootIndex = topLevelIndex >= 0 ? topLevelIndex : bi;
    const path: TablePath = { story: storyOf(where), ancestors: ancestors.slice(), tableId: block.id };
    for (let ri = 0; ri < block.rows.length; ri++) {
      const row = block.rows[ri]!;
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci]!;
        const direct = cell.blocks.find((child): child is Paragraph => child.kind === "paragraph" && child.id === paragraphId);
        if (direct) {
          return { path, table: block, where, topLevelIndex: rootIndex, parents: parents.slice(), paragraph: direct, cell, physicalRow: ri, physicalCol: ci };
        }
        const nested = findParagraphInBlocks(
          cell.blocks,
          where,
          paragraphId,
          [...ancestors, { tableId: block.id, cellId: cell.id }],
          [...parents, { table: block, cell, row }],
          rootIndex,
        );
        if (nested) return nested;
      }
    }
  }
  return null;
}

function paragraphTarget(doc: Document, paragraphId: string): { resolved: ParagraphInTable; row: number; col: number } | null {
  for (const where of ["body", ...BAND_CONTAINERS] as Container[]) {
    const resolved = findParagraphInBlocks(containerBlocks(doc, where), where, paragraphId);
    if (!resolved) continue;
    const grid = buildTableGrid(resolved.table);
    const origin = gridOriginOfCell(grid, resolved.physicalRow, resolved.physicalCol);
    if (origin) return { resolved, ...origin };
  }
  return null;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max - 1, value));
}

function selectionRect(selection: TableSelection, grid: TableGrid): { rect: GridRect; active: { row: number; col: number } } {
  switch (selection.kind) {
    case "cell": {
      const active = { row: clamp(selection.focus.row, grid.rows), col: clamp(selection.focus.col, grid.cols) };
      return {
        rect: normalizeRect(grid, { r0: selection.anchor.row, c0: selection.anchor.col, r1: selection.focus.row, c1: selection.focus.col }),
        active,
      };
    }
    case "row": {
      const from = clamp(Math.min(selection.from, selection.to), grid.rows);
      const to = clamp(Math.max(selection.from, selection.to), grid.rows);
      return { rect: { r0: from, c0: 0, r1: to, c1: grid.cols - 1 }, active: { row: to, col: 0 } };
    }
    case "column": {
      const from = clamp(Math.min(selection.from, selection.to), grid.cols);
      const to = clamp(Math.max(selection.from, selection.to), grid.cols);
      return { rect: { r0: 0, c0: from, r1: grid.rows - 1, c1: to }, active: { row: 0, col: to } };
    }
    case "table":
      return { rect: { r0: 0, c0: 0, r1: grid.rows - 1, c1: grid.cols - 1 }, active: { row: 0, col: 0 } };
  }
}

/** Single entry point for every table command and UI enable predicate. */
export class TableTargetResolver {
  resolve(state: EditorState): TableTarget | null {
    let selection = state.tableSelection ?? null;
    let resolved: ResolvedTablePath | null = null;
    if (selection) resolved = resolveTablePath(state.doc, selection.table);
    if (!resolved && state.cellSelection) {
      resolved = state.cellSelection.tablePath
        ? resolveTablePath(state.doc, state.cellSelection.tablePath)
        : findTablePathById(state.doc, state.cellSelection.tableId);
      if (resolved) {
        selection = {
          kind: "cell",
          table: resolved.path,
          anchor: state.cellSelection.anchor,
          focus: state.cellSelection.focus,
        };
      }
    }
    if (!resolved && state.selection) {
      const paragraph = paragraphTarget(state.doc, state.selection.focus.blockId);
      if (paragraph) {
        resolved = paragraph.resolved;
        selection = { kind: "cell", table: resolved.path, anchor: { row: paragraph.row, col: paragraph.col }, focus: { row: paragraph.row, col: paragraph.col } };
      }
    }
    if (!resolved || !selection) return null;
    const grid = buildTableGrid(resolved.table);
    if (grid.rows === 0 || grid.cols === 0) return null;
    const { rect, active } = selectionRect(selection, grid);
    return { ...resolved, grid, selection, rect, active, structuralOpsSupported: resolved.parents.length === 0 };
  }
}

export const tableTargetResolver = new TableTargetResolver();
