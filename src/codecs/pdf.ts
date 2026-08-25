import jsPDF from "jspdf"
import domToImage from "dom-to-image-more"

export interface ExportPdfOptions {
  filename?: string
  format?: "a4" | "letter" | [number, number]
  orientation?: "portrait" | "landscape"
  quality?: number
  scale?: number
}

interface PdfTextStyle {
  fontSize: number
  fontType: "normal" | "bold" | "italic" | "bolditalic"
  fontFamily: string
  color: string
  lineHeight: number
  textAlign: "left" | "center" | "right" | "justify"
}

interface PdfPageConfig {
  width: number
  height: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

// ─── Vietnamese / non-Latin1 detection ─────────────────────────────────────
const VIET_RE = /[ăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữựỳỵỷỹ]/i

function containsVietnamese(text: string): boolean {
  return VIET_RE.test(text)
}

function containsNonLatin1(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0xFF) return true
  }
  return false
}

function collectDocText(node: Record<string, unknown>): string {
  if (node.text) return String(node.text)
  const children = (node.content as Array<Record<string, unknown>>) || []
  return children.map(collectDocText).join("")
}

// ─── Color parsing ─────────────────────────────────────────────────────────
function parseColor(color?: string): [number, number, number] {
  if (!color) return [0, 0, 0]
  const hex = color.replace(/^#/, "")
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return [0, 0, 0]
}

// ─── Document metadata extraction ──────────────────────────────────────────
function extractPageConfig(docJson: Record<string, unknown>): PdfPageConfig {
  const defaults: PdfPageConfig = {
    width: 595.28,
    height: 841.89,
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
  }
  const content = (docJson.content as Array<Record<string, unknown>>) || []
  for (const node of content) {
    if (node.type === "sectionBreak" && node.attrs) {
      const a = node.attrs as Record<string, unknown>
      if (a.pageWidth) defaults.width = Number(a.pageWidth)
      if (a.pageHeight) defaults.height = Number(a.pageHeight)
      if (a.marginTop !== undefined && a.marginTop !== null) defaults.marginTop = Number(a.marginTop)
      if (a.marginBottom !== undefined && a.marginBottom !== null) defaults.marginBottom = Number(a.marginBottom)
      if (a.marginLeft !== undefined && a.marginLeft !== null) defaults.marginLeft = Number(a.marginLeft)
      if (a.marginRight !== undefined && a.marginRight !== null) defaults.marginRight = Number(a.marginRight)
      break
    }
  }
  return defaults
}

// ─── Inline content extraction ─────────────────────────────────────────────
function extractTextFromMarks(marks?: Array<{ type: string; attrs?: Record<string, unknown> }>): {
  text: string
  style: Partial<PdfTextStyle>
} {
  const style: Partial<PdfTextStyle> = {}
  for (const mark of marks || []) {
    if (mark.type === "bold") style.fontType = "bold"
    if (mark.type === "italic") {
      style.fontType = style.fontType === "bold" ? "bolditalic" : "italic"
    }
    if (mark.type === "textStyle") {
      const a = mark.attrs || {}
      if (a.fontFamily) style.fontFamily = String(a.fontFamily)
      if (a.fontSize) {
        const size = Number(String(a.fontSize).replace(/[^\d.]/g, ""))
        if (size > 0) style.fontSize = size * 0.75
      }
      if (a.color) style.color = String(a.color)
    }
  }
  return { text: "", style }
}

// ─── PDF Renderer (text-based, Latin-only) ─────────────────────────────────
const FONT_MAP: Record<string, string> = {
  "times new roman": "times",
  "georgia": "times",
  "arial": "helvetica",
  "helvetica": "helvetica",
  "courier new": "courier",
  "courier": "courier",
  "verdana": "helvetica",
  "tahoma": "helvetica",
  "sans-serif": "helvetica",
  "serif": "times",
  "monospace": "courier",
}

function resolveFont(family?: string): string {
  if (!family) return "helvetica"
  const lower = family.toLowerCase().trim()
  for (const [key, val] of Object.entries(FONT_MAP)) {
    if (lower.includes(key)) return val
  }
  return "helvetica"
}

class PdfRenderer {
  private doc: jsPDF
  private pageW: number
  private pageH: number
  private marginL: number
  private marginR: number
  private marginTop: number
  private marginBottom: number
  private contentW: number
  private y: number
  private currentStyle: PdfTextStyle

  constructor(doc: jsPDF, pageConfig: PdfPageConfig) {
    this.doc = doc
    this.pageW = pageConfig.width
    this.pageH = pageConfig.height
    this.marginL = pageConfig.marginLeft
    this.marginR = pageConfig.marginRight
    this.marginTop = pageConfig.marginTop
    this.marginBottom = pageConfig.marginBottom
    this.contentW = this.pageW - this.marginL - this.marginR
    this.y = this.marginTop
    this.currentStyle = {
      fontSize: 12,
      fontType: "normal",
      fontFamily: "helvetica",
      color: "#000000",
      lineHeight: 1.5,
      textAlign: "left",
    }
  }

  private applyStyle(style: Partial<PdfTextStyle>) {
    const s = { ...this.currentStyle, ...style }
    this.currentStyle = s
    const font = resolveFont(s.fontFamily)
    this.doc.setFont(font, s.fontType)
    this.doc.setFontSize(s.fontSize)
    const [r, g, b] = parseColor(s.color)
    this.doc.setTextColor(r, g, b)
  }

  private checkPageBreak(needed: number) {
    if (this.y + needed > this.pageH - this.marginBottom) {
      this.doc.addPage([this.pageW, this.pageH], "portrait")
      this.y = this.marginTop
    }
  }

  private getTextX(text: string): number {
    const align = this.currentStyle.textAlign
    if (align === "center") {
      const tw = this.doc.getTextWidth(text)
      return this.marginL + (this.contentW - tw) / 2
    }
    if (align === "right") {
      const tw = this.doc.getTextWidth(text)
      return this.marginL + this.contentW - tw
    }
    return this.marginL
  }

  private async renderImage(src: string, width: number, height: number) {
    const maxW = this.contentW
    const scale = Math.min(1, maxW / width)
    const imgW = width * scale
    const imgH = height * scale
    this.checkPageBreak(imgH + 8)
    const format = src.includes("image/png") ? "PNG" : "JPEG"
    try {
      this.doc.addImage(src, format, this.marginL, this.y, imgW, imgH)
    } catch {
      try {
        const response = await fetch(src)
        const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        this.doc.addImage(dataUrl, format, this.marginL, this.y, imgW, imgH)
      } catch {
        this.doc.setDrawColor(200, 200, 200)
        this.doc.rect(this.marginL, this.y, imgW, imgH)
        this.applyStyle({ fontSize: 9, color: "#999999" })
        this.doc.text("[image]", this.marginL + 4, this.y + imgH / 2 + 3)
      }
    }
    this.y += imgH + 8
  }

  private renderInlineContent(
    content: Array<Record<string, unknown>>,
    baseStyle: Partial<PdfTextStyle> = {},
  ): Array<{ text: string; style: Partial<PdfTextStyle> }> {
    const parts: Array<{ text: string; style: Partial<PdfTextStyle> }> = []
    for (const child of content) {
      if (child.type === "text" && child.text) {
        const { style } = extractTextFromMarks(child.marks as Array<Record<string, unknown>> | undefined)
        parts.push({ text: String(child.text), style: { ...baseStyle, ...style } })
      } else if (child.type === "hardBreak") {
        parts.push({ text: "\n", style: baseStyle })
      } else if (child.content && Array.isArray(child.content)) {
        const inner = this.renderInlineContent(child.content as Array<Record<string, unknown>>, baseStyle)
        parts.push(...inner)
      }
    }
    return parts
  }

  private renderTextLines(lines: string[]) {
    for (const line of lines) {
      this.checkPageBreak(this.currentStyle.fontSize * this.currentStyle.lineHeight + 4)
      const x = this.getTextX(line)
      this.doc.text(line, x, this.y)
      this.y += this.currentStyle.fontSize * this.currentStyle.lineHeight
    }
  }

  private renderTable(tableNode: Record<string, unknown>) {
    const rows = (tableNode.content as Array<Record<string, unknown>>) || []
    if (rows.length === 0) return
    const tableAttrs = (tableNode.attrs || {}) as Record<string, unknown>
    const tableBorders = tableAttrs.borders as Record<string, unknown> | undefined

    const grid: Array<Array<{ text: string; colspan: number; shading?: string }>> = []
    const maxColsArr: number[] = []

    for (const row of rows) {
      const cells = (row.content as Array<Record<string, unknown>>) || []
      const rowCells: Array<{ text: string; colspan: number; shading?: string }> = []
      let colIdx = 0
      for (const cell of cells) {
        const cellAttrs = (cell.attrs || {}) as Record<string, unknown>
        const colspan = Number(cellAttrs.colspan) || 1
        const shading = cellAttrs.background as string | undefined
        const content = (cell.content as Array<Record<string, unknown>>) || []
        const parts = this.renderInlineContent(content, { fontSize: 10 })
        const text = parts.map((p) => p.text).join(" ")
        rowCells.push({ text, colspan, shading })
        colIdx += colspan
      }
      grid.push(rowCells)
      maxColsArr.push(colIdx)
    }

    const totalCols = Math.max(...maxColsArr, 1)
    if (totalCols === 0) return

    const colWidths: number[] = []
    const cw = this.contentW / totalCols
    for (let i = 0; i < totalCols; i++) colWidths.push(cw)

    // Calculate row heights
    const rowHeights: number[] = []
    for (const row of grid) {
      let maxLines = 1
      let colOffset = 0
      for (const cell of row) {
        const w = colWidths.slice(colOffset, colOffset + cell.colspan).reduce((s, v) => s + v, 0) - 6
        const lines = this.doc.splitTextToSize(cell.text, Math.max(w, 20))
        maxLines = Math.max(maxLines, lines.length)
        colOffset += cell.colspan
      }
      rowHeights.push(Math.max(20, maxLines * 12 + 8))
    }

    const totalH = rowHeights.reduce((s, v) => s + v, 0)
    this.checkPageBreak(totalH + 8)

    const startY = this.y
    let cellY = startY

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r]
      let cellX = this.marginL

      for (const cell of row) {
        let actualCellW = 0
        for (let ci = 0; ci < cell.colspan; ci++) {
          const baseIdx = Math.round((cellX - this.marginL) / (this.contentW / totalCols))
          actualCellW += colWidths[Math.min(baseIdx + ci, totalCols - 1)] || (this.contentW / totalCols)
        }

        if (cell.shading) {
          const [sr, sg, sb] = parseColor(cell.shading)
          this.doc.setFillColor(sr, sg, sb)
          this.doc.rect(cellX, cellY, actualCellW, rowHeights[r], "F")
        }

        const borderColor: [number, number, number] = tableBorders
          ? parseColor(String(tableBorders.color || "#000000"))
          : [0, 0, 0]
        const borderSz = tableBorders ? Number(tableBorders.size) || 0.5 : 0.5
        if (borderSz > 0) {
          this.doc.setDrawColor(...borderColor)
          this.doc.setLineWidth(borderSz)
          this.doc.line(cellX, cellY + rowHeights[r], cellX + actualCellW, cellY + rowHeights[r])
          this.doc.line(cellX + actualCellW, cellY, cellX + actualCellW, cellY + rowHeights[r])
          if (r === 0) this.doc.line(cellX, cellY, cellX + actualCellW, cellY)
          if (cellX === this.marginL) this.doc.line(cellX, cellY, cellX, cellY + rowHeights[r])
        }

        this.doc.setFontSize(10)
        this.doc.setFont("helvetica", "normal")
        this.doc.setTextColor(0, 0, 0)
        const textW = actualCellW - 6
        const lines = this.doc.splitTextToSize(cell.text, Math.max(textW, 20))
        const lineH = 12
        const textStartY = cellY + 4 + lineH
        for (let li = 0; li < lines.length; li++) {
          this.doc.text(lines[li], cellX + 3, textStartY + li * lineH)
        }
        cellX += actualCellW
      }
      cellY += rowHeights[r]
    }
    this.y = cellY + 8
  }

  private renderList(node: Record<string, unknown>, depth: number = 0) {
    const isBullet = node.type === "bulletList"
    const items = (node.content as Array<Record<string, unknown>>) || []
    let counter = Number(node.attrs?.start) || 1
    for (const item of items) {
      const itemContent = (item.content as Array<Record<string, unknown>>) || []
      const indent = this.marginL + depth * 20
      const bullet = isBullet ? "\u2022" : `${counter}.`
      for (const child of itemContent) {
        if (child.type === "bulletList" || child.type === "orderedList") {
          this.renderList(child, depth + 1)
          continue
        }
        const content = (child.content as Array<Record<string, unknown>>) || []
        const parts = this.renderInlineContent(content, this.currentStyle)
        const fullText = parts.map((p) => p.text).join("")
        if (!fullText.trim()) continue
        const bulletW = this.doc.getTextWidth(`${bullet}  `)
        const lines = this.doc.splitTextToSize(fullText, this.contentW - bulletW - depth * 20)
        for (let i = 0; i < lines.length; i++) {
          this.checkPageBreak(this.currentStyle.fontSize * this.currentStyle.lineHeight + 4)
          if (i === 0) this.doc.text(bullet, indent, this.y)
          this.doc.text(lines[i], indent + bulletW, this.y)
          this.y += this.currentStyle.fontSize * this.currentStyle.lineHeight
        }
        this.y += 2
      }
      counter++
    }
  }

  private renderNodes(nodes: Array<Record<string, unknown>>) {
    for (const node of nodes) {
      if (this.y > this.pageH - this.marginBottom) {
        this.doc.addPage([this.pageW, this.pageH], "portrait")
        this.y = this.marginTop
      }
      if (node.type === "sectionBreak") continue

      if (node.type === "heading") {
        const level = Number(node.attrs?.level) || 1
        const sizeMap: Record<number, number> = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 11 }
        const align = (node.attrs?.textAlign as string) || "left"
        this.applyStyle({ fontSize: sizeMap[level] || 14, fontType: "bold", textAlign: align as PdfTextStyle["textAlign"] })
        const content = (node.content as Array<Record<string, unknown>>) || []
        const parts = this.renderInlineContent(content, this.currentStyle)
        const fullText = parts.map((p) => p.text).join("")
        if (fullText.trim()) {
          const lines = this.doc.splitTextToSize(fullText, this.contentW)
          this.renderTextLines(lines)
          this.y += 8
        }
      } else if (node.type === "paragraph") {
        const align = (node.attrs?.textAlign as string) || "left"
        this.applyStyle({ fontSize: 12, textAlign: align as PdfTextStyle["textAlign"] })
        const content = (node.content as Array<Record<string, unknown>>) || []
        const parts = this.renderInlineContent(content, this.currentStyle)
        const fullText = parts.map((p) => p.text).join("")
        if (!fullText.trim()) { this.y += 8; continue }
        const lines = this.doc.splitTextToSize(fullText, this.contentW)
        this.renderTextLines(lines)
        this.y += 6
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        this.applyStyle({ fontSize: 12 })
        this.renderList(node)
      } else if (node.type === "table") {
        this.renderTable(node)
      } else if (node.type === "image" || node.type === "inlineImage") {
        if (node.attrs?.src) {
          this.renderImage(String(node.attrs.src), Number(node.attrs.width) || 150, Number(node.attrs.height) || 100)
        }
      } else if (node.type === "pageBreak") {
        this.doc.addPage([this.pageW, this.pageH], "portrait")
        this.y = this.marginTop
      } else if (node.type === "blockquote") {
        this.applyStyle({ fontSize: 12, fontType: "italic" })
        const content = (node.content as Array<Record<string, unknown>>) || []
        for (const child of content) {
          const childContent = (child.content as Array<Record<string, unknown>>) || []
          const parts = this.renderInlineContent(childContent, this.currentStyle)
          const fullText = parts.map((p) => p.text).join("")
          if (!fullText.trim()) continue
          this.doc.setDrawColor(180, 180, 180)
          this.doc.line(this.marginL, this.y - 4, this.marginL, this.y + 14)
          const lines = this.doc.splitTextToSize(fullText, this.contentW - 16)
          for (const line of lines) {
            this.checkPageBreak(this.currentStyle.fontSize * this.currentStyle.lineHeight + 4)
            this.doc.text(line, this.marginL + 16, this.y)
            this.y += this.currentStyle.fontSize * this.currentStyle.lineHeight
          }
          this.y += 4
        }
      } else if (node.content && Array.isArray(node.content)) {
        this.renderNodes(node.content as Array<Record<string, unknown>>)
      }
    }
  }

  render(documentJson: Record<string, unknown>) {
    const content = (documentJson.content as Array<Record<string, unknown>>) || []
    this.renderNodes(content)
  }
}

