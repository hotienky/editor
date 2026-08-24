# Kế hoạch học hỏi `canvas-editor` để cải thiện Kindy Editor

> Trạng thái: Accepted — quyết định kiến trúc chính thức  
> Ngày lập kế hoạch: 24/08/2026  
> Tài liệu nền: [Đánh giá kiến trúc canvas-editor](./canvas-editor-architecture-assessment.md)  
> Risk register:
> [Đánh giá tải, độ ổn định và rủi ro](./document-layout-risk-assessment.md)  
> Phạm vi: layout, pagination, page preview, table, image, section,
> header/footer và hiệu năng tài liệu dài.

## 1. Kết luận triển khai

Kindy Editor nên **học có chọn lọc lớp layout/render** của `canvas-editor`, nhưng
không thay Tiptap/ProseMirror và không đưa mô hình ký tự `IElement[]` của
`canvas-editor` thành document state mới.

Quyết định đã chốt:

> Không fork `canvas-editor` để thay Tiptap. Giữ Tiptap/ProseMirror làm core
> editor và `KindyDocumentState` làm canonical state. Xây
> `DocumentLayoutService` riêng, sau đó port có chọn lọc thuật toán pagination,
> table fragmentation và image layout từ `canvas-editor` vào service này. Canvas
> chỉ được triển khai trước dưới dạng renderer/preview read-only.

Kiến trúc đích:

```text
KindyDocumentState (canonical ProseMirror JSON)
              │
              ▼
       TiptapEngineAdapter
              │ transactions / DOM measurements
              ▼
      DocumentLayoutService
       ├─ LayoutTree: block / row / position
       ├─ Page assignment và section geometry
       ├─ Table fragments
       ├─ Image anchors / wrapping
       └─ Incremental invalidation
              │
              ├───────────────┐
              ▼               ▼
      DOM editing surface   PageRenderAdapter
      (editable, mặc định)  (preview/print tùy chọn)
```

Các nguyên tắc bắt buộc:

1. `KindyDocumentState` tiếp tục là nguồn dữ liệu duy nhất được lưu.
2. `LayoutTree`, page, row, position và table fragment chỉ là dữ liệu dẫn xuất,
   có thể xóa và tính lại bất kỳ lúc nào.
3. Tiptap/ProseMirror tiếp tục quản lý transaction, caret, selection, undo/redo,
   clipboard, IME tiếng Việt và accessibility.
4. Không lưu DOM measurement hoặc canvas coordinate vào document JSON.
5. Không công bố một capability là supported nếu chưa có golden DOCX, round-trip
   test và visual regression tương ứng.
6. Canvas, nếu được dùng, trước tiên chỉ là read-only preview/print renderer;
   không được ghi ngược trực tiếp vào canonical state.

### Trạng thái triển khai

| Phase | Trạng thái | Bằng chứng |
|---|---|---|
| Phase 0 — layout boundary | Implemented, đang qua release gate | `src/layout/types.ts`, `src/layout/document-layout-service.ts` và contract tests |
| Phase 1 — incremental pagination | Chưa bắt đầu | Chỉ mở sau Phase 0 benchmark/regression gate |
| Phase 2–6 | Chưa bắt đầu | Phụ thuộc các phase trước và risk gates |

## 2. Các phần đáng học hỏi

