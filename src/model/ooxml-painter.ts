/**
 * OOXML Painter
 *
 * Renders LayoutTree to Canvas 2D context.
 * Text batching for performance, decoration batching for underlines/highlights.
 */

import type {
  LayoutTree,
  LayoutPage,
  LayoutBlock,
  LayoutParagraph,
  LayoutLine,
  LayoutTable,
  TextFragment,
  LayoutGeometry,
} from './ooxml-layout-types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TWIPS_PER_PX = 20 / (96 / 72)

// ─── Options ──────────────────────────────────────────────────────────────────

export interface PainterOptions {
  dpr?: number
  scale?: number
  defaultColor?: string
  selectionColor?: string
  selectionAlpha?: number
  pageColor?: string
  shadowColor?: string
  pageGap?: number
}

const DEFAULTS: Required<PainterOptions> = {
  dpr: 1, scale: 1, defaultColor: '#000000',
  selectionColor: '#0078D7', selectionAlpha: 0.3,
  pageColor: '#FFFFFF', shadowColor: '#E0E0E0', pageGap: 12,
}

// ─── Text Batcher ─────────────────────────────────────────────────────────────

class TextBatcher {
  private _text = ''
  private _x = 0
  private _y = 0
  private _font = ''
  private _color = ''

  record(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string): void {
    if (this._text.length > 0 && Math.abs(y - this._y) < 0.5 && this._font === font && this._color === color) {
      this._text += text
    } else {
      this.complete(ctx)
      this._text = text
      this._x = x
      this._y = y
      this._font = font
      this._color = color
    }
  }

  complete(ctx: CanvasRenderingContext2D): void {
    if (!this._text) return
    ctx.save()
    ctx.font = this._font
    ctx.fillStyle = this._color
    ctx.fillText(this._text, this._x, this._y)
    ctx.restore()
    this._text = ''
  }
}

// ─── Hit Position ─────────────────────────────────────────────────────────────

export interface HitPosition {
  pageIndex: number
  blockIndex: number
  lineIndex: number
  fragmentIndex: number
  charIndex: number
  x: number
  y: number
}

// ─── Layout Position Map ──────────────────────────────────────────────────────

export interface BlockPosition {
  pageIndex: number
  blockIndex: number
  x: number
  y: number
  width: number
  height: number
}

// ─── OOXML Painter ────────────────────────────────────────────────────────────

export class OoxmlPainter {
  private _opts: Required<PainterOptions>
  private _positions: BlockPosition[] = []
  private _pageOffsets: number[] = []
  private _mediaCache = new Map<string, HTMLImageElement>()
  private _mediaMap: Map<string, Uint8Array> | null = null

  setMedia(media: Map<string, Uint8Array> | null): void {
    this._mediaMap = media
  }

  constructor(options?: PainterOptions) {
    this._opts = { ...DEFAULTS, ...options }
  }

  /** Get all block positions (for hit testing) */
  get positions(): BlockPosition[] { return this._positions }

  /** Get page Y offsets (for scroll mapping) */
  get pageOffsets(): number[] { return this._pageOffsets }

  // ─── Measure ──────────────────────────────────────────────────────────────

  /** Measure total document height in pixels */
  measureDocumentHeight(tree: LayoutTree): number {
    let total = 0
    for (const page of tree.pages) {
      total += this._pageHeightPx(page) + this._opts.pageGap
    }
    return total
  }

  // ─── Paint ────────────────────────────────────────────────────────────────

  paint(ctx: CanvasRenderingContext2D, tree: LayoutTree, viewTop: number, viewBottom: number): void {
    this._positions = []
    this._pageOffsets = []

    let yOffset = 0
    for (let pi = 0; pi < tree.pages.length; pi++) {
      const page = tree.pages[pi]
      const pageH = this._pageHeightPx(page)
      this._pageOffsets.push(yOffset)

      // Viewport culling
      if (yOffset + pageH < viewTop - 200 || yOffset > viewBottom + 200) {
        yOffset += pageH + this._opts.pageGap
        continue
      }

      this._drawPageBackground(ctx, page, yOffset)
      this._drawPageContent(ctx, page, pi, yOffset)
      yOffset += pageH + this._opts.pageGap
    }
  }

  // ─── Page Background ─────────────────────────────────────────────────────

