# Đánh giá tải, độ ổn định và rủi ro của `DocumentLayoutService`

> Trạng thái: Baseline verified / implementation risks assessed  
> Ngày đánh giá: 24/08/2026  
> Phạm vi: Kindy Editor hiện tại và kế hoạch port có chọn lọc layout primitives
> từ `canvas-editor`.  
> Tài liệu liên quan:
> [kế hoạch áp dụng](./canvas-layout-adoption-plan.md) và
> [đánh giá canvas-editor](./canvas-editor-architecture-assessment.md).

## 1. Kết luận điều hành

Chưa thể kết luận `DocumentLayoutService` mới đã chịu tải hoặc ổn định vì service
này chưa được triển khai. Những gì đã được xác minh gồm:

1. Core Kindy hiện tại pass regression, typecheck và production build.
2. Browser production benchmark 100 trang text và 100 trang mixed pass ngân sách
   cục bộ trên corpus synthetic.
3. Synthetic state/pagination benchmark 100 và 200 trang pass.
4. Baseline development trước đó cho 200 trang mixed không đạt typing target và
   vẫn là stress limit.
5. Source review đã xác định các rủi ro chính của hướng port thuật toán.

Do đó, mức kết luận chính xác là:

| Phạm vi | Kết luận |
|---|---|
| Core/SDK regression hiện tại | Ổn định trong test suite hiện có |
| 100 trang text synthetic | Pass baseline cục bộ |
| 100 trang mixed synthetic | Pass baseline cục bộ, chưa phải SLA mọi thiết bị |
| 200 trang text | Synthetic/previous development baseline có thể dùng được |
| 200 trang mixed | Chưa đạt; không được quảng bá là supported SLA |
| DOCX thực tế 100 trang có bảng/ảnh phức tạp | Chưa đủ bằng chứng tải |
| Memory, GPU, mở/đóng lặp và soak test | Chưa có gate hoàn chỉnh |
| `DocumentLayoutService` mới | Chưa triển khai, chỉ mới đánh giá thiết kế |
| Canvas preview | Chưa POC; có rủi ro memory rất cao nếu canvas/page |

Quyết định go/no-go:

> Có thể bắt đầu Phase 0 vì phase này chỉ tạo boundary và giữ nguyên behavior.
> Không được bắt đầu port table/image hoặc canvas production trước khi Phase 1
> vượt qua performance, stale-layout, memory và edit-correctness gates.

## 2. Bằng chứng đã xác minh

### 2.1. Regression và build ngày 24/08/2026

| Kiểm tra | Kết quả |
|---|---:|
| Vitest | 30 file pass, 1 file skip; 262 test pass, 1 test skip |
| TypeScript | `tsc --noEmit` pass |
| Browser E2E | 8 pass, 2 skip; workspace/import/edit/export/print và 100-page gates pass |
| Production library build | Pass |
| ESM bundle | 3.568,50 kB; gzip 770,36 kB |
| CJS bundle | 2.552,42 kB; gzip 669,69 kB |
| CSS | 590,53 kB; gzip 76,03 kB |
| DOCX Worker | 778,74 kB |

Bundle hiện đã lớn. Phase 0 + PageRegistry tăng khoảng 8,63kB ESM so với baseline
trước service, tương đương khoảng 0,24% và pass gate 5%. Port thêm
renderer/table/image code mà không code-split vẫn là một rủi ro tải trang và
memory, dù không trực tiếp làm typing chậm.

### 2.2. Synthetic Node benchmark ngày 24/08/2026

| Corpus | Block | Node | JSON | Clone p95 | Serialize p95 | Page assignment p95 |
|---|---:|---:|---:|---:|---:|---:|
| 100 trang text | 999 | 1.900 | 328,1 kB | 2,90 ms | 1,22 ms | 0,20 ms |
| 200 trang text | 1.999 | 3.800 | 657,0 kB | 5,03 ms | 4,87 ms | 0,21 ms |

Giới hạn của phép đo này:

- Không mount ProseMirror DOM.
- Không đo style/layout/paint.
- Không đo table, ảnh thật, comment DOM hoặc tracked changes decoration.
- Không đo network/autosave.
- Không đo browser/GPU memory.

Vì vậy con số `page assignment p95 0,21 ms` không đồng nghĩa pagination trên màn
hình chỉ mất 0,21 ms.

### 2.3. Browser production benchmark ngày 24/08/2026

