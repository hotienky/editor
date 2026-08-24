# `DocumentLayoutService`

> Trạng thái: Phase 0 gate passed / Phase 1 registry foundation implemented
> Phạm vi: internal layout boundary của Kindy Editor. Chưa phải public SDK API.

## Mục đích

`DocumentLayoutService` tách việc đo DOM, phân trang và tạo page registry khỏi
Tiptap Pagination extension.

Service không thay Tiptap/ProseMirror:

```text
KindyDocumentState / ProseMirror transactions
                   │
                   ▼
          DOM editing surface
                   │ measurements
                   ▼
        DocumentLayoutService
          ├─ page assignments
          ├─ layout tree
          ├─ visual/manual break projection
          └─ telemetry
                   │
                   ▼
      Pagination decorations / print / navigator
```

## Invariant

1. `KindyDocumentState` là canonical state duy nhất.
2. `KindyLayoutTree` là dữ liệu dẫn xuất, không được save qua
   `DocumentApiAdapter`.
3. Manual page/section break là ProseMirror node semantic.
4. Automatic page break chỉ là layout metadata/decoration.
5. Service lỗi không được làm editor mất khả năng nhập.
6. Renderer không được tự tạo page model thứ hai.

## Tệp implementation

| Tệp | Trách nhiệm |
|---|---|
| `src/layout/types.ts` | Typed contract cho tree, page, assignment, invalidation và telemetry |
| `src/layout/document-layout-service.ts` | DOM implementation và registry queries |
| `src/layout/page-registry.ts` | Lookup page/block O(1), stable ephemeral IDs và viewport bounds |
| `src/extensions/pagination.js` | Bridge từ ProseMirror transaction sang service và decoration |
| `src/utils/dom-page-calculator.js` | DOM block measurement và pure page assignment hiện tại |
| `src/layout/__tests__/document-layout-service.test.ts` | Contract, parity, cache, break và lifecycle tests |

## Lifecycle

```text
editor open
  → layout(reason=open)
  → transaction
      → invalidate(changed blocks)
      → debounce/requestAnimationFrame
      → layout(reason=transaction)
  → resize/font load
      → invalidate(block/all)
      → layout(reason=resize/font)
  → ProseMirror plugin view recreate
      → giữ nguyên service/cache
  → Tiptap editor destroy
      → service.destroy()
```

`destroy()` là idempotent và phải thu hồi cache. Service thuộc lifecycle của
Tiptap editor, không thuộc lifecycle của một ProseMirror plugin view vì view có
thể bị tạo lại khi reconfigure. Sau khi editor destroy, service không nhận layout
mới.

## Layout result

Một lần layout trả:

- `layoutTree`: registry page duy nhất;
- `pageAssignments`: block assignment trước khi expand page span;
- `visualBreaks`: automatic page separators;
- `manualBreaks`: projection cho semantic page/section break;
- `telemetry`: số block đo, cache hit/miss và thời gian từng bước.

Pagination storage chỉ commit result này. Phần xây tree không còn nằm trong
Pagination extension.

## Invalidation

Hai scope hiện được hỗ trợ:

```ts
{ scope: 'block', element, reason: 'transaction' | 'resize' }
{ scope: 'all', reason: 'font' | 'section' | 'manual' }
```

Service đếm element invalidated theo tập hợp, nên một block bị báo nhiều lần
trước layout tiếp theo vẫn chỉ được tính một lần trong telemetry.

Measurement cache vẫn được expose dưới `pagination.storage.measurementCache` như
một alias tương thích nội bộ. Ownership và mutation thuộc về service; code mới
không được invalidate alias trực tiếp.

## Telemetry

`lastTelemetry` trong pagination storage có:

```ts
interface LayoutTelemetry {
  documentRevision: string
  layoutRevision: number
  reason: 'open' | 'transaction' | 'resize' | 'font' | 'image' | 'section' | 'manual'
  totalBlocks: number
  invalidatedBlocks: number
  firstInvalidatedBlock: number | null
  measuredBlocks: number
  cacheHits: number
  cacheMisses: number
  measureMs: number
  computeMs: number
  projectMs: number
  totalMs: number
  discardedAsStale: boolean
  pageCount: number
}
```

Telemetry không chứa nội dung hợp đồng.

## Khả năng hiện tại

- Giữ nguyên block-level pagination của v2.
- Page geometry và section transition hiện tại không đổi.
- Manual page break và section break không đổi semantic.
- Current page, go-to-page, scroll-to-page và get-page-layout đọc cùng registry.
- Page/block có stable ephemeral ID trong một editor session; ID không được lưu
  vào canonical state.
- Abort trước/sau DOM measurement được hỗ trợ ở service contract.
- Cache invalidation cho transaction, ResizeObserver và font load.

## Giới hạn có chủ đích

- Chưa chia paragraph theo row.
- Chưa có `position ↔ row/page` chính xác bên trong block nhiều trang.
- `getPositionAtPoint()` trả `null` thay vì tạo caret mapping giả.
- Chưa có table fragments.
- Chưa có image anchor/wrapping engine.
- Chưa chạy layout bất đồng bộ trong Worker.
- Chưa có canvas renderer.

Các giới hạn này tương ứng Phase 1–6 trong
[kế hoạch áp dụng](./canvas-layout-adoption-plan.md).

## Gate trước Phase 1

- Unit, typecheck, lint và build pass.
- Page assignment parity với implementation cũ.
- Browser benchmark 100 trang text/mixed không regression quá 10%.
- Bundle tăng không quá 5%.
- Không phát sinh page error trong workspace E2E.
- `destroy()` và invalidation contract pass.

Phase 1 chỉ được mở sau khi các gate trên đạt.

## Quyết định Phase 1 sau benchmark

Production stress 200 trang mixed ngày 24/08/2026:

| Editor ready | Typing median | Typing p95 | Pagination |
|---:|---:|---:|---:|
| 1.281,8 ms | 48,1 ms | 60,7 ms | 2,9 ms |

Page assignment/layout compute không phải bottleneck chính. Vì vậy chưa chuyển
page assignment sang Worker: serialization và async stale-result risk lớn hơn
lợi ích khi compute chỉ chiếm vài millisecond. Phase 1 ưu tiên registry/index,
DOM/editor cost và differential invalidation tests.