// ─── Image-based PDF generation ────────────────────────────────────────────
async function imageBasedPdf(
  prosemirrorEl: HTMLElement | null,
  options: ExportPdfOptions = {},
): Promise<Blob> {
  const orientation = options.orientation || "portrait"

  // Try to read page config from document
  let pageConfig: PdfPageConfig = {
    width: 595.28, height: 841.89,
    marginTop: 72, marginBottom: 72, marginLeft: 72, marginRight: 72,
  }
  if (prosemirrorEl) {
    const editorView = (prosemirrorEl as any)?.editor?.view
    if (editorView?.state?.doc) {
      pageConfig = extractPageConfig(editorView.state.doc.toJSON())
    }
  }

  const pdfW = pageConfig.width
  const pdfH = pageConfig.height

  // Capture the page editor wrap
  const pageContentNode = (
    document.querySelector<HTMLElement>(".kindy-page-editor-wrap") ||
    document.querySelector<HTMLElement>(".kindy-page-content") ||
    prosemirrorEl ||
    document.querySelector<HTMLElement>(".kindy-editor-content") ||
    document.querySelector<HTMLElement>(".kindy-page-scale-shell")
  )

  if (!pageContentNode) {
    throw new Error("Không tìm thấy nội dung văn bản để xuất PDF")
  }

  // Capture at 2x resolution for sharpness
  const imgData = await domToImage.toPng(pageContentNode, {
    bgcolor: "#ffffff",
    pixelRatio: 2,
    style: { margin: "0", boxShadow: "none", border: "none" },
    filter: (node: Node) => {
      if (node instanceof HTMLElement) {
        const cls = node.className || ""
        if (
          cls.includes("kindy-ruler") ||
          cls.includes("kindy-bubble-menu") ||
          cls.includes("kindy-floating-comments") ||
          cls.includes("tiptap-invisible-character")
        ) {
          return false
        }
      }
      return true
    },
  })

  if (imgData && imgData.startsWith("data:")) {
    const img = new Image()
    img.src = imgData
    await new Promise((resolve) => { img.onload = resolve })

    const doc = new jsPDF({
      orientation,
      unit: "pt",
      format: [pdfW, pdfH],
    })

    // Scale image to fit PDF page width
    const scaledHeight = (img.naturalHeight / img.naturalWidth) * pdfW

    if (scaledHeight <= pdfH) {
      // Single page
      doc.addImage(imgData, "PNG", 0, 0, pdfW, scaledHeight)
    } else {
      // Multi-page: slice the image vertically
      const sourcePageH = (pdfH / pdfW) * img.naturalWidth
      let srcY = 0
      let pageIdx = 0

      while (srcY < img.naturalHeight) {
        if (pageIdx > 0) doc.addPage([pdfW, pdfH], orientation)

        const remainingSrcH = img.naturalHeight - srcY
        const sliceH = Math.min(sourcePageH, remainingSrcH)
        const destH = (sliceH / img.naturalWidth) * pdfW

        // Create a canvas for this slice
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth
        canvas.height = sliceH
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, srcY, img.naturalWidth, sliceH, 0, 0, img.naturalWidth, sliceH)
          const sliceData = canvas.toDataURL("image/png")
          doc.addImage(sliceData, "PNG", 0, 0, pdfW, destH)
        }

        srcY += sliceH
        pageIdx++
      }
    }

    const filename = `${(options.filename || "document").replace(/\.(docx|json|pdf)$/i, "")}.pdf`
    if (typeof window !== "undefined") doc.save(filename)
    return doc.output("blob")
  }

  // Fallback: empty PDF
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" })
  const filename = `${(options.filename || "document").replace(/\.(docx|json|pdf)$/i, "")}.pdf`
  if (typeof window !== "undefined") doc.save(filename)
  return doc.output("blob")
}

