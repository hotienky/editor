// Table-style editor pane — edits a TableStyle one conditional part at a time
// (whole table, header row, banded rows, …): fill, borders, and basic text
// formatting per part. Pure presentation: read() returns the TableStyle; the
// Style Manager dispatches upsertTableStyle and renders the live {kind:"tableSample"}.

import type { CellBorder, CellBorders, TableCond, TableCondProps, TableStyle } from "@kindy/shared";
import { TABLE_COND_LABELS } from "@kindy/shared";
import { injectCssOnce } from "./styles";

export interface TableStyleController {
  read(): TableStyle;
  onChange(cb: () => void): void;
  dispose(): void;
}

export interface TableStyleEditorInit {
  style: TableStyle;
  isNew: boolean;
}

// The parts we expose (corners omitted for simplicity; they still round-trip).
const PARTS: TableCond[] = [
  "wholeTable", "firstRow", "lastRow", "firstCol", "lastCol",
  "band1Horz", "band2Horz", "band1Vert", "band2Vert",
];

const BORDER_STYLES: NonNullable<CellBorder["style"]>[] = ["single", "double", "dashed", "dotted"];

const CSS = `
.ked-te{display:flex;flex-direction:column;gap:14px;}
.ked-te-field{display:flex;flex-direction:column;gap:4px;}
.ked-te-field>label{font-size:11px;color:#5f6368;}
.ked-te-field input,.ked-te-field select{height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0 8px;font:13px Arial,sans-serif;background:#fff;}
.ked-te-row{display:flex;gap:8px;flex-wrap:wrap;}
.ked-te-row>*{flex:1 1 0;min-width:84px;}
.ked-te-h3{margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#80868b;font-weight:600;}
.ked-te-btns{display:flex;gap:6px;flex-wrap:wrap;}
.ked-te-btn{height:28px;padding:0 10px;border:1px solid #d0d4d9;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#3c4043;}
.ked-te-btn:hover{background:#f1f3f4;}
.ked-te-color{display:flex;align-items:center;gap:6px;}
.ked-te-color input[type=color]{width:34px;height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0;cursor:pointer;}
.ked-te-chk{display:flex;align-items:center;gap:7px;font-size:12px;color:#3c4043;}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const field = (label: string, control: HTMLElement): HTMLElement => {
  const w = el("div", "ked-te-field");
  w.append(el("label", undefined, label), control);
  return w;
};
const option = (sel: HTMLSelectElement, value: string, label: string): void => {
  const o = el("option"); o.value = value; o.textContent = label; sel.append(o);
};
const toHex = (c: string | undefined, fallback: string): string => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback);

export function mountTableStyleEditor(host: HTMLElement, init: TableStyleEditorInit): TableStyleController {
  injectCssOnce("ked-te-styles", CSS);
  // Deep clone so edits don't mutate the document's style before Apply.
  const style: TableStyle = {
    id: init.style.id,
    name: init.style.name,
    conds: structuredClone(init.style.conds),
    ...(init.style.basedOn ? { basedOn: init.style.basedOn } : {}),
    ...(init.style.rowBandSize !== undefined ? { rowBandSize: init.style.rowBandSize } : {}),
    ...(init.style.colBandSize !== undefined ? { colBandSize: init.style.colBandSize } : {}),
  };
  let onChangeCb: () => void = () => {};
  const fire = (): void => onChangeCb();
  let part: TableCond = "wholeTable";

  const root = el("div", "ked-te");

  const nameInput = el("input");
  nameInput.type = "text";
  nameInput.value = style.name;
  nameInput.disabled = !init.isNew;
  nameInput.addEventListener("input", () => { style.name = nameInput.value; fire(); });
  root.append(field(init.isNew ? "Style name" : "Style id", nameInput));

  const partSel = el("select");
  for (const c of PARTS) option(partSel, c, TABLE_COND_LABELS[c]);
  partSel.value = "wholeTable";
  root.append(field("Editing part", partSel));

  root.append(el("h3", "ked-te-h3", "Formatting"));
  const formHost = el("div", "ked-te");
  root.append(formHost);
  host.append(root);

  const cur = (): TableCondProps => (style.conds[part] ??= {});

  const buildForm = (): void => {
    formHost.replaceChildren();
    const props = cur();

    // -- Fill --
    const fillWrap = el("div", "ked-te-color");
    const fill = el("input");
    fill.type = "color";
    fill.value = toHex(props.shading, "#d9e2f3");
    fill.addEventListener("input", () => { props.shading = fill.value; fire(); });
    const fillBtn = el("button", "ked-te-btn", "Apply fill");
    fillBtn.type = "button";
    fillBtn.addEventListener("click", () => { props.shading = fill.value; fire(); });
    const noFill = el("button", "ked-te-btn", "No fill");
    noFill.type = "button";
    noFill.addEventListener("click", () => { delete props.shading; fire(); });
    fillWrap.append(fill, fillBtn, noFill);
    formHost.append(field("Fill", fillWrap));

    // -- Borders --
    const bColor = el("input"); bColor.type = "color"; bColor.value = "#000000";
    const bWidth = el("input"); bWidth.type = "number"; bWidth.min = "0.25"; bWidth.max = "6"; bWidth.step = "0.25"; bWidth.value = "1";
    const bStyle = el("select");
    for (const s of BORDER_STYLES) option(bStyle, s, s);
    const bRow = el("div", "ked-te-row");
    bRow.append(field("Border color", bColor), field("Width (px)", bWidth), field("Line", bStyle));
    formHost.append(bRow);

    const spec = (): CellBorder => ({ color: bColor.value, widthPx: Number(bWidth.value) || 1, style: bStyle.value as NonNullable<CellBorder["style"]> });
    const setEdges = (edges: (keyof CellBorders)[]): void => {
      const b: CellBorders = {};
      for (const e of edges) b[e] = spec();
      props.borders = b;
      fire();
    };
    const btns = el("div", "ked-te-btns");
    const mk = (label: string, on: () => void): void => {
      const b = el("button", "ked-te-btn", label);
      b.type = "button"; b.addEventListener("click", on);
      btns.append(b);
    };
    mk("All edges", () => setEdges(["top", "right", "bottom", "left"]));
    mk("Bottom", () => setEdges(["bottom"]));
    mk("Top", () => setEdges(["top"]));
    mk("No borders", () => { delete props.borders; fire(); });
    formHost.append(field("Borders", btns));

    // -- Text --
    const boldL = el("label", "ked-te-chk");
    const bold = el("input"); bold.type = "checkbox"; bold.checked = props.char?.bold ?? false;
    bold.addEventListener("change", () => { props.char = { ...props.char, bold: bold.checked }; fire(); });
    boldL.append(bold, document.createTextNode("Bold text"));

    const colorWrap = el("div", "ked-te-color");
    const tColor = el("input"); tColor.type = "color"; tColor.value = toHex(props.char?.color, "#202124");
    tColor.addEventListener("input", () => { props.char = { ...props.char, color: tColor.value }; fire(); });
    const tClear = el("button", "ked-te-btn", "Auto");
    tClear.type = "button";
    tClear.addEventListener("click", () => { if (props.char) delete props.char.color; fire(); });
    colorWrap.append(tColor, tClear);

    formHost.append(field("Text", boldL), field("Text color", colorWrap));
  };

  partSel.addEventListener("change", () => { part = partSel.value as TableCond; buildForm(); });
  buildForm();

  const slug = (s: string): string => s.trim().replace(/\s+/g, "").replace(/[^\w]/g, "") || "TableStyle";

  return {
    read: (): TableStyle => ({ ...style, id: init.isNew ? slug(nameInput.value) : style.id }),
    onChange: (cb) => { onChangeCb = cb; },
    dispose: () => { root.remove(); },
  };
}
