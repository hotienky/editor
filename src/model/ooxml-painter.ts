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

  record(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, font: string, color: string): void {
    if (this._text.length > 0 && Math.abs(y - this._y) < 0.5 && this._font === font && this._color === color) {
      this._text += char
    } else {
      this.complete(ctx)
      this._text = char
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
    let cursorY = yOffset + marginTop

    const textBatcher = new TextBatcher()

    for (let bi = 0; bi < page.blocks.length; bi++) {
      const block = page.blocks[bi]
      const bx = marginLeft

      if (block.type === 'paragraph') {
        const result = this._drawParagraph(ctx, block.data, bx, cursorY, pageIndex, bi, textBatcher)
        cursorY += result.height
        this._positions.push({
          pageIndex, blockIndex: bi,
          x: bx, y: cursorY - result.height,
          width: this._twipToPx(block.data.rightIndent ? g.contentW - block.data.leftIndent - block.data.rightIndent : g.contentW),
          height: result.height,
        })
      } else if (block.type === 'table') {
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
    const indent = this._twipToPx(para.leftIndent + para.firstLineIndent)

    for (const line of para.lines) {
      let cursorX = x + indent

      for (const frag of line.fragments) {
        const font = this._buildFont(frag)
        const color = frag.color || this._opts.defaultColor

        for (const char of frag.text) {
          batcher.record(ctx, char, cursorX, cursorX = cursorX + this._measureCharWidth(char, font), font, color)
          cursorX -= this._measureCharWidth(char, font)
          // Advance
          const charW = this._measureCharWidth(char, font)
          batcher.record(ctx, char, cursorX, cursorY, font, color)
          cursorX += charW
        }
      }

      cursorY += line.height
    }

    cursorY += this._twipToPx(para.spacingAfter)
    return { height: cursorY - y }
  }

  // ─── Table ───────────────────────────────────────────────────────────────

  private _drawTable(
    ctx: CanvasRenderingContext2D,
    table: LayoutTable,
    x: number, y: number,
    pageIndex: number, blockIndex: number,
    batcher: TextBatcher,
  ): number {
    let cursorY = y

    for (const row of table.rows) {
      let cursorX = x
      let maxRowH = 0

      for (const cell of row.cells) {
        const cellW = this._twipToPx(cell.width)
        let cellH = 0

        // Draw cell border
        ctx.save()
        ctx.strokeStyle = '#CCCCCC'
        ctx.lineWidth = 1
        ctx.strokeRect(cursorX, cursorY, cellW, 1)
        ctx.restore()

        // Draw cell content
        for (const child of cell.content) {
          if (child.type === 'paragraph') {
            const r = this._drawParagraph(ctx, child.data, cursorX + 4, cursorY + cellH + 4, pageIndex, blockIndex, batcher)
            cellH += r.height
          }
        }

        maxRowH = Math.max(maxRowH, cellH + 8)
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
