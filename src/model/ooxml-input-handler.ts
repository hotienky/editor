/**
 * OOXML Input Handler
 *
 * Handles keyboard and mouse input for the OOXML canvas editor.
 * Bridges DOM events to OoxmlSelection and provides editing callbacks.
 */

import { OoxmlSelection, type SelectionState } from './ooxml-selection'
import type { OoxmlPainter } from './ooxml-painter'
import type { LayoutTree } from './ooxml-layout-types'

// ─── Input Options ────────────────────────────────────────────────────────────

export interface InputHandlerOptions {
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Whether to enable IME composition */
  enableIME?: boolean
}

// ─── Edit Events ──────────────────────────────────────────────────────────────

export interface InsertTextEvent {
  type: 'insertText'
  text: string
  charIndex: number
}

export interface DeleteTextEvent {
  type: 'deleteText'
  startIndex: number
  endIndex: number
}

export interface FormatTextEvent {
  type: 'formatText'
  startIndex: number
  endIndex: number
  property: string
  value: unknown
}

export type EditEvent = InsertTextEvent | DeleteTextEvent | FormatTextEvent

// ─── Input Handler ────────────────────────────────────────────────────────────

export class OoxmlInputHandler {
  private _selection: OoxmlSelection
  private _painter: OoxmlPainter
  private _tree: LayoutTree | null = null
  private _container: HTMLElement | null = null
  private _hiddenInput: HTMLTextAreaElement | null = null
  private _editListeners: Array<(event: EditEvent) => void> = []
  private _afterInput: Array<() => void> = []
  private _isComposing = false
  private _opts: Required<InputHandlerOptions>

  constructor(
    selection: OoxmlSelection,
    painter: OoxmlPainter,
    options?: InputHandlerOptions,
  ) {
    this._selection = selection
    this._painter = painter
    this._opts = {
      readOnly: options?.readOnly ?? false,
      enableIME: options?.enableIME ?? true,
    }
  }

  /** Set the layout tree (for hit testing) */
  setTree(tree: LayoutTree): void {
    this._tree = tree
  }

  /** Attach to a DOM container */
  attach(container: HTMLElement): void {
    this._container = container

    // Create hidden textarea for keyboard/IME input
    this._hiddenInput = document.createElement('textarea')
    this._hiddenInput.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0'
    this._hiddenInput.setAttribute('autocomplete', 'off')
    this._hiddenInput.setAttribute('autocorrect', 'off')
    this._hiddenInput.setAttribute('spellcheck', 'false')
    container.appendChild(this._hiddenInput)

    // Mouse events
    container.addEventListener('mousedown', this._onMouseDown)
    container.addEventListener('dblclick', this._onDoubleClick)
    container.addEventListener('contextmenu', this._onContextMenu)

    // Keyboard events
    this._hiddenInput.addEventListener('keydown', this._onKeyDown)
    this._hiddenInput.addEventListener('input', this._onInput)
    this._hiddenInput.addEventListener('compositionstart', this._onCompositionStart)
    this._hiddenInput.addEventListener('compositionend', this._onCompositionEnd)

    // Selection change
    this._selection.onChange(this._onSelectionChange)
  }

  /** Detach from DOM */
  detach(): void {
    if (this._hiddenInput) {
      this._hiddenInput.remove()
      this._hiddenInput = null
    }
    if (this._container) {
      this._container.removeEventListener('mousedown', this._onMouseDown)
      this._container.removeEventListener('dblclick', this._onDoubleClick)
      this._container.removeEventListener('contextmenu', this._onContextMenu)
      this._container = null
    }
  }

  /** Subscribe to edit events */
  onEdit(listener: (event: EditEvent) => void): () => void {
    this._editListeners.push(listener)
    return () => { this._editListeners = this._editListeners.filter((l) => l !== listener) }
  }

  /** Subscribe to after-input (re-render trigger) */
  onAfterInput(listener: () => void): () => void {
    this._afterInput.push(listener)
    return () => { this._afterInput = this._afterInput.filter((l) => l !== listener) }
  }

  /** Focus the hidden input (to receive keyboard events) */
  focus(): void {
    this._hiddenInput?.focus()
  }

  /** Whether the handler is in read-only mode */
  get readOnly(): boolean { return this._opts.readOnly }
  set readOnly(v: boolean) { this._opts.readOnly = v }

  // ─── Mouse Events ────────────────────────────────────────────────────────

  private _onMouseDown = (e: MouseEvent): void => {
    if (this._opts.readOnly) return
    const rect = this._container!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (e.shiftKey) {
      this._selection.handleShiftClick(x, y)
    } else {
      this._selection.handleClick(x, y)
    }

    this.focus()
  }