| Ưu tiên | Bài học từ `canvas-editor` | Điểm yếu Kindy được xử lý | Cách đưa vào Kindy |
|---|---|---|---|
| P0 | Mô hình `row -> page -> position` | Pagination hiện đo chủ yếu theo top-level DOM block, khó chia đoạn dài và table dài | Tạo `KindyLayoutTree` typed, ánh xạ ProseMirror position sang row/page; chỉ là projection |
| P0 | Tách document model khỏi page layout | Page metadata và decoration đang gắn khá chặt vào extension pagination | Đặt `DocumentLayoutService` làm boundary dùng chung cho editor, navigator và print |
| P0 | Page geometry cố định | Trang cuối hoặc zoom có thể tạo cảm giác fit content/tràn | Mọi page lấy kích thước logic từ section/paper size; page cuối không co theo content |
| P1 | Layout invalidation theo vùng thay đổi | Reflow toàn tài liệu sẽ yếu khi 100–200 trang có table/ảnh | Chỉ đo và tính lại từ block/section bị ảnh hưởng, giữ cache cho phần trước |
| P1 | Position index và page index | Page hiện tại/tổng page, go-to-page và hit test dễ lệch | Dùng stable page registry và prefix index, không suy từ page-gap DOM rời rạc |
| P1 | Viewport observer, lazy paint | Tài liệu dài có thể tốn layout/paint dù người dùng chỉ xem vài trang | Chỉ mount layer nặng quanh viewport; ProseMirror document vẫn được giữ nguyên |
| P2 | Table data duy nhất, fragment dùng để render | Table cao hơn một trang không được chia đúng trong editing preview | Sinh `TableFragment[]` dẫn xuất theo page, hỗ trợ repeat header, rowspan/colspan |
| P2 | Image layout modes và image cache | Ảnh floating hiện bị flatten về inline/best-effort | Thêm anchor/wrap projection, cache decoded image, mapping DrawingML trong DOCX codec |
| P2 | Header/footer cache theo page context | Header/footer first/even/orientation có thể gây đo lặp và sai content band | Cache layout theo section ID, orientation và variant default/first/even |
| P2 | Render theo layer có thứ tự | Watermark, ảnh nổi, header/footer và selection có thể chồng sai | Chuẩn hóa page layers: background → underlay → content → header/footer → overlay |
| P3 | Logical coordinate không phụ thuộc zoom | CSS scale sai boundary có thể làm text tràn hoặc page indicator lệch | Layout ở 100% logical units; zoom chỉ đổi presentation transform và viewport math |
| P3 | Command/event façade | UI, toolbar và pagination có nguy cơ gọi trực tiếp implementation detail | Chỉ bổ sung typed layout events/hooks; không port toàn bộ `CommandAdapt` |
| P4 | Canvas page renderer | DOM print/preview có thể khác editing surface ở các primitive phức tạp | Làm POC read-only/print sau khi layout service ổn định; dùng canvas recycler pool |

## 3. Những phần không đưa vào

Các phần dưới đây có chi phí hoặc rủi ro lớn hơn giá trị đối với Kindy:

- Không thay ProseMirror JSON bằng `IElement[]` theo ký tự.
- Không port hidden textarea, canvas caret, canvas selection và hit-testing thành
  input engine chính.
- Không duy trì song song hai editable surfaces DOM và canvas.
- Không port snapshot history bằng closure; tiếp tục dùng ProseMirror transaction
  và history.
- Không port nguyên khối `Draw`, `Command` hoặc `CommandAdapt`; các class này gom
  quá nhiều trách nhiệm.
- Không đưa các module ngoài phạm vi hợp đồng như EMR, form cascade, graffiti,
  macro hoặc barcode vào public build.
- Không dùng DOCX plugin bên ngoài của `canvas-editor` trước khi có source audit,
  license audit và golden round-trip tests.
- Không tạo một canvas cho mọi trang trong tài liệu dài.

## 4. Backlog triển khai theo phase

### Phase 0 — Đặt layout boundary

Mục tiêu: tạo kiến trúc để thay thuật toán pagination từng phần mà không tác động
đến canonical state và public adapter contract.

Hạng mục:

1. Tạo các type dẫn xuất:
   - `KindyLayoutTree`;
   - `KindyLayoutSection`;
   - `KindyLayoutPage`;
   - `KindyLayoutBlock`;
   - `KindyLayoutRow`;
   - `KindyLayoutPosition`;
   - `LayoutInvalidation`.
2. Tạo `DocumentLayoutService` với các operation tối thiểu:
   - `layout(document, context)`;
   - `invalidate(change)`;
   - `getPageAtPosition(position)`;
   - `getPositionAtPoint(pageId, point)`;
   - `getVisiblePages(viewport)`;
   - `destroy()`.
