# Changelog

## 2.0.0

Breaking release chuyển Kindy Editor thành DOCX Document Library SDK.

### Added

- `KindyDocumentState` v2 làm canonical editing state.
- `DocumentLibraryClient` và `DocumentApiAdapter` contract.
- REST, Memory và legacy callback adapters.
- `KindyDocumentLibrary`, `KindyDocumentExplorer`, `KindyVersionPanel`.
- Responsive `KindyDocumentLibraryShell`, theme tokens và locale message contract.
- Autosave có debounce/cancellation và optimistic concurrency.
- Version preview read-only, restore và workspace status UI.
- DOCX import Worker, compatibility report và OOXML export thật.
- Browser print/Save as PDF flow.
- OpenAPI contract và REST mock transport.
- Tiptap engine adapter và Yjs collaboration adapter boundary.
- Compatibility profile v2.1 cho section/header/footer/page numbering, comments/Track Changes.
- Section-aware pagination/print, header/footer variants và Yjs workspace lifecycle.
- Corpus benchmark text/mixed 100–200 trang và measurement cache theo block.
- Playwright E2E production cho import/edit/autosave/version/restore/export/print và benchmark 100 trang.
- LibreOffice headless golden gate xác nhận DOCX mở/convert PDF không yêu cầu repair.
- Packed-consumer smoke test cho ESM core, Vue UI, stylesheet và relative DOCX Worker URL.
- Reproducible npm lockfile và CI dùng `npm ci` trên cả unit, LibreOffice và browser E2E jobs.

### Changed

- Vue 3/Tiptap vẫn là UI/editor engine mặc định.
- HTML không còn là state lưu trữ dài hạn.
- PDF API là `preparePrint()`/`print()`, không phải deterministic PDF Blob.
- DOCX fidelity được định nghĩa theo Kindy Compatibility Profile.
- Track Changes ghi nhận insert/delete/replace transaction, kể cả lệnh xóa từ API/toolbar.
- State sync mặc định 300ms; demo autosave 5 giây để tránh chặn input trên tài liệu dài.
- Loại dependency runtime `@umoteam/editor-external` không sử dụng và thay SVG build plugin bằng sprite generator nội bộ.
- Dependency audit đầy đủ không còn advisory tại thời điểm chốt release candidate local.

### Fixed

- Print iframe trước đây có thể rỗng do gán sai Vue ref.
- Find/Replace, TOC, scroll page tracking và trạng thái before-unload dùng đúng Vue ref.
- Ảnh DOCX body/header, section break, page geometry và metadata numbering được round-trip theo profile.
- Bộ đếm ký tự cập nhật reactive; mở document không còn tạo dirty/autosave giả.
- `KindyEditor.getState()` giữ assets, sections và header/footer variants.
- ESM entry không còn import CSS ngầm; ứng dụng import `kindy-editor/style` đúng một lần như public guide. Node/SSR dùng subpath `kindy-editor/core`.
- DOCX Worker trong package resolve tương đối theo `import.meta.url`, không còn hard-code base path của demo `/kindy-editor/`.

### Removed from public promise

- Backend/storage/auth tích hợp sẵn.
- API v1 đầy đủ.
- HTML Blob giả đuôi `.docx`.
- AI/collaboration/IO placeholder chưa hoàn thiện trong public build.

Xem [Migration v1 → v2](./MIGRATION.md).