Chromium headless, viewport 1600×1000, production preview, 40 lần nhập:

| Corpus | Editor ready | Typing median | Typing p95 | Typing max | Cached pagination |
|---|---:|---:|---:|---:|---:|
| 100 trang text | 467,1 ms | 19,6 ms | 27,5 ms | 33,7 ms | 5,4 ms |
| 100 trang mixed | 672,6 ms | 21,9 ms | 26,4 ms | 32,2 ms | 5,9 ms |

Hai browser tests pass. Tuy nhiên corpus mixed chỉ gồm table 4×4 xen kẽ, ảnh PNG
1×1, comment/Track Changes synthetic và manual page break. Test không đại diện
cho:

- bảng hàng trăm dòng hoặc row cao hơn page;
- ảnh độ phân giải lớn, SVG/EMF/VML hoặc floating anchor;
- 100 trang import từ DOCX thật;
- autosave đang bật;
- collaboration có remote transactions;
- thiết bị RAM thấp/mobile;
- mở/đóng document nhiều lần;
- print hoặc canvas renderer.

### 2.4. Baseline 200 trang

Baseline development đã ghi trước đó:

| Corpus | Editor ready | Typing median | Typing p95 | Cached pagination |
|---|---:|---:|---:|---:|
| 200 trang mixed | 1,39 s | 69,5 ms | 85,1 ms | khoảng 11 ms |

Kết quả này vượt target typing p95 50 ms. Do đó 200 trang mixed là **stress
limit**, không phải supported SLA.

Production stress được chạy lại sau Phase 0 ngày 24/08/2026: editor ready
1.281,8ms, typing median 48,1ms, typing p95 60,7ms, max 61,7ms và pagination
2,9ms. Kết quả tốt hơn historical development baseline nhưng vẫn chưa đạt target
50ms; classification tiếp tục là `stress-only-not-sla`.

## 3. Phương pháp xếp hạng rủi ro

Mỗi rủi ro được chấm:

- Xác suất: 1 rất thấp → 5 gần như chắc chắn nếu không xử lý.
- Tác động: 1 nhỏ → 5 mất dữ liệu, editor không dùng được hoặc sai DOCX.
- Điểm: xác suất × tác động.

| Điểm | Mức |
|---:|---|
| 20–25 | Critical |
| 12–19 | High |
| 6–11 | Medium |
| 1–5 | Low |

## 4. Risk register

### 4.1. Kiến trúc và nguồn dữ liệu

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| ARC-01 | Canonical state và layout tree trở thành hai nguồn sự thật | 4 | 5 | Critical | Layout tree immutable/ephemeral; cấm save coordinate/page fragment; luôn rebuild được từ state + measurements |
| ARC-02 | Pagination extension và service mới cùng giữ page registry | 4 | 5 | Critical | Phase 0 phải chuyển mọi current/total/go-to-page sang một registry duy nhất |
| ARC-03 | Port nguyên code canvas kéo theo coupling/god object | 4 | 4 | High | Port thuật toán nhỏ có contract/test; không copy `Draw`/`CommandAdapt` |
| ARC-04 | Public API bị phụ thuộc implementation DOM/canvas | 3 | 4 | High | Public chỉ expose typed layout events/capabilities; implementation nằm internal |
| ARC-05 | Schema bị thay đổi để phục vụ layout tạm thời | 3 | 5 | High | Không đổi schema cho row/page/coordinate; schema change chỉ dành cho semantic DOCX attrs |
| ARC-06 | Hai renderer cho kết quả page count khác nhau | 4 | 4 | High | Renderer chỉ nhận cùng một `LayoutResult`; renderer không tự paginate |
| ARC-07 | Prototype layout worker hiện tại bị nhầm là production engine | 4 | 4 | High | Không dùng estimator hiện tại cho fidelity; thay bằng pure page-assignment worker nhận measurements thật |

