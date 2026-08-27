import { injectCssOnce } from "./styles";

export interface TableQuickActionTarget {
  tableId: string;
  row: number;
  col: number;
}

export interface TableQuickActionAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
  tableLeft: number;
  tableRight: number;
}

export interface TableQuickActionsOptions {
  labels: {
    insertRow: string;
    insertColumn: string;
    more: string;
  };
  icons: {
    insertRow: string;
    insertColumn: string;
  };
  onInsertRow(target: TableQuickActionTarget): void;
  onInsertColumn(target: TableQuickActionTarget): void;
  onMore(target: TableQuickActionTarget, anchor: DOMRect): void;
}

export interface TableQuickActionsHandle {
  show(target: TableQuickActionTarget, anchor: TableQuickActionAnchor): void;
  scheduleHide(): void;
  hide(): void;
  destroy(): void;
}

const CSS = `
.ked-table-quick{position:fixed;z-index:1250;display:none;flex-direction:column;align-items:center;gap:2px;
  width:36px;padding:3px;background:#fff;border:1px solid #c7d2e3;border-radius:9px;
  box-shadow:0 4px 14px rgba(31,41,55,.18);font:12px Arial,sans-serif;user-select:none;}
.ked-table-quick.ked-open{display:flex;}
.ked-table-quick button{width:30px;height:28px;min-width:30px;padding:0;border:0;border-radius:6px;
  background:transparent;color:#314158;display:inline-flex;align-items:center;justify-content:center;
  gap:5px;cursor:pointer;white-space:nowrap;}
.ked-table-quick button:hover,.ked-table-quick button:focus-visible{background:#e8f0fe;color:#0b57d0;outline:none;}
.ked-table-quick button+button{border-top:1px solid #e2e7ef;border-top-left-radius:0;border-top-right-radius:0;}
.ked-table-quick svg{width:16px;height:16px;display:block;}
.ked-table-quick .ked-table-more{font-size:18px;line-height:1;padding:0 7px;}
`;

/**
 * Screen-space toolbar for a canvas table cell. It deliberately stays a DOM
 * overlay: controls remain readable/clickable at every document zoom while the
 * table itself continues to be rendered exclusively by CanvasEngine.
 */
export function createTableQuickActions(options: TableQuickActionsOptions): TableQuickActionsHandle {
  injectCssOnce("ked-table-quick-styles", CSS);
  const root = document.createElement("div");
  root.className = "ked-table-quick";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", options.labels.more);

  let current: TableQuickActionTarget | null = null;
  let currentKey = "";
  let hideTimer: number | null = null;
  let targetTimer: number | null = null;

  const button = (label: string, icon: string, className = ""): HTMLButtonElement => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.title = label;
    el.setAttribute("aria-label", label);
    if (icon) el.innerHTML = icon;
    return el;
  };

  const row = button(options.labels.insertRow, options.icons.insertRow);
  const col = button(options.labels.insertColumn, options.icons.insertColumn);
  const more = button(options.labels.more, "", "ked-table-more");
  more.textContent = "⋯";
  root.append(row, col, more);
  document.body.appendChild(root);

  const cancelHide = (): void => {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = null;
  };
  const cancelTargetUpdate = (): void => {
    if (targetTimer !== null) window.clearTimeout(targetTimer);
    targetTimer = null;
  };
  const hide = (): void => {
    cancelHide();
    cancelTargetUpdate();
    current = null;
    currentKey = "";
    root.classList.remove("ked-open");
  };
  const scheduleHide = (): void => {
    cancelHide();
    hideTimer = window.setTimeout(hide, 140);
  };

  root.addEventListener("mouseenter", () => {
    cancelHide();
    // Crossing the row horizontally toward this rail may pass through other
    // columns. Keep the cell originally hovered instead of retargeting the
    // column action to whichever cell happened to be crossed last.
    cancelTargetUpdate();
  });
  root.addEventListener("mouseleave", scheduleHide);
  // Do not move the editor caret before the action's click fires.
  root.addEventListener("mousedown", (event) => event.preventDefault());
  row.addEventListener("click", () => current && options.onInsertRow(current));
  col.addEventListener("click", () => current && options.onInsertColumn(current));
  more.addEventListener("click", () => {
    if (!current) return;
    options.onMore(current, root.getBoundingClientRect());
  });

  const place = (anchor: TableQuickActionAnchor): void => {
    // Keep the toolbar beside the table and vertically centred on the hovered
    // row. Reaching it is a horizontal move, so the pointer cannot cross a
    // neighbouring row; a vertical rail also avoids covering narrow row content.
    const width = root.offsetWidth || 42;
    const height = root.offsetHeight || 94;
    const cellHeight = Math.max(0, anchor.bottom - anchor.top);
    const roomLeft = anchor.tableLeft - width - 8;
    const roomRight = window.innerWidth - anchor.tableRight - width - 8;
    let left = roomLeft >= 8 || roomLeft >= roomRight
      ? anchor.tableLeft - width - 6
      : anchor.tableRight + 6;
    // The first (row) action's centre sits on the hovered row centre. Users can
    // travel horizontally into the rail; once inside, moving down to column / …
    // stays over the rail and cannot re-hit another canvas row.
    let top = anchor.top + cellHeight / 2 - 17;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
  };

  const onResize = (): void => hide();
  window.addEventListener("resize", onResize);

  return {
    show(target, anchor): void {
      cancelHide();
      // Row actions stay in one screen position while the user moves across the
      // cells of that row. `current` still tracks the latest column so column
      // insertion uses the cell actually hovered, without visual jitter.
      const key = `${target.tableId}:${target.row}`;
      if (current && key === currentKey && target.col !== current.col) {
        // A deliberate hover over another column eventually retargets, while a
        // quick pass toward the rail remains locked to the original column.
        cancelTargetUpdate();
        targetTimer = window.setTimeout(() => {
          current = target;
          targetTimer = null;
        }, 180);
      } else {
        cancelTargetUpdate();
        current = target;
      }
      root.classList.add("ked-open");
      if (key !== currentKey) {
        currentKey = key;
        place(anchor);
      }
    },
    scheduleHide,
    hide,
    destroy(): void {
      hide();
      window.removeEventListener("resize", onResize);
      root.remove();
    },
  };
}
