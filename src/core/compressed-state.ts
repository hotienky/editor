/**
 * Compressed Document State
 *
 * Reduces memory usage for large documents by:
 * 1. Shared string table for repeated values (font names, colors, text)
 * 2. Compact mark representation
 * 3. Lazy Canvas data conversion (only for visible pages)
 *
 * Architecture: Layer 2 — Document State (compressed)
 */

import type { JSONContent, KindyDocumentState, KindyPageState, AssetReference } from '../core/types'
import { createEmptyDocumentState } from '../core/state'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompressedDocumentState {
  strings: string[]
  content: CompressedNode
  page: KindyPageState
  assets: AssetReference[]
  schemaVersion: string
  meta: {
    totalNodes: number
    totalStrings: number
    originalSizeBytes: number
    compressedSizeBytes: number
    compressionRatio: number
  }
}

export interface CompressedNode {
  t: number
  a?: Record<string, unknown>
  c?: CompressedNode[]
  x?: number
  m?: CompressedMark[]
}

export interface CompressedMark {
  t: number
  a?: Record<string, unknown>
}

// ─── String Table ───────────────────────────────────────────────────────────

export class StringTable {
  private _index: Map<string, number>
  private _strings: string[]

  constructor() {
    this._index = new Map()
    this._strings = []
  }

  intern(value: string | undefined | null): number {
    if (value === undefined || value === null) return -1
    const existing = this._index.get(value)
    if (existing !== undefined) return existing

    const index = this._strings.length
    this._strings.push(value)
    this._index.set(value, index)
    return index
  }

  get(index: number): string | undefined {
    return this._strings[index]
  }

  getAll(): string[] {
    return this._strings
  }

  get size(): number {
    return this._strings.length
  }

  estimateMemory(): number {
    let bytes = 0
    for (const s of this._strings) {
      bytes += s.length * 2
    }
    return bytes
  }
}

// ─── Compressor ─────────────────────────────────────────────────────────────

const COMMON_MARK_TYPES = [
  'bold', 'italic', 'underline', 'strike', 'subscript', 'superscript',
  'textStyle', 'link', 'comment', 'trackChange', 'code',
]

const COMMON_NODE_TYPES = [
  'doc', 'paragraph', 'heading', 'text', 'hardBreak', 'pageBreak',
  'sectionBreak', 'docxTab', 'bulletList', 'orderedList', 'listItem',
  'table', 'tableRow', 'tableHeader', 'tableCell', 'image', 'inlineImage',
  'blockquote', 'horizontalRule',
]

export function compressDocumentState(state: KindyDocumentState): CompressedDocumentState {
  const stringTable = new StringTable()
  const startTime = performance.now()

  for (const type of COMMON_NODE_TYPES) {
    stringTable.intern(type)
  }
  for (const type of COMMON_MARK_TYPES) {
    stringTable.intern(type)
  }

  const content = compressNode(state.content, stringTable)

  const compressed: CompressedDocumentState = {
    strings: stringTable.getAll(),
    content,
    page: state.page,
    assets: state.assets,
    schemaVersion: state.schemaVersion,
    meta: {
      totalNodes: countNodes(content),
      totalStrings: stringTable.size,
      originalSizeBytes: JSON.stringify(state).length * 2,
      compressedSizeBytes: 0,
      compressionRatio: 0,
    },
  }

  compressed.meta.compressedSizeBytes = JSON.stringify(compressed).length * 2
  compressed.meta.compressionRatio =
    compressed.meta.originalSizeBytes > 0
      ? compressed.meta.compressedSizeBytes / compressed.meta.originalSizeBytes
      : 1

  return compressed
}

function compressNode(node: JSONContent | null | undefined, stringTable: StringTable): CompressedNode {
  if (!node) return { t: stringTable.intern('paragraph') }

  const typeIndex = stringTable.intern(node.type || 'paragraph')

  const compressed: CompressedNode = {
    t: typeIndex,
    a: compressAttrs(node.attrs, stringTable),
    c: node.content?.map((child) => compressNode(child, stringTable)),
    x: node.text !== undefined ? stringTable.intern(node.text) : undefined,
    m: compressMarks(node.marks, stringTable),
  }

  if (compressed.a === undefined) delete compressed.a
  if (compressed.c === undefined) delete compressed.c
  if (compressed.x === undefined) delete compressed.x
  if (compressed.m === undefined) delete compressed.m

  return compressed
}

