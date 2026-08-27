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
.ked-table-quick{position:fixed;z-index:1250;display:none;align-items:center;gap:2px;
  height:34px;padding:3px;background:#fff;border:1px solid #c7d2e3;border-radius:9px;
  box-shadow:0 4px 14px rgba(31,41,55,.18);font:12px Arial,sans-serif;user-select:none;}
.ked-table-quick.ked-open{display:flex;}
.ked-table-quick button{height:28px;min-width:30px;padding:0 8px;border:0;border-radius:6px;
  background:transparent;color:#314158;display:inline-flex;align-items:center;justify-content:center;
  gap:5px;cursor:pointer;white-space:nowrap;}
.ked-table-quick button:hover,.ked-table-quick button:focus-visible{background:#e8f0fe;color:#0b57d0;outline:none;}
.ked-table-quick button+button{border-left:1px solid #e2e7ef;border-top-left-radius:0;border-bottom-left-radius:0;}
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
  const hide = (): void => {
    cancelHide();
    current = null;
    currentKey = "";
    root.classList.remove("ked-open");
  };
  const scheduleHide = (): void => {
    cancelHide();
    hideTimer = window.setTimeout(hide, 140);
  };

  root.addEventListener("mouseenter", cancelHide);
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
    // Prefer the cell's top-right corner. If that would sit under the ribbon or
    // outside the viewport, flip inside/below and clamp. Controls are screen-size
    // UI and must never inherit the document zoom.
    const width = root.offsetWidth || 142;
    const height = root.offsetHeight || 34;
    let left = anchor.right - width;
    let top = anchor.top - height - 6;
    if (top < 8) top = anchor.top + 6;
    if (left < 8) left = anchor.left + 6;
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
      const key = `${target.tableId}:${target.row}:${target.col}`;
      current = target;
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
