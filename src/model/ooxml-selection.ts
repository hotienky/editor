/**
 * OOXML Selection Model
 *
 * Manages text selection state for the OOXML canvas editor.
 * Supports: single click, shift-click, double-click (word), triple-click (line).
 * Provides cursor position and selection range for painting.
 */

import type { LayoutTree, LayoutParagraph, LayoutLine, TextFragment } from './ooxml-layout-types'

// ─── Selection Range ──────────────────────────────────────────────────────────

export interface SelectionRange {
  /** Start position (character index in flattened text) */
  startIndex: number
  /** End position (exclusive) */
  endIndex: number
}

// ─── Cursor Position ──────────────────────────────────────────────────────────

export interface CursorPosition {
  /** Character index in flattened text */
  charIndex: number
  /** Page index */
  pageIndex: number
  /** Block index within page */
  blockIndex: number
  /** Line index within block */
  lineIndex: number
  /** Fragment index within line */
  fragmentIndex: number
  /** Character index within fragment */
  charOffset: number
  /** Screen X position in pixels */
  x: number
  /** Screen Y position in pixels */
  y: number
  /** Line height in pixels */
  height: number
}

// ─── Selection State ──────────────────────────────────────────────────────────

export type SelectionMode = 'none' | 'caret' | 'range' | 'word' | 'line' | 'block'

export interface SelectionState {
  mode: SelectionMode
  cursor: CursorPosition | null
  range: SelectionRange | null
}

// ─── Text Index Mapping ───────────────────────────────────────────────────────

interface TextChar {
  char: string
  charIndex: number
  pageIndex: number
  blockIndex: number
  lineIndex: number
  fragmentIndex: number
  charOffset: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * Builds a flat index of all characters in the layout tree.
 * Used for mapping between character indices and screen positions.
 */
export function buildTextIndex(tree: LayoutTree): TextChar[] {
  const index: TextChar[] = []
  let charCounter = 0

  const TWIPS_PER_PX = 20 / (96 / 72)

  for (let pi = 0; pi < tree.pages.length; pi++) {
    const page = tree.pages[pi]
    const pageYOffset = _getPageYOffset(tree, pi)
    const marginTop = page.geometry.marginTop / TWIPS_PER_PX
    const marginLeft = page.geometry.marginLeft / TWIPS_PER_PX
    let cursorY = pageYOffset + marginTop

    for (let bi = 0; bi < page.blocks.length; bi++) {
      const block = page.blocks[bi]

      if (block.type === 'paragraph') {
        const para = block.data
        cursorY += para.spacingBefore / TWIPS_PER_PX

        for (let li = 0; li < para.lines.length; li++) {
          const line = para.lines[li]
          let cursorX = marginLeft + (para.leftIndent + para.firstLineIndent) / TWIPS_PER_PX

          for (let fi = 0; fi < line.fragments.length; fi++) {
            const frag = line.fragments[fi]
            const sizePx = frag.sz * 0.5 * (96 / 72)

            for (let ci = 0; ci < frag.text.length; ci++) {
              index.push({
                char: frag.text[ci],
                charIndex: charCounter++,
                pageIndex: pi,
                blockIndex: bi,
                lineIndex: li,
                fragmentIndex: fi,
                charOffset: ci,
                x: cursorX,
                y: cursorY,
                width: frag.widthPx / frag.text.length || sizePx * 0.6,
                height: line.height / TWIPS_PER_PX,
              })
              cursorX += frag.widthPx / frag.text.length || sizePx * 0.6
            }
          }

          cursorY += line.height / TWIPS_PER_PX
        }

        cursorY += para.spacingAfter / TWIPS_PER_PX
      } else if (block.type === 'table') {
        // Simplified table text indexing
        const table = block.data
        for (const row of table.rows) {
          for (const cell of row.cells) {
            for (const child of cell.content) {
              if (child.type === 'paragraph') {
                for (const line of child.data.lines) {
                  for (const frag of line.fragments) {
                    for (const char of frag.text) {
                      index.push({
                        char, charIndex: charCounter++,
                        pageIndex: pi, blockIndex: bi,
                        lineIndex: 0, fragmentIndex: 0, charOffset: 0,
                        x: 0, y: cursorY,
                        width: frag.widthPx / frag.text.length,
                        height: line.height / TWIPS_PER_PX,
                      })
                    }
                  }
                  cursorY += line.height / TWIPS_PER_PX
                }
              }
            }
          }
        }
      }
    }
  }

  return index
}

function _getPageYOffset(tree: LayoutTree, pageIndex: number): number {
  const TWIPS_PER_PX = 20 / (96 / 72)
  let y = 0
  for (let i = 0; i < pageIndex; i++) {
    y += tree.pages[i].geometry.pageH / TWIPS_PER_PX + 12
  }
  return y
}

// ─── OOXML Selection ──────────────────────────────────────────────────────────

export class OoxmlSelection {
  private _state: SelectionState = { mode: 'none', cursor: null, range: null }
  private _textIndex: TextChar[] = []
  private _listeners: Array<(state: SelectionState) => void> = []