3. Bọc `dom-page-calculator` hiện tại thành implementation đầu tiên. Phase này
   không được chủ động thay đổi hình ảnh UI.
4. Pagination extension chỉ đọc `LayoutResult`; không tự sở hữu một mô hình page
   thứ hai.
5. Thêm telemetry nội bộ: thời gian measure, layout, decorate, số block đo lại,
   tổng page và cache hit rate.

Tệp dự kiến:

```text
src/layout/types.ts
src/layout/document-layout-service.ts
src/layout/dom-layout-service.ts
src/extensions/pagination.js
src/utils/dom-page-calculator.js
src/layout/__tests__/
```

Điều kiện hoàn thành:

- Không đổi `KindyDocumentState.schemaVersion`.
- Page count và manual page break hiện tại không bị regression.
- Toàn bộ regression test, typecheck và production build pass.
- Có contract test để một layout implementation khác có thể thay thế DOM
  implementation.

### Phase 1 — Incremental pagination và page registry

Mục tiêu: ổn định tài liệu 100–200 trang trước khi thêm thuật toán layout phức
tạp.

Hạng mục:

1. Gán stable layout ID cho section/block/page trong một phiên editor.
2. Xây prefix index cho chiều cao block và page boundary.
3. Khi transaction thay đổi một vùng, chỉ invalidate block chứa thay đổi và các
   page phía sau cho đến khi page boundary hội tụ lại.
4. Không đo lại block phía trước điểm thay đổi nếu geometry không đổi.
5. Chuyển phần page assignment thuần dữ liệu sang Web Worker sau khi main thread
   đã thu DOM measurements.
6. Tạo page registry làm nguồn duy nhất cho:
   - trang hiện tại / tổng số trang;
   - go-to-page;
   - page navigator;
   - print page order;
   - active section.
7. Dùng `IntersectionObserver` cho layer trang nặng quanh viewport. Không unmount
   ProseMirror node theo cách làm hỏng position mapping.

Điều kiện hoàn thành:

- 100 trang mixed không chậm hơn baseline đã ghi trong
  `docs/completion-roadmap.md`.
- 200 trang mixed cải thiện tối thiểu 20% typing p95 so với baseline đo trên cùng
  máy, browser và corpus.
- Một lần sửa ở trang cuối không làm remeasure toàn bộ các block phía trước.
- Page current/total không nhảy sai khi gõ nhanh, undo/redo hoặc đổi zoom.
- Không phát sinh lỗi Vietnamese IME, selection và collaboration position.

### Phase 2 — Row-aware layout cho paragraph

Mục tiêu: khắc phục giới hạn “một top-level node cao hơn trang không được chia
trong editing preview”.

Hạng mục:

1. Thu line boxes bằng DOM `Range.getClientRects()` hoặc node-view measurement
   adapter.
2. Ánh xạ mỗi visible row về ProseMirror `from/to` position.
3. Tính break candidate theo row thay vì chỉ theo block.
4. Áp dụng các rule tối thiểu:
   - manual page break luôn thắng;
   - không đặt page break giả bằng nhiều dòng trống;
   - giữ paragraph spacing và line-height;
   - tránh orphan/widow trong phạm vi compatibility profile nếu có metadata.
5. Layout row chỉ là metadata; DOM contenteditable vẫn liên tục để caret và
   selection do ProseMirror quản lý.

Điều kiện hoàn thành:

- Paragraph dài hơn một page được hiển thị qua nhiều page mà không tràn text.
- Xóa, chèn, paste, undo/redo ở hai phía page boundary không mất ký tự.
- Zoom từ 50% đến 200% không thay đổi logical page count nếu font metrics không
  đổi.
- Có visual regression cho A3, A4, A5, Letter ở portrait và landscape.

### Phase 3 — Table fragment engine

Mục tiêu: chia table đúng trang mà vẫn giữ đúng một table trong ProseMirror JSON.

Hạng mục:

1. Định nghĩa `KindyTableFragment` gồm table ID, page ID, row range, cell slices,
   repeated header và continuation metadata.