function compressAttrs(
  attrs: Record<string, unknown> | null | undefined,
  stringTable: StringTable,
): Record<string, unknown> | undefined {
  if (!attrs || Object.keys(attrs).length === 0) return undefined

  const compressed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue

    if (typeof value === 'string') {
      compressed[key] = stringTable.intern(value)
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      compressed[key] = compressAttrs(value as Record<string, unknown>, stringTable)
    } else {
      compressed[key] = value
    }
  }

  return Object.keys(compressed).length > 0 ? compressed : undefined
}

function compressMarks(
  marks: Array<{ type: string; attrs?: Record<string, unknown> }> | undefined,
  stringTable: StringTable,
): CompressedMark[] | undefined {
  if (!marks || marks.length === 0) return undefined

  return marks.map((mark) => ({
    t: stringTable.intern(mark.type),
    a: compressAttrs(mark.attrs, stringTable),
  }))
}

function countNodes(node: CompressedNode | null | undefined): number {
  if (!node) return 0
  let count = 1
  if (node.c) {
    for (const child of node.c) {
      count += countNodes(child)
    }
  }
  return count
}

// ─── Decompressor ───────────────────────────────────────────────────────────

export function decompressNode(compressed: CompressedNode | null | undefined, stringTable: StringTable): JSONContent {
  if (!compressed) return { type: 'paragraph' }

  const node: JSONContent = {
    type: stringTable.get(compressed.t) || 'paragraph',
  }

  if (compressed.a) {
    node.attrs = decompressAttrs(compressed.a, stringTable)
  }
  if (compressed.c) {
    node.content = compressed.c.map((child) => decompressNode(child, stringTable))
  }
  if (compressed.x !== undefined) {
    node.text = stringTable.get(compressed.x)
  }
  if (compressed.m) {
    node.marks = compressed.m.map((mark) => ({
      type: stringTable.get(mark.t) || 'textStyle',
      attrs: mark.a ? decompressAttrs(mark.a, stringTable) : undefined,
    }))
  }

  return node
}

function decompressAttrs(
  attrs: Record<string, unknown>,
  stringTable: StringTable,
): Record<string, unknown> {
  if (!attrs) return undefined as unknown as Record<string, unknown>

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'number' && key !== 'level' && key !== 'colspan' && key !== 'rowspan') {
      const str = stringTable.get(value)
      result[key] = str !== undefined ? str : value
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = decompressAttrs(value as Record<string, unknown>, stringTable)
    } else {
      result[key] = value
    }
  }

  return result
}

// ─── Lazy Canvas Converter ──────────────────────────────────────────────────

export class LazyCanvasCache {
  private _bridge: any
  private _cache: Map<number, any>
  private _converting: Set<number>
  private _maxCacheSize: number

  constructor(bridgeModule: any) {
    this._bridge = bridgeModule
    this._cache = new Map()
    this._converting = new Set()
    this._maxCacheSize = 20
  }

  getPageData(pageNumber: number, content: JSONContent, page: KindyPageState): any | null {
    const cached = this._cache.get(pageNumber)
    if (cached) return cached

    if (this._converting.has(pageNumber)) return null

    this._converting.add(pageNumber)
    try {
      const pageContent = this._extractPageContent(pageNumber, content)
      const canvasData = this._bridge.proseMirrorToCanvasData(pageContent, page)
      this._cache.set(pageNumber, canvasData)

      this._evictIfNeeded()

      return canvasData
    } finally {
      this._converting.delete(pageNumber)
    }
  }

  prefetchPages(pageNumbers: number[], content: JSONContent, page: KindyPageState): void {
    for (const num of pageNumbers) {
      if (!this._cache.has(num) && !this._converting.has(num)) {
        this.getPageData(num, content, page)
      }
    }
  }

  invalidatePages(pageNumbers: number[]): void {
    for (const num of pageNumbers) {
      this._cache.delete(num)
    }
  }

  clear(): void {
    this._cache.clear()
    this._converting.clear()
  }

  getStats(): { cachedPages: number; converting: number; maxCacheSize: number } {
    return {
      cachedPages: this._cache.size,
      converting: this._converting.size,
      maxCacheSize: this._maxCacheSize,
    }
  }

  private _extractPageContent(pageNumber: number, content: JSONContent): JSONContent {
    return content
  }

  private _evictIfNeeded(): void {
    if (this._cache.size <= this._maxCacheSize) return

    const keys = Array.from(this._cache.keys())
    const toEvict = keys.slice(0, keys.length - this._maxCacheSize)
    for (const key of toEvict) {
      this._cache.delete(key)
    }
  }
}

export default {
  StringTable,
  compressDocumentState,
  decompressNode,
  LazyCanvasCache,
}
