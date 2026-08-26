// Font dialog — Word-style character formatting that goes beyond the ribbon's
// B/I/U: caps / small-caps / double strikethrough, underline STYLE + COLOR, the
// raise/lower baseline shift (w:position), horizontal width scaling (w:w),
// character spacing (letter spacing), the kerning threshold (w:kern), the
// emphasis mark (w:em), the outline / shadow / emboss / imprint text effects,
// and the fit-text target width (w:fitText). It presents the current selection's
// effective run style and, on Apply, hands a `Partial<CharStyle>` patch back to
// the caller — which routes it through `editor.setCharStyle` so the whole change
// is one undoable edit over the selection. Floating, non-blocking panel like the
// other editing dialogs (Borders & Shading, TOC options, field constructor).

import type { CharStyle, EmphasisMark, UnderlineStyle } from "@kindy/shared";
import { injectCssOnce } from "./styles";
import { makeFloatingDialog } from "./floatingDialog";
import type { DialogCommon, FontDialogMessages } from "../i18n/types";
import { defaultMessages } from "../i18n";

/** The selection's effective run style, read from `editor.currentFormat()`. */
export interface FontDialogInitial {
  underline: boolean;
  underlineStyle: UnderlineStyle | null;
  underlineColor: string | null;
  caps: boolean;
  smallCaps: boolean;
  doubleStrikethrough: boolean;
  positionPx: number | null;
  widthScalePct: number | null;
  letterSpacingPx: number | null;
  kerningMinPx: number | null;
  emphasisMark: EmphasisMark | null;
  outline: boolean;
  shadow: boolean;
  emboss: boolean;
  imprint: boolean;
  fitTextPx: number | null;
}

export interface FontDialogOptions {
  initial: FontDialogInitial;
  /** Apply the edited patch over the selection (one undoable edit). */
  onApply: (patch: Partial<CharStyle>) => void;
  messages?: FontDialogMessages;
  common?: DialogCommon;
}

export interface FontDialogHandle {
  close(): void;
}

const getUnderlineStyles = (t: FontDialogMessages): { value: UnderlineStyle | "none"; label: string }[] => [
  { value: "none", label: t.ulNone },
  { value: "single", label: t.ulSingle },
  { value: "double", label: t.ulDouble },
  { value: "thick", label: t.ulThick },
  { value: "dotted", label: t.ulDotted },
  { value: "dash", label: t.ulDashed },
  { value: "dotDash", label: t.ulDotDash },
  { value: "dotDotDash", label: t.ulDotDotDash },
  { value: "wave", label: t.ulWave },
];

const getEmphasisMarks = (t: FontDialogMessages): { value: EmphasisMark | "none"; label: string }[] => [
  { value: "none", label: t.emNone },
  { value: "dot", label: t.emDot },
  { value: "comma", label: t.emComma },
  { value: "circle", label: t.emCircle },
  { value: "underDot", label: t.emUnderDot },
];

