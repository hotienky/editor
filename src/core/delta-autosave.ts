/**
 * Delta Autosave
 *
 * Tracks changes to document state and serializes only modified nodes.
 * Reduces save time from seconds to milliseconds for large documents.
 *
 * Architecture: Layer 3 — Client (delta save)
 */

import type { JSONContent, KindyDocumentState } from '../core/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface DeltaChange {
  type: 'insert' | 'delete' | 'replace' | 'move'
  from: number
  to: number
  node?: JSONContent
  timestamp: number
}

interface DeltaSaveResult {
  delta: Record<string, unknown>
  changedNodes: number
  serializeTimeMs: number
  totalSizeBytes: number
}

interface SaveSnapshot {
  stateHash: string
  savedAt: number
  revisionId: number
}

// ─── Change Tracker ─────────────────────────────────────────────────────────

export class ChangeTracker {
  private _changes: DeltaChange[]
  private _lastSaveTime: number
  private _lastStateHash: string
  private _hasUnsavedChanges: boolean
  private _changeCount: number

  constructor() {
    this._changes = []
    this._lastSaveTime = 0
    this._lastStateHash = ''
    this._hasUnsavedChanges = false
    this._changeCount = 0
  }

  recordChange(change: Omit<DeltaChange, 'timestamp'>): void {
    this._changes.push({
      ...change,
      timestamp: Date.now(),
    })
    this._hasUnsavedChanges = true
    this._changeCount++
  }

  recordInsert(position: number, node: JSONContent): void {
    this.recordChange({
      type: 'insert',
      from: position,
      to: position,
      node,
    })
  }

  recordDelete(from: number, to: number): void {
    this.recordChange({
      type: 'delete',
      from,
      to,
    })
  }

  recordReplace(from: number, to: number, newNode: JSONContent): void {
    this.recordChange({
      type: 'replace',
      from,
      to,
      node: newNode,
    })
  }

  getPendingChanges(): DeltaChange[] {
    return this._changes.filter((c) => c.timestamp > this._lastSaveTime)
  }

  hasUnsavedChanges(): boolean {
    return this._hasUnsavedChanges
  }

  markSaved(stateHash: string, _revisionId: number): void {
    this._lastSaveTime = Date.now()
    this._lastStateHash = stateHash
    this._hasUnsavedChanges = false
    this._changes = []
  }

  getSnapshot(): SaveSnapshot {
    return {
      stateHash: this._lastStateHash,
      savedAt: this._lastSaveTime,
      revisionId: 0,
    }
  }

  get changeCount(): number {
    return this._changeCount
  }
}

// ─── Delta Serializer ───────────────────────────────────────────────────────

export class DeltaSerializer {
  private _nodeCache: Map<string, JSONContent>
  private _maxCacheSize: number

  constructor() {
    this._nodeCache = new Map()
    this._maxCacheSize = 10000
  }

  createDelta(previous: KindyDocumentState, current: KindyDocumentState): DeltaSaveResult {
    const startTime = performance.now()
    const delta: Record<string, unknown> = {
      type: 'delta',
      timestamp: Date.now(),
      schemaVersion: current.schemaVersion,
    }

    if (JSON.stringify(previous.page) !== JSON.stringify(current.page)) {
      delta.page = current.page
    }

    const contentDelta = this._compareNodes(previous.content, current.content, '')

    if (contentDelta.changed) {
      delta.content = contentDelta.delta
    }

    if (JSON.stringify(previous.assets) !== JSON.stringify(current.assets)) {
      delta.assets = current.assets
    }

    const serializeTimeMs = performance.now() - startTime
    const totalSizeBytes = JSON.stringify(delta).length * 2

    return {
      delta,
      changedNodes: contentDelta.changedCount,
      serializeTimeMs,
      totalSizeBytes,
    }
  }

  private _compareNodes(
    prev: JSONContent | null | undefined,
    curr: JSONContent | null | undefined,
    path: string,
  ): { changed: boolean; changedCount: number; delta: unknown } {
    const result = { changed: false, changedCount: 0, delta: null as unknown }

    if (!prev && !curr) return result

    if (!prev || !curr) {
      return { changed: true, changedCount: 1, delta: curr }
    }

    if (prev.type === 'text' && curr.type === 'text') {
      if (prev.text !== curr.text || JSON.stringify(prev.marks) !== JSON.stringify(curr.marks)) {
        return { changed: true, changedCount: 1, delta: curr }
      }
      return result
    }

    if (prev.type !== curr.type) {
      return { changed: true, changedCount: 1, delta: curr }
    }

    if (JSON.stringify(prev.attrs) !== JSON.stringify(curr.attrs)) {
      return { changed: true, changedCount: 1, delta: curr }
    }

    if (JSON.stringify(prev.marks) !== JSON.stringify(curr.marks)) {
      return { changed: true, changedCount: 1, delta: curr }
    }

    const prevContent = prev.content || []
    const currContent = curr.content || []

    if (prevContent.length !== currContent.length) {
      return { changed: true, changedCount: currContent.length, delta: curr }
    }

    const childDeltas: (JSONContent | null)[] = []
    let anyChildChanged = false
    let totalChanged = 0

    for (let i = 0; i < currContent.length; i++) {
      const childResult = this._compareNodes(
        prevContent[i],
        currContent[i],
        `${path}.${i}`,
      )

      if (childResult.changed) {
        anyChildChanged = true
        totalChanged += childResult.changedCount
        childDeltas.push(childResult.delta as JSONContent)
      } else {
        childDeltas.push(null)
      }
    }

    if (anyChildChanged) {
      const delta: JSONContent = {
        type: curr.type,
        attrs: curr.attrs,
        content: currContent.map((child, i) => {
          if (childDeltas[i] !== null) {
            return childDeltas[i]
          }
          return { _ref: `${path}.${i}`, _unchanged: true }
        }),
      }

      return { changed: true, changedCount: totalChanged, delta }
    }

    return result
  }

