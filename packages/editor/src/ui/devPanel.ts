// Develop-mode inspector — a browser-devtools-style floating panel over the editor.
// This file is the SHELL: a draggable/resizable window with a tab strip, a shared
// toolbar (filter + per-tab extras), a content area that swaps per tab, and a shared
// detail/JSON pane. Each tab lives in ./devpanel/*Tab.ts and is a `PanelTab`.
//
// Gated twice over: it only exists when the embedder passes `develop: true`, and even
// then runs nothing until the developer opens it from the Developer ribbon tab. The
// tree ↔ canvas bridge goes through the editor's setInspectorHighlight /
// revealInspectorTarget / onInspectorHover surface (see ../index.ts).
//
// Pattern mirrors styleManager.ts: injectCssOnce + makeFloatingDialog, an
// AbortController for teardown, Escape-to-close, a handle with close()/refresh().

import type { Document } from "@kindy/shared";
import { makeFloatingDialog } from "./floatingDialog";
import { injectCssOnce } from "./styles";
import { createModelTab } from "./devpanel/modelTab";
import { createLayoutTab } from "./devpanel/layoutTab";
import { createProblemsTab } from "./devpanel/problemsTab";
import { createProbeTab } from "./devpanel/probeTab";
import { createHistoryTab } from "./devpanel/historyTab";
import { createOverlayBar } from "./devpanel/overlayBar";
import { el, type DevPanelEditor, type PanelCtx, type PanelTab } from "./devpanel/types";

export type { DevPanelEditor } from "./devpanel/types";

export interface DevPanelOptions {
  editor: DevPanelEditor;
  onClose?: () => void;
  /** Replace the whole document from a loaded JSON snapshot. When provided, the
   *  toolbar shows a "Load" button; omit to hide it (the core editor can't replace
   *  its own document — editorApp wires this to its replaceDocument). */
  setDocument?: (doc: Document) => void;
}

export interface DevPanelHandle {
  close(): void;
  /** Re-read state and refresh the active tab (preserving its UI state). */
  refresh(): void;
  /** Reverse sync: highlight the tree row for a canvas block id (tree tabs). */
  highlightNode(blockId: string | null): void;
  /** Deliver a hit-test probe payload to the active tab (Probe tab). */
  setProbe(probe: unknown): void;
}