2. Giữ table canonical không bị clone hoặc cắt thành nhiều table trong state.
3. Sinh fragment cho preview/print theo page content box.
4. Hỗ trợ theo thứ tự:
   - break giữa các row;
   - repeat header row;
   - row cao hơn page;
   - rowspan qua page;
   - colspan và merged cells;
   - cell padding/border/alignment.
5. Editing DOM giai đoạn đầu vẫn liên tục. Fragment renderer chỉ phục vụ page
   projection cho đến khi cursor mapping đã đủ test.

Điều kiện hoàn thành:

- Table 2–10 trang không tràn khỏi page và không nhân đôi dữ liệu khi save.
- Repeat header, rowspan và colspan có fixture riêng.
- Chỉnh text ở fragment sau cập nhật đúng canonical cell.
- Import → edit → export DOCX không tạo nhiều table giả.
- LibreOffice mở DOCX export không yêu cầu repair; Microsoft Word manual gate
  pass trước khi công bố support.

### Phase 4 — Image anchor và page layers

Mục tiêu: khắc phục ảnh DOCX bị mất hoặc bị flatten sai vị trí.

Hạng mục:

1. Chuẩn hóa image data trong document schema/asset reference:
   - size và aspect ratio;
   - inline/block/anchor mode;
   - horizontal/vertical relative target;
   - offsets;
   - text wrapping;
   - crop;
   - z-index/order;
   - alt text.
2. Tạo `ImageLayoutProjection` từ canonical image node và section geometry.
3. Bổ sung decoded image cache và giới hạn bộ nhớ.
4. Chuẩn hóa page layer order:
   - background;
   - watermark;
   - floating image under text;
   - main content;
   - header/footer/page number;
   - floating image above text;
   - comments/selection/search overlays.
5. Mở rộng DOCX import/export cho DrawingML anchor thuộc compatibility profile;
   trường hợp ngoài profile phải tạo compatibility warning, không tự im lặng
   flatten.

Điều kiện hoàn thành:

- Ảnh inline và block giữ đúng kích thước, crop và aspect ratio.
- Ảnh header/footer và logo không mất sau save/load.
- Floating image thuộc profile giữ anchor và wrapping qua DOCX round-trip.
- Ảnh không bị tải/giải mã lại trên mỗi keystroke.
- Tài liệu ảnh lớn có memory budget và test hủy import.

### Phase 5 — Section, header/footer và page geometry cache

Mục tiêu: làm browser preview nhất quán với section data mà codec đã hỗ trợ.

Hạng mục:

1. Page geometry lấy hoàn toàn từ section:
   - A1, A2, A3, A4, A5 và custom size;
   - portrait/landscape;
   - margins;
   - header/footer distance;
   - page-number start.
2. Mỗi page có fixed logical width/height; page cuối không co theo nội dung.
3. Cache header/footer layout theo khóa:
   `(sectionId, orientation, variant, contentRevision)`.
4. Hỗ trợ default, first và even header/footer theo profile.
5. Content box luôn trừ đúng vùng header/footer hiệu dụng.
6. Section break và manual page break dùng cùng page registry, không tạo gap block
   độc lập.

Điều kiện hoàn thành:

- Tất cả page trong cùng section có kích thước đồng đều.
- Section khác khổ/orientation đổi đúng từ page boundary.
- Header/footer không đè main content khi zoom hoặc print.
- Current page, total page và page number start không bị lẫn.
- Visual regression khớp fixture section/header/footer ở các zoom level.

### Phase 6 — POC canvas read-only/print renderer

Mục tiêu: kiểm chứng canvas có thực sự cải thiện fidelity/print trước khi nhận thêm
chi phí kiến trúc.

Hạng mục:

1. Định nghĩa `PageRenderAdapter` độc lập với `DocumentLayoutService`.
2. Renderer chỉ nhận `LayoutResult`; không đọc/ghi trực tiếp ProseMirror state.
3. Chỉ render page đang nhìn thấy và một vùng đệm nhỏ.
4. Dùng recycler pool khoảng 3–7 canvas, không dùng một backing canvas cho mỗi
   page.