  private _drawPageBackground(ctx: CanvasRenderingContext2D, page: LayoutPage, yOffset: number): void {
    const g = page.geometry
    const pw = this._twipToPx(g.pageW)
    const ph = this._twipToPx(g.pageH)

    // Shadow
    ctx.save()
    ctx.shadowColor = this._opts.shadowColor
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fillStyle = this._opts.pageColor
    ctx.fillRect(0, yOffset, pw, ph)
    ctx.restore()
  }

  // ─── Page Content ────────────────────────────────────────────────────────

  private _drawPageContent(ctx: CanvasRenderingContext2D, page: LayoutPage, pageIndex: number, yOffset: number): void {
    const g = page.geometry
    const marginLeft = this._twipToPx(g.marginLeft)
    const marginTop = this._twipToPx(g.marginTop)
    const textBatcher = new TextBatcher()

    // Draw Header (if present on page)
    if (page.header && page.header.blocks.length > 0) {
      const headerTop = yOffset + this._twipToPx(g.headerMargin || 720)
      let hCursorY = headerTop
      for (let hi = 0; hi < page.header.blocks.length; hi++) {
        const hb = page.header.blocks[hi]
        if (hb.type === "paragraph") {
          const r = this._drawParagraph(ctx, hb.data, marginLeft, hCursorY, pageIndex, -1, textBatcher)
          hCursorY += r.height
        } else if (hb.type === "table") {
          const r = this._drawTable(ctx, hb.data, marginLeft, hCursorY, pageIndex, -1, textBatcher)
          hCursorY += r
        }
      }
    }

    // Draw Main Body Blocks
    let cursorY = yOffset + marginTop
    for (let bi = 0; bi < page.blocks.length; bi++) {
      const block = page.blocks[bi]
      const bx = marginLeft

      if (block.type === "paragraph") {
        const result = this._drawParagraph(ctx, block.data, bx, cursorY, pageIndex, bi, textBatcher)
        cursorY += result.height
        this._positions.push({
          pageIndex, blockIndex: bi,
          x: bx, y: cursorY - result.height,
          width: this._twipToPx(block.data.rightIndent ? g.contentW - block.data.leftIndent - block.data.rightIndent : g.contentW),
          height: result.height,
        })
      } else if (block.type === "table") {
        const tableH = this._drawTable(ctx, block.data, bx, cursorY, pageIndex, bi, textBatcher)
        cursorY += tableH
        this._positions.push({
          pageIndex, blockIndex: bi,
          x: bx, y: cursorY - tableH,
          width: this._twipToPx(block.data.width),
          height: tableH,
        })
      }
    }

    // Draw Footer (if present on page)
    if (page.footer && page.footer.blocks.length > 0) {
      const pageHPx = this._twipToPx(g.pageH)
      const footerBottom = yOffset + pageHPx - this._twipToPx(g.footerMargin || 720)
      let fCursorY = footerBottom
      for (let fi = 0; fi < page.footer.blocks.length; fi++) {
        const fb = page.footer.blocks[fi]
        if (fb.type === "paragraph") {
          const r = this._drawParagraph(ctx, fb.data, marginLeft, fCursorY, pageIndex, -2, textBatcher)
          fCursorY += r.height
        }
      }
    }

    textBatcher.complete(ctx)
  }

  // ─── Paragraph ───────────────────────────────────────────────────────────