// ─── Export function ───────────────────────────────────────────────────────
export async function exportDocumentToPdf(
  _unusedContainerEl: HTMLElement | null,
  options: ExportPdfOptions = {},
): Promise<Blob> {
  const orientation = options.orientation || "portrait"

  // Tier 1: OOXML canvas images
  const ooxmlCanvases = Array.from(
    document.querySelectorAll<HTMLCanvasElement>(
      ".ooxml-page-canvas, .kindy-page-surface canvas, canvas.ooxml-page",
    ),
  )

  if (ooxmlCanvases.length > 0) {
    const doc = new jsPDF({ orientation, unit: "pt", format: "a4" })
    const pdfW = doc.internal.pageSize.getWidth()
    const pdfH = doc.internal.pageSize.getHeight()
    for (let i = 0; i < ooxmlCanvases.length; i++) {
      const cvs = ooxmlCanvases[i]
      const imgData = cvs.toDataURL("image/jpeg", options.quality ?? 0.98)
      if (imgData && imgData.startsWith("data:")) {
        if (i > 0) doc.addPage("a4", orientation)
        doc.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH)
      }
    }
    const filename = `${(options.filename || "document").replace(/\.(docx|json|pdf)$/i, "")}.pdf`
    if (typeof window !== "undefined") doc.save(filename)
    return doc.output("blob")
  }

  // Check for Vietnamese / non-Latin text → use image-based for correct rendering
  const prosemirrorEl = document.querySelector<HTMLElement>(".ProseMirror")
  let useImageBased = false

  if (prosemirrorEl) {
    const editorView = (prosemirrorEl as any)?.editor?.view
    if (editorView?.state?.doc) {
      const json = editorView.state.doc.toJSON()
      const fullText = collectDocText(json)
      if (containsVietnamese(fullText) || containsNonLatin1(fullText)) {
        useImageBased = true
      }
    }
  }

  // For non-Vietnamese: try text-based PdfRenderer
  if (!useImageBased && prosemirrorEl) {
    const editorView = (prosemirrorEl as any)?.editor?.view
    if (editorView?.state?.doc) {
      try {
        const json = editorView.state.doc.toJSON()
        const pageConfig = extractPageConfig(json)
        const doc = new jsPDF({
          orientation,
          unit: "pt",
          format: [pageConfig.width, pageConfig.height],
        })
        const renderer = new PdfRenderer(doc, pageConfig)
        renderer.render(json)
        const filename = `${(options.filename || "document").replace(/\.(docx|json|pdf)$/i, "")}.pdf`
        if (typeof window !== "undefined") doc.save(filename)
        return doc.output("blob")
      } catch (err) {
        console.warn("[PDF] Text-based render failed, falling back to image-based:", err)
      }
    }
  }

  // Image-based fallback (Vietnamese, complex layouts, or text-based failed)
  return imageBasedPdf(prosemirrorEl, options)
}
