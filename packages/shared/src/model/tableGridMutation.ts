import type { TableBlock, TableCell, TableRow } from "./document";
import { buildTableGrid, cellsInRect, mergeRows, normalizeRect, unmergeRows } from "./tableGrid";
import type { GridRect } from "./tableGrid";
import { gridColumnCount } from "./ops";

export type TableGridIssueCode =
  | "EMPTY_TABLE"
  | "EMPTY_GRID"
  | "INVALID_SPAN"
  | "ROWSPAN_OVERFLOW"
  | "COLUMN_OVERFLOW"
  | "OVERLAP"
  | "HOLE"
  | "DUPLICATE_CELL_ID"
  | "COLUMN_COUNT_MISMATCH";

export interface TableGridIssue {
  code: TableGridIssueCode;
  message: string;
  row?: number;
  col?: number;
  cellId?: string;
}

export interface TableGridValidation {
  valid: boolean;
  rows: number;
  cols: number;
  issues: TableGridIssue[];
}

/** Legacy DOCX imports can contain a structurally sound cell grid whose width
 * metadata is stale, or ragged rows with uncovered (empty) slots. Both shapes
 * are losslessly repairable before an edit: width metadata can be regenerated
 * and uncovered slots can become empty cells. Overlap/overflow/bad spans are
 * deliberately NOT repairable because guessing there could move or drop user
 * content. */
export function isRepairableTableGrid(validation: TableGridValidation): boolean {
  return validation.issues.length > 0 && validation.issues.every((issue) =>
    issue.code === "COLUMN_COUNT_MISMATCH" || issue.code === "HOLE",
  );
}

/** Strict table validator used at every structural-mutation boundary. Unlike
 * buildTableGrid (which is deliberately tolerant for rendering imported data),
 * this reports clipped spans, overlap and holes instead of silently painting
 * over them. */
export function validateTableGrid(table: TableBlock): TableGridValidation {
  const issues: TableGridIssue[] = [];
  const rows = table.rows.length;
  if (rows === 0) {
    issues.push({ code: "EMPTY_TABLE", message: "A table must contain at least one row." });
    return { valid: false, rows: 0, cols: 0, issues };
  }

  const structuralCols = gridColumnCount(table);
  const declaredCols = table.colFractions?.length;
  const cols = declaredCols && declaredCols > 0 ? declaredCols : structuralCols;
  if (cols <= 0) {
    issues.push({ code: "EMPTY_GRID", message: "A table must contain at least one grid column." });
    return { valid: false, rows, cols: 0, issues };
  }
  if (declaredCols && structuralCols !== declaredCols) {
    issues.push({
      code: "COLUMN_COUNT_MISMATCH",
      message: `The physical grid has ${structuralCols} columns but colFractions declares ${declaredCols}.`,
    });
  }

  const occupied: (TableCell | undefined)[][] = Array.from({ length: rows }, () =>
    new Array<TableCell | undefined>(cols).fill(undefined),
  );
  const ids = new Set<string>();
  for (let ri = 0; ri < rows; ri++) {
    let col = 0;
    for (const cell of table.rows[ri]!.cells) {
      if (ids.has(cell.id)) {
        issues.push({ code: "DUPLICATE_CELL_ID", message: `Duplicate table cell id: ${cell.id}.`, row: ri, cellId: cell.id });
      }
      ids.add(cell.id);
      const rawColSpan = cell.colSpan ?? 1;
      const rawRowSpan = cell.rowSpan ?? 1;
      if (!Number.isInteger(rawColSpan) || !Number.isInteger(rawRowSpan) || rawColSpan < 1 || rawRowSpan < 1) {
        issues.push({ code: "INVALID_SPAN", message: "Cell spans must be positive integers.", row: ri, cellId: cell.id });
      }
      const colSpan = Math.max(1, Math.trunc(rawColSpan));
      const rowSpan = Math.max(1, Math.trunc(rawRowSpan));
      while (col < cols && occupied[ri]![col]) col++;
      if (col + colSpan > cols) {
        issues.push({ code: "COLUMN_OVERFLOW", message: "Cell extends beyond the table grid.", row: ri, col, cellId: cell.id });
      }
      if (ri + rowSpan > rows) {
        issues.push({ code: "ROWSPAN_OVERFLOW", message: "Cell extends beyond the final row.", row: ri, col, cellId: cell.id });
      }
      for (let r = ri; r < Math.min(rows, ri + rowSpan); r++) {
        for (let c = col; c < Math.min(cols, col + colSpan); c++) {
          if (occupied[r]![c]) {
            issues.push({ code: "OVERLAP", message: "Two cells occupy the same grid slot.", row: r, col: c, cellId: cell.id });
          } else {
            occupied[r]![c] = cell;
          }
        }
      }
      col += colSpan;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!occupied[r]![c]) issues.push({ code: "HOLE", message: "Table grid contains an uncovered slot.", row: r, col: c });
    }
  }
  return { valid: issues.length === 0, rows, cols, issues };
}