  private _drawParagraph(
    ctx: CanvasRenderingContext2D,
    para: LayoutParagraph,
    x: number, y: number,
    pageIndex: number, blockIndex: number,
    batcher: TextBatcher,
  ): { height: number } {
    let cursorY = y + this._twipToPx(para.spacingBefore)

    // Draw paragraph shading (background)
    const pPr = para.pPr as any
    if (pPr?.shd?.fill && pPr.shd.fill !== "auto" && pPr.shd.fill !== "FFFFFF") {
      ctx.save()
      ctx.fillStyle = "#" + pPr.shd.fill
      const totalHeightPx = this._twipToPx(para.lines.reduce((s, l) => s + l.height, 0))
      const totalWidthPx = this._twipToPx(para.lines.reduce((max, l) => Math.max(max, l.width), 0))
      ctx.fillRect(x, cursorY, totalWidthPx, totalHeightPx)
      ctx.restore()
    }

    for (let lineIdx = 0; lineIdx < para.lines.length; lineIdx++) {
      const line = para.lines[lineIdx]
      const lineHeightPx = this._twipToPx(line.height)
      const lineAscentPx = this._twipToPx(line.ascent)
      const lineTop = cursorY
      const lineBaseline = cursorY + lineAscentPx

      // Apply firstLineIndent ONLY on the first line (lineIdx === 0)
      const lineIndent = lineIdx === 0
        ? para.leftIndent + para.firstLineIndent
        : para.leftIndent
      let cursorX = x + this._twipToPx(lineIndent)

      for (const frag of line.fragments) {
        if (frag.kind === "break") continue

        if (frag.kind === "drawing") {
          const blip = (frag.rPr as any)?.drawingBlip
          const embedId = blip?.embed || blip?.link || "image1.png"
          const wPx = this._twipToPx(frag.width)
          const hPx = this._twipToPx((frag.rPr as any)?.heightTwips || frag.width)

          if (this._mediaMap && typeof document !== "undefined") {
            let img = this._mediaCache.get(embedId)
            if (!img) {
              let mediaData = this._mediaMap.get(embedId)
              if (!mediaData) {
                for (const [k, v] of this._mediaMap) {
                  if (k.includes(embedId) || embedId.includes(k) || k.endsWith(".png") || k.endsWith(".jpg") || k.endsWith(".jpeg")) {
                    mediaData = v
                    break
                  }
                }
              }
              if (mediaData) {
                const blob = new Blob([mediaData], { type: "image/png" })
                img = new Image()
                img.src = URL.createObjectURL(blob)
                this._mediaCache.set(embedId, img)
              }
            }
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, cursorX, lineTop, wPx, hPx)
            }
          }
          cursorX += wPx
          continue
        }

        const font = this._buildFont(frag)
        const color = frag.color || this._opts.defaultColor

        if (frag.kind === "tab") {
          cursorX += this._twipToPx(frag.width)
          continue
        }

        // Render full text fragment preserving Unicode combining marks
        if (frag.text) {
          const textW = this._twipToPx(frag.width)

          // Highlight
          if (frag.highlight) {
            ctx.save()
            ctx.fillStyle = this._resolveHighlightColor(frag.highlight)
            ctx.fillRect(cursorX, lineTop, textW, lineHeightPx)
            ctx.restore()
          }

          // Text shading (run-level background)
          if (frag.shd?.fill && frag.shd.fill !== "auto" && frag.shd.fill !== "FFFFFF") {
            ctx.save()
            ctx.fillStyle = "#" + frag.shd.fill
            ctx.fillRect(cursorX, lineTop, textW, lineHeightPx)
            ctx.restore()
          }

          batcher.record(ctx, frag.text, cursorX, lineBaseline, font, color)

          // Strikethrough
          if (frag.strike || frag.dstrike) {
            ctx.save()
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            const strikeY = lineBaseline - lineAscentPx * 0.35
            ctx.beginPath()
            ctx.moveTo(cursorX, strikeY)
            ctx.lineTo(cursorX + textW, strikeY)
            ctx.stroke()
            if (frag.dstrike) {
              const doubleY = strikeY + 3
              ctx.beginPath()
              ctx.moveTo(cursorX, doubleY)
              ctx.lineTo(cursorX + textW, doubleY)
              ctx.stroke()
            }
            ctx.restore()
          }

          // Underline
          if (frag.underline && frag.underline !== "none") {
            ctx.save()
            ctx.strokeStyle = frag.underlineColor || color
            ctx.lineWidth = 1
            const underlineY = lineBaseline + 2
            ctx.beginPath()
            ctx.moveTo(cursorX, underlineY)
            ctx.lineTo(cursorX + textW, underlineY)
            ctx.stroke()
            ctx.restore()
          }

          cursorX += textW
        }
      }