  /** Rebuild the text index from a layout tree */
  rebuildIndex(tree: LayoutTree): void {
    this._textIndex = buildTextIndex(tree)
  }

  /** Subscribe to selection changes */
  onChange(listener: (state: SelectionState) => void): () => void {
    this._listeners.push(listener)
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener)
    }
  }

  /** Get current state */
  get state(): SelectionState { return this._state }

  /** Get selected text */
  getSelectedText(): string {
    if (!this._state.range) return ''
    const { startIndex, endIndex } = this._state.range
    return this._textIndex.slice(startIndex, endIndex).map((c) => c.char).join('')
  }

  // ─── Click Handling ──────────────────────────────────────────────────────

  /** Handle single click at screen coordinates */
  handleClick(x: number, y: number): void {
    const charIdx = this._hitTest(x, y)
    if (charIdx === null) return

    const pos = this._charIndexToPosition(charIdx)
    this._state = {
      mode: 'caret',
      cursor: pos,
      range: { startIndex: charIdx, endIndex: charIdx },
    }
    this._notify()
  }

  /** Handle shift-click to extend selection */
  handleShiftClick(x: number, y: number): void {
    const charIdx = this._hitTest(x, y)
    if (charIdx === null || !this._state.cursor) return

    const startIdx = this._state.cursor.charIndex
    const endIdx = charIdx

    this._state = {
      mode: 'range',
      cursor: this._state.cursor,
      range: { startIndex: Math.min(startIdx, endIdx), endIndex: Math.max(startIdx, endIdx) },
    }
    this._notify()
  }

  /** Handle double-click (word selection) */
  handleDoubleClick(x: number, y: number): void {
    const charIdx = this._hitTest(x, y)
    if (charIdx === null) return

    const wordRange = this._getWordRange(charIdx)
    const pos = this._charIndexToPosition(wordRange.startIndex)

    this._state = {
      mode: 'word',
      cursor: pos,
      range: wordRange,
    }
    this._notify()
  }

  /** Handle triple-click (line selection) */
  handleTripleClick(x: number, y: number): void {
    const charIdx = this._hitTest(x, y)
    if (charIdx === null) return

    const lineRange = this._getLineRange(charIdx)
    const pos = this._charIndexToPosition(lineRange.startIndex)

    this._state = {
      mode: 'line',
      cursor: pos,
      range: lineRange,
    }
    this._notify()
  }

  // ─── Keyboard Movement ───────────────────────────────────────────────────

  /** Move cursor left by one character */
  moveLeft(): void {
    if (!this._state.cursor) return
    const newIdx = Math.max(0, this._state.cursor.charIndex - 1)
    const pos = this._charIndexToPosition(newIdx)
    this._state = { mode: 'caret', cursor: pos, range: { startIndex: newIdx, endIndex: newIdx } }
    this._notify()
  }

  /** Move cursor right by one character */
  moveRight(): void {
    if (!this._state.cursor) return
    const newIdx = Math.min(this._textIndex.length - 1, this._state.cursor.charIndex + 1)
    const pos = this._charIndexToPosition(newIdx)
    this._state = { mode: 'caret', cursor: pos, range: { startIndex: newIdx, endIndex: newIdx } }
    this._notify()
  }

  /** Move cursor up one line */
  moveUp(): void {
    if (!this._state.cursor) return
    const cur = this._state.cursor
    // Find the character directly above
    const targetY = cur.y - cur.height
    let bestIdx = cur.charIndex
    let bestDist = Infinity
    for (let i = 0; i < this._textIndex.length; i++) {
      const c = this._textIndex[i]
      const dist = Math.abs(c.y - targetY) + Math.abs(c.x - cur.x) * 0.1
      if (dist < bestDist && c.pageIndex === cur.pageIndex) {
        bestDist = dist
        bestIdx = i
      }
    }
    const pos = this._charIndexToPosition(bestIdx)
    this._state = { mode: 'caret', cursor: pos, range: { startIndex: bestIdx, endIndex: bestIdx } }
    this._notify()
  }

  /** Move cursor down one line */
  moveDown(): void {
    if (!this._state.cursor) return
    const cur = this._state.cursor
    const targetY = cur.y + cur.height
    let bestIdx = cur.charIndex
    let bestDist = Infinity
    for (let i = 0; i < this._textIndex.length; i++) {
      const c = this._textIndex[i]
      const dist = Math.abs(c.y - targetY) + Math.abs(c.x - cur.x) * 0.1
      if (dist < bestDist && c.pageIndex === cur.pageIndex) {
        bestDist = dist
        bestIdx = i
      }
    }
    const pos = this._charIndexToPosition(bestIdx)
    this._state = { mode: 'caret', cursor: pos, range: { startIndex: bestIdx, endIndex: bestIdx } }
    this._notify()
  }

  /** Select all */
  selectAll(): void {
    if (this._textIndex.length === 0) return
    const first = this._textIndex[0]
    const last = this._textIndex[this._textIndex.length - 1]
    this._state = {
      mode: 'range',
      cursor: this._charIndexToPosition(0),
      range: { startIndex: 0, endIndex: this._textIndex.length },
    }
    this._notify()
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private _hitTest(x: number, y: number): number | null {
    for (let i = 0; i < this._textIndex.length; i++) {
      const c = this._textIndex[i]
      if (y >= c.y && y <= c.y + c.height && x >= c.x && x <= c.x + c.width) {
        return i
      }
    }
    // Find closest character by Y, then X
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < this._textIndex.length; i++) {
      const c = this._textIndex[i]
      const dist = Math.abs(c.y - y) * 10 + Math.abs(c.x - x)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    return bestIdx
  }

  private _charIndexToPosition(charIndex: number): CursorPosition | null {
    const c = this._textIndex[charIndex]
    if (!c) return null
    return {
      charIndex: c.charIndex,
      pageIndex: c.pageIndex,
      blockIndex: c.blockIndex,
      lineIndex: c.lineIndex,
      fragmentIndex: c.fragmentIndex,
      charOffset: c.charOffset,
      x: c.x + c.width,
      y: c.y,
      height: c.height,
    }
  }

  private _getWordRange(charIndex: number): SelectionRange {
    // Simple word boundary detection
    const chars = this._textIndex
    let start = charIndex
    let end = charIndex

    while (start > 0 && this._isWordChar(chars[start - 1].char)) start--
    while (end < chars.length && this._isWordChar(chars[end].char)) end++

    return { startIndex: start, endIndex: end }
  }

  private _getLineRange(charIndex: number): SelectionRange {
    const chars = this._textIndex
    const target = chars[charIndex]
    if (!target) return { startIndex: charIndex, endIndex: charIndex }

    let start = charIndex
    let end = charIndex

    while (start > 0 && chars[start - 1].lineIndex === target.lineIndex && chars[start - 1].pageIndex === target.pageIndex) start--
    while (end < chars.length && chars[end].lineIndex === target.lineIndex && chars[end].pageIndex === target.pageIndex) end++

    return { startIndex: start, endIndex: end }
  }

  private _isWordChar(char: string): boolean {
    return /\w/.test(char) || char === '_'
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener(this._state)
    }
  }
}