5. Canvas giữ logical page units; backing store scale theo DPR nhưng có giới hạn.
6. So sánh DOM renderer và canvas renderer trên cùng 10 golden contract documents.

Điều kiện để tiếp tục sau POC:

- Có cải thiện đo được về visual stability hoặc print fidelity.
- 100 trang không giữ 100 backing canvases trong bộ nhớ.
- Memory CPU và GPU nằm trong budget đã công bố.
- Canvas renderer không làm thay đổi canonical state, page count hoặc DOCX
  export.
- Nếu lợi ích không đủ lớn, dừng POC và giữ DOM renderer.

Không nằm trong Phase 6:

- caret canvas;
- editable canvas;
- canvas selection engine;
- clipboard/IME engine riêng;
- thay thế Tiptap.

## 5. Thứ tự ưu tiên đề xuất

| Hạng mục | Giá trị | Công sức | Rủi ro | Quyết định |
|---|---:|---:|---:|---|
| Layout boundary và typed projection | Rất cao | Vừa | Thấp | Làm ngay |
| Telemetry và incremental invalidation | Rất cao | Cao | Vừa | Làm ngay sau boundary |
| Stable page registry/current-total | Cao | Vừa | Thấp | Làm cùng Phase 1 |
| Row-aware paragraph layout | Cao | Cao | Cao | Làm sau performance foundation |
| Table fragments | Rất cao | Rất cao | Cao | Chia nhỏ theo capability |
| Image anchor/wrapping | Rất cao | Cao | Cao | Làm sau layout projection ổn định |
| Section/header/footer cache | Cao | Vừa | Vừa | Làm song song với image layers |
| Canvas preview/print POC | Vừa | Cao | Cao | Tùy chọn, có stop gate |
| Editable canvas engine | Thấp trong v2 | Rất cao | Nghiêm trọng | Không làm |

Thứ tự thực thi khuyến nghị:

```text
Phase 0: layout boundary
   ↓
Phase 1: incremental pagination + page registry
   ↓
Phase 2: row-aware paragraph
   ↓
Phase 3: table fragments
   ↓
Phase 4 + 5: image layers + section/header/footer geometry
   ↓
Phase 6: canvas read-only/print POC (chỉ khi còn nhu cầu)
```

## 6. Backlog kỹ thuật có thể tạo ticket

| ID | Ticket | Phụ thuộc | Kết quả |
|---|---|---|---|
| LYT-001 | Khai báo layout types và invariant | Không | `KindyLayoutTree` typed |
| LYT-002 | Tạo `DocumentLayoutService` contract | LYT-001 | Boundary cho mọi renderer |
| LYT-003 | Bọc DOM page calculator hiện tại | LYT-002 | Không đổi behavior hiện tại |
| LYT-004 | Thêm layout telemetry | LYT-003 | Baseline trước tối ưu |
| LYT-005 | Stable page registry | LYT-003 | Current/total/go-to-page chuẩn |
| LYT-006 | Incremental invalidation | LYT-004 | Không reflow toàn bộ vô ích |
| LYT-007 | Worker page assignment | LYT-006 | Giảm main-thread work |
| LYT-008 | Viewport page observer | LYT-005 | Giảm paint layer ngoài màn hình |
| LYT-009 | Row measurement adapter | LYT-003 | Break candidate trong paragraph |
| LYT-010 | Position ↔ row/page mapping | LYT-009 | Cursor/page navigation metadata |
| TBL-001 | Table fragment data model | LYT-002 | Một table, nhiều render fragments |
| TBL-002 | Break table between rows | TBL-001 | Table nhiều page cơ bản |
| TBL-003 | Repeat table header | TBL-002 | Header lặp theo page |
| TBL-004 | Rowspan/oversized row split | TBL-002 | Table phức tạp trong profile |
| IMG-001 | Image anchor schema/profile | LYT-001 | Thuộc tính ảnh rõ ràng |
| IMG-002 | Image projection và cache | IMG-001 | Layout/hiệu năng ảnh |
| IMG-003 | DrawingML anchor round-trip | IMG-002 | DOCX fidelity thuộc profile |
| SEC-001 | Fixed page geometry theo section | LYT-005 | A1–A5/custom đồng đều |
| SEC-002 | Header/footer variant cache | SEC-001 | Preview ổn định và nhanh |
| RND-001 | Chuẩn hóa page layer contract | IMG-002, SEC-002 | Thứ tự vẽ nhất quán |
| RND-002 | Canvas recycler POC | RND-001 | Kết quả go/no-go có số đo |