### 4.2. Pagination và hiệu năng

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| PER-01 | `Range.getClientRects()` trên nhiều paragraph gây forced synchronous layout | 5 | 4 | Critical | Batch read; không xen DOM write; chỉ đo invalid range; có long-task telemetry |
| PER-02 | Transaction nhỏ làm reflow toàn bộ 100–200 trang | 4 | 5 | Critical | Incremental invalidation + convergence boundary; test số block remeasured |
| PER-03 | Cache stale sau font load, image decode, resize hoặc style change | 5 | 4 | Critical | Cache key gồm width/font/style/asset revision; FontFaceSet, ResizeObserver và image load phải invalidate |
| PER-04 | Invalidation quá rộng khiến cache không có giá trị | 4 | 4 | High | Ghi cache hit rate và block count; đặt regression budget |
| PER-05 | Invalidation quá hẹp làm page count/layout sai | 4 | 5 | Critical | Differential test: incremental result phải bằng full layout result |
| PER-06 | Main thread bị block bởi measurement dù page assignment chạy Worker | 5 | 4 | Critical | Công bố rõ Worker không đo DOM; time-slice measurement và ưu tiên input |
| PER-07 | Serialization sang Worker triệt tiêu lợi ích | 3 | 3 | Medium | Gửi compact typed measurements, không gửi toàn document JSON |
| PER-08 | Kết quả Worker cũ ghi đè transaction mới | 4 | 5 | Critical | `layoutRevision` + `AbortSignal`; discard result không đúng state/version |
| PER-09 | Layout request storm khi gõ, resize, ảnh load và remote update đồng thời | 4 | 4 | High | Coalescing scheduler, max one active job, latest-wins, backpressure |
| PER-10 | Toàn bộ ProseMirror DOM vẫn mount, memory tăng tuyến tính | 5 | 4 | Critical | Không hứa 200 trang trước khi đo DOM nodes/heap; chỉ lazy layer nặng, nghiên cứu PM-compatible viewport rendering riêng |
| PER-11 | Scroll jump khi page trước viewport đổi chiều cao | 4 | 4 | High | Scroll anchoring theo stable block/position; visual test khi edit trang trước |
| PER-12 | Current page tính sai trong block kéo dài nhiều trang | 5 | 3 | High | Row/position index; không suy current page chỉ bằng top-level block |
| PER-13 | Zoom gây tính sai viewport/page do trộn logical và visual coordinates | 4 | 4 | High | Layout 100% logical units; một utility convert coordinate; invariant tests 50–200% |
| PER-14 | Bundle tăng mạnh khi port code | 4 | 3 | High | Code-split canvas/advanced layout; bundle budget và package audit |
| PER-15 | Không thu hồi listener/observer/worker/cache khi đóng editor | 3 | 4 | High | `destroy()` idempotent; open/close 100 lần; heap plateau gate |

### 4.3. Editing, selection và collaboration

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| EDT-01 | Visual page fragments làm caret/selection lệch ProseMirror position | 4 | 5 | Critical | DOM editing liên tục trong phase đầu; fragment chỉ projection; mapping contract tests |
| EDT-02 | Xóa/chèn tại page boundary mất ký tự hoặc nhảy caret | 4 | 5 | Critical | E2E cho insert/delete/paste/undo/redo hai phía boundary |
| EDT-03 | Vietnamese IME composition bị repaginate giữa composition | 3 | 5 | High | Trì hoãn layout decoration trong `compositionstart/end`; IME E2E bắt buộc |
| EDT-04 | Decoration page gap can thiệp keyboard navigation | 3 | 4 | High | Decoration non-editable, không tạo document position giả; keyboard matrix |
| EDT-05 | Row measurement mapping sai với bidi/CJK/emoji/grapheme | 3 | 4 | High | Dùng DOM Range thật; corpus Unicode/bidi; không chia bằng JS code unit |
| EDT-06 | Track Changes/comment decoration làm line box khác hoặc mapping sai | 4 | 4 | High | Corpus review riêng; cache key theo decoration revision |
| EDT-07 | Remote Yjs transaction tạo layout storm hoặc page khác giữa client | 4 | 4 | High | Batch remote transactions; canonical convergence độc lập layout; cùng font corpus khi cần visual parity |
| EDT-08 | Undo/redo khôi phục state nhưng layout cache không rollback đúng | 3 | 4 | High | Invalidate bằng transaction mapping/version; undo/redo differential test |
| EDT-09 | Read-only canvas bị mở rộng thành editable canvas quá sớm | 3 | 5 | High | Capability flag/read-only contract; ADR cấm canvas ghi state trước gate riêng |

