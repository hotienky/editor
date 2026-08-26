// Field constructor — a modal to insert or edit a built-in field (PAGE, NUMPAGES,
// DATE, TIME, IF). The left column picks the field type + its arguments/switches;
// the right column shows a live preview of the result. On Apply, the caller turns
// the FieldSpec into ops (insertFieldCmd / editFieldCmd). Pure presentation.

import type { CharStyle, FieldSpec, IfOp, PageNumFmt, Run } from "@kindy/shared";
import { evaluateIf, formatFieldDate } from "@kindy/shared";
import { injectCssOnce } from "./styles";
import { makeFloatingDialog } from "./floatingDialog";

export interface FieldConstructorOptions {
  /** Pre-fill for editing an existing field; omit to insert a new one. */
  initial?: FieldSpec;
  /** Base run style for the result preview (and IF result text). */
  baseStyle: CharStyle;
  /** "now" for the DATE/TIME preview. */
  now?: Date;
  onApply: (spec: FieldSpec) => void;
  /** Paint the result preview into `host` in the document's real font (via a child
   *  document) instead of plain text. Reuses `host` across refreshes. */
  renderResult?: (host: HTMLElement, runs: Run[]) => void;
  /** Called when the dialog closes — tear down the child document. */
  onClose?: () => void;
}

export interface FieldConstructorHandle {
  close(): void;
}

type FieldType = FieldSpec["type"];

const TYPES: { value: FieldType; label: string }[] = [
  { value: "PAGE", label: "Page number (PAGE)" },
  { value: "NUMPAGES", label: "Total pages (NUMPAGES)" },
  { value: "DATE", label: "Date (DATE)" },
  { value: "TIME", label: "Time (TIME)" },
  { value: "IF", label: "Conditional (IF)" },
];
const NUM_FMTS: { value: PageNumFmt; label: string }[] = [
  { value: "arabic", label: "1, 2, 3" },
  { value: "roman", label: "i, ii, iii" },
  { value: "Roman", label: "I, II, III" },
  { value: "alpha", label: "a, b, c" },
  { value: "Alpha", label: "A, B, C" },
];
const IF_OPS: IfOp[] = ["=", "<>", "<", ">", "<=", ">="];
const DATE_PRESETS = ["M/d/yyyy", "MMMM d, yyyy", "dddd, MMMM d, yyyy", "yyyy-MM-dd"];
const TIME_PRESETS = ["h:mm AM/PM", "HH:mm", "h:mm:ss AM/PM"];