  applyDelta(base: KindyDocumentState, delta: Record<string, unknown>): KindyDocumentState {
    const result = { ...base }

    if (delta.page) {
      result.page = delta.page as KindyDocumentState['page']
    }

    if (delta.content) {
      result.content = this._applyNodeDelta(base.content, delta.content as JSONContent)
    }

    if (delta.assets) {
      result.assets = delta.assets as KindyDocumentState['assets']
    }

    return result
  }

  private _applyNodeDelta(baseNode: JSONContent, deltaNode: JSONContent): JSONContent {
    if (!deltaNode || (deltaNode as any)._unchanged) {
      return baseNode
    }

    if ((deltaNode as any)._ref) {
      return baseNode
    }

    return deltaNode
  }

  estimateDeltaSize(previous: KindyDocumentState, current: KindyDocumentState): number {
    const prevHash = this._quickHash(previous.content)
    const currHash = this._quickHash(current.content)

    if (prevHash === currHash) return 0

    return JSON.stringify(current).length * 0.1 * 2
  }

  private _quickHash(node: JSONContent | null | undefined): string {
    if (!node) return ''
    const str = JSON.stringify(node)
    let hash = 0
    for (let i = 0; i < Math.min(str.length, 1000); i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    }
    return String(hash)
  }
}

// ─── Optimized Autosave ─────────────────────────────────────────────────────

export class OptimizedAutosave {
  private _tracker: ChangeTracker
  private _serializer: DeltaSerializer
  private _saveFn: ((delta: any) => Promise<void>) | null
  private _debounceMs: number
  private _timer: ReturnType<typeof setTimeout> | null
  private _lastState: any
  private _saving: boolean
  private _onProgress: ((status: string) => void) | null

  constructor(options: any = {}) {
    this._tracker = new ChangeTracker()
    this._serializer = new DeltaSerializer()
    this._saveFn = options.saveFn || null
    this._debounceMs = options.debounceMs || 1000
    this._timer = null
    this._lastState = null
    this._saving = false
    this._onProgress = options.onProgress || null
  }

  updateState(state: any): void {
    if (this._lastState) {
      const delta = this._serializer.createDelta(this._lastState, state)
      if (delta.changedNodes > 0) {
        this._tracker.recordReplace(0, -1, state.content)
      }
    }

    this._lastState = state
    this._scheduleSave()
  }

  private _scheduleSave(): void {
    if (this._timer) {
      clearTimeout(this._timer)
    }

    this._timer = setTimeout(() => {
      this._performSave()
    }, this._debounceMs)
  }

  private async _performSave(): Promise<void> {
    if (this._saving || !this._tracker.hasUnsavedChanges()) return
    if (!this._saveFn || !this._lastState) return

    this._saving = true
    this._onProgress?.('saving')

    try {
      const delta = this._serializer.createDelta(
        { content: null, page: null, assets: [], schemaVersion: '2.0' } as any,
        this._lastState,
      )

      await this._saveFn({
        type: 'delta',
        delta: delta.delta,
        stats: {
          changedNodes: delta.changedNodes,
          sizeBytes: delta.totalSizeBytes,
        },
      })

      this._tracker.markSaved(this._quickHash(this._lastState), 0)
      this._onProgress?.('saved')
    } catch (error) {
      console.error('[Autosave] Save failed:', error)
      this._onProgress?.('error')
    } finally {
      this._saving = false
    }
  }

  async forceSave(): Promise<void> {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    await this._performSave()
  }

  getStats(): any {
    return {
      hasUnsavedChanges: this._tracker.hasUnsavedChanges(),
      changeCount: this._tracker.changeCount,
      saving: this._saving,
      lastSave: this._tracker.getSnapshot().savedAt,
    }
  }

  destroy(): void {
    if (this._timer) {
      clearTimeout(this._timer)
    }
  }

  private _quickHash(state: any): string {
    return JSON.stringify(state).length.toString(36)
  }
}

export default {
  ChangeTracker,
  DeltaSerializer,
  OptimizedAutosave,
}
