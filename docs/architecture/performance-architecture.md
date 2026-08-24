# Kiến trúc v2.0 — Performance Architecture

> Version: 2.0
> Date: 2026-08-24
> Status: Active
> Author: Kindy Team

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc phân tầng](#2-kiến-trúc-phân-tầng)
3. [Streaming Import Pipeline](#3-streaming-import-pipeline)
4. [Incremental Layout Engine](#4-incremental-layout-engine)
5. [Compressed Document State](#5-compressed-document-state)
6. [Parallel Layout Workers](#6-parallel-layout-workers)
7. [Delta Autosave](#7-delta-autosave)
8. [Lazy Canvas Cache](#8-lazy-canvas-cache)
9. [Integration Map](#9-integration-map)
10. [Performance Targets](#10-performance-targets)

---

## 1. Tổng quan

### 1.1 Bối cảnh

Kindy Editor v2.0 được thiết kế để xử lý tài liệu DOCX lên đến **500 trang** trên trình duyệt web. Kiến trúc mới tập trung vào 5 trụ cột hiệu năng:

| Trụ cột | Mục tiêu | Module |
|---|---|---|
| **Streaming Import** | Parse DOCX 500 trang < 8s, UI không treo | `src/codecs/docx-stream.ts` |
| **Incremental Layout** | Chỉ re-layout affected pages, < 500ms | `src/layout/incremental-layout.js` |
| **Compressed State** | Giảm ~40-60% RAM dùng StringTable | `src/core/compressed-state.ts` |
| **Parallel Layout** | Web Workers song song cho layout computation | `src/layout/parallel-layout.js` |
| **Delta Autosave** | Serialize only changed nodes, < 500ms save | `src/core/delta-autosave.ts` |

### 1.2 Flow dữ liệu tổng quát

```
DOCX File
  │
  ▼
┌──────────────────────────────────┐
│  Streaming Import (docx-stream)  │  Parse OOXML chunks → ProseMirror nodes
│  (Web Worker hoặc main thread)   │  Throttle UI, yield theo chunk
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│  Compressed Document State       │  StringTable dedup, LazyCanvasCache
│  (compressed-state.ts)           │  Chỉ convert visible pages
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│  Layout Engine                   │  Full compute hoặc Incremental
│  (engine.js / incremental-layout)│  DirtyTracker → re-layout affected
│  (parallel-layout.js)            │  Web Workers song song
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│  Canvas Bridge                   │  ProseMirror → Canvas rendering
│  (bridge.ts)                     │  Virtual viewport
└──────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────┐
│  Delta Autosave                  │  ChangeTracker → DeltaSerializer
│  (delta-autosave.ts)             │  Only serialize changed nodes
└──────────────────────────────────┘
```

---

## 2. Kiến trúc phân tầng

### 2.1 Biểu đồ phân tầng

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 4: Presentation (Vue 3)                  │
│  WordEditor.vue · DocumentLibrary.vue · KindyDocumentLibraryShell   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 3: Headless Core (TypeScript)             │
│  DocumentLibraryClient · State Machine · Event Bus                 │
│  + DeltaAutosave · ChangeTracker · DeltaSerializer                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 2: Document Model & Codecs                │
│  DOCX Codec · Streaming Import · Layout Engine                     │
│  + IncrementalLayoutEngine · ParallelLayoutManager                 │
│  + StringTable · CompressedState · LazyCanvasCache                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 1: IO & Adapter Interface                 │
│  RestDocumentAdapter · MemoryDocumentAdapter · YjsAdapter          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Nguyên tắc thiết kế

1. **Framework Agnostic**: Core logic chạy được trong Node.js/Web Worker, không phụ thuộc Vue/DOM
2. **Lazy Everything**: Chỉ load/convert/render những gì cần thiết
3. **Incremental by Default**: Mọi thay đổi chỉ ảnh hưởng affected range
4. **Worker Offload**: Computation nặng luôn có thể chuyển sang Web Worker
5. **Delta First**: Save/load/send luôn dùng delta, không full state

---

## 3. Streaming Import Pipeline

**File:** `src/codecs/docx-stream.ts`

### 3.1 Vấn đề

DOCX import truyền thống parse toàn bộ OOXML trên main thread → UI treo 3-10s cho tài liệu lớn.

### 3.2 Giải pháp

Chia OOXML thành chunks, parse từng chunk và yield ProseMirror nodes incrementally.

```typescript
interface StreamingImportOptions {
  onProgress?: (percent: number, message: string) => void
  onNode?: (node: JSONContent, index: number) => void
  abortSignal?: AbortSignal
  chunkSize?: number  // default: 50 blocks
}

interface StreamingImportResult {
  state: KindyDocumentState
  report: ImportReport
}
```

### 3.3 Algorithm

```
DOCX ZIP → fflate解压
  │
  ├─ word/document.xml (chính)
  ├─ word/styles.xml
  ├─ word/numbering.xml
  ├─ word/_rels/document.xml.rels
  └─ [Content_Types].xml
      │
      ▼
  extractDocumentXml() → string
      │
      ▼
  chunkXmlBlocks(xml, chunkSize) → Generator<XmlChunk>
      │  Sort blocks by position
      │  Yield chunk[0..chunkSize]
      │  Yield chunk[chunkSize..2*chunkSize]
      │  ...
      ▼
  parseChunk(chunk) → JSONContent[]
      │  Regex-based XML parser
      │  Handle: <w:p>, <w:tbl>, <w:sectPr>
      ▼
  allNodes = flatten + merge
      │
      ▼
  createEmptyDocumentState({ content: allNodes })
```

### 3.4 Hạn chế

- Regex XML parser chỉ xử lý được DOCX chuẩn (không phải所有 OOXML)
- Complex table merging có thể mất chính xác
- Images/base64 data không được xử lý trong streaming path (fallback sang full parse)

---

## 4. Incremental Layout Engine

**File:** `src/layout/incremental-layout.js`

### 4.1 Vấn đề

Layout engine truyền thống compute lại toàn bộ layout khi bất kỳ node nào thay đổi → O(N) cho mỗi edit.

### 4.2 Giải pháp

Track dirty pages, chỉ re-layout affected pages.

```typescript
class IncrementalLayoutEngine {
  private _dirtyTracker: DirtyTracker
  private _pageCache: PageCache
  private _fullLayout: LayoutTree | null

  // Only re-layout dirty pages
  computeIncremental(
    content: JSONContent,
    pageOptions: PageOptions,
    changedRange?: { from: number; to: number }
  ): LayoutTree
}
```

### 4.3 Components

#### DirtyTracker

```typescript
class DirtyTracker {
  private _dirtyPages: Set<number>

  markDirty(pageNumbers: number[]): void
  clearDirty(): void
  getDirtyPages(): Set<number>
  isDirty(pageNumber: number): boolean
}
```

#### PageCache

```typescript
class PageCache {
  private _cache: Map<number, CachedPage>

  get(pageNumber: number): CachedPage | undefined
  set(pageNumber: number, page: CachedPage): void
  invalidate(pageNumbers: number[]): void
  invalidateRange(from: number, to: number): void
}
```

### 4.4 Flow

```
Edit happened (node N on page P)
  │
  ▼
DirtyTracker.markDirty([P])
  │
  ▼
Find affected pages: [P, P+1, P+2, ...] (cascade)
  │
  ▼
For each dirty page:
  ├─ Get cached page data
  ├─ Re-measure only changed blocks
  ├─ Recompute page layout
  └─ Update PageCache
  │
  ▼
Merge: unchanged pages (from cache) + re-laid-out pages
  │
  ▼
New LayoutTree
```

---

## 5. Compressed Document State

**File:** `src/core/compressed-state.ts`

### 5.1 Vấn đề

JSONContent tree cho tài liệu lớn consume nhiều RAM (500 trang ≈ 50-100MB JSON).

### 5.2 Giải pháp

Dùng shared StringTable để deduplicate string values.

```typescript
class StringTable {
  private _index: Map<string, number>  // string → index
  private _strings: string[]            // index → string

  intern(value: string): number     // Register + return index
  get(index: number): string        // Get string by index
  getAll(): string[]                 // Get all strings
}
```

### 5.3 CompressedNode format

```typescript
interface CompressedNode {
  t: number                              // node type (index vào StringTable)
  a?: Record<string, unknown>            // attrs (string values → index)
  c?: CompressedNode[]                   // children
  x?: number                             // text content (index)
  m?: CompressedMark[]                   // marks
}

interface CompressedMark {
  t: number    // mark type index
  a?: Record<string, unknown>
}
```

### 5.4 Compression ratio

| Loại nội dung | Original (bytes) | Compressed (bytes) | Ratio |
|---|---:|---:|---:|
| 100 trang text | ~2.5MB | ~1.0MB | 0.40 |
| 200 trang text | ~5.0MB | ~2.0MB | 0.40 |
| 500 trang mixed | ~20MB | ~8MB | 0.40 |

---

## 6. Parallel Layout Workers

**File:** `src/layout/parallel-layout.js`

### 6.1 Vấn đề

Layout computation cho 500 trang trên main thread mất > 5s → block input.

### 6.2 Giải pháp

Chia document thành chunks, dispatch cho nhiều Web Workers song song.

```typescript
class ParallelLayoutManager {
  private _workers: Worker[]
  private _chunkSize: number

  async computeParallel(
    content: JSONContent,
    pageOptions: PageOptions,
    workerCount?: number
  ): Promise<LayoutTree>
}
```

### 6.3 Strategy

```
Content (500 paragraphs)
  │
  ├─ Chunk 1: paragraphs [0..99]   → Worker 1
  ├─ Chunk 2: paragraphs [100..199] → Worker 2
  ├─ Chunk 3: paragraphs [200..299] → Worker 3
  ├─ Chunk 4: paragraphs [300..399] → Worker 4
  └─ Chunk 5: paragraphs [400..499] → Worker 5
      │
      ▼
  Merge results → global page assignment
  (each worker returns local page layout,
   coordinator merges + assigns global page numbers)
```

### 6.4 Limitations

- Serialization overhead có thể offset benefit cho tài liệu nhỏ (< 100 trang)
- Worker communication async → cần careful cancellation handling
- Text measurement phải reproducible trên worker (shared font loading)
- Khuyến nghị: chỉ dùng cho documents > 200 trang

---

## 7. Delta Autosave

**File:** `src/core/delta-autosave.ts`

### 7.1 Vấn đề

Autosave truyền thống serialize toàn bộ KindyDocumentState → clone + stringify 500 trang mất > 2s.

### 7.2 Giải pháp

Track changes, serialize chỉ modified nodes.

```typescript
class ChangeTracker {
  recordInsert(position: number, node: JSONContent): void
  recordDelete(from: number, to: number): void
  recordReplace(from: number, to: number, newNode: JSONContent): void
  hasUnsavedChanges(): boolean
  getPendingChanges(): DeltaChange[]
  markSaved(stateHash: string, revisionId: number): void
}

class DeltaSerializer {
  createDelta(previous: KindyDocumentState, current: KindyDocumentState): DeltaSaveResult
  applyDelta(base: KindyDocumentState, delta: Record<string, unknown>): KindyDocumentState
  estimateDeltaSize(previous: KindyDocumentState, current: KindyDocumentState): number
}

class OptimizedAutosave {
  updateState(state: any): void        // Called on every edit
  forceSave(): Promise<void>          // Debounced save
  getStats(): SaveStats
}
```

### 7.3 Delta format

```typescript
interface DeltaSaveResult {
  delta: {
    type: 'delta'
    timestamp: number
    schemaVersion: string
    page?: KindyPageState          // Only if page config changed
    content?: JSONContent          // Only changed nodes (with _ref markers)
    assets?: AssetReference[]      // Only if assets changed
  }
  changedNodes: number
  serializeTimeMs: number
  totalSizeBytes: number
}
```

### 7.4 Optimization

- `_ref` markers cho unchanged nodes → server-side merge
- Debounce 1000ms default → batch multiple edits
- Quick hash comparison → skip serialize nếu không có thay đổi

---

## 8. Lazy Canvas Cache

**File:** `src/core/compressed-state.ts` (LazyCanvasCache class)

### 8.1 Vấn đề

Converting ProseMirror → Canvas data cho toàn bộ 500 trang consume ~50% RAM.

### 8.2 Giải pháp

Chỉ convert visible pages, cache LRU.

```typescript
class LazyCanvasCache {
  private _bridge: any                    // Canvas bridge module
  private _cache: Map<number, any>        // pageNumber → CanvasData
  private _converting: Set<number>        // Currently converting
  private _maxCacheSize: number           // 20 pages

  getPageData(pageNumber: number, content: JSONContent, page: KindyPageState): any
  prefetchPages(pageNumbers: number[], content: JSONContent, page: KindyPageState): void
  invalidatePages(pageNumbers: number[]): void
  clear(): void
}
```

### 8.3 Strategy

```
Viewport: pages [15, 16, 17, 18, 19] visible
Buffer: [13, 14, ..., 20, 21]
  │
  ▼
prefetchPages([13, 14, 15, 16, 17, 18, 19, 20, 21])
  │
  ├─ Cache hit → return cached data
  ├─ Converting → return null (skip)
  └─ Cache miss → convert on demand
      │
      ▼
  LRU eviction when cache > 20 pages
  (evict oldest, keep visible + buffer)
```

---

## 9. Integration Map

### 9.1 Xuất hiện trong codebase

| Module | File | Export từ |
|---|---|---|
| `streamingImportDocx` | `src/codecs/docx-stream.ts` | `src/codecs/index.ts` |
| `IncrementalLayoutEngine` | `src/layout/incremental-layout.js` | `src/layout/index.js` |
| `DirtyTracker` | `src/layout/incremental-layout.js` | `src/layout/index.js` |
| `PageCache` | `src/layout/incremental-layout.js` | `src/layout/index.js` |
| `ParallelLayoutManager` | `src/layout/parallel-layout.js` | `src/layout/index.js` |
| `StringTable` | `src/core/compressed-state.ts` | `src/core/index.ts` |
| `compressDocumentState` | `src/core/compressed-state.ts` | `src/core/index.ts` |
| `decompressNode` | `src/core/compressed-state.ts` | `src/core/index.ts` |
| `LazyCanvasCache` | `src/core/compressed-state.ts` | `src/core/index.ts` |
| `ChangeTracker` | `src/core/delta-autosave.ts` | `src/core/index.ts` |
| `DeltaSerializer` | `src/core/delta-autosave.ts` | `src/core/index.ts` |
| `OptimizedAutosave` | `src/core/delta-autosave.ts` | `src/core/index.ts` |

### 9.2 Điểm tích hợp với existing code

```
WordEditor.vue (2694 lines — god component, cần split)
  │
  ├─ Import flow → streamingImportDocx()
  │  (thay thế import DOCX hiện tại trong WordEditor)
  │
  ├─ Layout flow → IncrementalLayoutEngine
  │  (thay thế computeLayout() mỗi lần edit)
  │
  ├─ Canvas rendering → LazyCanvasCache
  │  (thay thế convert toàn bộ pages mỗi lần render)
  │
  └─ Autosave flow → OptimizedAutosave
     (thay thế clone + serialize full state)

DocumentLibrary.vue
  │
  └─ Save flow → OptimizedAutosave.forceSave()
     (debounced delta save thay vì full state save)
```

### 9.3 Test coverage

- `src/codecs/__tests__/docx.test.js` — 20 tests ✓
- `src/core/__tests__/state.test.js` — 3 tests ✓
- `src/core/__tests__/editor-state.test.js` — 2 tests ✓
- `src/engines/canvas/__tests__/bridge.test.ts` — 5 tests ✓
- **Tổng: 247 tests passed, 1 skipped** ✓

---

## 10. Performance Targets

### 10.1 Ngân sách hiệu năng

| Metric | Target | Method |
|---|---|---|
| Import DOCX 100 trang | ≤ 8s, UI không treo | Streaming + throttle |
| Import DOCX 500 trang | ≤ 30s, progress bar | Streaming + Web Worker |
| Typing latency p95 | ≤ 50ms | Incremental layout |
| Pagination (affected pages) | ≤ 500ms | DirtyTracker + PageCache |
| Autosave | < 500ms (delta serialize) | DeltaSerializer |
| Memory 500 trang | ≤ 200MB | StringTable + LazyCanvasCache |
| Scroll | 60fps | Virtual viewport |

### 10.2 Cách đo

```bash
npm run test                    # 247 tests
npm run typecheck               # TypeScript strict
npm run lint:check              # ESLint
npm run benchmark:long-doc      # Long document benchmark
npm run benchmark:ci            # CI benchmark with budget
```

### 10.3 Corpus test tối thiểu

| Corpus | Pages | Blocks | Tables | Images |
|---|---:|---:|---:|---:|
| Text/heading/list | 100 | ~1000 | 0 | 0 |
| Hợp đồng (bảng) | 100 | ~1000 | 50 | 0 |
| Ảnh/logo | 100 | ~1000 | 0 | 100 |
| Mixed content | 200 | ~2000 | 100 | 200 |

---

## Appendix: File Reference

| File | Mô tả |
|---|---|
| `src/codecs/docx-stream.ts` | Streaming import pipeline (564 lines) |
| `src/layout/incremental-layout.js` | Incremental layout engine |
| `src/layout/parallel-layout.js` | Parallel layout Web Workers |
| `src/core/compressed-state.ts` | StringTable + CompressedState + LazyCanvasCache (370 lines) |
| `src/core/delta-autosave.ts` | ChangeTracker + DeltaSerializer + OptimizedAutosave (330 lines) |
| `src/codecs/index.ts` | Updated exports |
| `src/layout/index.js` | Updated exports |
| `src/core/index.ts` | Updated exports |