const CSS = `
.ked-fc-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(20,22,26,.38);display:flex;align-items:center;justify-content:center;}
.ked-fc-modal{width:min(720px,94vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;
  box-shadow:0 18px 56px rgba(0,0,0,.34);font:13px/1.5 Arial,sans-serif;color:#202124;overflow:hidden;}
.ked-fc-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #e6e8eb;}
.ked-fc-head h2{margin:0;font-size:15px;font-weight:600;flex:1 1 auto;}
.ked-fc-x{border:none;background:transparent;font-size:20px;line-height:1;color:#5f6368;cursor:pointer;width:28px;height:28px;border-radius:6px;}
.ked-fc-x:hover{background:#e8eaed;}
.ked-fc-body{display:flex;min-height:0;flex:1 1 auto;}
.ked-fc-left{flex:1 1 auto;padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px;}
.ked-fc-right{flex:0 0 240px;border-left:1px solid #e6e8eb;background:#fbfbfc;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.ked-fc-field{display:flex;flex-direction:column;gap:4px;}
.ked-fc-field label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#80868b;}
.ked-fc-field input,.ked-fc-field select{height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0 8px;font:13px Arial,sans-serif;}
.ked-fc-row{display:flex;gap:8px;}.ked-fc-row>*{flex:1 1 auto;}
.ked-fc-presets{display:flex;flex-wrap:wrap;gap:6px;}
.ked-fc-chip{border:1px solid #d0d4d9;border-radius:14px;background:#fff;cursor:pointer;font-size:11px;padding:3px 9px;color:#3c4043;}
.ked-fc-chip:hover{background:#f1f3f4;}
.ked-fc-prev-title{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#80868b;}
.ked-fc-prev{border:1px solid #dadce0;border-radius:8px;padding:10px 12px;background:#fff;min-height:48px;font-size:14px;word-break:break-word;}
.ked-fc-note{font-size:11px;color:#9aa0a6;}
.ked-fc-foot{display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:1px solid #e6e8eb;}
.ked-fc-foot .spacer{flex:1 1 auto;}
.ked-fc-btn{height:30px;padding:0 14px;border:1px solid #d0d4d9;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#3c4043;}
.ked-fc-btn:hover{background:#f1f3f4;}
.ked-fc-btn.primary{border-color:#1a73e8;background:#1a73e8;color:#fff;}
.ked-fc-btn.primary:hover{background:#1864cc;}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const labelled = (label: string, control: HTMLElement): HTMLElement => {
  const wrap = el("div", "ked-fc-field");
  wrap.append(el("label", undefined, label), control);
  return wrap;
};

const option = (value: string, label: string): HTMLOptionElement => {
  const o = el("option");
  o.value = value;
  o.textContent = label;
  return o;
};

export function showFieldConstructor(opts: FieldConstructorOptions): FieldConstructorHandle {
  injectCssOnce("ked-fc-styles", CSS);
  const now = opts.now ?? new Date();
  const editing = opts.initial !== undefined;

  const backdrop = el("div", "ked-fc-backdrop");
  const modal = el("div", "ked-fc-modal");
  modal.addEventListener("mousedown", (e) => e.stopPropagation());

  const head = el("div", "ked-fc-head");
  const h2 = el("h2", undefined, editing ? "Edit field" : "Insert field");
  const xBtn = el("button", "ked-fc-x", "×");
  head.append(h2, xBtn);

  const body = el("div", "ked-fc-body");
  const left = el("div", "ked-fc-left");
  const right = el("div", "ked-fc-right");

  // Type picker
  const typeSel = el("select");
  for (const t of TYPES) typeSel.append(option(t.value, t.label));
  typeSel.value = opts.initial?.type ?? "PAGE";
  left.append(labelled("Field type", typeSel));

  const formHost = el("div", "ked-fc-field");
  left.append(formHost);

  const prevTitle = el("div", "ked-fc-prev-title", "Preview");
  const prev = el("div", "ked-fc-prev");
  const note = el("div", "ked-fc-note");
  right.append(prevTitle, prev, note);

  // --- per-type form builders. Each returns a readSpec() closure. -------------
  let readSpec: () => FieldSpec = () => ({ type: "PAGE", numFmt: "arabic" });

  const numFmtForm = (type: "PAGE" | "NUMPAGES"): (() => FieldSpec) => {
    const sel = el("select");
    for (const f of NUM_FMTS) sel.append(option(f.value, f.label));
    const init = opts.initial;
    sel.value = (init && (init.type === "PAGE" || init.type === "NUMPAGES") && init.numFmt) || "arabic";
    sel.addEventListener("change", refresh);
    formHost.append(labelled("Number format", sel));
    return () => ({ type, numFmt: sel.value as PageNumFmt });
  };

  const dateForm = (type: "DATE" | "TIME"): (() => FieldSpec) => {
    const input = el("input");
    input.type = "text";
    const init = opts.initial;
    input.value = (init && (init.type === "DATE" || init.type === "TIME") && init.format) || (type === "DATE" ? "M/d/yyyy" : "h:mm AM/PM");
    input.addEventListener("input", refresh);
    const presets = el("div", "ked-fc-presets");
    for (const p of type === "DATE" ? DATE_PRESETS : TIME_PRESETS) {
      const chip = el("button", "ked-fc-chip", p);
      chip.type = "button";
      chip.addEventListener("click", () => { input.value = p; refresh(); });
      presets.append(chip);
    }
    formHost.append(labelled("Format (Word \\@ picture)", input), presets);
    return () => ({ type, format: input.value });
  };

  const ifForm = (): (() => FieldSpec) => {
    const a = el("input"); a.type = "text"; a.placeholder = "e.g. 1";
    const opSel = el("select");
    for (const o of IF_OPS) opSel.append(option(o, o));
    const b = el("input"); b.type = "text"; b.placeholder = "e.g. 1";
    const t = el("input"); t.type = "text"; t.placeholder = "shown when true";
    const f = el("input"); f.type = "text"; f.placeholder = "shown when false";
    const init = opts.initial;
    if (init?.type === "IF") {
      a.value = init.operandA; opSel.value = init.op; b.value = init.operandB;
      t.value = init.trueRuns.map((r) => r.text).join("");
      f.value = init.falseRuns.map((r) => r.text).join("");
    }
    for (const inp of [a, opSel, b, t, f]) inp.addEventListener("input", refresh), inp.addEventListener("change", refresh);
    const cmp = el("div", "ked-fc-row");
    cmp.append(labelled("If", a), labelled("Is", opSel), labelled("Than", b));
    formHost.append(cmp, labelled("Then show", t), labelled("Otherwise show", f));
    return () => ({
      type: "IF", operandA: a.value, op: opSel.value as IfOp, operandB: b.value,
      trueRuns: [{ text: t.value, style: { ...opts.baseStyle } }],
      falseRuns: [{ text: f.value, style: { ...opts.baseStyle } }],
    });
  };

  function rebuildForm(): void {
    formHost.replaceChildren();
    const type = typeSel.value as FieldType;
    readSpec =
      type === "PAGE" || type === "NUMPAGES" ? numFmtForm(type)
      : type === "DATE" || type === "TIME" ? dateForm(type)
      : ifForm();
    refresh();
  }

  // The field result as styled runs. PAGE/NUMPAGES use sample values (the dialog
  // has no pagination context); DATE/TIME/IF are materialized from the spec.
  const resultRuns = (spec: FieldSpec): Run[] => {
    switch (spec.type) {
      case "PAGE":
        return [{ text: "1", style: { ...opts.baseStyle } }];
      case "NUMPAGES":
        return [{ text: "12", style: { ...opts.baseStyle } }];
      case "DATE":
      case "TIME":
        return [{ text: formatFieldDate(now, spec.format) || "(empty format)", style: { ...opts.baseStyle } }];
      default: {
        const runs = evaluateIf(spec);
        return runs.length ? runs : [{ text: "(empty)", style: { ...opts.baseStyle } }];
      }
    }
  };

  function refresh(): void {
    const spec = readSpec();
    const runs = resultRuns(spec);
    // renderResult reuses `prev` as its surface host — don't clear it between calls.
    if (opts.renderResult) opts.renderResult(prev, runs);
    else prev.textContent = runs.map((r) => r.text).join("") || "(empty)";
    note.textContent =
      spec.type === "PAGE" ? "Live — resolves to the current page per page (i, I, a, A per format)."
      : spec.type === "NUMPAGES" ? "Live — resolves to the document's total page count."
      : spec.type === "DATE" || spec.type === "TIME" ? "Materialized now; refresh with Update Field."
      : "Materialized from the comparison; refresh with Update Field.";
  }

  typeSel.addEventListener("change", rebuildForm);
  typeSel.disabled = editing; // editing keeps the field's type

  const foot = el("div", "ked-fc-foot");
  const spacer = el("div", "spacer");
  const cancel = el("button", "ked-fc-btn", "Cancel");
  const apply = el("button", "ked-fc-btn primary", editing ? "Apply" : "Insert");
  foot.append(spacer, cancel, apply);

  body.append(left, right);
  modal.append(head, body, foot);
  backdrop.append(modal);
  document.body.append(backdrop);

  const ac = new AbortController();
  const handle: FieldConstructorHandle = {
    close(): void {
      backdrop.remove();
      ac.abort();
      opts.onClose?.(); // tear down the child document
    },
  };
  window.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); handle.close(); }
  }, { capture: true, signal: ac.signal });
  makeFloatingDialog({ backdrop, modal, handle: head, signal: ac.signal, noDrag: ".ked-fc-x" });
  xBtn.addEventListener("click", () => handle.close());
  cancel.addEventListener("click", () => handle.close());
  apply.addEventListener("click", () => { opts.onApply(readSpec()); handle.close(); });

  rebuildForm();
  return handle;
}