export class TableGridMutationError extends Error {
  constructor(
    message: string,
    readonly validation?: TableGridValidation,
  ) {
    super(message);
    this.name = "TableGridMutationError";
  }
}

export interface TableGridMutationResult {
  rows: TableRow[];
  colFractions?: number[];
}

export interface TableCellFactory {
  (row: number, col: number, prototype: TableCell | undefined): TableCell;
}

interface OwnerRect {
  cell: TableCell;
  r0: number;
  c0: number;
  rowSpan: number;
  colSpan: number;
}

function requireValid(table: TableBlock): void {
  const validation = validateTableGrid(table);
  if (!validation.valid) throw new TableGridMutationError("Cannot mutate a malformed table grid.", validation);
}

function ownersOf(table: TableBlock): OwnerRect[] {
  const grid = buildTableGrid(table);
  const owners: OwnerRect[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const slot = grid.slots[r]![c];
      if (!slot || slot.originRow !== r || slot.originCol !== c) continue;
      owners.push({ cell: slot.cell, r0: r, c0: c, rowSpan: slot.rowSpan, colSpan: slot.colSpan });
    }
  }
  return owners;
}

function withSpans(cell: TableCell, rowSpan: number, colSpan: number): TableCell {
  const { rowSpan: _oldRowSpan, colSpan: _oldColSpan, ...base } = cell;
  return {
    ...base,
    ...(rowSpan > 1 ? { rowSpan } : {}),
    ...(colSpan > 1 ? { colSpan } : {}),
  };
}

function rebuild(
  table: TableBlock,
  rowCount: number,
  colCount: number,
  owners: OwnerRect[],
  rowProps: Array<TableRow["props"]>,
  colFractions: number[] | undefined,
): TableGridMutationResult {
  const rows: TableRow[] = Array.from({ length: rowCount }, (_, r) => ({
    cells: owners
      .filter((owner) => owner.r0 === r)
      .sort((a, b) => a.c0 - b.c0)
      .map((owner) => withSpans(owner.cell, owner.rowSpan, owner.colSpan)),
    ...(rowProps[r] ? { props: structuredClone(rowProps[r]) } : {}),
  }));
  const { colFractions: _previousFractions, ...tableWithoutFractions } = table;
  const candidate: TableBlock = {
    ...tableWithoutFractions,
    rows,
    ...(colFractions ? { colFractions } : {}),
  };
  const validation = validateTableGrid(candidate);
  if (!validation.valid || validation.cols !== colCount) {
    throw new TableGridMutationError("Table mutation produced an invalid grid.", validation);
  }
  return colFractions ? { rows, colFractions } : { rows };
}

function occupancy(rows: number, cols: number, owners: OwnerRect[]): boolean[][] {
  const used = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
  for (const owner of owners) {
    for (let r = owner.r0; r < owner.r0 + owner.rowSpan; r++) {
      for (let c = owner.c0; c < owner.c0 + owner.colSpan; c++) used[r]![c] = true;
    }
  }
  return used;
}

function sourceCell(table: TableBlock, row: number, col: number): TableCell | undefined {
  const grid = buildTableGrid(table);
  const r = Math.max(0, Math.min(grid.rows - 1, row));
  const c = Math.max(0, Math.min(grid.cols - 1, col));
  return grid.slots[r]?.[c]?.cell;
}

function normalizedFractions(table: TableBlock): number[] | undefined {
  if (!table.colFractions) return undefined;
  const cols = gridColumnCount(table);
  if (table.colFractions.length === cols) return table.colFractions.slice();
  return Array.from({ length: cols }, () => 1 / cols);
}

function normalizeFractionSum(values: number[]): number[] {
  const sum = values.reduce((total, value) => total + value, 0);
  return sum > 0 ? values.map((value) => value / sum) : values.map(() => 1 / values.length);
}

/** Losslessly normalize a legacy/ragged table so structural commands can act on
 * it. Existing cells, spans, row properties and formatting are preserved; only
 * genuinely uncovered slots receive cells from `createCell`. */
