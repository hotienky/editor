/**
 * OOXML Editor
 *
 * State management, undo/redo, and re-layout coordination.
 * Bridges OoxmlInputHandler events → OoxmlTransaction → OoxmlLayoutEngine.
 */

import type { OoxmlPackage } from './ooxml-types'
import type { LayoutTree } from './ooxml-layout-types'
import type { EditEvent } from './ooxml-input-handler'
import type { Transaction, TransactionOp } from './ooxml-transaction'
import { applyTransaction, undoTransaction } from './ooxml-transaction'
import { getDocumentCharCount } from './ooxml-char-index'
import { OoxmlLayoutEngine } from './ooxml-layout-engine'
import { OoxmlSelection, buildTextIndex } from './ooxml-selection'
import { OoxmlPainter } from './ooxml-painter'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorOptions {
  maxUndoSize?: number
}

export type EditorChangeType = 'edit' | 'undo' | 'redo' | 'load'

export interface EditorChangeEvent {
  type: EditorChangeType
  pkg: OoxmlPackage
  tree: LayoutTree
}

export type EditorChangeListener = (event: EditorChangeEvent) => void

// ─── Editor ───────────────────────────────────────────────────────────────────

export class OoxmlEditor {
  private _pkg: OoxmlPackage
  private _layoutEngine: OoxmlLayoutEngine
  private _tree: LayoutTree
  private _selection: OoxmlSelection
  private _painter: OoxmlPainter

  // Undo/redo stacks
  private _undoStack: Transaction[] = []
  private _redoStack: Transaction[] = []
  private _maxUndoSize: number

  // Change listeners
  private _listeners = new Set<EditorChangeListener>()

  // Batch editing flag
  private _isBatching = false
  private _batchOps: TransactionOp[] = []
  private _batchInverses: TransactionOp[] = []

  constructor(
    pkg: OoxmlPackage,
    options?: EditorOptions,
  ) {
    this._pkg = pkg
    this._layoutEngine = new OoxmlLayoutEngine()
    this._tree = this._layoutEngine.layout(pkg)
    this._selection = new OoxmlSelection()
    this._painter = new OoxmlPainter()
    this._maxUndoSize = options?.maxUndoSize ?? 200

    // Build initial selection index
    this._selection.rebuildIndex(this._tree)
  }

  // ── Getters ──

  get pkg(): OoxmlPackage { return this._pkg }
  get tree(): LayoutTree { return this._tree }
  get selection(): OoxmlSelection { return this._selection }
  get painter(): OoxmlPainter { return this._painter }
  get charCount(): number { return getDocumentCharCount(this._pkg) }
  get canUndo(): boolean { return this._undoStack.length > 0 }
  get canRedo(): boolean { return this._redoStack.length > 0 }

  // ── Edit handling ──

  /**
   * Handle an EditEvent from OoxmlInputHandler.
   * Applies the edit, re-layoutes, and notifies listeners.
   */
  handleEdit(event: EditEvent): void {
    const ops = this._editEventToOps(event)
    if (ops.length === 0) return

    this.applyOps(ops)
  }

  /**
   * Apply a list of operations. Pushes to undo stack.
   */
  applyOps(ops: TransactionOp[]): void {
    if (this._isBatching) {
      // Accumulate in batch
      for (const op of ops) {
        const inverse = this._applySingleOp(op)
        if (inverse) this._batchInverses.push(inverse)
      }
      return
    }

    // Apply all ops and collect inverses
    const allInverses: TransactionOp[] = []
    for (const op of ops) {
      const inverse = this._applySingleOp(op)
      if (inverse) allInverses.push(inverse)
    }

    if (allInverses.length > 0) {
      const transaction: Transaction = { ops, inverses: allInverses }
      this._undoStack.push(transaction)
      if (this._undoStack.length > this._maxUndoSize) {
        this._undoStack.shift()
      }
      this._redoStack = []
    }

    this._relayout('edit')
  }

  /**
   * Begin a batch of operations (single undo step).
   */
  beginBatch(): void {
    this._isBatching = true
    this._batchOps = []
    this._batchInverses = []
  }

  /**
   * End a batch and push as a single undo step.
   */
  endBatch(): void {
    this._isBatching = false
    if (this._batchInverses.length > 0) {
      const transaction: Transaction = {
        ops: this._batchOps,
        inverses: this._batchInverses,
      }
      this._undoStack.push(transaction)
      if (this._undoStack.length > this._maxUndoSize) {
        this._undoStack.shift()
      }
      this._redoStack = []
      this._relayout('edit')
    }
    this._batchOps = []
    this._batchInverses = []
  }

  /**
   * Cancel a batch without applying.
   */
  cancelBatch(): void {
    // Undo everything in the batch
    for (let i = this._batchInverses.length - 1; i >= 0; i--) {
      this._applySingleOp(this._batchInverses[i])
    }
    this._isBatching = false
    this._batchOps = []
    this._batchInverses = []
    this._relayout('undo')
  }

  // ── Undo/Redo ──

  undo(): boolean {
    const transaction = this._undoStack.pop()
    if (!transaction) return false

    undoTransaction(this._pkg, transaction)
    this._redoStack.push(transaction)
    this._relayout('undo')
    return true
  }

  redo(): boolean {
    const transaction = this._redoStack.pop()
    if (!transaction) return false

    // Re-apply the original ops
    for (const op of transaction.ops) {
      this._applySingleOp(op)
    }
    this._undoStack.push(transaction)
    this._relayout('redo')
    return true
  }

  // ── External operations ──

  /**
   * Apply external operations (e.g., from collaboration).
   * Does NOT push to undo stack.
   */
  applyExternalOps(ops: TransactionOp[]): void {
    for (const op of ops) {
      this._applySingleOp(op)
    }
    this._relayout('edit')
  }

  // ── Listeners ──

  onChange(listener: EditorChangeListener): () => void {
    this._listeners.add(listener)
    return () => { this._listeners.delete(listener) }
  }

  // ── Private ──

  private _applySingleOp(op: TransactionOp): TransactionOp | null {
    const result = applyTransaction(this._pkg, [op])
    return result.inverses[0] ?? null
  }

  private _relayout(type: EditorChangeType): void {
    this._tree = this._layoutEngine.layout(this._pkg)
    this._selection.rebuildIndex(this._tree)

    this._notify({ type, pkg: this._pkg, tree: this._tree })
  }

  private _notify(event: EditorChangeEvent): void {
    for (const listener of this._listeners) {
      listener(event)
    }
  }

  private _editEventToOps(event: EditEvent): TransactionOp[] {
    switch (event.type) {
      case 'insertText':
        return [{ type: 'insertText', charIndex: event.charIndex, text: event.text }]
      case 'deleteText':
        return [{ type: 'deleteText', startIndex: event.startIndex, endIndex: event.endIndex }]
      case 'formatText':
        return [{
          type: 'formatText',
          startIndex: event.startIndex,
          endIndex: event.endIndex,
          property: event.property,
          value: event.value,
        }]
      default:
        return []
    }
  }
}
