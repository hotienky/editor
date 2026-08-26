// Image Properties dialog — Word-style floating panel that lets the user
// inspect and edit the SELECTED image's size (with lock-aspect toggle),
// text-wrap mode, horizontal alignment, and alt-text.  It follows the same
// floating-dialog pattern as fontDialog / paragraphDialog: non-blocking,
// draggable by the header, closed via the × button.  The caller supplies
// the current props via `initial` and receives an `ImagePropsPatch` (plus
// optional `altText`) on Apply.

import type { ImagePropsPatch } from "@kindy/shared";
import { injectCssOnce } from "./styles";
import { makeFloatingDialog } from "./floatingDialog";

/** Current state of the selected image, read from the document model. */
export interface ImageDialogInitial {
  widthPx: number;
  heightPx: number;
  align: "left" | "center" | "right";
  wrap: "block" | "square" | undefined;
  /** Alt-text stored in the OOXML docPr/@descr attribute. */
  altText?: string;
}

export interface ImageDialogOptions {
  initial: ImageDialogInitial;
  /** Receive a patch to dispatch + the updated alt text. */
  onApply: (patch: ImagePropsPatch, altText: string) => void;
  onClose?: () => void;
}

export interface ImageDialogHandle {
  close(): void;
}

// ---------------------------------------------------------------------------
// CSS

const CSS = `
.cw-imgd-backdrop{position:fixed;inset:0;z-index:1100;}
.cw-imgd-modal{
  width:min(380px,94vw);background:#fff;border-radius:10px;
  box-shadow:0 18px 56px rgba(0,0,0,.32);font:13px/1.5 Arial,sans-serif;
  color:#202124;overflow:hidden;position:fixed;
}
.cw-imgd-head{
  display:flex;align-items:center;gap:8px;padding:11px 14px;
  border-bottom:1px solid #e6e8eb;
}
.cw-imgd-head h2{margin:0;font-size:14px;font-weight:600;flex:1 1 auto;}
.cw-imgd-x{
  border:none;background:transparent;font-size:18px;line-height:1;
  color:#5f6368;cursor:pointer;width:26px;height:26px;border-radius:6px;
  display:inline-flex;align-items:center;justify-content:center;
}
.cw-imgd-x:hover{background:#e8eaed;}
.cw-imgd-body{padding:14px;display:flex;flex-direction:column;gap:14px;}
.cw-imgd-section>label.cw-imgd-head-lbl{
  display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;
  color:#80868b;margin-bottom:6px;
}
.cw-imgd-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.cw-imgd-row label{font-size:13px;color:#3c4043;min-width:56px;}
.cw-imgd-num{
  width:72px;height:26px;border:1px solid #dadce0;border-radius:5px;
  padding:0 6px;font-size:13px;color:#202124;
}
.cw-imgd-num:focus{outline:none;border-color:#1a73e8;}
.cw-imgd-unit{font-size:12px;color:#80868b;}
.cw-imgd-lock{
  width:22px;height:22px;border:1px solid #dadce0;border-radius:5px;
  background:#fff;cursor:pointer;color:#5f6368;
  display:inline-flex;align-items:center;justify-content:center;font-size:13px;
}
.cw-imgd-lock.on{background:#e8f0fe;border-color:#1a73e8;color:#1a73e8;}
.cw-imgd-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#3c4043;}
.cw-imgd-check input{width:15px;height:15px;}
.cw-imgd-seg{display:flex;border:1px solid #dadce0;border-radius:5px;overflow:hidden;}
.cw-imgd-seg button{
  flex:1;height:28px;border:none;background:#fff;cursor:pointer;
  font-size:13px;color:#3c4043;border-right:1px solid #dadce0;
}
.cw-imgd-seg button:last-child{border-right:none;}
.cw-imgd-seg button:hover{background:#f1f3f4;}
.cw-imgd-seg button.active{background:#e8f0fe;color:#1a73e8;font-weight:600;}
.cw-imgd-textarea{
  width:100%;height:56px;border:1px solid #dadce0;border-radius:5px;
  padding:6px 8px;font-size:13px;resize:vertical;box-sizing:border-box;
}
.cw-imgd-textarea:focus{outline:none;border-color:#1a73e8;}
.cw-imgd-footer{
  display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;
  border-top:1px solid #e6e8eb;
}
.cw-imgd-cancel{
  height:30px;border:1px solid #dadce0;border-radius:5px;background:#fff;
  cursor:pointer;font-size:13px;color:#3c4043;padding:0 14px;
}
.cw-imgd-cancel:hover{background:#f1f3f4;}
.cw-imgd-apply{
  height:30px;border:none;border-radius:5px;background:#1a73e8;
  cursor:pointer;font-size:13px;color:#fff;padding:0 18px;
}
.cw-imgd-apply:hover{background:#1765cc;}
`;