export function repairTableGrid(
  table: TableBlock,
  createCell: TableCellFactory,
): TableBlock {
  const validation = validateTableGrid(table);
  if (validation.valid) return table;
  if (!isRepairableTableGrid(validation)) {
    throw new TableGridMutationError("Cannot safely repair this table grid.", validation);
  }

  const cols = Math.max(1, gridColumnCount(table), table.colFractions?.length ?? 0);
  const occupied: (TableCell | undefined)[][] = Array.from({ length: table.rows.length }, () =>
    new Array<TableCell | undefined>(cols).fill(undefined),
  );
  const placed: Array<Array<{ col: number; cell: TableCell }>> = Array.from(
    { length: table.rows.length },
    () => [],
  );

  for (let row = 0; row < table.rows.length; row++) {
    let col = 0;
    for (const cell of table.rows[row]!.cells) {
      while (col < cols && occupied[row]![col]) col++;
      const colSpan = Math.max(1, cell.colSpan ?? 1);
      const rowSpan = Math.max(1, cell.rowSpan ?? 1);
      placed[row]!.push({ col, cell });
      for (let r = row; r < Math.min(table.rows.length, row + rowSpan); r++) {
        for (let c = col; c < Math.min(cols, col + colSpan); c++) occupied[r]![c] = cell;
      }
      col += colSpan;
    }
  }

  const prototypeAt = (row: number, col: number): TableCell | undefined => {
    for (let distance = 1; distance < cols; distance++) {
      const left = occupied[row]?.[col - distance];
      if (left) return left;
      const right = occupied[row]?.[col + distance];
      if (right) return right;
    }
    return occupied[row - 1]?.[col] ?? occupied[row + 1]?.[col];
  };

  for (let row = 0; row < table.rows.length; row++) {
    for (let col = 0; col < cols; col++) {
      if (occupied[row]![col]) continue;
      const cell = createCell(row, col, prototypeAt(row, col));
      placed[row]!.push({ col, cell });
      occupied[row]![col] = cell;
    }
  }

  const rows: TableRow[] = placed.map((cells, row) => ({
    cells: cells.sort((a, b) => a.col - b.col).map((entry) => entry.cell),
    ...(table.rows[row]!.props ? { props: structuredClone(table.rows[row]!.props) } : {}),
  }));
  const colFractions = table.colFractions?.length === cols
    ? normalizeFractionSum(table.colFractions.slice())
    : Array.from({ length: cols }, () => 1 / cols);
  const repaired: TableBlock = { ...table, rows, colFractions };
  const repairedValidation = validateTableGrid(repaired);
  if (!repairedValidation.valid) {
    throw new TableGridMutationError("Table grid repair did not produce a valid grid.", repairedValidation);
  }
  return repaired;
}

/** Span-aware structural mutations. Every method validates both input and output;
 * callers never receive a partially corrupted table. */
