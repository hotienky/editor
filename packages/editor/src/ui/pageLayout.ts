// Page Layout — the draggable, non-blocking dialog for a section's page setup:
// size & orientation, margins, newspaper columns, header/footer band distances,
// page color and page borders. Numeric inputs accept inches or centimetres (the
// model stays native px). A schematic scaled-page preview on the right reflects
// every control live; Apply turns the draft into applyPageSetup ops.
//
// Pattern mirrors fieldConstructor.ts: injectCssOnce + makeFloatingDialog, an
// AbortController for teardown, Escape-to-close, footer Cancel/Apply.

import type { Command } from "../editor/state";
import type {
  ColumnEntry,
  DocSelection,
  Document,
  LineNumbering,
  PageBorders,
  SectionBreakType,
  SectionGeometry,
} from "@kindy/shared";
import { applyPageSetup, pageSetupAt, setBandVariantEnabled } from "../editor/commands";
import { injectCssOnce } from "./styles";
import { makeFloatingDialog } from "./floatingDialog";
import { formatUnit, unitToPx, type LengthUnit } from "./units";
import type { DialogCommon, PageLayoutMessages } from "../i18n/types";
import { defaultMessages } from "../i18n";

/** The slice of the editor the dialog needs (the full Editor satisfies it). */
export interface PageLayoutEditor {
  getDocument(): Document;
  getSelection(): DocSelection | null;
  dispatch(cmd: Command): void;
  focus(): void;
}

export interface PageLayoutOptions {
  editor: PageLayoutEditor;
  onClose?: () => void;
  messages?: PageLayoutMessages;
  common?: DialogCommon;
}

export interface PageLayoutHandle {
  close(): void;
}

const SIZES: Record<string, { w: number; h: number }> = {
  Letter: { w: 816, h: 1056 }, // 8.5×11in @96dpi
  A4: { w: 794, h: 1123 },
  Legal: { w: 816, h: 1344 },
};
const MARGINS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
  Normal: { top: 96, right: 96, bottom: 96, left: 96 },
  Narrow: { top: 48, right: 48, bottom: 48, left: 48 },
  Wide: { top: 96, right: 144, bottom: 96, left: 144 },
};
const BORDER_STYLES = ["single", "double", "dashed", "dotted", "thick"] as const;