### 4.4. Table fragmentation

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| TBL-01 | Clone table thành nhiều node làm mất canonical identity | 4 | 5 | Critical | Một PM table duy nhất; `TableFragment[]` chỉ render metadata |
| TBL-02 | Rowspan/colspan qua page tạo cell trùng/mất | 5 | 5 | Critical | Thuật toán cell occupancy grid; golden fixture cho mọi tổ hợp |
| TBL-03 | Row cao hơn content box không có break candidate | 5 | 5 | Critical | Cell/row slice model; fallback warning nếu content primitive không split được |
| TBL-04 | Repeat header bị chỉnh như bản sao độc lập | 4 | 4 | High | Repeated header read-only projection trỏ về canonical row |
| TBL-05 | Border/cell padding khác giữa fragment đầu/giữa/cuối | 4 | 3 | High | Fragment edge rules rõ; visual regression |
| TBL-06 | Cursor/table selection qua fragment không map đúng | 4 | 5 | Critical | Không bật editable fragment trước mapping E2E; DOM table liên tục ở phase đầu |
| TBL-07 | Table layout có độ phức tạp cao gây long task | 4 | 4 | High | Benchmark theo cell count/merge density, không chỉ page count; incremental row cache |
| TBL-08 | DOCX export vô tình serialize fragments | 3 | 5 | High | Codec chỉ đọc canonical PM table; round-trip invariant |

### 4.5. Image và floating object

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| IMG-01 | Ảnh chưa decode khiến kích thước/page count đổi sau khi mở | 5 | 4 | Critical | Dùng intrinsic metadata từ DOCX; placeholder đúng size; invalidate có anchor |
| IMG-02 | Ảnh lớn làm tăng heap/GPU và decode long task | 4 | 5 | Critical | Pixel budget, lazy decode, bounded cache, downsample preview, abort |
| IMG-03 | Floating anchor/wrap không tương đương DrawingML | 5 | 5 | Critical | Compatibility profile hẹp; mapping theo relativeFrom/offset/wrap; warning ngoài profile |
| IMG-04 | Ảnh dưới/trên text hoặc watermark sai z-order | 4 | 4 | High | Page layer contract duy nhất; golden visual fixture |
| IMG-05 | Crop/rotation/aspect ratio mất khi round-trip | 4 | 4 | High | Semantic image attrs + codec tests; không bake tùy tiện vào bitmap |
| IMG-06 | SVG/EMF/VML hoặc fallback image không render an toàn | 3 | 5 | High | Mime allowlist, raster fallback, sanitize SVG, compatibility warning |
| IMG-07 | Data URL làm state/autosave phình lớn | 4 | 4 | High | Canonical state chỉ giữ asset reference; binary qua adapter/artifact |
| IMG-08 | Ảnh CORS làm taint canvas/không export được | 3 | 4 | High | Host-controlled asset loader, Blob/Object URL, CORS contract |

### 4.6. Section, header/footer và page geometry

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| SEC-01 | Page cuối co theo content hoặc page khác chiều cao | 3 | 5 | High | Fixed geometry per section; invariant tất cả page cùng section |
| SEC-02 | Section transition lệch một block/page | 4 | 4 | High | Stable section break position; boundary fixtures trước/sau table |
| SEC-03 | First/even/default header-footer chọn sai variant | 4 | 4 | High | Variant resolver dùng section page index; golden first/even |
| SEC-04 | Page-number restart không đồng nhất display/export | 3 | 4 | High | Một page-number resolver dùng chung preview/print/codec metadata |
| SEC-05 | Header/footer band đè main content | 4 | 4 | High | Measure band thật; content box trừ effective band; collision test |
| SEC-06 | A1/A2 tạo surface quá lớn, zoom/DPR vượt giới hạn | 3 | 4 | High | Logical units + max backing-store dimension; fit zoom; canvas tile nếu cần |
| SEC-07 | Custom size/margins không hợp lệ tạo content box âm | 3 | 4 | High | Validation/minimum content box; structured error/warning |
| SEC-08 | Font khác máy làm pagination khác Word/client khác | 5 | 5 | Critical | Font readiness gate, font manifest/fallback policy; không tuyên bố pixel parity tuyệt đối |