const CSS = `
.ked-dev-backdrop{position:fixed;inset:0;z-index:1100;}
.ked-dev-modal{position:fixed;width:min(460px,96vw);height:min(680px,92vh);min-width:300px;min-height:240px;
  max-width:96vw;max-height:96vh;display:flex;flex-direction:column;background:#1e1f22;resize:both;
  border-radius:10px;box-shadow:0 18px 56px rgba(0,0,0,.5);font:12px/1.5 'Segoe UI',Arial,sans-serif;color:#d4d6da;overflow:hidden;}
.ked-dev-head{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #34363b;background:#26282c;cursor:move;}
.ked-dev-head h2{margin:0;font-size:13px;font-weight:600;flex:1 1 auto;color:#e8eaed;}
.ked-dev-x{border:none;background:transparent;font-size:18px;line-height:1;color:#9aa0a6;cursor:pointer;width:26px;height:26px;border-radius:6px;}
.ked-dev-x:hover{background:#34363b;color:#fff;}
.ked-dev-tabs{display:flex;gap:2px;padding:4px 8px 0;border-bottom:1px solid #34363b;background:#26282c;}
.ked-dev-tab{border:none;background:transparent;color:#9aa0a6;cursor:pointer;font:inherit;padding:5px 10px;border-radius:6px 6px 0 0;border-bottom:2px solid transparent;}
.ked-dev-tab:hover{background:#2f3236;color:#d4d6da;}
.ked-dev-tab.active{color:#e8eaed;border-bottom-color:#5b9bd5;background:#1e1f22;}
.ked-dev-tab .ked-dev-tabcount{color:#6b6f76;font-size:10px;margin-left:5px;}
.ked-dev-toolbar{display:flex;align-items:center;gap:6px;padding:7px 10px;border-bottom:1px solid #34363b;background:#222428;flex-wrap:wrap;}
.ked-dev-filter{flex:1 1 140px;height:26px;padding:0 8px;border:1px solid #3a3d42;border-radius:6px;background:#1a1b1e;color:#e8eaed;font-size:12px;}
.ked-dev-filter::placeholder{color:#6b6f76;}
.ked-dev-content{flex:1 1 auto;display:flex;min-height:0;}
.ked-dev-tabpane{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}
.ked-dev-tree{flex:1 1 auto;overflow:auto;padding:4px 0;font-family:'Cascadia Code',Consolas,monospace;}
.ked-dev-row{display:flex;align-items:baseline;gap:5px;padding:1px 10px 1px 0;cursor:pointer;white-space:nowrap;}
.ked-dev-row:hover{background:#2b2d31;}
.ked-dev-row.sel{background:#33415e;}
.ked-dev-row.cur{outline:1px solid #5b9bd5;outline-offset:-1px;}
.ked-dev-row.match{background:#3a3320;}
.ked-dev-tw{display:inline-block;width:12px;flex:0 0 auto;text-align:center;color:#9aa0a6;user-select:none;}
.ked-dev-kind{color:#9cdcfe;flex:0 0 auto;}
.ked-dev-kind.tag{color:#c586c0;}
.ked-dev-kind.run{color:#7ec699;}
.ked-dev-kind.group{color:#d7ba7d;}
.ked-dev-kind.layout{color:#80cbc4;}
.ked-dev-kind.problem{color:#e0e0e0;}
.ked-dev-prev{color:#cea36a;overflow:hidden;text-overflow:ellipsis;}
.ked-dev-badge{color:#6b9bd1;font-size:10px;border:1px solid #3f5470;border-radius:7px;padding:0 5px;flex:0 0 auto;}
.ked-dev-id{color:#6b6f76;font-size:10px;flex:0 0 auto;}
.ked-dev-empty{color:#6b6f76;padding:6px 14px;font-style:italic;}
.ked-dev-chip{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 9px;border:1px solid #3a3d42;border-radius:12px;background:#1a1b1e;color:#9aa0a6;cursor:pointer;font-size:11px;user-select:none;}
.ked-dev-chip:hover{border-color:#4a4d52;color:#d4d6da;}
.ked-dev-chip.on{background:#2d4156;border-color:#5b9bd5;color:#cfe3f5;}
.ked-dev-overlays{display:flex;align-items:center;gap:5px;padding:6px 10px;border-bottom:1px solid #34363b;background:#1f2124;flex-wrap:wrap;}
.ked-dev-overlabel{color:#6b6f76;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-right:2px;}
.ked-dev-actions{display:flex;align-items:center;gap:6px;flex:0 0 auto;margin-left:auto;}
.ked-dev-btn{height:24px;padding:0 9px;border:1px solid #3a3d42;border-radius:6px;background:#1a1b1e;color:#9aa0a6;cursor:pointer;font-size:11px;}
.ked-dev-btn:hover{border-color:#4a4d52;color:#d4d6da;}
.ked-dev-history{flex:1 1 auto;overflow:auto;padding:2px 0;font-family:'Cascadia Code',Consolas,monospace;}
.ked-dev-hrow{display:flex;align-items:baseline;gap:8px;padding:2px 10px;cursor:pointer;white-space:nowrap;}
.ked-dev-hrow:hover{background:#2b2d31;}
.ked-dev-hrow.sel{background:#33415e;}
.ked-dev-hi{color:#6b6f76;flex:0 0 38px;}
.ked-dev-horigin{flex:0 0 60px;color:#9aa0a6;}
.ked-dev-horigin.typing{color:#7ec699;}
.ked-dev-horigin.command{color:#9cdcfe;}
.ked-dev-horigin.paste{color:#d7ba7d;}
.ked-dev-horigin.undo,.ked-dev-horigin.redo{color:#c586c0;}
.ked-dev-hops{color:#cea36a;overflow:hidden;text-overflow:ellipsis;}
.ked-dev-hts{color:#6b6f76;font-size:10px;margin-left:auto;}
.ked-dev-probe{flex:1 1 auto;overflow:auto;padding:8px 12px;}
.ked-dev-probe-row{display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #2b2d31;}
.ked-dev-probe-k{flex:0 0 84px;color:#9aa0a6;}
.ked-dev-probe-v{color:#cdd1d6;font-family:'Cascadia Code',Consolas,monospace;word-break:break-all;}
.ked-dev-detail{flex:0 0 200px;border-top:1px solid #34363b;background:#191a1d;display:flex;flex-direction:column;min-height:0;}
.ked-dev-detail-head{padding:6px 12px;border-bottom:1px solid #2b2d31;color:#9aa0a6;font-size:11px;text-transform:uppercase;letter-spacing:.05em;}
.ked-dev-json{flex:1 1 auto;overflow:auto;margin:0;padding:8px 12px;font-family:'Cascadia Code',Consolas,monospace;font-size:11px;color:#cdd1d6;white-space:pre;}`;

