# CanvasEngine migration

> Trạng thái: Phase 1 đã được triển khai ngày 24/08/2026.  
> Quyết định hiện hành: CanvasEngine sở hữu layout, pagination, paint và input;
> ProseMirror tạm giữ canonical document model và transaction history.

## 1. Kiến trúc đang chạy

```text
KindyDocumentState (ProseMirror JSON, canonical)
               │
               ▼
     CanvasDocumentController
       ProseMirror transaction
               │
       PM JSON ⇄ Canvas bridge
               │
               ▼
          CanvasEngine
   layout / page / table / image
   caret / selection / keyboard / IME
               │
               ▼
   virtualized canvas page window
```

`IEditorData`/`IElement[]` là projection runtime, không được lưu vào
`KindyDocumentState.content`. Adapter API, autosave, versioning và DOCX codec vẫn
đọc/ghi canonical JSON.

## 2. Phần đã hoàn thành

- `KindyEditor` public và `KindyDocumentLibrary` dùng `WordEditor.vue` dựa trên
  CanvasEngine; Tiptap UI/engine adapter cũ đã rời public runtime.
- `CanvasEngineAdapter` triển khai đầy đủ `EditorEngineAdapter` và trả về
  `CanvasEngineHandle`.
- Bridge hai chiều cho text Unicode, marks cơ bản, paragraph alignment/spacing,
  heading, list, table, image, hyperlink, tab, page break và section-break
  projection.
- Mọi thay đổi từ canvas được commit qua một ProseMirror transaction trước khi
  phát event `changed` hoặc đi vào save pipeline.
- Header/footer dùng zone thật của CanvasEngine và được ánh xạ về page state.
- Page break cuối tài liệu luôn tạo trailing editable paragraph, do đó hiển thị
  trang trắng mới và đặt được caret.
- Page có geometry cố định theo khổ giấy; zoom đổi đồng bộ paper, ruler và paint.
- Backing bitmap được virtualize theo viewport: chỉ trang đang thấy và tối đa
  hai trang đệm mỗi phía được cấp bitmap độ phân giải đầy đủ.
- UI tiếng Việt, ribbon responsive và status page/word/zoom đã nằm trên Canvas
  runtime.

## 3. Invariant bắt buộc

1. Không ghi Canvas `IEditorData` trực tiếp vào `KindyDocumentState.content`.
2. Layout coordinates, rows, pages và table fragments là derived state.
3. Save/version/export chỉ đọc snapshot từ `CanvasDocumentController`.
4. Chỉ các feature có bridge test, golden DOCX và visual test mới được công bố
   thuộc compatibility profile.
5. Không dùng câu “giống Word 100%” cho mọi DOCX. Mục tiêu 100% chỉ hợp lệ với
   corpus và profile đã khóa font, page setup và feature set.

## 4. Hiệu năng đã đo

Chromium production preview, viewport 1600×1000, corpus text đơn giản gồm 200
trang và 199 manual page breaks:

| Chỉ số | Kết quả |
|---|---:|
| Layout một transaction | 47,4–56,4 ms |
| Page DOM | 200 |
| Backing bitmap sau render đầu | 3 |
| JSON clone p95, state ~657 KB | 4,31 ms |
| JSON stringify p95 | 1,68 ms |

Số liệu này chứng minh page virtualization hoạt động, không phải SLA cho 200
trang mixed. Corpus bảng/ảnh/comment/track-change phải đo riêng.

## 5. Lộ trình tiếp theo

### Phase 2 — Fidelity gate

- Golden DOCX cho font, paragraph, list, table merge, image, page size và manual
  break.
- So sánh import → edit → export bằng Word/LibreOffice và render PDF.
- Hoàn thiện tab stop, floating image, section margins và first/even header/footer.

### Phase 3 — Incremental layout

- Invalidation từ vùng transaction thay vì layout toàn document khi gõ.
- Worker hóa measurement độc lập DOM và serialization.
- Corpus 100/200 trang mixed với typing p95, scroll FPS, heap và image cache.

### Phase 4 — Review/collaboration

- Mapping comment và tracked changes hai chiều.
- ProseMirror/Yjs position mapping với Canvas range/caret.
- IME, undo/redo, accept/reject và concurrent editing stress tests.

### Phase 5 — Release gate

- Bundle split cho Canvas core và DOCX worker.
- Accessibility fallback/semantic mirror.
- Leak test mở/đóng nhiều tài liệu; mobile keyboard; low-end hardware.
- Chỉ publish sau khi capability matrix và golden corpus đều pass.

## 6. Lệnh kiểm tra

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run test:package
npm run benchmark:long-doc -- --pages=200
```
