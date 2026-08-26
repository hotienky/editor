// Builds the editor's DOM skeleton (the structure index.html used to hard-code)
// under a host-provided container, returning references the app wires into.
// Mirrors the original markup: toolbar, work area (outline drawer + editor pane
// with ruler + scrolling page canvas), status bar.

export interface EditorShell {
  root: HTMLDivElement;
  toolbar: HTMLDivElement;
  outline: HTMLElement;
  ruler: HTMLDivElement;
  /** Vertical ruler down the left of the scroll area, mirroring `ruler`. */
  vruler: HTMLDivElement;
  app: HTMLDivElement;
  /** Right-docked review pane (track changes + comments) — in-flow like the
   *  outline drawer, so it shrinks the editor rather than overlaying it. */
  review: HTMLElement;
  statusbar: HTMLDivElement;
}

export function buildShell(container: HTMLElement): EditorShell {
  // Class-based (not id-based) so multiple editors can share one page — see
  // ui/styles.ts. Every structural node is keyed by a `ked-*` class the shared
  // stylesheet targets under `.kindy-editor-root`.
  const div = (cls?: string, tag: keyof HTMLElementTagNameMap = "div"): HTMLElement => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  };

  const root = div("kindy-editor-root") as HTMLDivElement;

  const toolbar = div("ked-toolbar") as HTMLDivElement;
  const workarea = div("ked-workarea") as HTMLDivElement;
  const outline = div("ked-outline", "aside");
  const editorpane = div("ked-editorpane") as HTMLDivElement;
  // Two rows: a top ruler-row (corner spacer + horizontal ruler) and a main row
  // (vertical ruler + scroll area). The corner keeps the horizontal ruler's left
  // edge aligned with the scroll area, so its pageLeft math needs no change.
  const rulerRow = div("ked-ruler-row") as HTMLDivElement;
  const rulerCorner = div("ked-ruler-corner") as HTMLDivElement;
  const ruler = div("ked-ruler") as HTMLDivElement;
  const mainRow = div("ked-main-row") as HTMLDivElement;
  const vruler = div("ked-vruler") as HTMLDivElement;
  const app = div("ked-app") as HTMLDivElement;
  const review = div("ked-review", "aside");
  const statusbar = div("ked-statusbar") as HTMLDivElement;

  rulerRow.append(rulerCorner, ruler);
  mainRow.append(vruler, app);
  editorpane.append(rulerRow, mainRow);
  workarea.append(outline, editorpane, review);
  root.append(toolbar, workarea, statusbar);
  container.appendChild(root);

  return { root, toolbar, outline, ruler, vruler, app, review, statusbar };
}