export function showDevPanel(opts: DevPanelOptions): DevPanelHandle {
  injectCssOnce("ked-dev-styles", CSS);
  const { editor } = opts;

  // ---- DOM scaffold ---------------------------------------------------------
  const backdrop = el("div", "ked-dev-backdrop");
  const modal = el("div", "ked-dev-modal");
  modal.addEventListener("mousedown", (e) => e.stopPropagation());

  const head = el("div", "ked-dev-head");
  const h2 = el("h2", undefined, "Document Inspector");
  const xBtn = el("button", "ked-dev-x", "×");
  head.append(h2, xBtn);

  const tabStrip = el("div", "ked-dev-tabs");

  const toolbar = el("div", "ked-dev-toolbar");
  const filterInput = el("input", "ked-dev-filter");
  filterInput.type = "search";
  filterInput.placeholder = "Filter…";
  const extrasHost = el("div", "ked-dev-extras");
  extrasHost.style.cssText = "display:flex;align-items:center;gap:6px;flex:0 1 auto;flex-wrap:wrap;";

  // Shell actions: follow-caret toggle + snapshot copy/load.
  const actions = el("div", "ked-dev-actions");
  const followChip = el("span", "ked-dev-chip", "⟲ Follow caret");
  followChip.title = "Scroll the tree to the node under the caret as you edit";
  let followOn = false;
  followChip.addEventListener("click", () => { followOn = !followOn; followChip.classList.toggle("on", followOn); active.setFollowCaret?.(followOn); });
  const flash = (btn: HTMLButtonElement, fn: () => void): void => { fn(); const t = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = t; }, 900); };
  const copyDocBtn = el("button", "ked-dev-btn", "⧉ Doc");
  copyDocBtn.title = "Copy the Document JSON to the clipboard";
  copyDocBtn.addEventListener("click", () => flash(copyDocBtn, () => void navigator.clipboard?.writeText(JSON.stringify(editor.getDocument(), null, 2))));
  const copyLayoutBtn = el("button", "ked-dev-btn", "⧉ Layout");
  copyLayoutBtn.title = "Copy the LayoutTree JSON to the clipboard";
  copyLayoutBtn.addEventListener("click", () => flash(copyLayoutBtn, () => void navigator.clipboard?.writeText(JSON.stringify(editor.getLayoutTree(), null, 2))));
  actions.append(followChip, copyDocBtn, copyLayoutBtn);
  if (opts.setDocument) {
    const loadBtn = el("button", "ked-dev-btn", "⤓ Load");
    loadBtn.title = "Replace the document from a JSON snapshot";
    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.style.display = "none";
    loadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      try { opts.setDocument!(JSON.parse(await f.text()) as Document); }
      catch { window.alert("Could not parse the file as a Document JSON."); }
      fileInput.value = "";
    });
    actions.append(loadBtn, fileInput);
  }
  toolbar.append(filterInput, extrasHost, actions);

  const overlayBar = createOverlayBar(editor);
  const content = el("div", "ked-dev-content");

  const detail = el("div", "ked-dev-detail");
  const detailHead = el("div", "ked-dev-detail-head", "Select a node");
  const json = el("pre", "ked-dev-json");
  detail.append(detailHead, json);

  modal.append(head, tabStrip, toolbar, overlayBar.element, content, detail);
  backdrop.append(modal);
  document.body.append(backdrop);

  // ---- Shared detail pane ---------------------------------------------------
  const showDetail = (title: string, data: unknown): void => {
    detailHead.textContent = title;
    try {
      json.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch {
      json.textContent = String(data);
    }
  };

  // ---- Tabs -----------------------------------------------------------------
  const ctx: PanelCtx = { editor, showDetail };
  const tabs: PanelTab[] = [createModelTab(ctx), createLayoutTab(ctx), createProblemsTab(ctx), createProbeTab(ctx), createHistoryTab(ctx)];
  let active: PanelTab = tabs[0]!;
  const tabButtons = new Map<string, HTMLButtonElement>();
  const tabCounts = new Map<string, HTMLSpanElement>();

  for (const tab of tabs) {
    tab.element.classList.add("ked-dev-tabpane");
    tab.element.style.display = "none";
    content.append(tab.element);
    if (tab.toolbar) { tab.toolbar.style.display = "none"; extrasHost.append(tab.toolbar); }
    const btn = el("button", "ked-dev-tab");
    btn.append(document.createTextNode(tab.label));
    const countSpan = el("span", "ked-dev-tabcount");
    btn.append(countSpan);
    btn.addEventListener("click", () => switchTo(tab.id));
    tabButtons.set(tab.id, btn);
    tabCounts.set(tab.id, countSpan);
    tabStrip.append(btn);
  }

  const updateCounts = (): void => {
    for (const tab of tabs) {
      const n = tab.count?.() ?? null;
      const span = tabCounts.get(tab.id);
      if (span) span.textContent = n != null ? String(n) : "";
    }
  };

  const switchTo = (id: string): void => {
    const next = tabs.find((t) => t.id === id);
    if (!next) return;
    active.deactivate?.();
    active.element.style.display = "none";
    if (active.toolbar) active.toolbar.style.display = "none";
    tabButtons.get(active.id)?.classList.remove("active");
    active = next;
    active.element.style.display = "flex";
    if (active.toolbar) active.toolbar.style.display = "flex";
    tabButtons.get(active.id)?.classList.add("active");
    filterInput.style.display = active.usesFilter ? "" : "none";
    if (active.usesFilter) active.setFilter?.(filterInput.value);
    active.setFollowCaret?.(followOn);
    active.activate();
    updateCounts();
  };

  filterInput.addEventListener("input", () => active.usesFilter && active.setFilter?.(filterInput.value));

  // ---- Lifecycle ------------------------------------------------------------
  const ac = new AbortController();
  editor.setInspectorActive(true);
  const handle: DevPanelHandle = {
    close(): void {
      editor.setInspectorActive(false);
      editor.setInspectorHighlight(null);
      overlayBar.reset(); // clear any canvas overlays the dev left on
      for (const t of tabs) t.destroy?.();
      backdrop.remove();
      ac.abort();
      opts.onClose?.();
    },
    refresh(): void { active.refresh(); updateCounts(); },
    highlightNode(blockId: string | null): void { active.highlightByBlockId?.(blockId); },
    setProbe(probe: unknown): void { active.onProbe?.(probe); },
  };
  window.addEventListener("keydown", (ev: KeyboardEvent) => {
    // Let the search filter's native Escape-to-clear run; only close on a global Escape.
    if (ev.key === "Escape" && ev.target !== filterInput) { ev.preventDefault(); ev.stopPropagation(); handle.close(); }
  }, { capture: true, signal: ac.signal });
  makeFloatingDialog({ backdrop, modal, handle: head, signal: ac.signal, noDrag: ".ked-dev-x" });
  xBtn.addEventListener("click", () => handle.close());

  switchTo(active.id);
  return handle;
}