## 7. Chiến lược kiểm thử bắt buộc

### 7.1. Correctness

- Unit test cho layout types, page assignment, invalidation và cache key.
- Contract test dùng chung cho DOM layout và renderer POC.
- Property-based test cho page geometry: page content box không âm, block không
  xuất hiện đồng thời ở hai page nếu không phải fragment.
- Test Enter, Shift+Enter, Ctrl/Cmd+Enter theo đúng shortcut contract đã chọn.
- Test paste, delete, undo/redo, Vietnamese IME và selection qua page boundary.

### 7.2. DOCX compatibility

- Golden DOCX riêng cho paragraph dài, table dài, repeat header, rowspan, ảnh
  inline, ảnh floating, logo header, section landscape và custom paper size.
- Import → edit → save JSON → load → export DOCX.
- DOCX export phải là OOXML hợp lệ và mở bằng LibreOffice headless không repair.
- Microsoft Word manual compatibility gate trước khi đổi capability matrix.
- Unsupported OOXML phải tạo `CompatibilityReport`, không được bỏ âm thầm.

### 7.3. Visual regression

- Chromium cố định version và font corpus.
- Snapshot ở 50%, 75%, 100%, 125%, 150% và 200%.
- Snapshot A3/A4/A5, portrait/landscape, first/even header/footer.
- So sánh page size, page gap, text overflow, table boundary, image anchor và
  footer collision.

### 7.4. Performance

- Corpus 100 và 200 trang gồm text, list, table, image, comments và changes.
- Ghi riêng open time, first editable, typing p50/p95, layout time, block
  remeasured, memory JS heap và GPU/backing-store estimate.
- Benchmark phải ghi máy, browser, build mode, corpus hash và số lần chạy.
- Tối ưu chỉ được merge nếu không làm giảm correctness hoặc DOCX round-trip.

### 7.5. Accessibility

- DOM editing surface giữ semantic tree và screen-reader navigation.
- Toolbar tiếp tục dùng keyboard được.
- Read-only canvas POC phải có DOM accessibility mirror hoặc không được dùng làm
  editor mặc định.

## 8. Definition of done toàn chương trình

Chương trình được xem là hoàn thành khi:

1. Page count và page navigation dùng một layout registry duy nhất.
2. Tài liệu 100 trang mixed đạt performance gate; 200 trang có kết quả stress
   được công bố trung thực.
3. Paragraph và table cao hơn một trang không tràn khỏi paper surface.
4. Mỗi page có fixed geometry theo section; page cuối không fit theo content.
5. Image thuộc compatibility profile không mất và không bị flatten im lặng.
6. Header/footer, page number và section geometry không đè nội dung.
7. Import → edit → export giữ đúng semantic DOCX trong supported profile.
8. Tiptap/ProseMirror vẫn là editing engine duy nhất và không có canonical state
   thứ hai.
9. Capability matrix, README và migration docs khớp với test thực tế.

## 9. Quyết định cần giữ xuyên suốt

Mục tiêu thực tế không phải là sao chép toàn bộ `canvas-editor` hoặc tuyên bố
“giống Google Docs/Microsoft Word 100%”. Mục tiêu là xây một layout projection có
kiểm thử, đủ chính xác cho **Kindy DOCX Compatibility Profile**, trong khi vẫn giữ
được transaction model, khả năng chỉnh sửa và API SDK hiện tại.

Phase có giá trị cao nhất là Phase 0–3. Canvas renderer chỉ là lựa chọn tối ưu
preview/print sau cùng, không phải điều kiện để giải quyết pagination, table hoặc
DOCX fidelity.