export class TableGridMutationService {
  insertRows(table: TableBlock, rowIndex: number, count: number, createCell: TableCellFactory): TableGridMutationResult {
    requireValid(table);
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > table.rows.length || count < 1) {
      throw new TableGridMutationError("Invalid row insertion range.");
    }
    const cols = gridColumnCount(table);
    const owners = ownersOf(table).map((owner) => {
      if (owner.r0 < rowIndex && rowIndex < owner.r0 + owner.rowSpan) return { ...owner, rowSpan: owner.rowSpan + count };
      return owner.r0 >= rowIndex ? { ...owner, r0: owner.r0 + count } : owner;
    });
    const rowCount = table.rows.length + count;
    const used = occupancy(rowCount, cols, owners);
    for (let r = rowIndex; r < rowIndex + count; r++) {
      for (let c = 0; c < cols; c++) {
        if (used[r]![c]) continue;
        owners.push({ cell: createCell(r, c, sourceCell(table, rowIndex === table.rows.length ? rowIndex - 1 : rowIndex, c)), r0: r, c0: c, rowSpan: 1, colSpan: 1 });
        used[r]![c] = true;
      }
    }
    const protoProps = table.rows[Math.min(Math.max(0, rowIndex), table.rows.length - 1)]?.props;
    const rowProps = table.rows.map((row) => row.props);
    rowProps.splice(rowIndex, 0, ...Array.from({ length: count }, () => protoProps));
    return rebuild(table, rowCount, cols, owners, rowProps, normalizedFractions(table));
  }

  deleteRows(table: TableBlock, from: number, to: number): TableGridMutationResult {
    requireValid(table);
    const r0 = Math.max(0, Math.min(from, to));
    const r1 = Math.min(table.rows.length - 1, Math.max(from, to));
    if (r0 > r1 || r1 - r0 + 1 >= table.rows.length) throw new TableGridMutationError("Row deletion would remove the entire table.");
    const count = r1 - r0 + 1;
    const mapRow = (row: number): number => row < r0 ? row : row - count;
    const owners: OwnerRect[] = [];
    for (const owner of ownersOf(table)) {
      const surviving = Array.from({ length: owner.rowSpan }, (_, offset) => owner.r0 + offset)
        .filter((row) => row < r0 || row > r1);
      if (surviving.length === 0) continue;
      owners.push({ ...owner, r0: mapRow(surviving[0]!), rowSpan: surviving.length });
    }
    const rowProps = table.rows.filter((_row, index) => index < r0 || index > r1).map((row) => row.props);
    return rebuild(table, table.rows.length - count, gridColumnCount(table), owners, rowProps, normalizedFractions(table));
  }

  insertColumns(table: TableBlock, colIndex: number, count: number, createCell: TableCellFactory): TableGridMutationResult {
    requireValid(table);
    const oldCols = gridColumnCount(table);
    if (!Number.isInteger(colIndex) || colIndex < 0 || colIndex > oldCols || count < 1) {
      throw new TableGridMutationError("Invalid column insertion range.");
    }
    const owners = ownersOf(table).map((owner) => {
      if (owner.c0 < colIndex && colIndex < owner.c0 + owner.colSpan) return { ...owner, colSpan: owner.colSpan + count };
      return owner.c0 >= colIndex ? { ...owner, c0: owner.c0 + count } : owner;
    });
    const cols = oldCols + count;
    const used = occupancy(table.rows.length, cols, owners);
    for (let r = 0; r < table.rows.length; r++) {
      for (let c = colIndex; c < colIndex + count; c++) {
        if (used[r]![c]) continue;
        owners.push({ cell: createCell(r, c, sourceCell(table, r, colIndex === oldCols ? oldCols - 1 : colIndex)), r0: r, c0: c, rowSpan: 1, colSpan: 1 });
        used[r]![c] = true;
      }
    }
    const fractions = normalizedFractions(table);
    if (fractions) {
      const proto = fractions[Math.min(Math.max(0, colIndex), fractions.length - 1)] ?? 1 / oldCols;
      fractions.splice(colIndex, 0, ...Array.from({ length: count }, () => proto));
    }
    return rebuild(table, table.rows.length, cols, owners, table.rows.map((row) => row.props), fractions ? normalizeFractionSum(fractions) : undefined);
  }

  deleteColumns(table: TableBlock, from: number, to: number): TableGridMutationResult {
    requireValid(table);
    const oldCols = gridColumnCount(table);
    const c0 = Math.max(0, Math.min(from, to));
    const c1 = Math.min(oldCols - 1, Math.max(from, to));
    if (c0 > c1 || c1 - c0 + 1 >= oldCols) throw new TableGridMutationError("Column deletion would remove the entire table.");
    const count = c1 - c0 + 1;
    const mapCol = (col: number): number => col < c0 ? col : col - count;
    const owners: OwnerRect[] = [];
    for (const owner of ownersOf(table)) {
      const surviving = Array.from({ length: owner.colSpan }, (_, offset) => owner.c0 + offset)
        .filter((col) => col < c0 || col > c1);
      if (surviving.length === 0) continue;
      owners.push({ ...owner, c0: mapCol(surviving[0]!), colSpan: surviving.length });
    }
    const fractions = normalizedFractions(table);
    if (fractions) fractions.splice(c0, count);
    return rebuild(table, table.rows.length, oldCols - count, owners, table.rows.map((row) => row.props), fractions ? normalizeFractionSum(fractions) : undefined);
  }

  merge(table: TableBlock, rect: GridRect, mergeCells: (cells: TableCell[]) => TableCell): TableGridMutationResult {
    requireValid(table);
    const grid = buildTableGrid(table);
    const normalized = normalizeRect(grid, rect);
    if (normalized.r0 === normalized.r1 && normalized.c0 === normalized.c1) throw new TableGridMutationError("A single cell cannot be merged.");
    const merged = mergeCells(cellsInRect(grid, normalized).map((slot) => slot.cell));
    const rows = mergeRows(grid, normalized, withSpans(merged, normalized.r1 - normalized.r0 + 1, normalized.c1 - normalized.c0 + 1));
    return rebuild(table, table.rows.length, grid.cols, ownersOf({ ...table, rows }), table.rows.map((row) => row.props), normalizedFractions(table));
  }

  unmerge(table: TableBlock, row: number, col: number, createCell: TableCellFactory): TableGridMutationResult {
    requireValid(table);
    const grid = buildTableGrid(table);
    const slot = grid.slots[row]?.[col];
    if (!slot || (slot.rowSpan <= 1 && slot.colSpan <= 1)) throw new TableGridMutationError("The selected cell is not merged.");
    const topLeft = withSpans(slot.cell, 1, 1);
    const rows = unmergeRows(grid, slot.originRow, slot.originCol, topLeft, () => createCell(slot.originRow, slot.originCol, slot.cell));
    return rebuild(table, table.rows.length, grid.cols, ownersOf({ ...table, rows }), table.rows.map((source) => source.props), normalizedFractions(table));
  }
}

export const tableGridMutations = new TableGridMutationService();