  private _onDoubleClick = (e: MouseEvent): void => {
    if (this._opts.readOnly) return
    const rect = this._container!.getBoundingClientRect()
    this._selection.handleDoubleClick(e.clientX - rect.left, e.clientY - rect.top)
  }

  private _onContextMenu = (e: MouseEvent): void => {
    // Future: show context menu
    e.preventDefault()
  }

  // ─── Keyboard Events ─────────────────────────────────────────────────────

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this._isComposing) return
    if (this._opts.readOnly) return

    const ctrl = e.ctrlKey || e.metaKey

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        if (e.shiftKey) {
          // Extend selection left — future
        } else {
          this._selection.moveLeft()
        }
        break

      case 'ArrowRight':
        e.preventDefault()
        if (e.shiftKey) {
          // Extend selection right — future
        } else {
          this._selection.moveRight()
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        this._selection.moveUp()
        break

      case 'ArrowDown':
        e.preventDefault()
        this._selection.moveDown()
        break

      case 'Home':
        e.preventDefault()
        // Move to line start — future
        break

      case 'End':
        e.preventDefault()
        // Move to line end — future
        break

      case 'Backspace':
        e.preventDefault()
        this._handleDelete(true)
        break

      case 'Delete':
        e.preventDefault()
        this._handleDelete(false)
        break

      case 'Enter':
        e.preventDefault()
        this._handleInsertText('\n')
        break

      case 'Tab':
        e.preventDefault()
        this._handleInsertText('\t')
        break

      default:
        // Ctrl shortcuts
        if (ctrl) {
          switch (e.key.toLowerCase()) {
            case 'a':
              e.preventDefault()
              this._selection.selectAll()
              break
            case 'c':
              e.preventDefault()
              this._handleCopy()
              break
            case 'x':
              e.preventDefault()
              this._handleCut()
              break
            case 'v':
              // Paste is handled by paste event
              break
            case 'z':
              e.preventDefault()
              // Undo — future
              break
            case 'y':
              e.preventDefault()
              // Redo — future
              break
          }
        }
        break
    }
  }

  private _onInput = (): void => {
    if (this._isComposing || this._opts.readOnly) return

    const text = this._hiddenInput?.value
    if (text) {
      this._handleInsertText(text)
      if (this._hiddenInput) this._hiddenInput.value = ''
    }
  }

  private _onCompositionStart = (): void => {
    this._isComposing = true
  }

  private _onCompositionEnd = (e: CompositionEvent): void => {
    this._isComposing = false
    if (this._opts.readOnly) return
    if (e.data) {
      this._handleInsertText(e.data)
    }
  }

  // ─── Edit Operations ─────────────────────────────────────────────────────

  private _handleInsertText(text: string): void {
    const state = this._selection.state
    if (!state.range) return

    const { startIndex, endIndex } = state.range
    const event: EditEvent = {
      type: 'insertText',
      text,
      charIndex: startIndex,
    }

    // Delete selected range first if any
    if (startIndex !== endIndex) {
      this._emitEdit({ type: 'deleteText', startIndex, endIndex })
    }

    this._emitEdit(event)
    this._afterInput.forEach((l) => l())
  }

  private _handleDelete(backward: boolean): void {
    const state = this._selection.state
    if (!state.cursor) return

    const { startIndex, endIndex } = state.range || { startIndex: state.cursor.charIndex, endIndex: state.cursor.charIndex }

    if (startIndex !== endIndex) {
      this._emitEdit({ type: 'deleteText', startIndex, endIndex })
    } else if (backward && startIndex > 0) {
      this._emitEdit({ type: 'deleteText', startIndex: startIndex - 1, endIndex: startIndex })
    } else if (!backward && startIndex < (this._tree?.allBlocks.length ?? 0)) {
      this._emitEdit({ type: 'deleteText', startIndex, endIndex: startIndex + 1 })
    }

    this._afterInput.forEach((l) => l())
  }

  private async _handleCopy(): Promise<void> {
    const text = this._selection.getSelectedText()
    if (text) {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Fallback: use execCommand
        document.execCommand('copy')
      }
    }
  }

  private async _handleCut(): Promise<void> {
    await this._handleCopy()
    this._handleDelete(false)
  }

  private _onSelectionChange = (_state: SelectionState): void => {
    // Future: update toolbar state (bold, italic, etc.)
  }

  private _emitEdit(event: EditEvent): void {
    for (const listener of this._editListeners) {
      listener(event)
    }
  }
}