const CSS = `
.ked-pl-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(20,22,26,.30);}
.ked-pl-modal{position:fixed;width:min(640px,95vw);max-height:90vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;
  box-shadow:0 18px 56px rgba(0,0,0,.34);font:13px/1.5 Arial,sans-serif;color:#202124;overflow:hidden;}
.ked-pl-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e6e8eb;cursor:move;}
.ked-pl-head h2{margin:0;font-size:15px;font-weight:600;flex:1 1 auto;}
.ked-pl-unit{display:flex;gap:4px;align-items:center;font-size:11px;color:#80868b;}
.ked-pl-unit select{height:24px;border:1px solid #d0d4d9;border-radius:5px;font:12px Arial;}
.ked-pl-x{border:none;background:transparent;font-size:20px;line-height:1;color:#5f6368;cursor:pointer;width:28px;height:28px;border-radius:6px;}
.ked-pl-x:hover{background:#e8eaed;}
.ked-pl-body{display:flex;min-height:0;flex:1 1 auto;}
.ked-pl-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;}
.ked-pl-tabs{display:flex;gap:2px;padding:8px 12px 0;border-bottom:1px solid #e6e8eb;}
.ked-pl-tab{border:none;background:transparent;padding:7px 11px;font-size:12px;color:#5f6368;cursor:pointer;border-radius:6px 6px 0 0;border-bottom:2px solid transparent;}
.ked-pl-tab.active{color:#1a73e8;border-bottom-color:#1a73e8;font-weight:600;}
.ked-pl-pane{padding:14px 16px;overflow:auto;display:none;flex-direction:column;gap:12px;flex:1 1 auto;}
.ked-pl-pane.active{display:flex;}
.ked-pl-right{flex:0 0 200px;border-left:1px solid #e6e8eb;background:#fbfbfc;padding:14px 12px;display:flex;flex-direction:column;gap:8px;align-items:center;}
.ked-pl-prev-ttl{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#80868b;align-self:flex-start;}
.ked-pl-prev{border:1px solid #dadce0;border-radius:6px;background:#eef0f2;display:flex;align-items:center;justify-content:center;width:100%;height:240px;}
.ked-pl-field{display:flex;flex-direction:column;gap:4px;}
.ked-pl-field label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#80868b;}
.ked-pl-field input,.ked-pl-field select{height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0 8px;font:13px Arial,sans-serif;box-sizing:border-box;}
.ked-pl-row{display:flex;gap:8px;}.ked-pl-row>*{flex:1 1 0;min-width:0;}
.ked-pl-presets{display:flex;flex-wrap:wrap;gap:6px;}
.ked-pl-chip{border:1px solid #d0d4d9;border-radius:14px;background:#fff;cursor:pointer;font-size:11px;padding:3px 10px;color:#3c4043;}
.ked-pl-chip:hover{background:#f1f3f4;}
.ked-pl-check{display:flex;align-items:center;gap:7px;font-size:13px;color:#3c4043;cursor:pointer;}
.ked-pl-check input{width:16px;height:16px;}
.ked-pl-cols{display:flex;flex-direction:column;gap:6px;}
.ked-pl-foot{display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:1px solid #e6e8eb;}
.ked-pl-foot .spacer{flex:1 1 auto;}
.ked-pl-btn{height:30px;padding:0 14px;border:1px solid #d0d4d9;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#3c4043;}
.ked-pl-btn:hover{background:#f1f3f4;}
.ked-pl-btn.primary{border-color:#1a73e8;background:#1a73e8;color:#fff;}
.ked-pl-btn.primary:hover{background:#1864cc;}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const labelled = (label: string, control: HTMLElement): HTMLElement => {
  const wrap = el("div", "ked-pl-field");
  wrap.append(el("label", undefined, label), control);
  return wrap;
};

const option = (value: string, label: string): HTMLOptionElement => {
  const o = el("option");
  o.value = value;
  o.textContent = label;
  return o;
};

/** A numeric input bound to a px value, displayed in the active unit. */
interface NumField {
  field: HTMLElement;
  input: HTMLInputElement;
  getPx(): number;
  setPx(px: number): void;
  refreshUnit(): void;
}

export function showPageLayout(opts: PageLayoutOptions): PageLayoutHandle {
  injectCssOnce("ked-pl-styles", CSS);
  const { editor } = opts;
  const t = opts.messages ?? defaultMessages.pageLayout;
  const c = opts.common ?? defaultMessages.common;

  // ---- draft state (seeded from the caret's section) ------------------------
  const init = pageSetupAt({ doc: editor.getDocument(), selection: editor.getSelection() });
  let unit: LengthUnit = "in"; // toggled by header unit picker
  const draft = {
    pageWidthPx: init.pageWidthPx,
    pageHeightPx: init.pageHeightPx,
    margin: { ...init.marginPx },
    columns: init.columns ? { ...init.columns, ...(init.columns.cols ? { cols: init.columns.cols.map((c) => ({ ...c })) } : {}) } : null,
    pageNumberStart: init.pageNumberStart,
    headerDistancePx: init.headerDistancePx,
    footerDistancePx: init.footerDistancePx,
    pageColorHex: init.pageColorHex,
    pageBorders: init.pageBorders ? structuredCloneBorders(init.pageBorders) : null,
    breakType: init.breakType,
    lineNumbering: init.lineNumbering ? { ...init.lineNumbering } : null,
  };

  const numFields: NumField[] = [];
  const makeNum = (initialPx: number, onChange: (px: number) => void, min = 0): NumField => {
    let px = initialPx;
    const input = el("input");
    input.type = "number";
    input.step = "0.05";
    input.value = formatUnit(px, unit);
    const read = (): number => {
      const v = Number(input.value);
      return Number.isFinite(v) ? Math.max(min, unitToPx(v, unit)) : px;
    };
    input.addEventListener("input", () => {
      px = read();
      onChange(px);
      redrawPreview();
    });
    const nf: NumField = {
      field: labelled("", input),
      input,
      getPx: () => px,
      setPx: (p) => {
        px = p;
        input.value = formatUnit(p, unit);
      },
      refreshUnit: () => {
        input.value = formatUnit(px, unit);
      },
    };
    numFields.push(nf);
    return nf;
  };
  const relabel = (nf: NumField, label: string): HTMLElement => {
    (nf.field.querySelector("label") as HTMLLabelElement).textContent = label;
    return nf.field;
  };

  // ---- scaffold -------------------------------------------------------------
  const backdrop = el("div", "ked-pl-backdrop");
  backdrop.style.pointerEvents = "none";
  const modal = el("div", "ked-pl-modal");
  modal.style.pointerEvents = "auto";
  modal.addEventListener("mousedown", (e) => e.stopPropagation());

  const head = el("div", "ked-pl-head");
  const h2 = el("h2", undefined, t.title);
  const unitWrap = el("div", "ked-pl-unit");
  const unitSel = el("select");
  unitSel.append(option("in", t.labelInches), option("cm", t.labelCm));
  unitWrap.append(el("span", undefined, "Units"), unitSel);
  const xBtn = el("button", "ked-pl-x", "×");
  head.append(h2, unitWrap, xBtn);

  const bodyWrap = el("div", "ked-pl-body");
  const mainCol = el("div", "ked-pl-main");
  const tabsBar = el("div", "ked-pl-tabs");
  const right = el("div", "ked-pl-right");
  const prevTtl = el("div", "ked-pl-prev-ttl", "Preview");
  const prevHost = el("div", "ked-pl-prev");
  const prevCanvas = el("canvas");
  prevHost.append(prevCanvas);
  right.append(prevTtl, prevHost);

  // ---- panes ---------------------------------------------------------------
  const panes: Record<string, HTMLElement> = {};
  const tabs: Record<string, HTMLButtonElement> = {};
  const addTab = (id: string, label: string): HTMLElement => {
    const tBtn = el("button", "ked-pl-tab", label);
    tBtn.addEventListener("click", () => selectTab(id));
    tabsBar.append(tBtn);
    tabs[id] = tBtn;
    const pane = el("div", "ked-pl-pane");
    mainCol.append(pane);
    panes[id] = pane;
    return pane;
  };
  const selectTab = (id: string): void => {
    for (const k of Object.keys(panes)) {
      panes[k]!.classList.toggle("active", k === id);
      tabs[k]!.classList.toggle("active", k === id);
    }
  };

  // Page tab: size preset + orientation + custom W×H.
  const pagePane = addTab("page", t.sectionSize);
  const sizeSel = el("select");
  for (const k of Object.keys(SIZES)) sizeSel.append(option(k, k));
  sizeSel.append(option("Custom", t.customSize));
  const orientSel = el("select");
  orientSel.append(option("portrait", t.orientationPortrait), option("landscape", t.orientationLandscape));
  const widthNum = makeNum(draft.pageWidthPx, (px) => { draft.pageWidthPx = px; sizeSel.value = "Custom"; syncOrient(); });
  const heightNum = makeNum(draft.pageHeightPx, (px) => { draft.pageHeightPx = px; sizeSel.value = "Custom"; syncOrient(); });
  const syncOrient = (): void => { orientSel.value = draft.pageWidthPx > draft.pageHeightPx ? "landscape" : "portrait"; };
  sizeSel.addEventListener("change", () => {
    const s = SIZES[sizeSel.value];
    if (!s) return;
    const landscape = orientSel.value === "landscape";
    draft.pageWidthPx = landscape ? s.h : s.w;
    draft.pageHeightPx = landscape ? s.w : s.h;
    widthNum.setPx(draft.pageWidthPx);
    heightNum.setPx(draft.pageHeightPx);
    redrawPreview();
  });
  orientSel.addEventListener("change", () => {
    const landscape = orientSel.value === "landscape";
    if (landscape !== draft.pageWidthPx > draft.pageHeightPx) {
      [draft.pageWidthPx, draft.pageHeightPx] = [draft.pageHeightPx, draft.pageWidthPx];
      widthNum.setPx(draft.pageWidthPx);
      heightNum.setPx(draft.pageHeightPx);
      redrawPreview();
    }
  });
  pagePane.append(
    labelled(t.paperSize, sizeSel),
    labelled(t.orientation, orientSel),
    rowOf(relabel(widthNum, t.width), relabel(heightNum, t.height)),
  );

  // Margins tab.
  const marginsPane = addTab("margins", t.sectionMargins);
  const mTop = makeNum(draft.margin.top, (px) => { draft.margin.top = px; });
  const mBottom = makeNum(draft.margin.bottom, (px) => { draft.margin.bottom = px; });
  const mLeft = makeNum(draft.margin.left, (px) => { draft.margin.left = px; });
  const mRight = makeNum(draft.margin.right, (px) => { draft.margin.right = px; });
  const marginPresets = el("div", "ked-pl-presets");
  const marginPresetLabels: Record<string, string> = {
    Normal: t.marginNormal,
    Narrow: t.marginNarrow,
    Wide: t.marginWide,
  };
  for (const k of Object.keys(MARGINS)) {
    const chip = el("button", "ked-pl-chip", marginPresetLabels[k] ?? k);
    chip.type = "button";
    chip.addEventListener("click", () => {
      const m = MARGINS[k]!;
      draft.margin = { ...m };
      mTop.setPx(m.top); mBottom.setPx(m.bottom); mLeft.setPx(m.left); mRight.setPx(m.right);
      redrawPreview();
    });
    marginPresets.append(chip);
  }
  marginsPane.append(
    marginPresets,
    rowOf(relabel(mTop, t.marginTop), relabel(mBottom, t.marginBottom)),
    rowOf(relabel(mLeft, t.marginLeft), relabel(mRight, t.marginRight)),
  );

  // Columns tab.
  const columnsPane = addTab("columns", t.sectionColumns);
  const countInput = el("input");
  countInput.type = "number";
  countInput.min = "1";
  countInput.max = "6";
  countInput.value = String(draft.columns?.count ?? 1);
  const equalCheck = checkbox(t.columnCount);
  const sepCheck = checkbox(t.columnSeparatorLine);
  const gapHost = el("div");
  const colsHost = el("div", "ked-pl-cols");
  const rebuildColumns = (): void => {
    const count = Math.max(1, Math.min(6, Number(countInput.value) || 1));
    gapHost.replaceChildren();
    colsHost.replaceChildren();
    if (count <= 1) {
      draft.columns = null;
      return;
    }
    const equal = equalCheck.input.checked;
    if (equal) {
      const gap = draft.columns?.gapPx ?? 24;
      const gapNum = makeNum(gap, (px) => { if (draft.columns) draft.columns.gapPx = px; });
      gapHost.append(relabel(gapNum, t.columnSpacing));
      draft.columns = { count, gapPx: gap, sep: sepCheck.input.checked };
    } else {
      // Per-column widths: seed from current content width split evenly.
      const contentW = draft.pageWidthPx - draft.margin.left - draft.margin.right;
      const existing = draft.columns?.cols;
      const cols: ColumnEntry[] =
        existing && existing.length === count
          ? existing.map((c) => ({ ...c }))
          : Array.from({ length: count }, () => ({
              widthPx: Math.round((contentW - (count - 1) * 24) / count),
              spaceAfterPx: 24,
            }));
      draft.columns = { count, gapPx: 24, sep: sepCheck.input.checked, cols };
      cols.forEach((c, i) => {
        const wNum = makeNum(c.widthPx, (px) => { c.widthPx = px; });
        const sNum = makeNum(c.spaceAfterPx, (px) => { c.spaceAfterPx = px; });
        colsHost.append(
          i < count - 1
            ? rowOf(relabel(wNum, `${t.columnCount} ${i + 1} ${t.width}`), relabel(sNum, `${t.columnCount} ${i + 1} ${t.columnSpacing}`))
            : relabel(wNum, `${t.columnCount} ${i + 1} ${t.width}`),
        );
      });
    }
  };
  countInput.addEventListener("input", () => { rebuildColumns(); redrawPreview(); });
  equalCheck.input.addEventListener("change", () => { rebuildColumns(); redrawPreview(); });
  sepCheck.input.addEventListener("change", () => { if (draft.columns) draft.columns.sep = sepCheck.input.checked; redrawPreview(); });
  equalCheck.input.checked = !draft.columns?.cols;
  sepCheck.input.checked = !!draft.columns?.sep;
  columnsPane.append(labelled(t.columnCount, countInput), equalCheck.row, gapHost, colsHost, sepCheck.row);

  // Layout tab: header/footer distance + page-number restart + band variants.
  const layoutPane = addTab("layout", t.sectionHeaderFooter);
  const headerNum = makeNum(draft.headerDistancePx ?? 48, (px) => { draft.headerDistancePx = px; });
  const footerNum = makeNum(draft.footerDistancePx ?? 48, (px) => { draft.footerDistancePx = px; });
  const startInput = el("input");
  startInput.type = "number";
  startInput.min = "0";
  startInput.placeholder = "continue";
  startInput.value = draft.pageNumberStart === null ? "" : String(draft.pageNumberStart);
  startInput.addEventListener("input", () => {
    const textVal = startInput.value.trim();
    draft.pageNumberStart = textVal === "" ? null : Math.max(0, Number(textVal) || 0);
  });
  const sec = editor.getDocument().section;
  const firstCheck = checkbox("Different first page");
  const evenCheck = checkbox("Different odd & even pages");
  firstCheck.input.checked = sec.headerFirst !== undefined || sec.footerFirst !== undefined;
  evenCheck.input.checked = sec.headerEven !== undefined || sec.footerEven !== undefined;
  firstCheck.input.addEventListener("change", () => editor.dispatch(setBandVariantEnabled("first", firstCheck.input.checked)));
  evenCheck.input.addEventListener("change", () => editor.dispatch(setBandVariantEnabled("even", evenCheck.input.checked)));

  // Section start (w:sectPr/w:type) — forces this section's first page onto an
  // even/odd page number. The model represents nextPage (the default), evenPage
  // and oddPage; Word's "Continuous" is flowed inline by the importer and so has
  // no breakType to set here.
  const sectionStartSel = el("select");
  sectionStartSel.append(option("nextPage", t.sectionBreakNextPage), option("evenPage", t.sectionBreakEvenPage), option("oddPage", t.sectionBreakOddPage));
  sectionStartSel.value = draft.breakType ?? "nextPage";
  sectionStartSel.addEventListener("change", () => { draft.breakType = sectionStartSel.value as SectionBreakType; });

  // Line numbering (w:sectPr/w:lnNumType): an on/off toggle revealing count-by,
  // start-at, restart and the gap from the text edge.
  const lineNumCheck = checkbox(t.sectionLineNumbers);
  lineNumCheck.input.checked = draft.lineNumbering !== null;
  const lnCountBy = el("input");
  lnCountBy.type = "number";
  lnCountBy.min = "1";
  lnCountBy.value = String(draft.lineNumbering?.countBy ?? 1);
  const lnStart = el("input");
  lnStart.type = "number";
  lnStart.min = "0";
  lnStart.value = String(draft.lineNumbering?.start ?? 1);
  const lnRestartSel = el("select");
  lnRestartSel.append(option("newPage", t.lineNumberRestart), option("newSection", t.pageBorderApplySection), option("continuous", t.sectionBreakContinuous));
  lnRestartSel.value = draft.lineNumbering?.restart ?? "newPage";
  const lnDistance = makeNum(draft.lineNumbering?.distancePx ?? 0, () => syncLineNumbering(), 0);
  const lnDetail = el("div", "ked-pl-cols");
  lnDetail.append(
    rowOf(labelled(t.lineNumberStep, lnCountBy), labelled(t.lineNumberStart, lnStart)),
    rowOf(labelled("Restart", lnRestartSel), relabel(lnDistance, "Distance from text")),
  );
  const syncLineNumbering = (): void => {
    if (!lineNumCheck.input.checked) {
      draft.lineNumbering = null;
      lnDetail.style.display = "none";
      return;
    }
    lnDetail.style.display = "";
    const ln: LineNumbering = {};
    const countBy = Math.max(1, Math.floor(Number(lnCountBy.value) || 1));
    if (countBy !== 1) ln.countBy = countBy;
    const rawStart = Number(lnStart.value);
    const start = Number.isFinite(rawStart) ? Math.max(0, Math.floor(rawStart)) : 1;
    if (start !== 1) ln.start = start;
    const restart = lnRestartSel.value as NonNullable<LineNumbering["restart"]>;
    if (restart !== "newPage") ln.restart = restart;
    const dist = lnDistance.getPx();
    if (dist > 0) ln.distancePx = dist;
    draft.lineNumbering = ln;
  };
  lnDetail.style.display = lineNumCheck.input.checked ? "" : "none";
  lineNumCheck.input.addEventListener("change", syncLineNumbering);
  for (const item of [lnCountBy, lnStart]) item.addEventListener("input", syncLineNumbering);
  lnRestartSel.addEventListener("change", syncLineNumbering);

  layoutPane.append(
    rowOf(relabel(headerNum, t.headerDistance), relabel(footerNum, t.footerDistance)),
    labelled(t.lineNumberStart, startInput),
    labelled(t.sectionBreakType, sectionStartSel),
    firstCheck.row,
    evenCheck.row,
    lineNumCheck.row,
    lnDetail,
  );

  // Background tab: page color + page borders.
  const bgPane = addTab("background", t.sectionPageColor);
  const colorCheck = checkbox(t.pageColor);
  const colorInput = el("input");
  colorInput.type = "color";
  colorInput.value = draft.pageColorHex ?? "#ffffff";
  colorInput.style.cssText = "height:30px;width:60px;padding:2px;border:1px solid #d0d4d9;border-radius:6px;";
  colorCheck.input.checked = draft.pageColorHex !== null;
  const onColor = (): void => {
    draft.pageColorHex = colorCheck.input.checked ? colorInput.value : null;
    redrawPreview();
  };
  colorCheck.input.addEventListener("change", onColor);
  colorInput.addEventListener("input", onColor);

  const borderCheck = checkbox(t.pageBorder);
  const borderStyleSel = el("select");
  for (const s of BORDER_STYLES) borderStyleSel.append(option(s, s[0]!.toUpperCase() + s.slice(1)));
  const borderWidthNum = makeNum((draft.pageBorders?.top?.widthPx ?? 1), (_px) => updateBorders(), 0);
  const borderColorInput = el("input");
  borderColorInput.type = "color";
  borderColorInput.value = draft.pageBorders?.top?.color ?? "#000000";
  borderColorInput.style.cssText = "height:30px;width:60px;padding:2px;border:1px solid #d0d4d9;border-radius:6px;";
  const offsetSel = el("select");
  offsetSel.append(option("page", t.pageBorderApplyPage), option("text", t.pageBorderApplySection));
  offsetSel.value = draft.pageBorders?.offsetFrom ?? "page";
  borderCheck.input.checked = draft.pageBorders !== null;
  if (draft.pageBorders?.top) borderStyleSel.value = draft.pageBorders.top.style;
  const updateBorders = (): void => {
    if (!borderCheck.input.checked) {
      draft.pageBorders = null;
    } else {
      const edge = {
        style: borderStyleSel.value as NonNullable<PageBorders["top"]>["style"],
        widthPx: borderWidthNum.getPx(),
        color: borderColorInput.value,
      };
      draft.pageBorders = {
        offsetFrom: offsetSel.value as "page" | "text",
        top: { ...edge }, right: { ...edge }, bottom: { ...edge }, left: { ...edge },
      };
    }
    redrawPreview();
  };
  for (const item of [borderStyleSel, borderColorInput, offsetSel]) item.addEventListener("change", updateBorders);
  borderColorInput.addEventListener("input", updateBorders);
  borderCheck.input.addEventListener("change", updateBorders);
  bgPane.append(
    colorCheck.row,
    labelled(t.pageBorderColor, colorInput),
    borderCheck.row,
    rowOf(labelled(t.pageBorderStyle, borderStyleSel), relabel(borderWidthNum, t.pageBorderWidth)),
    rowOf(labelled(t.pageBorderColor, borderColorInput), labelled(t.pageBorderApply, offsetSel)),
  );

  // ---- preview --------------------------------------------------------------
  function redrawPreview(): void {
    const host = prevHost.getBoundingClientRect();
    const maxW = Math.max(40, host.width - 20);
    const maxH = Math.max(40, host.height - 20);
    const scale = Math.min(maxW / draft.pageWidthPx, maxH / draft.pageHeightPx);
    const pw = Math.round(draft.pageWidthPx * scale);
    const ph = Math.round(draft.pageHeightPx * scale);
    const dpr = window.devicePixelRatio || 1;
    prevCanvas.width = Math.round(pw * dpr);
    prevCanvas.height = Math.round(ph * dpr);
    prevCanvas.style.width = `${pw}px`;
    prevCanvas.style.height = `${ph}px`;
    const ctx = prevCanvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    const W = draft.pageWidthPx;
    const H = draft.pageHeightPx;
    // page fill
    ctx.fillStyle = draft.pageColorHex ?? "#ffffff";
    ctx.fillRect(0, 0, W, H);
    // page outline
    ctx.strokeStyle = "#9aa0a6";
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(0.5 / scale, 0.5 / scale, W - 1 / scale, H - 1 / scale);
    // page border (uniform box approximation)
    if (draft.pageBorders?.top) {
      const e = draft.pageBorders.top;
      const fromText = draft.pageBorders.offsetFrom === "text";
      const sp = e.spacePx ?? 24;
      const x0 = fromText ? draft.margin.left - sp : sp;
      const y0 = fromText ? draft.margin.top - sp : sp;
      const x1 = fromText ? W - draft.margin.right + sp : W - sp;
      const y1 = fromText ? H - draft.margin.bottom + sp : H - sp;
      ctx.strokeStyle = e.color === "auto" ? "#000000" : e.color;
      ctx.lineWidth = Math.max(1 / scale, e.widthPx);
      ctx.setLineDash(e.style === "dashed" ? [6, 4] : e.style === "dotted" ? [2, 3] : []);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.setLineDash([]);
    }
    // margin box
    const cx = draft.margin.left;
    const cy = draft.margin.top;
    const cw = W - draft.margin.left - draft.margin.right;
    const ch = H - draft.margin.top - draft.margin.bottom;
    ctx.strokeStyle = "#c6cdd6";
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([4 / scale, 3 / scale]);
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.setLineDash([]);
    // columns + separators
    const boxes = previewColBoxes(cx, cw);
    ctx.fillStyle = "rgba(26,115,232,0.06)";
    for (const b of boxes) ctx.fillRect(b.x, cy, b.width, ch);
    if (draft.columns?.sep && boxes.length > 1) {
      ctx.strokeStyle = "#c0c4c9";
      ctx.lineWidth = 1 / scale;
      for (let i = 0; i < boxes.length - 1; i++) {
        const sx = (boxes[i]!.x + boxes[i]!.width + boxes[i + 1]!.x) / 2;
        ctx.beginPath();
        ctx.moveTo(sx, cy);
        ctx.lineTo(sx, cy + ch);
        ctx.stroke();
      }
    }
  }
  const previewColBoxes = (cx: number, cw: number): { x: number; width: number }[] => {
    const c = draft.columns;
    if (!c || c.count <= 1) return [{ x: cx, width: cw }];
    if (c.cols && c.cols.length === c.count) {
      let x = cx;
      return c.cols.map((col, i) => {
        const b = { x, width: col.widthPx };
        x += col.widthPx + (i < c.count - 1 ? col.spaceAfterPx : 0);
        return b;
      });
    }
    const w = (cw - (c.count - 1) * c.gapPx) / c.count;
    return Array.from({ length: c.count }, (_, i) => ({ x: cx + i * (w + c.gapPx), width: w }));
  };

  // ---- unit toggle ----------------------------------------------------------
  unitSel.addEventListener("change", () => {
    unit = unitSel.value as LengthUnit;
    for (const nf of numFields) nf.refreshUnit();
  });

  // ---- footer ---------------------------------------------------------------
  const foot = el("div", "ked-pl-foot");
  const spacer = el("div", "spacer");
  const cancel = el("button", "ked-pl-btn", c.cancel);
  const apply = el("button", "ked-pl-btn primary", `${c.apply} (${t.pageBorderApplySection.toLowerCase()})`);
  foot.append(spacer, cancel, apply);

  bodyWrap.append(mainCol, right);
  mainCol.insertBefore(tabsBar, mainCol.firstChild);
  modal.append(head, bodyWrap, foot);
  backdrop.append(modal);
  document.body.append(backdrop);

  rebuildColumns();
  syncOrient();
  // size preset selection (else "Custom")
  sizeSel.value =
    Object.keys(SIZES).find((k) => {
      const s = SIZES[k]!;
      return (s.w === draft.pageWidthPx && s.h === draft.pageHeightPx) || (s.h === draft.pageWidthPx && s.w === draft.pageHeightPx);
    }) ?? "Custom";
  selectTab("page");
  requestAnimationFrame(redrawPreview);

  // ---- lifecycle ------------------------------------------------------------
  const ac = new AbortController();
  const handle: PageLayoutHandle = {
    close(): void {
      backdrop.remove();
      ac.abort();
      opts.onClose?.();
    },
  };
  window.addEventListener(
    "keydown",
    (ev: KeyboardEvent) => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); handle.close(); }
    },
    { capture: true, signal: ac.signal },
  );
  // Exclude the unit dropdown from drag — otherwise the header's mousedown
  // preventDefault swallows the native <select> open.
  makeFloatingDialog({ backdrop, modal, handle: head, signal: ac.signal, noDrag: ".ked-pl-x, .ked-pl-unit" });
  xBtn.addEventListener("click", () => handle.close());
  cancel.addEventListener("click", () => handle.close());
  apply.addEventListener("click", () => {
    editor.dispatch(applyPageSetup(buildGeometry()));
    handle.close();
    editor.focus();
  });

  function buildGeometry(): SectionGeometry {
    return {
      pageWidthPx: draft.pageWidthPx,
      pageHeightPx: draft.pageHeightPx,
      marginPx: { ...draft.margin },
      columns: draft.columns
        ? { ...draft.columns, ...(draft.columns.cols ? { cols: draft.columns.cols.map((c) => ({ ...c })) } : {}) }
        : null,
      pageNumberStart: draft.pageNumberStart,
      headerDistancePx: draft.headerDistancePx,
      footerDistancePx: draft.footerDistancePx,
      pageColorHex: draft.pageColorHex,
      pageBorders: draft.pageBorders ? structuredCloneBorders(draft.pageBorders) : null,
      // "New page" is the default — store null so doc.section stays clean (the
      // mid-section path falls back to "nextPage" too).
      breakType: draft.breakType && draft.breakType !== "nextPage" ? draft.breakType : null,
      lineNumbering: draft.lineNumbering ? { ...draft.lineNumbering } : null,
    };
  }

  return handle;
}

// --- small helpers ----------------------------------------------------------
function rowOf(...kids: HTMLElement[]): HTMLElement {
  const r = el("div", "ked-pl-row");
  r.append(...kids);
  return r;
}

interface Check {
  row: HTMLElement;
  input: HTMLInputElement;
}
function checkbox(label: string): Check {
  const row = el("label", "ked-pl-check");
  const input = el("input");
  input.type = "checkbox";
  row.append(input, el("span", undefined, label));
  return { row, input };
}

function structuredCloneBorders(b: PageBorders): PageBorders {
  const out: PageBorders = {};
  if (b.offsetFrom) out.offsetFrom = b.offsetFrom;
  for (const k of ["top", "right", "bottom", "left"] as const) {
    if (b[k]) out[k] = { ...b[k]! };
  }
  return out;
}
