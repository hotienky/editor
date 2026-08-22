# Completion roadmap của Kindy Editor v2

Tài liệu này là bảng kiểm phát hành, không phải danh sách ý tưởng. Một capability
chỉ chuyển sang **Done** khi runtime, automated test, compatibility fixture và
tài liệu public cùng khớp nhau.

## Trạng thái hiện tại

| Hạng mục | Trạng thái | Bằng chứng / gate còn thiếu |
|---|---|---|
| Document state, migration, client, optimistic concurrency | Done v2.0 | Contract/unit tests trong `src/core/__tests__` |
| Memory/REST/legacy adapters và OpenAPI | Done v2.0 | Adapter contract + OpenAPI route test |
| Explorer, workspace, version preview/restore | Done v2.0 | Playwright E2E production và CI job |
| DOCX body text/style/list/table/image/page break/page setup | Done trong profile v2.0 | Golden/unit test; DOCX v2.2 đã mở và convert PDF bằng LibreOffice headless không yêu cầu repair |
| Browser print | Supported browser flow | E2E kiểm tra iframe/@page/content; vẫn không phải deterministic PDF Blob |
| Tài liệu dài | 100 trang text/mixed pass local production gate | Text 490,3ms/21,5ms p95; mixed 849,7ms/36,5ms p95, 40 mẫu. Pagination 2,8–3,7ms. CI upload JSON; 200 mixed vẫn là stress limit |
| Multiple section DOCX round-trip | Done v2.1 codec/pagination/print | Editing canvas liên tục vẫn có thể khác Word; cần Chromium visual regression |
| Header/footer DOCX import + variants | Done v2.1 codec | Golden strict gồm default/first/even và logo header |
| Page-number start/first/odd/even | Done v2.1 codec | Golden strict gồm page-number start và section landscape |
| Comment DOCX round-trip | Done v2.2 codec/editor | Range, reply, resolved và strict round-trip pass |
| Track Changes DOCX round-trip | Done v2.2 codec/editor | Insert/delete/replace transaction, author/time, accept/reject, undo/redo, table text pass |
| Realtime Yjs | SDK lifecycle + local convergence done | Hai Tiptap editor dùng chung host Y.Doc hội tụ/recreate không nhân đôi; host vẫn phải test provider/server, auth và network reconnect thật |

## Thứ tự hoàn thiện bắt buộc

### Gate A — v2.0 release candidate

- Regression, typecheck, build và package audit pass.
- Golden DOCX v2.2 mở được bằng LibreOffice headless không yêu cầu repair. **Done** trên Debian/LibreOffice 7.4.7 ARM64 và chạy lại trong CI.
- Browser E2E: Explorer → import → edit → autosave → version → restore → export → print. **Done** bằng Playwright production build.
- Corpus text 100/200 trang ghi JSON benchmark artifact trong CI (`benchmark:ci` + GitHub Actions đã cấu hình).
- Corpus text/mixed 100 trang chạy trong Playwright; không công bố SLA nếu p95 fail trên thiết bị tích hợp.
- Xóa hoặc giữ ngoài public entrypoint toàn bộ prototype AI/IO/storage cũ.

### Gate B — v2.1 sections/header/footer

- Mọi section có stable ID và semantic `sectionBreak` node.
- Import/export `sectPr`, page size/orientation/margin và page-number start theo từng section.
- Header/footer là ProseMirror sub-document; hỗ trợ default/first/odd/even trong profile đã công bố.
- Golden DOCX cho section landscape giữa tài liệu, header logo, footer số trang và different-first-page.
- Pagination browser đọc section boundary; vẫn ghi rõ không phải Word layout engine.

### Gate C — v2.2 review/realtime

- Comment range/thread import/export bằng OOXML comments parts.
- Track insert/delete có author, timestamp, stable ID; accept/reject từng change và toàn bộ.
- Track Changes golden test gồm text, undo/redo và text trong table.
- Hai editor dùng host-provided Yjs provider hội tụ cùng document state; reconnect không nhân đôi transaction.
- Comment, review và collaboration dùng identity do ứng dụng chủ truyền vào.

### Gate D — release nhưng chưa publish

- `npm pack --dry-run` chỉ chứa file public đã khai báo. **Done** — 34 file, khoảng 1,7MB nén; `test:package` build lại tarball trong một app Vite consumer và kiểm tra DOCX Worker/CSS.
- README/API/types/capability matrix khớp runtime. **Done** và được kiểm tra cùng build/typecheck.
- Changelog và migration guide hoàn chỉnh. **Done**.
- Tạo release candidate local. **Done** với `kindy-editor-2.0.0.tgz`; chỉ publish npm khi chủ dự án yêu cầu lại.

## Definition of done cho hiệu năng

Mỗi báo cáo phải ghi browser, máy, build mode, corpus và số mẫu. Ngân sách mặc
định: open 100 trang text ≤ 3 giây, typing p95 ≤ 50 ms, pagination sau khi dừng
gõ ≤ 500 ms. Kết quả text không được suy rộng sang bảng, ảnh hoặc review.