### 4.7. Canvas renderer

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| CAN-01 | Một backing canvas mỗi page gây memory cực lớn | 5 | 5 | Critical | Recycler pool 3–7 canvas; placeholder page; cấm canvas/page |
| CAN-02 | DPR 2 làm bitmap memory tăng gấp bốn | 5 | 5 | Critical | DPR cap/adaptive resolution; đo GPU/process memory |
| CAN-03 | Canvas context loss tạo trang trắng | 3 | 4 | High | Handle context loss, rerender, DOM fallback |
| CAN-04 | Text metrics canvas khác DOM/Word | 5 | 5 | Critical | Canvas dùng cùng LayoutResult/metrics; golden comparison; không claim Word 100% |
| CAN-05 | Canvas mất native selection/search/accessibility | 5 | 5 | Critical | Chỉ read-only preview; DOM accessibility mirror; editor mặc định vẫn DOM |
| CAN-06 | Print canvas mờ hoặc sai pagination | 4 | 4 | High | Vector/DOM print vẫn là fallback; print DPI tests |
| CAN-07 | Page bitmap cache stale sau edit | 4 | 4 | High | Cache key theo layout/page/content revision; bounded LRU |
| CAN-08 | Canvas POC làm scope creep thành engine thứ hai | 4 | 5 | Critical | Go/no-go ADR; POC có timebox và success metrics; không có editing API |

Ước lượng memory lý thuyết của `canvas-editor` hiện tại với A4 794×1123:

```text
DPR 1 ≈ 3,40 MiB/trang → 100 trang ≈ 340 MiB
DPR 2 ≈ 13,61 MiB/trang → 100 trang ≈ 1,33 GiB
```

Đây là lý do canvas recycler pool là điều kiện bắt buộc.

### 4.8. DOCX fidelity và dữ liệu

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| DOC-01 | Người dùng kỳ vọng “giống Word 100%” ngoài compatibility profile | 5 | 5 | Critical | Capability matrix/warning rõ; golden corpus; giữ original artifact |
| DOC-02 | Layout projection làm thay đổi semantic export | 3 | 5 | High | Codec không đọc layout fragments; canonical-only export |
| DOC-03 | OOXML unsupported bị bỏ im lặng | 4 | 5 | Critical | `CompatibilityReport` bắt buộc; strict programmatic export |
| DOC-04 | Font substitution thay line/page break | 5 | 5 | Critical | Font readiness và approved fonts; visual gate với Word |
| DOC-05 | Manual/section break bị nhầm với visual auto break | 4 | 5 | Critical | Chỉ semantic break được lưu/export; auto break luôn ephemeral |
| DOC-06 | Original DOCX mất fidelity sau edit ngoài profile | 4 | 5 | Critical | Dual-artifact policy; cảnh báo trước best-effort; fixture thực tế |
| DOC-07 | Asset relationship bị mất sau save/version restore | 3 | 5 | High | Asset-reference integrity test; artifact/state version coupling |
| DOC-08 | Import file độc hại/ZIP bomb/image bomb | 3 | 5 | High | Giữ ZIP/media limits; pixel dimension limits; Worker abort; fuzz corpus |

### 4.9. Autosave, realtime và vận hành

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| OPS-01 | Autosave clone/serialize chồng với layout làm input spike | 4 | 4 | High | Scheduler ưu tiên input; autosave ≥30s cho tài liệu dài; Worker serialization |
| OPS-02 | Layout fail làm editor trắng/không chỉnh được | 3 | 5 | High | DOM continuous fallback; retain last good layout; structured error |
| OPS-03 | Exception bị console.warn rồi mất observability | 4 | 3 | High | Typed layout error/event; adapter telemetry hook; failure counter |
| OPS-04 | Version restore dùng state mới nhưng layout cũ | 3 | 4 | High | Hard layout revision reset khi open/restore |
| OPS-05 | Browser background/tab throttling làm kết quả async bất thường | 3 | 3 | Medium | Revision check; resume/recalculate on visibility change |
| OPS-06 | Không hủy Worker/import/layout khi chuyển document | 4 | 4 | High | AbortController theo document session; ignore stale session |
| OPS-07 | CI shared runner quá nhiễu để gate latency tuyệt đối | 4 | 3 | High | Dedicated baseline runner hoặc regression ratio; giữ correctness gate tuyệt đối |
| OPS-08 | Chỉ test Chromium/M2 che lỗi máy thấp/browser khác | 5 | 4 | Critical | Device/browser matrix tối thiểu; low-end laptop gate trước production |

### 4.10. Bảo trì, license và kế hoạch

