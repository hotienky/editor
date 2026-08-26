// TOC properties — a modal to review and edit a table-of-contents field's OOXML
// switches (\o level range, \u outline levels, \h hyperlinks, \n hidden page
// numbers, \p separator, \z web-only hide). On Apply the caller turns the edited
// TocSwitches into ops (setTocSwitchesCmd): persist the instruction + regenerate
// the entries. Pure presentation, modeled on the field constructor modal.

import type { TocSwitches } from "@kindy/shared";
import { injectCssOnce } from "./styles";
import { makeFloatingDialog } from "./floatingDialog";

export interface TocPropertiesOptions {
  /** Current switches, parsed from the TOC field's instruction. */
  initial: TocSwitches;
  onApply: (sw: TocSwitches) => void;
}

export interface TocPropertiesHandle {
  close(): void;
}

const CSS = `
.ked-toc-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(20,22,26,.38);display:flex;align-items:center;justify-content:center;}
.ked-toc-modal{width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;
  box-shadow:0 18px 56px rgba(0,0,0,.34);font:13px/1.5 Arial,sans-serif;color:#202124;overflow:hidden;}
.ked-toc-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #e6e8eb;}
.ked-toc-head h2{margin:0;font-size:15px;font-weight:600;flex:1 1 auto;}
.ked-toc-x{border:none;background:transparent;font-size:20px;line-height:1;color:#5f6368;cursor:pointer;width:28px;height:28px;border-radius:6px;}
.ked-toc-x:hover{background:#e8eaed;}
.ked-toc-body{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:14px;}
.ked-toc-field{display:flex;flex-direction:column;gap:4px;}
.ked-toc-field>label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#80868b;}
.ked-toc-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#3c4043;}
.ked-toc-check input{width:16px;height:16px;}
.ked-toc-range{display:flex;align-items:center;gap:8px;}
.ked-toc-range input[type=number]{width:64px;}
.ked-toc-range.dim{opacity:.45;}
.ked-toc-body input[type=number],.ked-toc-body input[type=text]{height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0 8px;font:13px Arial,sans-serif;}
.ked-toc-instr{font:12px/1.4 Consolas,monospace;color:#5f6368;background:#f6f7f9;border:1px solid #e6e8eb;border-radius:6px;padding:8px 10px;word-break:break-all;}
.ked-toc-foot{display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:1px solid #e6e8eb;}
.ked-toc-foot .spacer{flex:1 1 auto;}
.ked-toc-btn{height:30px;padding:0 14px;border:1px solid #d0d4d9;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#3c4043;}
.ked-toc-btn:hover{background:#f1f3f4;}
.ked-toc-btn.primary{border-color:#1a73e8;background:#1a73e8;color:#fff;}
.ked-toc-btn.primary:hover{background:#1864cc;}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const checkbox = (label: string, checked: boolean): { row: HTMLElement; input: HTMLInputElement } => {
  const row = el("label", "ked-toc-check");
  const input = el("input");
  input.type = "checkbox";
  input.checked = checked;
  row.append(input, document.createTextNode(label));
  return { row, input };
};

export function showTocProperties(opts: TocPropertiesOptions): TocPropertiesHandle {
  injectCssOnce("ked-toc-styles", CSS);
  const init = opts.initial;

  const backdrop = el("div", "ked-toc-backdrop");
  const modal = el("div", "ked-toc-modal");
  modal.addEventListener("mousedown", (e) => e.stopPropagation());

  const head = el("div", "ked-toc-head");
  head.append(el("h2", undefined, "Table of contents — field options"), (() => { const x = el("button", "ked-toc-x", "×"); return x; })());
  const xBtn = head.querySelector("button")!;

  const body = el("div", "ked-toc-body");

  // \o "from-to" — heading level range
  const oField = el("div", "ked-toc-field");
  const oToggle = checkbox("Build from heading levels (\\o)", !!init.outlineRange);
  const oRange = el("div", "ked-toc-range");
  const fromIn = el("input"); fromIn.type = "number"; fromIn.min = "1"; fromIn.max = "9"; fromIn.value = String(init.outlineRange?.from ?? 1);
  const toIn = el("input"); toIn.type = "number"; toIn.min = "1"; toIn.max = "9"; toIn.value = String(init.outlineRange?.to ?? 3);
  oRange.append(el("span", undefined, "Levels"), fromIn, el("span", undefined, "to"), toIn);
  oField.append(el("label", undefined, "Heading levels"), oToggle.row, oRange);
  body.append(oField);

  // \u, \h, \z
  const uChk = checkbox("Include paragraphs with a direct outline level (\\u)", init.useOutlineLevels);
  const hChk = checkbox("Make entries hyperlinks to their heading (\\h)", init.hyperlinks);
  const zChk = checkbox("Hide leader & page numbers in web view (\\z)", init.hideInWeb);
  const flags = el("div", "ked-toc-field");
  flags.append(el("label", undefined, "Options"), uChk.row, hChk.row, zChk.row);
  body.append(flags);

  // \p separator
  const sepField = el("div", "ked-toc-field");
  const sepIn = el("input"); sepIn.type = "text"; sepIn.placeholder = "tab (default)"; sepIn.value = init.separator ?? "";
  sepField.append(el("label", undefined, "Label / page-number separator (\\p)"), sepIn);
  body.append(sepField);

  // Live instruction preview
  const instrField = el("div", "ked-toc-field");
  const instr = el("div", "ked-toc-instr");
  instrField.append(el("label", undefined, "Field instruction"), instr);
  body.append(instrField);

  const foot = el("div", "ked-toc-foot");
  const cancel = el("button", "ked-toc-btn", "Cancel");
  const apply = el("button", "ked-toc-btn primary", "Apply");
  foot.append(el("div", "spacer"), cancel, apply);

  modal.append(head, body, foot);
  backdrop.append(modal);
  document.body.append(backdrop);

  const read = (): TocSwitches => {
    const sw: TocSwitches = {
      useOutlineLevels: uChk.input.checked,
      hyperlinks: hChk.input.checked,
      hideInWeb: zChk.input.checked,
    };
    if (oToggle.input.checked) {
      const from = Math.max(1, Math.min(9, Number(fromIn.value) || 1));
      const to = Math.max(from, Math.min(9, Number(toIn.value) || from));
      sw.outlineRange = { from, to };
    }
    if (init.customStyles) sw.customStyles = init.customStyles; // preserve \t mappings we don't edit here
    if (init.hidePageNumberRange) sw.hidePageNumberRange = init.hidePageNumberRange;
    if (sepIn.value.length > 0) sw.separator = sepIn.value;
    return sw;
  };

  const refresh = (): void => {
    oRange.classList.toggle("dim", !oToggle.input.checked);
    fromIn.disabled = toIn.disabled = !oToggle.input.checked;
    // Inline-built instruction string (mirrors shared buildTocInstruction).
    const sw = read();
    const parts = ["TOC"];
    if (sw.outlineRange) parts.push(`\\o "${sw.outlineRange.from}-${sw.outlineRange.to}"`);
    if (sw.useOutlineLevels) parts.push("\\u");
    if (sw.hyperlinks) parts.push("\\h");
    if (sw.separator !== undefined) parts.push(`\\p "${sw.separator}"`);
    if (sw.hideInWeb) parts.push("\\z");
    instr.textContent = ` ${parts.join(" ")} `;
  };
  for (const c of [oToggle.input, uChk.input, hChk.input, zChk.input]) c.addEventListener("change", refresh);
  for (const i of [fromIn, toIn, sepIn]) i.addEventListener("input", refresh);

  const ac = new AbortController();
  const handle: TocPropertiesHandle = {
    close(): void { backdrop.remove(); ac.abort(); },
  };
  window.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); handle.close(); }
  }, { capture: true, signal: ac.signal });
  makeFloatingDialog({ backdrop, modal, handle: head, signal: ac.signal, noDrag: ".ked-toc-x" });
  xBtn.addEventListener("click", () => handle.close());
  cancel.addEventListener("click", () => handle.close());
  apply.addEventListener("click", () => { opts.onApply(read()); handle.close(); });

  refresh();
  return handle;
}
