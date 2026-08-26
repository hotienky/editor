// Probe tab — a live hit-test readout. While this tab is open the editor emits a
// probe (resolved caret position, content-control chain, field, table cell) for the
// point under the pointer; the tab renders it. A Freeze chip pins the last reading.

import type { InspectorProbe } from "../../index";
import { el, type PanelCtx, type PanelTab } from "./types";

export function createProbeTab(ctx: PanelCtx): PanelTab {
  const pane = el("div", "ked-dev-probe");
  const hint = el("div", "ked-dev-empty", "Move the pointer over the page to inspect what the input layer resolves there.");
  const body = el("div", "ked-dev-proberows");
  pane.append(hint, body);

  const toolbar = el("div");
  toolbar.style.cssText = "display:flex;align-items:center;gap:6px;";
  const freezeChip = el("span", "ked-dev-chip", "❄ Freeze");
  freezeChip.title = "Pin the current reading (stop following the pointer)";
  let frozen = false;
  freezeChip.addEventListener("click", () => { frozen = !frozen; freezeChip.classList.toggle("on", frozen); });
  toolbar.append(freezeChip);

  const row = (k: string, v: string): void => {
    const r = el("div", "ked-dev-probe-row");
    r.append(el("span", "ked-dev-probe-k", k), el("span", "ked-dev-probe-v", v));
    body.append(r);
  };

  const render = (p: InspectorProbe | null): void => {
    body.replaceChildren();
    if (!p) { hint.style.display = ""; return; }
    hint.style.display = "none";
    row("Page", `${p.pageIndex}`);
    row("Point", `${p.x}, ${p.y}`);
    row("Position", p.position ? `${p.position.blockId} @ ${p.position.offset}` : "—");
    row("SDT chain", p.sdtChain.length ? p.sdtChain.join(" › ") : "—");
    row("Field", p.fieldId ?? "—");
    row("Cell", p.cell ? `${p.cell.tableId} [${p.cell.row}, ${p.cell.col}]` : "—");
  };

  return {
    id: "probe",
    label: "Probe",
    element: pane,
    toolbar,
    usesFilter: false,
    activate: () => ctx.editor.setInspectorProbe(true),
    deactivate: () => ctx.editor.setInspectorProbe(false),
    refresh: () => {},
    onProbe: (probe) => { if (!frozen) render(probe as InspectorProbe | null); },
    destroy: () => ctx.editor.setInspectorProbe(false),
  };
}