      cursorY += lineHeightPx
    }

    cursorY += this._twipToPx(para.spacingAfter)

    // Draw paragraph borders (bottom/top)
    if (pPr?.pBdr) {
      const pBdr = pPr.pBdr
      const paraWidth = this._twipToPx(para.lines.reduce((max, l) => Math.max(max, l.width), 0))

      if (pBdr.top && pBdr.top.val !== "none") {
        ctx.save()
        ctx.strokeStyle = "#" + (pBdr.top.color || "000000")
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + paraWidth, y)
        ctx.stroke()
        ctx.restore()
      }

      if (pBdr.bottom && pBdr.bottom.val !== "none") {
        ctx.save()
        ctx.strokeStyle = "#" + (pBdr.bottom.color || "000000")
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, cursorY)
        ctx.lineTo(x + paraWidth, cursorY)
        ctx.stroke()
        ctx.restore()
      }
    }

    return { height: cursorY - y }
  }

  // ─── Table ───────────────────────────────────────────────────────────────

  private _measureParagraphHeightPx(para: LayoutParagraph): number {
    let totalTwips = (para.spacingBefore || 0) + (para.spacingAfter || 0)
    for (const line of para.lines) {
      totalTwips += line.height
    }
    return this._twipToPx(totalTwips)
  }

  private _drawTable(
    ctx: CanvasRenderingContext2D,
    table: LayoutTable,
    x: number, y: number,
    pageIndex: number, blockIndex: number,
    batcher: TextBatcher,
  ): number {
    let cursorY = y
    const tblPr = table.tblPr as any
    const tblBorders = tblPr?.tblBorders
    const tblCellMar = tblPr?.tblCellMar

    for (const row of table.rows) {
      // Step 1: Pre-calculate maxRowH for this row
      let maxRowH = 0
      for (const cell of row.cells) {
        const cellData = cell as any
        const cellMar = cellData.cellMar || tblCellMar
        const padTop = this._twipToPx(cellMar?.top ?? 0) + 4
        const padBottom = this._twipToPx(cellMar?.bottom ?? 0) + 4
        let cellH = 0
        for (const child of cell.content) {
          if (child.type === "paragraph") {
            cellH += this._measureParagraphHeightPx(child.data)
          }
        }
        maxRowH = Math.max(maxRowH, cellH + padTop + padBottom)
      }

      // Step 2: Draw cell background, borders, and content
      let cursorX = x
      for (const cell of row.cells) {
        const cellW = this._twipToPx(cell.width)
        const cellData = cell as any
        const cellMar = cellData.cellMar || tblCellMar
        const padTop = this._twipToPx(cellMar?.top ?? 0) + 4
        const padLeft = this._twipToPx(cellMar?.start ?? cellMar?.left ?? 0) + 4

        // Shading
        const shd = cellData.shd
        if (shd?.fill && shd.fill !== "auto" && shd.fill !== "FFFFFF") {
          ctx.save()
          ctx.fillStyle = "#" + shd.fill
          ctx.fillRect(cursorX, cursorY, cellW, maxRowH)
          ctx.restore()
        }

        // Cell borders with exact maxRowH
        const cellBorders = cellData.tcBorders
        ctx.save()
        ctx.lineWidth = 1

        const topBorder = cellBorders?.top || tblBorders?.top
        if (topBorder && topBorder.val !== "none") {
          ctx.strokeStyle = "#" + (topBorder.color || "000000")
          ctx.beginPath()
          ctx.moveTo(cursorX, cursorY)
          ctx.lineTo(cursorX + cellW, cursorY)
          ctx.stroke()
        }

        const bottomBorder = cellBorders?.bottom || tblBorders?.bottom
        if (bottomBorder && bottomBorder.val !== "none") {
          ctx.strokeStyle = "#" + (bottomBorder.color || "000000")
          ctx.beginPath()
          ctx.moveTo(cursorX, cursorY + maxRowH)
          ctx.lineTo(cursorX + cellW, cursorY + maxRowH)
          ctx.stroke()
        }

        const leftBorder = cellBorders?.left || tblBorders?.left
        if (leftBorder && leftBorder.val !== "none") {
          ctx.strokeStyle = "#" + (leftBorder.color || "000000")
          ctx.beginPath()
          ctx.moveTo(cursorX, cursorY)
          ctx.lineTo(cursorX, cursorY + maxRowH)
          ctx.stroke()
        }

        const rightBorder = cellBorders?.right || tblBorders?.right
        if (rightBorder && rightBorder.val !== "none") {
          ctx.strokeStyle = "#" + (rightBorder.color || "000000")
          ctx.beginPath()
          ctx.moveTo(cursorX + cellW, cursorY)
          ctx.lineTo(cursorX + cellW, cursorY + maxRowH)
          ctx.stroke()
        }
        ctx.restore()

        // Cell content
        let cellH = 0
        for (const child of cell.content) {
          if (child.type === "paragraph") {
            const r = this._drawParagraph(ctx, child.data, cursorX + padLeft, cursorY + cellH + padTop, pageIndex, blockIndex, batcher)
            cellH += r.height
          }
        }

        cursorX += cellW
      }

      cursorY += maxRowH
    }

    return cursorY - y
  }

  // ─── Selection Rendering ─────────────────────────────────────────────────

  drawSelection(
    ctx: CanvasRenderingContext2D,
    tree: LayoutTree,
    startIndex: number,
    endIndex: number,
  ): void {
    if (startIndex === endIndex) return

    ctx.save()
    ctx.globalAlpha = this._opts.selectionAlpha
    ctx.fillStyle = this._opts.selectionColor

    const start = this._positions[startIndex]
    const end = this._positions[endIndex]
    if (!start || !end) { ctx.restore(); return }

    if (start.pageIndex === end.pageIndex) {
      ctx.fillRect(start.x, start.y, end.x + end.width - start.x, Math.max(start.height, end.height))
    } else {
      // Multi-page selection
      ctx.fillRect(start.x, start.y, this._twipToPx(tree.pages[start.pageIndex].geometry.contentW), start.height)
      for (let pi = start.pageIndex + 1; pi < end.pageIndex; pi++) {
        const pg = tree.pages[pi]
        ctx.fillRect(this._twipToPx(pg.geometry.marginLeft), this._pageOffsets[pi] + this._twipToPx(pg.geometry.marginTop),
          this._twipToPx(pg.geometry.contentW), this._twipToPx(pg.geometry.contentH))
      }
      ctx.fillRect(end.x, end.y, end.width, end.height)
    }

    ctx.restore()
  }

  // ─── Cursor Rendering ────────────────────────────────────────────────────

  getCursorPosition(tree: LayoutTree, charIndex: number): { x: number; y: number; height: number } | null {
    const pos = this._positions[charIndex]
    if (!pos) return null
    return { x: pos.x + pos.width, y: pos.y, height: pos.height }
  }

  // ─── Hit Testing ─────────────────────────────────────────────────────────

  hitTest(x: number, y: number): HitPosition | null {
    for (let i = 0; i < this._positions.length; i++) {
      const p = this._positions[i]
      if (y >= p.y && y <= p.y + p.height && x >= p.x && x <= p.x + p.width) {
        return {
          pageIndex: p.pageIndex, blockIndex: p.blockIndex,
          lineIndex: 0, fragmentIndex: 0, charIndex: i,
          x: p.x, y: p.y,
        }
      }
    }
    return null
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _resolveHighlightColor(hl: string): string {
    const map: Record<string, string> = {
      yellow: "#FFFF00",
      green: "#00FF00",
      cyan: "#00FFFF",
      magenta: "#FF00FF",
      blue: "#0000FF",
      red: "#FF0000",
      darkBlue: "#000080",
      darkCyan: "#008080",
      darkGreen: "#008000",
      darkMagenta: "#800080",
      darkRed: "#800000",
      darkYellow: "#808000",
      darkGray: "#808080",
      lightGray: "#C0C0C0",
      black: "#000000",
    }
    return map[hl] || hl || "#FFFF00"
  }

  private _pageHeightPx(page: LayoutPage): number {
    return this._twipToPx(page.geometry.pageH)
  }

  private _twipToPx(twips: number): number {
    return twips / TWIPS_PER_PX * this._opts.scale
  }

  private _buildFont(frag: TextFragment): string {
    const sizePt = frag.sz * 0.5
    const sizePx = sizePt * (96 / 72) * this._opts.scale
    const weight = frag.bold ? 'bold ' : ''
    const style = frag.italic ? 'italic ' : ''
    return `${style}${weight}${sizePx}px "${frag.fontFamily}"`
  }

  private _measureCharWidth(char: string, font: string): number {
    if (typeof document === 'undefined') return font.length > 0 ? 8 : 0
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return 8
      ctx.font = font
      return ctx.measureText(char).width || 8
    } catch {
      return 8
    }
  }
}