// ---------------------------------------------------------------------------

/** Open the Image Properties floating dialog. Returns a handle to close it. */
export function showImageDialog(opts: ImageDialogOptions): ImageDialogHandle {
  injectCssOnce("cw-imgd-styles", CSS);

  const ac = new AbortController();
  const { initial } = opts;

  // ---- DOM structure -------------------------------------------------------
  const backdrop = document.createElement("div");
  backdrop.className = "cw-imgd-backdrop";

  const modal = document.createElement("div");
  modal.className = "cw-imgd-modal";

  const head = document.createElement("div");
  head.className = "cw-imgd-head";

  const title = document.createElement("h2");
  title.textContent = "Image Properties";

  const closeBtn = document.createElement("button");
  closeBtn.className = "cw-imgd-x";
  closeBtn.innerHTML = "&#x2715;";
  closeBtn.title = "Close";

  head.appendChild(title);
  head.appendChild(closeBtn);
  modal.appendChild(head);

  const body = document.createElement("div");
  body.className = "cw-imgd-body";

  // ---- Section: Size -------------------------------------------------------
  const sizeSection = document.createElement("div");
  sizeSection.className = "cw-imgd-section";

  const sizeLbl = document.createElement("label");
  sizeLbl.className = "cw-imgd-head-lbl";
  sizeLbl.textContent = "Size";
  sizeSection.appendChild(sizeLbl);

  let aspectRatio = initial.heightPx > 0 ? initial.widthPx / initial.heightPx : 1;
  let lockAspect = true;

  // Width row
  const widthRow = document.createElement("div");
  widthRow.className = "cw-imgd-row";
  const widthLbl = document.createElement("label");
  widthLbl.textContent = "Width";
  const widthInput = document.createElement("input");
  widthInput.type = "number";
  widthInput.className = "cw-imgd-num";
  widthInput.min = "1";
  widthInput.max = "5000";
  widthInput.step = "1";
  widthInput.value = String(Math.round(initial.widthPx));
  const widthUnit = document.createElement("span");
  widthUnit.className = "cw-imgd-unit";
  widthUnit.textContent = "px";
  widthRow.appendChild(widthLbl);
  widthRow.appendChild(widthInput);
  widthRow.appendChild(widthUnit);

  // Height row + lock button
  const heightRow = document.createElement("div");
  heightRow.className = "cw-imgd-row";
  const heightLbl = document.createElement("label");
  heightLbl.textContent = "Height";
  const heightInput = document.createElement("input");
  heightInput.type = "number";
  heightInput.className = "cw-imgd-num";
  heightInput.min = "1";
  heightInput.max = "5000";
  heightInput.step = "1";
  heightInput.value = String(Math.round(initial.heightPx));
  const heightUnit = document.createElement("span");
  heightUnit.className = "cw-imgd-unit";
  heightUnit.textContent = "px";

  const lockBtn = document.createElement("button");
  lockBtn.className = "cw-imgd-lock on";
  lockBtn.title = "Lock aspect ratio";
  lockBtn.innerHTML = "🔒";
  lockBtn.addEventListener("click", () => {
    lockAspect = !lockAspect;
    lockBtn.classList.toggle("on", lockAspect);
    lockBtn.innerHTML = lockAspect ? "🔒" : "🔓";
    if (lockAspect) {
      aspectRatio =
        parseFloat(widthInput.value) > 0 && parseFloat(heightInput.value) > 0
          ? parseFloat(widthInput.value) / parseFloat(heightInput.value)
          : aspectRatio;
    }
  });

  heightRow.appendChild(heightLbl);
  heightRow.appendChild(heightInput);
  heightRow.appendChild(heightUnit);
  heightRow.appendChild(lockBtn);

  // Aspect-ratio-linked updates
  widthInput.addEventListener("input", () => {
    if (!lockAspect) return;
    const w = parseFloat(widthInput.value);
    if (w > 0 && aspectRatio > 0) heightInput.value = String(Math.max(1, Math.round(w / aspectRatio)));
  });
  heightInput.addEventListener("input", () => {
    if (!lockAspect) return;
    const h = parseFloat(heightInput.value);
    if (h > 0 && aspectRatio > 0) widthInput.value = String(Math.max(1, Math.round(h * aspectRatio)));
  });

  sizeSection.appendChild(widthRow);
  sizeSection.appendChild(heightRow);

  // ---- Section: Text wrap --------------------------------------------------
  const wrapSection = document.createElement("div");
  wrapSection.className = "cw-imgd-section";
  const wrapLbl = document.createElement("label");
  wrapLbl.className = "cw-imgd-head-lbl";
  wrapLbl.textContent = "Text Wrap";

  let currentWrap: "block" | "square" = initial.wrap ?? "block";

  const wrapSeg = document.createElement("div");
  wrapSeg.className = "cw-imgd-seg";
  const makeWrapBtn = (value: "block" | "square", label: string, icon: string): HTMLButtonElement => {
    const b = document.createElement("button");
    b.title = label;
    b.innerHTML = icon;
    b.classList.toggle("active", currentWrap === value);
    b.addEventListener("click", () => {
      currentWrap = value;
      wrapSeg.querySelectorAll("button").forEach((el) => el.classList.remove("active"));
      b.classList.add("active");
    });
    return b;
  };
  wrapSeg.appendChild(
    makeWrapBtn(
      "block",
      "In line with text",
      `<svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="5" y="5" width="6" height="5" rx=".8"/><path d="M2 2.5h12M2 12.5h12"/></svg>`,
    ),
  );
  wrapSeg.appendChild(
    makeWrapBtn(
      "square",
      "Square wrap",
      `<svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="2" y="5" width="5" height="5" rx=".8"/><path d="M2 2.5h12M9 5.5h5M9 8h5M2 12.5h12"/></svg>`,
    ),
  );
  wrapSection.appendChild(wrapLbl);
  wrapSection.appendChild(wrapSeg);

  // ---- Section: Alignment --------------------------------------------------
  const alignSection = document.createElement("div");
  alignSection.className = "cw-imgd-section";
  const alignLbl = document.createElement("label");
  alignLbl.className = "cw-imgd-head-lbl";
  alignLbl.textContent = "Alignment";

  let currentAlign: "left" | "center" | "right" = initial.align;

  const alignSeg = document.createElement("div");
  alignSeg.className = "cw-imgd-seg";
  const makeAlignBtn = (value: "left" | "center" | "right", label: string): HTMLButtonElement => {
    const b = document.createElement("button");
    b.textContent = label;
    b.title = `Align ${value}`;
    b.classList.toggle("active", currentAlign === value);
    b.addEventListener("click", () => {
      currentAlign = value;
      alignSeg.querySelectorAll("button").forEach((el) => el.classList.remove("active"));
      b.classList.add("active");
    });
    return b;
  };
  alignSeg.appendChild(makeAlignBtn("left", "Left"));
  alignSeg.appendChild(makeAlignBtn("center", "Center"));
  alignSeg.appendChild(makeAlignBtn("right", "Right"));
  alignSection.appendChild(alignLbl);
  alignSection.appendChild(alignSeg);

  // ---- Section: Alt text ---------------------------------------------------
  const altSection = document.createElement("div");
  altSection.className = "cw-imgd-section";
  const altLbl = document.createElement("label");
  altLbl.className = "cw-imgd-head-lbl";
  altLbl.textContent = "Alt Text (accessibility)";
  const altInput = document.createElement("textarea");
  altInput.className = "cw-imgd-textarea";
  altInput.placeholder = "Describe the image for screen readers…";
  altInput.value = initial.altText ?? "";
  altSection.appendChild(altLbl);
  altSection.appendChild(altInput);

  body.appendChild(sizeSection);
  body.appendChild(wrapSection);
  body.appendChild(alignSection);
  body.appendChild(altSection);
  modal.appendChild(body);

  // ---- Footer --------------------------------------------------------------
  const footer = document.createElement("div");
  footer.className = "cw-imgd-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cw-imgd-cancel";
  cancelBtn.textContent = "Cancel";

  const applyBtn = document.createElement("button");
  applyBtn.className = "cw-imgd-apply";
  applyBtn.textContent = "Apply";

  footer.appendChild(cancelBtn);
  footer.appendChild(applyBtn);
  modal.appendChild(footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // ---- Floating / draggable ------------------------------------------------
  makeFloatingDialog({ backdrop, modal, handle: head, signal: ac.signal, noDrag: ".cw-imgd-x" });

  // ---- Close logic ---------------------------------------------------------
  const close = (): void => {
    ac.abort();
    backdrop.remove();
    opts.onClose?.();
  };

  closeBtn.addEventListener("click", close, { signal: ac.signal });
  cancelBtn.addEventListener("click", close, { signal: ac.signal });

  // ---- Apply logic ---------------------------------------------------------
  applyBtn.addEventListener(
    "click",
    () => {
      const w = Math.round(Math.max(1, parseFloat(widthInput.value) || initial.widthPx));
      const h = Math.round(Math.max(1, parseFloat(heightInput.value) || initial.heightPx));
      const patch: ImagePropsPatch = { widthPx: w, heightPx: h, align: currentAlign, wrap: currentWrap };
      opts.onApply(patch, altInput.value.trim());
      close();
    },
    { signal: ac.signal },
  );

  return { close };
}