| ID | Rủi ro | Xác suất | Tác động | Mức | Biện pháp bắt buộc |
|---|---|---:|---:|---|---|
| MNT-01 | Port code không rõ license/provenance | 3 | 5 | High | Audit license/NOTICE từng phần; ưu tiên reimplement thuật toán từ spec |
| MNT-02 | Fork logic rồi khó đồng bộ upstream | 4 | 3 | High | Không fork; test theo behavior; ghi nguồn tham khảo |
| MNT-03 | Thuật toán table/image bị đánh giá thấp về công sức | 5 | 4 | Critical | Chia capability nhỏ, stop gate, không cam kết ngày trước prototype |
| MNT-04 | Prototype cũ trong `src/layout` gây nhầm implementation | 4 | 3 | High | Đánh dấu internal/prototype hoặc loại khỏi public build khi service mới có |
| MNT-05 | Tài liệu nói supported trước runtime/test | 4 | 4 | High | Capability matrix chỉ cập nhật sau fixture pass |
| MNT-06 | Code coverage cao nhưng không bao phủ visual/layout invariants | 5 | 4 | Critical | Golden DOCX + visual + browser performance là release gate riêng |

## 5. Rủi ro quan trọng nhất cần chặn trước

Theo thứ tự:

1. **TBL-02/TBL-03:** table fragmentation với rowspan và oversized row.
2. **CAN-01/CAN-02:** memory canvas ở 100–200 trang.
3. **PER-03/PER-05/PER-08:** cache stale và async stale result.
4. **EDT-01/EDT-02:** caret/selection qua page boundary.
5. **PER-10:** toàn bộ ProseMirror DOM vẫn tăng tuyến tính.
6. **DOC-01/DOC-04:** kỳ vọng fidelity 100% và font metrics.
7. **IMG-02/IMG-03:** ảnh lớn và DrawingML floating anchor.
8. **OPS-08:** số liệu chỉ trên thiết bị mạnh/Chromium.

Nếu một trong các risk Critical này chưa có test và fallback, phase liên quan
không được bật mặc định.

## 6. Performance và stability gates cho từng phase

### Gate 0 — Layout boundary

- Không đổi canonical state hoặc public adapter contract.
- Page count hiện tại không regression trên toàn test corpus.
- Full layout và wrapped-service layout phải deep-equal ở metadata công khai.
- Layout service có `destroy()` idempotent.
- Bundle tăng không quá 5% nếu chưa có code-splitting justification.

### Gate 1 — Incremental pagination

- Incremental result luôn bằng full recomputation trên cùng measurements.
- 100 trang mixed production:
  - editor ready ≤ 3.000 ms;
  - typing p95 ≤ 50 ms trên máy chuẩn;
  - pagination ≤ 500 ms;
  - không long task >100 ms do layout.
- 200 trang mixed stress:
  - typing p95 mục tiêu ≤ 50 ms; hard ceiling 75 ms trước khi quảng bá;
  - edit trang cuối không đo lại block phía trước;
  - không stale result sau 1.000 random transactions.
- Open/close 100 lần: heap phải tiến tới plateau; không tăng listener/observer.

### Gate 2 — Row-aware paragraph

- Insert/delete/paste/undo/redo qua boundary pass.
- Vietnamese IME, emoji, CJK và bidi pass.
- Current page đúng khi caret nằm ở các row khác nhau trong cùng block.
- Zoom 50–200% không đổi logical page count.
- Không có scroll jump lớn hơn một dòng khi edit ngoài viewport, trừ khi nội dung
  thực sự đổi page.

### Gate 3 — Table fragments

- Golden fixtures:
  - table 2/10/100 trang;
  - repeat header;
  - rowspan/colspan;
  - row cao hơn page;
  - nested paragraph/list/image trong cell.
- Canonical JSON vẫn có đúng một table.
- Editing fragment sau map đúng canonical cell.
- Table stress benchmark theo 1.000/5.000/10.000 cells.
- DOCX export mở không repair và không serialize fragment.

### Gate 4/5 — Image, section và header/footer

- Ảnh 1/10/50 megapixel, nhiều ảnh và ảnh lỗi.
- Heap/GPU budget rõ trên thiết bị mục tiêu.
- Floating anchor thuộc profile round-trip pass.
- A1–A5/Letter/custom, portrait/landscape pass.
- First/even/default header-footer và page-number restart pass.
- Font missing/loading late không để layout ở trạng thái stale.

### Gate 6 — Canvas POC