const CSS = `
.ked-font-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(20,22,26,.38);display:flex;align-items:center;justify-content:center;}
.ked-font-modal{width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:10px;
  box-shadow:0 18px 56px rgba(0,0,0,.34);font:13px/1.5 Arial,sans-serif;color:#202124;overflow:hidden;}
.ked-font-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #e6e8eb;}
.ked-font-head h2{margin:0;font-size:15px;font-weight:600;flex:1 1 auto;}
.ked-font-x{border:none;background:transparent;font-size:20px;line-height:1;color:#5f6368;cursor:pointer;width:28px;height:28px;border-radius:6px;}
.ked-font-x:hover{background:#e8eaed;}
.ked-font-body{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:14px;}
.ked-font-section{display:flex;flex-direction:column;gap:8px;}
.ked-font-section>label.head{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#80868b;}
.ked-font-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#3c4043;}
.ked-font-check input{width:16px;height:16px;}
.ked-font-checks{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;}
.ked-font-row{display:flex;align-items:center;gap:8px;}
.ked-font-row.dim{opacity:.45;}
.ked-font-row>span.lbl{flex:0 0 150px;color:#3c4043;}
.ked-font-body input[type=number],.ked-font-body select{height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0 8px;font:13px Arial,sans-serif;background:#fff;}
.ked-font-body input[type=number]{width:88px;}
.ked-font-body input[type=color]{width:42px;height:30px;border:1px solid #d0d4d9;border-radius:6px;padding:0 2px;background:#fff;cursor:pointer;}
.ked-font-foot{display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:1px solid #e6e8eb;}
.ked-font-foot .spacer{flex:1 1 auto;}
.ked-font-btn{height:30px;padding:0 14px;border:1px solid #d0d4d9;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#3c4043;}
.ked-font-btn:hover{background:#f1f3f4;}
.ked-font-btn.primary{border-color:#1a73e8;background:#1a73e8;color:#fff;}
.ked-font-btn.primary:hover{background:#1864cc;}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const checkbox = (label: string, checked: boolean): { row: HTMLElement; input: HTMLInputElement } => {
  const row = el("label", "ked-font-check");
  const input = el("input");
  input.type = "checkbox";
  input.checked = checked;
  row.append(input, document.createTextNode(label));
  return { row, input };
};

const numberInput = (value: number | null, step: string, min?: string, max?: string): HTMLInputElement => {
  const i = el("input");
  i.type = "number";
  i.step = step;
  if (min !== undefined) i.min = min;
  if (max !== undefined) i.max = max;
  i.value = value === null ? "" : String(value);
  return i;
};

/** Parse a number input: blank or out-of-range ⇒ `undefined` (clears the field).
 *  `min`/`max` on the inputs are only UI hints, so the model patch re-validates
 *  here — a junk or impossible value (e.g. `widthScalePct=0`, negative kerning)
 *  must never reach the document. */
const numOrUndef = (raw: string, min?: number, max?: number): number | undefined => {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  if (min !== undefined && n < min) return undefined;
  if (max !== undefined && n > max) return undefined;
  return n;
};

export function showFontDialog(opts: FontDialogOptions): FontDialogHandle {
  injectCssOnce("ked-font-styles", CSS);
  const init = opts.initial;
  const t = opts.messages ?? defaultMessages.fontDialog;
  const c = opts.common ?? defaultMessages.common;

  const backdrop = el("div", "ked-font-backdrop");
  const modal = el("div", "ked-font-modal");
  modal.addEventListener("mousedown", (e) => e.stopPropagation());

  const head = el("div", "ked-font-head");
  const xBtn = el("button", "ked-font-x", "×");
  head.append(el("h2", undefined, t.title), xBtn);

  const body = el("div", "ked-font-body");

  // ---- Effects (caps / small-caps / double-strike / outline / shadow / …) ----
  const effects = el("div", "ked-font-section");
  const capsChk = checkbox(t.allCaps, init.caps);
  const smallChk = checkbox(t.smallCaps, init.smallCaps);
  const dstrikeChk = checkbox(t.doubleStrikethrough, init.doubleStrikethrough);
  const outlineChk = checkbox(t.outline, init.outline);
  const shadowChk = checkbox(t.shadow, init.shadow);
  const embossChk = checkbox(t.emboss, init.emboss);
  const imprintChk = checkbox(t.engrave, init.imprint);
  const checks = el("div", "ked-font-checks");
  checks.append(capsChk.row, smallChk.row, dstrikeChk.row, outlineChk.row, shadowChk.row, embossChk.row, imprintChk.row);
  effects.append(el("label", "head", t.sectionEffects), checks);
  body.append(effects);

  // ---- Underline (style + color) ----
  const underline = el("div", "ked-font-section");
  const uStyleSel = el("select");
  for (const s of getUnderlineStyles(t)) {
    const o = el("option");
    o.value = s.value;
    o.textContent = s.label;
    uStyleSel.append(o);
  }
  uStyleSel.value = init.underline ? (init.underlineStyle ?? "single") : "none";
  const uStyleRow = el("div", "ked-font-row");
  uStyleRow.append(el("span", "lbl", t.underlineStyle), uStyleSel);
  const uColorRow = el("div", "ked-font-row");
  const uColorIn = el("input");
  uColorIn.type = "color";
  uColorIn.value = init.underlineColor ?? "#000000";
  const uAuto = checkbox(t.automatic, init.underlineColor === null);
  uColorRow.append(el("span", "lbl", t.underlineColor), uColorIn, uAuto.row);
  underline.append(el("label", "head", t.sectionUnderline), uStyleRow, uColorRow);
  body.append(underline);

  // ---- Spacing / position / scaling / kerning ----
  const spacing = el("div", "ked-font-section");
  const posIn = numberInput(init.positionPx, "1");
  const scaleIn = numberInput(init.widthScalePct, "1", "1", "600");
  const spacingIn = numberInput(init.letterSpacingPx, "0.5");
  const kernIn = numberInput(init.kerningMinPx, "0.5", "0");
  const fitIn = numberInput(init.fitTextPx, "1", "0");
  const row = (label: string, input: HTMLElement, suffix?: string): HTMLElement => {
    const r = el("div", "ked-font-row");
    r.append(el("span", "lbl", label), input);
    if (suffix) r.append(el("span", undefined, suffix));
    return r;
  };
  spacing.append(
    el("label", "head", t.sectionSpacing),
    row(t.position, posIn, t.unitPx),
    row(t.scale, scaleIn, t.unitPct),
    row(t.charSpacing, spacingIn, t.unitPx),
    row(t.kerning, kernIn, t.unitPx),
    row(t.fitText, fitIn, t.unitPx),
  );
  body.append(spacing);

  // ---- Emphasis mark ----
  const emphasis = el("div", "ked-font-section");
  const emSel = el("select");
  for (const m of getEmphasisMarks(t)) {
    const o = el("option");
    o.value = m.value;
    o.textContent = m.label;
    emSel.append(o);
  }
  emSel.value = init.emphasisMark ?? "none";
  emphasis.append(el("label", "head", t.sectionEmphasis), row(t.emphasisMark, emSel));
  body.append(emphasis);

  const foot = el("div", "ked-font-foot");
  const cancel = el("button", "ked-font-btn", c.cancel);
  const apply = el("button", "ked-font-btn primary", c.apply);
  foot.append(el("div", "spacer"), cancel, apply);

  modal.append(head, body, foot);
  backdrop.append(modal);
  document.body.append(backdrop);

  const refresh = (): void => {
    const noUnderline = uStyleSel.value === "none";
    uColorRow.classList.toggle("dim", noUnderline);
    uColorIn.disabled = noUnderline || uAuto.input.checked;
    uAuto.input.disabled = noUnderline;
  };
  uStyleSel.addEventListener("change", refresh);
  uAuto.input.addEventListener("change", refresh);

  const read = (): Partial<CharStyle> => {
    const patch: Partial<CharStyle> = {
      // Emit explicit `false` for unchecked effects (not `undefined`) so the
      // dialog turns a flag OFF as reliably as ON — the patch asserts the full
      // effect state over the selection, Word-style.
      caps: capsChk.input.checked,
      smallCaps: smallChk.input.checked,
      doubleStrikethrough: dstrikeChk.input.checked,
      outline: outlineChk.input.checked,
      shadow: shadowChk.input.checked,
      emboss: embossChk.input.checked,
      imprint: imprintChk.input.checked,
      emphasisMark: emSel.value === "none" ? undefined : (emSel.value as EmphasisMark),
      positionPx: numOrUndef(posIn.value),
      widthScalePct: numOrUndef(scaleIn.value, 1, 600),
      // letterSpacingPx is `number` (no `| undefined`) — normal is 0, so a blank
      // field clears the spacing to 0 rather than removing the property.
      letterSpacingPx: numOrUndef(spacingIn.value) ?? 0,
      kerningMinPx: numOrUndef(kernIn.value, 0),
      fitTextPx: numOrUndef(fitIn.value, 0),
    };
    if (uStyleSel.value === "none") {
      patch.underline = false;
      patch.underlineStyle = undefined;
      patch.underlineColor = undefined;
    } else {
      patch.underline = true;
      patch.underlineStyle = uStyleSel.value as UnderlineStyle;
      patch.underlineColor = uAuto.input.checked ? undefined : uColorIn.value;
    }
    return patch;
  };

  const ac = new AbortController();
  const handle: FontDialogHandle = {
    close(): void { backdrop.remove(); ac.abort(); },
  };
  window.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); handle.close(); }
  }, { capture: true, signal: ac.signal });
  makeFloatingDialog({ backdrop, modal, handle: head, signal: ac.signal, noDrag: ".ked-font-x" });
  xBtn.addEventListener("click", () => handle.close());
  cancel.addEventListener("click", () => handle.close());
  apply.addEventListener("click", () => { opts.onApply(read()); handle.close(); });

  refresh();
  return handle;
}
