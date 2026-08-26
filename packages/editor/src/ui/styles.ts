// Component CSS for the editor chrome (ribbon, ruler, outline, status bar,
// popovers). Injected once by KindyEditor so the package is self-contained — the
// host page needs no stylesheet. The only change from the original index.html
// <style> is that the page-level `html, body` rules become a `.kindy-editor-root`
// container rule, so embedding doesn't restyle the host's body.
//
// Structural selectors are CLASS-based (.ked-toolbar/.ked-app/.ked-ruler/
// .ked-outline/.ked-statusbar), scoped by the per-instance .kindy-editor-root, so
// multiple editors can coexist on one page without id collisions. The stylesheet
// itself is shared (injected once, keyed by STYLE_ID) — it styles every instance.

const STYLE_ID = "kindy-editor-styles";

const CSS = `
/* ===== Design tokens (Office 365 / Fluent-inspired palette) ========= */
.kindy-editor-root {
  /* Brand blues */
  --ked-blue:        #2b579a;
  --ked-blue-dark:   #1e3f73;
  --ked-blue-mid:    #3a6bbf;
  --ked-blue-light:  #dce9f8;
  --ked-blue-xlight: #eef4fc;

  /* Neutrals */
  --ked-bg:          #f5f4f2;
  --ked-surface:     #ffffff;
  --ked-border:      #dedad8;
  --ked-border-mid:  #c8c6c4;
  --ked-hover:       #e9e7e5;
  --ked-active:      #d8d6d3;
  --ked-canvas:      #e4e6eb;

  /* Text */
  --ked-text:        #201f1e;
  --ked-text-muted:  #605e5c;
  --ked-text-subtle: #8a8886;

  /* Semantic */
  --ked-accent-btn:  #cfe3fb;
  --ked-accent-text: #0b57d0;
  --ked-accent-bdr:  #a8ccf0;
  --ked-danger:      #a4262c;
  --ked-success:     #107c41;

  /* Shadow */
  --ked-shadow-sm:   0 1px 3px rgba(0,0,0,.10), 0 1px 2px rgba(0,0,0,.06);
  --ked-shadow-md:   0 4px 12px rgba(0,0,0,.12), 0 2px 4px rgba(0,0,0,.07);
  --ked-shadow-lg:   0 8px 28px rgba(0,0,0,.16), 0 3px 8px rgba(0,0,0,.08);

  /* Transitions */
  --ked-t-fast:      80ms ease;
  --ked-t-base:      140ms ease;

  display: flex; flex-direction: column; height: 100%; min-height: 0; overflow-x: hidden;
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--ked-text);
  font-size: 13px;
}

/* ===== Word-style ribbon ============================================ */
.ked-toolbar {
  flex: 0 0 auto; display: flex; flex-direction: column;
  background: var(--ked-bg);
  border-bottom: 1px solid var(--ked-border);
  user-select: none;
}

/* --- tab strip --- */
.rib-tabs {
  display: flex; align-items: flex-end; gap: 1px; height: 34px;
  padding: 4px 8px 0;
  background: linear-gradient(180deg, var(--ked-blue) 0%, #23498a 100%);
}
/* Tab buttons scroll horizontally on overflow; the right-side cluster
   (.ked-header-review + collapse chevron) stays pinned as siblings of .rib-tabs. */
.rib-tab-scroll {
  flex: 1 1 auto; min-width: 0; display: flex; align-items: flex-end; gap: 1px;
  overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; scrollbar-width: none;
}
.rib-tab-scroll::-webkit-scrollbar { display: none; }
.rib-tab {
  flex: 0 0 auto;
  border: none; background: transparent; cursor: pointer;
  font: inherit; font-size: 13px; color: rgba(255,255,255,0.82);
  padding: 5px 13px 7px; border-radius: 4px 4px 0 0; position: relative;
  transition: color var(--ked-t-fast), background var(--ked-t-fast);
  letter-spacing: 0.01em;
}
.rib-tab:hover { color: #fff; background: rgba(255,255,255,0.12); }
.rib-tab.active {
  background: var(--ked-surface); color: var(--ked-blue); font-weight: 600;
  box-shadow: 0 -1px 3px rgba(0,0,0,0.08), 1px 0 0 var(--ked-border), -1px 0 0 var(--ked-border);
}
.rib-tab.active::after {
  content: ""; position: absolute; left: 8px; right: 8px; top: 0;
  height: 2.5px; background: var(--ked-blue-mid); border-radius: 0 0 2px 2px;
  top: auto; bottom: 0; /* indicator at bottom in active state */
}
.rib-tab.file {
  background: rgba(0,0,0,0.25); color: #fff; font-weight: 700;
  border-radius: 4px 4px 0 0; letter-spacing: 0.02em;
}
.rib-tab.file:hover { background: rgba(0,0,0,0.38); }

/* review controls docked in the ribbon header (right of the tab strip) */
.ked-header-review { margin-left: auto; display: flex; align-items: center; gap: 6px; padding-bottom: 4px; }
.ked-mode-select {
  height: 26px; border: 1px solid rgba(255,255,255,0.35); border-radius: 5px;
  background: rgba(255,255,255,0.12);
  font: inherit; font-size: 12px; color: #fff; padding: 0 6px; cursor: pointer;
  transition: border-color var(--ked-t-fast), background var(--ked-t-fast);
}
.ked-mode-select:hover { border-color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.2); }
.ked-mode-select option { color: var(--ked-text); background: var(--ked-surface); }
.ked-header-btn {
  height: 26px; border: 1px solid rgba(255,255,255,0.35); border-radius: 5px;
  background: rgba(255,255,255,0.12); cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600; color: #fff; padding: 0 12px;
  display: inline-flex; align-items: center; gap: 5px;
  transition: border-color var(--ked-t-fast), background var(--ked-t-fast);
}
.ked-header-btn[hidden], .ked-review-head .ked-btn[hidden] { display: none; }
.ked-header-btn:hover { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.55); }
.ked-header-btn.active {
  background: rgba(255,255,255,0.92); color: var(--ked-blue); border-color: transparent;
  box-shadow: var(--ked-shadow-sm);
}

/* --- ribbon body: one panel visible at a time --- */
.rib-bodies {
  background: var(--ked-surface);
  border-bottom: 1px solid var(--ked-border);
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.rib-panel { display: none; align-items: stretch; min-height: 90px; padding: 0 4px; }
.rib-panel.active { display: flex; }

/* --- group: stacked controls + caption, divider on the right --- */
.rib-group {
  display: flex; flex-direction: column; align-items: center;
  padding: 5px 8px 3px; position: relative;
}
.rib-group + .rib-group::before {
  content: ""; position: absolute; left: 0; top: 10px; bottom: 10px;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--ked-border) 20%, var(--ked-border) 80%, transparent);
}
.rib-controls { display: flex; align-items: center; gap: 2px; flex: 1; }
/* two stacked rows (Font, Paragraph) */
.rib-rows { display: flex; flex-direction: column; gap: 3px; flex: 1; justify-content: center; }
.rib-row { display: flex; align-items: center; gap: 2px; }
.rib-label {
  font-size: 10.5px; color: var(--ked-text-subtle); padding-top: 3px; white-space: nowrap;
  letter-spacing: 0.01em;
}

/* --- buttons --- */
.ked-toolbar button.rib-btn {
  min-width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer;
  color: var(--ked-text); font-size: 13px; padding: 0 4px; gap: 1px;
  transition: background var(--ked-t-fast), border-color var(--ked-t-fast), color var(--ked-t-fast);
}
.ked-toolbar button.rib-btn:hover {
  background: var(--ked-hover);
  border-color: var(--ked-border);
}
.ked-toolbar button.rib-btn:active {
  background: var(--ked-active);
  transform: scale(0.97);
}
.ked-toolbar button.rib-btn.active {
  background: var(--ked-accent-btn);
  color: var(--ked-accent-text);
  border-color: var(--ked-accent-bdr);
}
.ked-toolbar button.rib-btn.active:hover { background: #b8d5f7; }
.ked-toolbar button.rib-btn.active svg { color: var(--ked-accent-text); }
.ked-toolbar button.rib-btn svg { width: 16px; height: 16px; display: block; }
.ked-toolbar button.rib-btn .caret { width: 8px; height: 8px; }

/* large button (Paste): icon over caption */
.ked-toolbar button.rib-big {
  flex-direction: column; height: 100%; min-width: 52px; padding: 5px 7px; gap: 2px; justify-content: center;
}
.ked-toolbar button.rib-big svg { width: 28px; height: 28px; }
.ked-toolbar button.rib-big .big-cap { font-size: 11px; display: flex; align-items: center; gap: 1px; }

/* swatch button: icon row + colour underline */
.ked-toolbar button.rib-swatch { flex-direction: column; gap: 0; padding: 2px 3px; }
.ked-toolbar button.rib-swatch .row { display: flex; align-items: center; gap: 1px; }
.ked-toolbar button.rib-swatch .bar { width: 18px; height: 3px; margin-top: 1px; border-radius: 1px; }

/* disabled stub (feature not supported by the engine yet) */
.ked-toolbar button.rib-btn:disabled { opacity: 0.35; cursor: default; }
.ked-toolbar button.rib-btn:disabled:hover { background: transparent; border-color: transparent; transform: none; }

/* form controls */
.ked-toolbar select, .ked-toolbar input[type="number"] {
  height: 25px; border: 1px solid var(--ked-border-mid); border-radius: 4px;
  background: var(--ked-surface);
  font: inherit; font-size: 12.5px; color: var(--ked-text);
  transition: border-color var(--ked-t-fast);
}
.ked-toolbar select:hover, .ked-toolbar input[type="number"]:hover {
  border-color: var(--ked-text-subtle);
}
.ked-toolbar select:focus, .ked-toolbar input[type="number"]:focus {
  outline: 2px solid var(--ked-blue-light);
  border-color: var(--ked-blue);
}

/* styles gallery */
.rib-gallery {
  display: flex; align-items: center; gap: 4px; height: 64px; padding: 0 4px;
  border: 1px solid var(--ked-border-mid); border-radius: 5px;
  background: var(--ked-surface);
  overflow-x: auto; max-width: 340px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.04);
}
.rib-gallery::-webkit-scrollbar { height: 6px; }
.rib-gallery::-webkit-scrollbar-thumb { background: var(--ked-border-mid); border-radius: 3px; }
.style-card {
  flex: 0 0 auto; width: 76px; height: 52px; border: 1px solid var(--ked-border); border-radius: 4px;
  background: var(--ked-surface); cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px; padding: 2px;
  transition: border-color var(--ked-t-fast), background var(--ked-t-fast), box-shadow var(--ked-t-fast);
}
.style-card:hover { border-color: var(--ked-blue); background: var(--ked-blue-xlight); }
.style-card.active {
  border-color: var(--ked-blue); box-shadow: inset 0 0 0 1px var(--ked-blue);
  background: var(--ked-blue-xlight);
}
.style-card .preview { font-size: 13px; line-height: 1; color: var(--ked-text); }
.style-card .name { font-size: 10px; color: var(--ked-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 72px; }

/* work area: optional outline drawer + ruler + the scrolling page canvas */
.ked-workarea { flex: 1 1 auto; min-height: 0; display: flex; }
.ked-editorpane { flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
/* touch-action: keep one/two-finger PAN (scroll) but disable the browser's
   native pinch-zoom and double-tap-zoom on the document, so our own
   pinch-to-zoom handler (index.ts) owns those gestures. The toolbar/status bar
   keep default touch-action so the ribbon scrolls and taps normally. */
.ked-app {
  flex: 1 1 auto; min-height: 0; min-width: 0; overflow: auto;
  background: var(--ked-canvas);
  position: relative; touch-action: pan-x pan-y;
}

/* ruler row: top-left corner spacer (over the vertical ruler) + horizontal ruler */
.ked-ruler-row { flex: 0 0 22px; display: flex; }
.ked-ruler-row.hidden { display: none; }
.ked-ruler-corner {
  flex: 0 0 22px; width: 22px;
  background: var(--ked-canvas);
  border-bottom: 1px solid var(--ked-border); border-right: 1px solid var(--ked-border);
}
.ked-ruler-corner.hidden { display: none; }
.ked-main-row { flex: 1 1 auto; min-height: 0; min-width: 0; display: flex; }
/* horizontal ruler (inch ticks, margin shading, draggable indent markers) */
.ked-ruler {
  flex: 1 1 auto; height: 22px; position: relative;
  background: var(--ked-canvas);
  border-bottom: 1px solid var(--ked-border); overflow: hidden;
}
.ked-ruler.hidden { display: none; }
.ked-ruler canvas { position: absolute; inset: 0; }
/* vertical ruler (inch ticks + top/bottom margin shading down the left edge) */
.ked-vruler {
  flex: 0 0 22px; width: 22px; position: relative;
  background: var(--ked-canvas);
  border-right: 1px solid var(--ked-border); overflow: hidden;
}
.ked-vruler.hidden { display: none; }
.ked-vruler canvas { position: absolute; inset: 0; }
/* margin handles: right-pointing triangles at the top/bottom content boundaries */
.ked-vruler .vruler-marker { position: absolute; left: 0; width: 0; height: 0; cursor: ns-resize; z-index: 2; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 7px solid var(--ked-blue); }
.ked-ruler .ruler-marker { position: absolute; width: 0; height: 0; cursor: ew-resize; z-index: 2; }
/* left-indent: bottom-pointing triangle sitting on the baseline */
.ked-ruler .ruler-left { bottom: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid var(--ked-blue); }
/* first-line-indent: top-pointing triangle */
.ked-ruler .ruler-first { top: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid var(--ked-blue); }

/* ===== Outline / Navigation drawer ================================== */
.ked-outline {
  flex: 0 0 264px; width: 264px; min-height: 0; overflow-y: auto;
  background: var(--ked-surface);
  border-right: 1px solid var(--ked-border); display: none;
}
.ked-outline.open { display: block; }
.ked-outline .outline-head {
  position: sticky; top: 0; background: var(--ked-surface); z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 8px 10px 14px; border-bottom: 1px solid var(--ked-border);
  font-size: 13px; font-weight: 600; color: var(--ked-text);
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.ked-outline .outline-head button {
  border: none; background: transparent; cursor: pointer; color: var(--ked-text-muted);
  width: 26px; height: 26px; border-radius: 5px; font-size: 17px; line-height: 1;
  transition: background var(--ked-t-fast), color var(--ked-t-fast);
}
.ked-outline .outline-head button:hover { background: var(--ked-hover); color: var(--ked-text); }
.ked-outline-list { padding: 4px 0 12px; }
.outline-item {
  display: block; width: 100%; box-sizing: border-box; text-align: left;
  border: none; border-left: 3px solid transparent; background: transparent; cursor: pointer;
  padding: 5px 12px; color: var(--ked-text); font-size: 13px; line-height: 1.35;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: background var(--ked-t-fast), color var(--ked-t-fast), border-color var(--ked-t-fast);
}
.outline-item:hover { background: var(--ked-hover); }
.outline-item.active {
  background: var(--ked-blue-xlight);
  border-left-color: var(--ked-blue);
  color: var(--ked-blue); font-weight: 600;
}
.outline-empty { padding: 16px 14px; color: var(--ked-text-subtle); font-size: 12px; line-height: 1.5; }

/* ===== Review pane (track changes + comments) ======================= */
.ked-review {
  flex: 0 0 320px; width: 320px; min-height: 0; display: none;
  flex-direction: column; background: #f7f8fa; border-left: 1px solid var(--ked-border);
  font-size: 13px; color: #202124;
}
.ked-review.open { display: flex; }
.ked-review-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 10px 10px 14px; background: var(--ked-surface);
  border-bottom: 1px solid var(--ked-border);
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.ked-review-head .ked-review-title { font-size: 14px; font-weight: 600; color: #202124; }
.ked-review-head .ked-review-title + .ked-btn { margin-left: auto; }
.ked-review-head .ked-review-close {
  margin-left: 0; border: none; background: transparent; cursor: pointer;
  color: #5f6368; width: 28px; height: 28px; border-radius: 50%; font-size: 18px; line-height: 1;
  transition: background var(--ked-t-fast);
}
.ked-review-head .ked-review-close:hover { background: #f1f3f4; }
/* tab strip */
.ked-review-tabs {
  display: flex; background: var(--ked-surface);
  border-bottom: 1px solid var(--ked-border); padding: 0 8px;
}
.ked-review-tab {
  flex: 1 1 0; border: none; background: transparent; cursor: pointer;
  padding: 9px 4px 8px; font-size: 13px; font-weight: 600; color: #5f6368;
  border-bottom: 2px solid transparent;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: color var(--ked-t-fast);
}
.ked-review-tab:hover { color: #202124; }
.ked-review-tab.active { color: var(--ked-blue); border-bottom-color: var(--ked-blue); }
.ked-review-tab .ked-pill {
  background: #e8eaed; color: #5f6368; border-radius: 10px; padding: 0 7px;
  font-size: 11px; font-weight: 700; min-width: 18px; text-align: center;
}
.ked-review-tab.active .ked-pill { background: var(--ked-blue-light); color: var(--ked-blue); }
/* sticky bulk-action bar */
.ked-review-actions {
  display: flex; gap: 8px; padding: 8px 12px; background: #f7f8fa;
  border-bottom: 1px solid var(--ked-border); position: sticky; top: 0; z-index: 1;
}
.ked-review-body { flex: 1 1 auto; overflow-y: auto; padding: 10px 12px; }
.ked-review-empty { padding: 28px 16px; text-align: center; color: var(--ked-text-subtle); font-size: 12.5px; line-height: 1.5; }
.ked-review-empty .ked-review-empty-ico { width: 32px; height: 32px; display: block; margin: 0 auto 10px; opacity: .45; color: var(--ked-text-subtle); }
.ked-review-empty .ked-review-empty-ico svg { width: 32px; height: 32px; }

/* buttons */
.ked-btn {
  border: 1px solid var(--ked-border); background: var(--ked-surface); color: #3c4043; cursor: pointer;
  border-radius: 6px; padding: 5px 14px; font-size: 12.5px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 5px; line-height: 1;
  transition: background var(--ked-t-fast), box-shadow var(--ked-t-fast), border-color var(--ked-t-fast);
}
.ked-btn:hover { background: #f5f5f5; box-shadow: var(--ked-shadow-sm); border-color: var(--ked-border-mid); }
.ked-btn.ked-btn-primary { background: var(--ked-blue); border-color: var(--ked-blue); color: #fff; }
.ked-btn.ked-btn-primary:hover { background: var(--ked-blue-dark); border-color: var(--ked-blue-dark); }
.ked-btn.ked-btn-accept { color: var(--ked-success); border-color: #b7dfca; background: #e8f5ee; }
.ked-btn.ked-btn-accept:hover { background: #d4edde; }
.ked-btn.ked-btn-reject { color: var(--ked-danger); border-color: #f0c4c3; background: #fdecea; }
.ked-btn.ked-btn-reject:hover { background: #f9d5d3; }
.ked-btn.ked-btn-ghost { border-color: transparent; background: transparent; color: var(--ked-blue); padding: 4px 6px; }
.ked-btn.ked-btn-ghost:hover { background: var(--ked-blue-xlight); box-shadow: none; }
.ked-btn-sm { padding: 4px 10px; font-size: 12px; }
.ked-btn:disabled, .ked-header-btn:disabled { opacity: .45; cursor: default; pointer-events: none; }

/* suggestion card */
.ked-sug {
  background: var(--ked-surface); border: 1px solid var(--ked-border);
  border-left: 3px solid var(--ked-author, var(--ked-blue));
  border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;
  box-shadow: var(--ked-shadow-sm);
  cursor: pointer; transition: background var(--ked-t-fast), border-color var(--ked-t-fast);
}
.ked-sug:hover { background: #f8f9fa; border-color: var(--ked-blue-light); }
.ked-sug-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ked-sug-kind { font-weight: 600; font-size: 12.5px; color: #202124; display: flex; align-items: center; gap: 6px; }
.ked-sug-kind .ked-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ked-author, var(--ked-blue)); }
.ked-sug-meta { margin-left: auto; color: var(--ked-text-subtle); font-size: 11.5px; white-space: nowrap; }
.ked-sug-actions { display: flex; gap: 8px; }

/* avatar + comment card */
.ked-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex: 0 0 28px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 700; text-transform: uppercase;
}
.ked-thread {
  background: var(--ked-surface); border: 1px solid var(--ked-border); border-radius: 8px;
  padding: 12px; margin-bottom: 10px; box-shadow: var(--ked-shadow-sm);
  cursor: pointer; transition: border-color var(--ked-t-fast);
}
.ked-thread:hover { border-color: var(--ked-blue-light); }
.ked-thread.active { border-color: var(--ked-blue); box-shadow: 0 0 0 1px var(--ked-blue-light), var(--ked-shadow-sm); }
.ked-thread.resolved { opacity: .58; }
.ked-comment { display: flex; gap: 9px; margin-bottom: 10px; }
.ked-comment:last-of-type { margin-bottom: 6px; }
.ked-comment-main { min-width: 0; flex: 1 1 auto; }
.ked-comment-who { font-weight: 600; font-size: 12.5px; color: #202124; }
.ked-comment-when { color: var(--ked-text-subtle); font-size: 11px; margin-left: 6px; font-weight: 400; }
.ked-comment-body { color: #3c4043; font-size: 13px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; margin-top: 2px; }
.ked-comment-body.deleted, .ked-thread-popover-comment .deleted { color: var(--ked-text-subtle); font-style: italic; }
.ked-comment-actions { display: flex; gap: 2px; margin-top: 3px; }
.ked-comment-menu { position: relative; }
.ked-comment-menu > summary { list-style: none; cursor: pointer; width: 26px; height: 24px; border-radius: 5px; display: grid; place-items: center; color: var(--ked-text-subtle); font-weight: 700; }
.ked-comment-menu > summary::-webkit-details-marker { display: none; }
.ked-comment-menu > summary:hover, .ked-comment-menu > summary:focus-visible { background: var(--ked-blue-xlight); color: var(--ked-blue); outline: none; }
.ked-comment-menu-items { position: absolute; right: 0; top: 26px; z-index: 5; min-width: 112px; padding: 4px; background: var(--ked-surface); border: 1px solid var(--ked-border); border-radius: 7px; box-shadow: var(--ked-shadow-md); }
.ked-comment-menu-items .ked-btn { display: block; width: 100%; text-align: left; padding: 6px 8px; font-size: 11.5px; }
.ked-comment-actions .ked-danger { color: var(--ked-danger); }
.ked-comment-edit { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; margin-top: 6px; }
.ked-comment-edit textarea { grid-column: 1 / -1; resize: vertical; min-height: 54px; border: 1px solid var(--ked-border); border-radius: 6px; padding: 7px; font: 13px/1.4 inherit; }
.ked-thread-actions { display: flex; gap: 4px; align-items: center; padding-top: 6px; border-top: 1px solid #f1f3f4; }
.ked-thread-actions .ked-resolved-tag { color: var(--ked-success); font-size: 11.5px; font-weight: 600; display: flex; align-items: center; gap: 4px; }

/* inline reply editor inside a thread */
.ked-reply-box { display: none; gap: 8px; margin-top: 8px; }
.ked-reply-box.open { display: flex; }
.ked-comment-filters { display: flex; gap: 4px; margin: 0 0 9px; position: sticky; top: 0; z-index: 2; background: #f7f8fa; padding-bottom: 5px; }
.ked-comment-filter { border: 1px solid transparent; background: transparent; color: var(--ked-text-subtle); padding: 4px 9px; border-radius: 12px; cursor: pointer; font: 600 11.5px/1 inherit; }
.ked-comment-filter.active { color: var(--ked-blue); background: var(--ked-blue-xlight); border-color: var(--ked-blue-light); }

/* ===== Comment composer bubble (Google-Docs style, floats by selection) === */
.ked-comment-bubble {
  position: absolute; z-index: 60; width: min(308px, calc(100% - 16px)); box-sizing: border-box;
  background: var(--ked-surface); border: 1px solid var(--ked-border); border-radius: 10px;
  box-shadow: var(--ked-shadow-lg); padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.ked-comment-bubble .ked-bubble-row { display: flex; gap: 9px; align-items: flex-start; min-width: 0; }
.ked-comment-bubble textarea {
  flex: 1 1 auto; resize: none; min-height: 52px; max-height: 180px;
  min-width: 0; box-sizing: border-box; border: none; outline: none;
  font: inherit; font-size: 13px; line-height: 1.45; color: #202124;
  padding: 4px 0; background: transparent;
}
.ked-comment-bubble .ked-bubble-actions { display: flex; justify-content: flex-end; gap: 8px; }
.ked-comment-bubble .ked-btn.ked-btn-primary:disabled { opacity: .4; cursor: default; box-shadow: none; }
.ked-comment-thread-popover { width: min(336px, calc(100% - 16px)); max-height: min(480px, 70vh); }
.ked-thread-popover-head { display: flex; align-items: center; justify-content: space-between; }
.ked-thread-popover-head .ked-review-close { border: 0; background: transparent; font-size: 20px; cursor: pointer; }
.ked-thread-popover-list { overflow: auto; display: flex; flex-direction: column; gap: 9px; }
.ked-thread-popover-comment { border-bottom: 1px solid var(--ked-border); padding-bottom: 8px; font-size: 12.5px; line-height: 1.4; white-space: pre-wrap; }
.ked-thread-popover-comment strong { display: block; margin-bottom: 2px; font-size: 12px; }
.ked-thread-popover-reply { display: grid; grid-template-columns: 1fr auto; gap: 7px; align-items: end; }
.ked-thread-popover-reply textarea { min-height: 38px; resize: vertical; border: 1px solid var(--ked-border); border-radius: 6px; padding: 7px; font: inherit; font-size: 13px; line-height: 1.4; }

/* floating "leave a comment" chip shown beside an editable selection/caret */
.ked-comment-chip {
  position: absolute; z-index: 55; width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--ked-border); background: var(--ked-surface); cursor: pointer;
  box-shadow: var(--ked-shadow-md); color: var(--ked-blue);
  display: flex; align-items: center; justify-content: center;
  padding: 0; line-height: 1; transition: transform var(--ked-t-fast), box-shadow var(--ked-t-fast), background var(--ked-t-fast);
}
.ked-comment-chip svg { width: 18px; height: 18px; }
.ked-comment-chip:hover {
  transform: scale(1.1); box-shadow: var(--ked-shadow-lg);
  background: var(--ked-blue-xlight);
}

/* @-mention autocomplete dropdown + rendered mention chips */
.ked-mention-menu {
  position: fixed; z-index: 70; background: var(--ked-surface);
  border: 1px solid var(--ked-border);
  border-radius: 8px; box-shadow: var(--ked-shadow-lg); padding: 4px; box-sizing: border-box;
  max-height: 220px; overflow-y: auto; overscroll-behavior: contain;
  font: inherit; font-size: 13px; line-height: 1.3; color: var(--ked-text);
}
.ked-mention-item {
  display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 5px 8px; box-sizing: border-box;
  border-radius: 6px; cursor: pointer; color: var(--ked-text);
  transition: background var(--ked-t-fast);
}
.ked-mention-item:hover, .ked-mention-item.active { background: var(--ked-blue-xlight); }
.ked-mention-empty { padding: 12px 10px; color: var(--ked-text-subtle); text-align: center; font-size: 12px; }
.ked-mention-av {
  width: 24px; height: 24px; border-radius: 50%; flex: 0 0 24px;
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase;
}
.ked-mention { color: var(--ked-blue); background: var(--ked-blue-xlight); border-radius: 4px; padding: 0 3px; font-weight: 600; }

/* collapsed ribbon: keep the tab strip, hide the body */
.ked-toolbar.collapsed .rib-bodies { display: none; }

/* compact ribbon (container-width driven via ResizeObserver, see editorApp):
   dense single horizontally-scrollable group row with captions hidden. Keyed off
   the editor's own width, so it also engages for narrow embeds on a wide page.
   The pointer:coarse half of the mobile @media block below carries the same body
   rules for touch devices regardless of width. */
.ked-toolbar.compact .rib-panel {
  min-height: 0; overflow-x: auto; overflow-y: hidden;
  flex-wrap: nowrap; -webkit-overflow-scrolling: touch;
}
.ked-toolbar.compact .rib-label { display: none; }
.ked-toolbar.compact .rib-group { padding: 4px 6px; }
.ked-toolbar.compact .rib-panel::-webkit-scrollbar { height: 6px; }
.ked-toolbar.compact .rib-panel::-webkit-scrollbar-thumb { background: var(--ked-border-mid); border-radius: 3px; }

/* ===== Status bar ================================================== */
.ked-statusbar {
  flex: 0 0 auto; height: 26px; display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(90deg, var(--ked-blue-dark) 0%, var(--ked-blue) 100%);
  color: rgba(255,255,255,0.92); font-size: 12px; padding: 0 10px; user-select: none;
  box-shadow: 0 -1px 0 rgba(0,0,0,0.12);
}
.ked-statusbar .sb-left, .ked-statusbar .sb-right { display: flex; align-items: center; gap: 14px; }
.ked-statusbar .sb-right { gap: 6px; }
.ked-statusbar .sb-item { white-space: nowrap; letter-spacing: 0.01em; }
.ked-statusbar .sb-sep { width: 1px; height: 13px; background: rgba(255,255,255,0.28); }
.ked-statusbar button.sb-btn {
  background: transparent; border: none; color: rgba(255,255,255,0.88); cursor: pointer; font-size: 14px;
  width: 24px; height: 22px; border-radius: 4px; line-height: 1; padding: 0;
  transition: background var(--ked-t-fast), color var(--ked-t-fast);
}
.ked-statusbar button.sb-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }
.ked-statusbar input[type="range"] { width: 110px; cursor: pointer; accent-color: rgba(255,255,255,0.85); }
.ked-statusbar .sb-zoom { min-width: 38px; text-align: right; }

/* ===== Popovers (palettes, menus, pickers, dialogs) ================ */
.ked-pop {
  position: fixed; background: var(--ked-surface);
  border: 1px solid var(--ked-border); border-radius: 8px;
  box-shadow: var(--ked-shadow-lg);
  z-index: 50; font-size: 13px; padding: 4px;
}
.ked-menu { display: flex; flex-direction: column; min-width: 172px; }
.ked-menu button {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  border: none; background: transparent; cursor: pointer; padding: 7px 10px; border-radius: 5px;
  font: inherit; color: var(--ked-text);
  transition: background var(--ked-t-fast);
}
.ked-menu button:hover { background: var(--ked-hover); }
.ked-menu .check { width: 14px; color: var(--ked-blue); }
.ked-menu .sample { color: var(--ked-text-muted); }
.ked-pop-title { font-size: 11px; color: var(--ked-text-subtle); padding: 4px 8px 2px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.ked-swatches { display: grid; grid-template-columns: repeat(6, 22px); gap: 4px; padding: 4px 6px; }
.ked-swatches button {
  width: 22px; height: 22px; border: 1px solid rgba(0,0,0,0.15); border-radius: 4px;
  cursor: pointer; padding: 0;
  transition: transform var(--ked-t-fast), box-shadow var(--ked-t-fast);
}
.ked-swatches button:hover { outline: 2px solid var(--ked-blue); outline-offset: 2px; transform: scale(1.08); }
.ked-pop .pop-action {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; border: none;
  background: transparent; cursor: pointer; padding: 7px 8px; border-radius: 5px;
  font: inherit; color: var(--ked-text);
  border-top: 1px solid var(--ked-border); margin-top: 4px;
  transition: background var(--ked-t-fast);
}
.ked-pop .pop-action:hover { background: var(--ked-hover); }
.ked-grid { display: grid; gap: 2px; padding: 8px 8px 2px; }
.ked-grid .cell {
  width: 16px; height: 16px; border: 1px solid var(--ked-border-mid); background: var(--ked-surface);
  transition: background var(--ked-t-fast), border-color var(--ked-t-fast);
}
.ked-grid .cell.on { background: var(--ked-accent-btn); border-color: var(--ked-blue); }
.ked-grid-label { text-align: center; font-size: 12px; color: var(--ked-text-muted); padding: 4px 0 6px; }
.ked-dialog { display: flex; flex-direction: column; gap: 9px; padding: 12px; min-width: 256px; }
.ked-dialog label { font-size: 12px; color: var(--ked-text-muted); display: flex; flex-direction: column; gap: 3px; font-weight: 500; }
.ked-dialog input {
  height: 30px; border: 1px solid var(--ked-border-mid); border-radius: 5px;
  padding: 0 9px; font: inherit; font-size: 13px; color: var(--ked-text);
  transition: border-color var(--ked-t-fast), box-shadow var(--ked-t-fast);
}
.ked-dialog input:focus { outline: none; border-color: var(--ked-blue); box-shadow: 0 0 0 2px var(--ked-blue-light); }
.ked-dialog .row { display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px; }
.ked-dialog button {
  height: 30px; border: 1px solid var(--ked-border-mid); background: var(--ked-surface);
  border-radius: 5px; cursor: pointer; padding: 0 14px; font: inherit; font-size: 13px;
  font-weight: 500; color: var(--ked-text);
  transition: background var(--ked-t-fast), border-color var(--ked-t-fast);
}
.ked-dialog button:hover { background: var(--ked-hover); }
.ked-dialog button.primary { background: var(--ked-blue); color: #fff; border-color: var(--ked-blue); }
.ked-dialog button.primary:hover { background: var(--ked-blue-dark); }
.ked-dialog button.danger { color: var(--ked-danger); border-color: #f0c4c3; }
.ked-dialog button.danger:hover { background: #fdecea; }

/* ===== Busy overlay (docx import / join / publish) ================= */
.ked-loading-overlay {
  position: fixed; inset: 0; z-index: 70;
  background: rgba(0,0,0,0.32);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(2px);
}
.ked-loading-card {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  background: var(--ked-surface); border: 1px solid var(--ked-border); border-radius: 12px;
  box-shadow: var(--ked-shadow-lg); padding: 28px 36px; min-width: 220px;
}
.ked-spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid var(--ked-blue-light);
  border-top-color: var(--ked-blue);
  animation: ked-spin 0.75s linear infinite;
}
@keyframes ked-spin { to { transform: rotate(360deg); } }
.ked-loading-label { font-size: 13.5px; color: var(--ked-text-muted); text-align: center; font-weight: 500; }
.ked-progress { width: 180px; height: 5px; background: var(--ked-blue-light); border-radius: 3px; overflow: hidden; }
.ked-progress-bar { height: 100%; width: 0%; background: var(--ked-blue); transition: width 0.18s ease; border-radius: 3px; }

/* floating mini-toolbar shown above a selected image */
.ked-img-toolbar {
  position: fixed; display: none; align-items: center; gap: 2px; z-index: 40;
  background: var(--ked-surface); border: 1px solid var(--ked-border); border-radius: 8px; padding: 3px;
  box-shadow: var(--ked-shadow-md);
}
.ked-img-toolbar button {
  width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer;
  color: var(--ked-text);
  transition: background var(--ked-t-fast), color var(--ked-t-fast);
}
.ked-img-toolbar button:hover { background: var(--ked-hover); }
.ked-img-toolbar button.danger:hover { background: #fdecea; color: var(--ked-danger); }
.ked-img-toolbar button svg { width: 16px; height: 16px; }
.ked-img-toolbar .sep { width: 1px; height: 18px; background: var(--ked-border); margin: 0 2px; }

/* ===== Mobile / touch responsive layer ============================== */
/* Activates on touch devices (coarse primary pointer) OR narrow screens.
   Desktop is untouched outside this block. Strategy: collapse the ribbon to one
   horizontally-scrollable row, hide group captions, grow touch targets to ~40px,
   turn the 264px outline into an overlay drawer, and clamp floating panels to
   the viewport (a bottom sheet) so they never render off-screen. */
@media (pointer: coarse), (max-width: 760px) {
  /* Ribbon body: single scrollable row instead of a tall multi-group block. */
  .rib-panel { min-height: 0; overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
  .rib-label { display: none; }
  .rib-group { padding: 4px 6px; }
  /* Touch targets (Apple/Material guideline is ~40-48px). */
  .ked-toolbar button.rib-btn { min-width: 40px; height: 40px; }
  .ked-toolbar button.rib-btn svg { width: 18px; height: 18px; }
  .rib-tab { padding: 9px 14px; font-size: 14px; }
  .ked-toolbar select, .ked-toolbar input[type="number"] { height: 36px; font-size: 14px; }

  /* Outline: overlay the page instead of stealing 264px of a ~360px screen. */
  .ked-workarea { position: relative; }
  .ked-outline { position: absolute; left: 0; top: 0; bottom: 0; height: auto; width: min(264px, 80vw); z-index: 30; box-shadow: 4px 0 20px rgba(0,0,0,0.2); }
  .ked-review { position: absolute; right: 0; top: 0; bottom: 0; height: auto; width: min(320px, 88vw); z-index: 31; box-shadow: -4px 0 20px rgba(0,0,0,0.2); }

  /* Status bar: tappable zoom controls. */
  .ked-statusbar { height: 38px; }
  .ked-statusbar button.sb-btn { width: 32px; height: 30px; font-size: 17px; }
  .ked-statusbar input[type="range"] { width: 96px; }

  /* Floating panels (Page Setup, Find) → bottom sheet; Activity → full-width.
     !important overrides the inline position/size set in editorApp.ts. */
  .ked-float-panel { left: 8px !important; right: 8px !important; top: auto !important; bottom: 8px !important; width: auto !important; max-width: none !important; max-height: 60vh; overflow: auto; }
  .ked-float-drawer { width: 100% !important; }
  .ked-img-toolbar button { width: 36px; height: 36px; }

  /* Image resize handles: 8px dots are unhittable with a finger — an invisible
     ::before pads the touch target to ~24px without changing the visual size. */
  .ked-obj-handle::before { content: ""; position: absolute; inset: -8px; }
}
`;

/** Append a <style id> with the given css once per document, keyed by `id`
 *  (idempotent across calls and hot-reloads). Shared by the editor chrome and
 *  the on-demand modal/menu components so the inject-once pattern lives once. */
export function injectCssOnce(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

/** Inject the component stylesheet once per document (idempotent). */
export function ensureKindyEditorStyles(): void {
  injectCssOnce(STYLE_ID, CSS);
}