- Không có editable API.
- Không quá 7 backing canvases hoạt động với 100–200 page placeholders.
- Đo JS heap, browser process và GPU memory, không chỉ `performance.memory`.
- Context loss có recovery hoặc DOM fallback.
- Visual score phải tốt hơn DOM renderer trên golden corpus đủ để biện minh chi
  phí.
- Nếu không đạt memory/accessibility/fidelity gate, POC bị dừng và không merge
  vào default bundle.

## 7. Test matrix còn thiếu

| Nhóm | Hiện có | Cần bổ sung trước production |
|---|---|---|
| Unit/regression | 255 test pass | Layout service contract, differential invalidation |
| Browser 100 trang | Text + synthetic mixed | Real contract corpus, table/image/review riêng |
| Browser 200 trang | Historical development | Production gate và repeated runs |
| Memory | Chưa thành gate | Heap, DOM node, browser process, GPU, open/close loop |
| Soak | Chưa có | Gõ/scroll/autosave 1–4 giờ |
| Browser/device | Chủ yếu Chromium/M2 | Chrome/Edge/Firefox policy; low-end Windows laptop |
| DOCX | Golden feature tests | 50–100 trang thực, merged table, floating image |
| Fonts | Có kiểm tra thủ công | Font manifest, late-load, missing-font regression |
| Collaboration | Local convergence | Remote provider, latency/loss/reconnect + layout storm |
| Canvas | Chưa có | Recycler, context loss, DPR, accessibility, print |
| Security | ZIP/media limits | Image pixel bomb, malformed OOXML, fuzz/abort |

## 8. Telemetry bắt buộc trong implementation

Mỗi layout cycle cần ghi nội bộ:

```ts
interface LayoutTelemetry {
  documentId?: string
  documentRevision: string
  layoutRevision: number
  reason: 'open' | 'transaction' | 'resize' | 'font' | 'image' | 'section'
  totalBlocks: number
  invalidatedBlocks: number
  measuredBlocks: number
  cacheHits: number
  cacheMisses: number
  measureMs: number
  computeMs: number
  decorateMs: number
  totalMs: number
  discardedAsStale: boolean
  pageCount: number
}
```

Telemetry không được chứa nội dung tài liệu. Host application quyết định có gửi
ra observability backend hay không.

## 9. Fallback và rollback

Mỗi phase phải có feature flag:

```text
layoutService.enabled
layoutService.incremental
layoutService.rowAware
layoutService.tableFragments
layoutService.imageAnchors
pageRenderer.canvasPreview
```

Fallback production:

1. Layout mới lỗi → giữ last known good layout.
2. Nếu không có layout tốt → dùng DOM continuous editor, tắt page decoration.
3. Không được làm editor mất khả năng nhập hoặc làm mất state.
4. Canvas context/memory lỗi → quay về DOM preview/print.
5. Unsupported DOCX → compatibility warning và strict export refusal theo
   contract; không tự làm mất dữ liệu im lặng.

Rollback không cần migration canonical state vì layout metadata không được lưu.
Đây là lợi ích quan trọng nhất của kiến trúc đã chọn.

## 10. Đánh giá sẵn sàng

| Phase | Sẵn sàng bắt đầu | Sẵn sàng production |
|---|---|---|
| Phase 0 — boundary | Có | Sau contract/regression gate |
| Phase 1 — incremental | Có thể prototype | Chưa, cần 200-page/memory/stale tests |
| Phase 2 — row-aware | Sau Phase 1 | Chưa, cần editing/IME mapping |
| Phase 3 — table fragments | Chỉ sau row/page model | Chưa, rủi ro Critical |
| Phase 4 — image anchors | Có thể nghiên cứu codec song song | Chưa, cần memory/DrawingML profile |
| Phase 5 — section/HF cache | Có thể chuẩn bị fixtures | Chưa, cần geometry/font gates |
| Phase 6 — canvas POC | Chưa ưu tiên | Không production trước recycler/a11y/memory gates |

Kết luận cuối:

> Plan là hướng kiến trúc ít rủi ro nhất trong các lựa chọn đã đánh giá, nhưng
> bản thân nó không phải rủi ro thấp. Pagination theo row, table fragmentation,
> floating image và canvas đều là các hạng mục High/Critical. Chúng chỉ an toàn
> khi triển khai qua boundary dẫn xuất, feature flag, differential test và
> fallback DOM; không triển khai như một lần thay engine lớn.
