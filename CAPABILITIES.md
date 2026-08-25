# Kindy DOCX Compatibility Matrix

Chỉ đánh dấu “Supported” khi có automated fixture/test tương ứng. “Preview” là khả năng editor/browser, không phải Word layout engine.

| Capability | v2.0 | Ghi chú |
|---|---:|---|
| Unicode/tiếng Việt | Supported | OOXML text round-trip test |
| Bold/italic/underline/strike | Supported | Semantic marks |
| Font, size, color | Supported | Basic `textStyle` mapping |
| Paragraph alignment, line spacing, indent | Supported | Ruler/transaction dùng twip; `w:ind` round-trip test gồm left/right/first-line/hanging |
| Heading 1–6 | Supported | Word heading styles |
| Bullet/number list | Supported | Numbering profile cơ bản |
| Table, colspan, rowspan | Supported | `gridSpan` và vertical merge `vMerge` có round-trip test |
| Inline/block image | Supported | DrawingML, VML và `mc:AlternateContent`; ưu tiên fallback browser-safe; ảnh import có `AssetReference` |
| Hyperlink | Supported | External hyperlink |
| Global page size/orientation/margins | Supported | Đơn vị canonical là cm |
| Soft line break | Supported | `Shift+Enter` ↔ `hardBreak` ↔ `w:br` round-trip test |
| Manual page break | Supported | `Ctrl/Cmd+Enter`; import tách thành semantic block `pageBreak`; editor chừa đúng phần trắng còn lại của trang |
| Automatic page preview | Preview | Chừa phần còn lại của trang và page gap giữa các top-level block; status bar hiển thị/điều hướng `Trang hiện tại / tổng trang` |
| OOXML validation/report | Supported | ZIP/content types/feature detection |
| Browser print | Supported | Chromium visual regression cần chạy trong CI ứng dụng |
| PDF Blob deterministic | Not supported | Dùng print/Save as PDF |
| Multiple sections | Supported v2.1 | Stable `sectionBreak`, per-section size/orientation/margin/page-number metadata; pagination và print đổi geometry theo section. Editing canvas vẫn là một ProseMirror surface, không phải Word layout engine |
| Header/footer sub-document | Supported v2.1 codec | Default/first/even, ảnh header và relationship parts có golden test; banner header được giữ tỷ lệ và lặp trong page preview |
| Page-number variants | Supported v2.1 codec | Page-number start, different-first và odd/even header/footer trong profile |
| Comments DOCX round-trip | Supported v2.2 | Range, thread, reply và resolved state qua comments/commentsExtended parts |
| Track Changes DOCX round-trip | Supported v2.2 | `w:ins`/`w:del`, author/timestamp, insert/delete/replace transaction, accept/reject, undo/redo và table text có test |
| Yjs realtime | Adapter available | Ứng dụng chủ cung cấp provider/server |
| Floating image | Best effort | Chuyển thành inline image và báo `FLOATING_IMAGE_FLATTENED` |
| EMF/WMF/TIFF, SmartArt, macros, equations | Lossless preservation | Báo compatibility warning; các raw OOXML parts/custom properties được lưu giữ và nhúng nguyên vẹn khi re-export |

Automatic pagination là browser preview và có thể khác Word do font metrics, printer driver và Word layout rules. v2.0 không chèn page gap vào giữa một top-level node quá cao (ví dụ một bảng cao hơn một trang); node đó được hiển thị liên tục để không phá cấu trúc/selection. Print CSS cho phép browser ngắt theo hàng, nhưng vị trí có thể khác Word.

Các profile v2.1/v2.2 là opt-in qua `profile` của codec hoặc `docxProfile` của workspace; mặc định vẫn là v2.0. Import có thể nhúng `PNG`, `JPEG`, `GIF`, `SVG`, `WebP`, `BMP` vào state. Serializer strict ghi trực tiếp `PNG`, `JPEG`, `GIF`, `BMP`; `SVG`, `WebP`, `EMF`, `WMF`, `TIFF` hoặc URL không xác định được liệt kê trong `CompatibilityReport` và cần chuyển đổi trước khi export.

File vừa import, chưa chỉnh sửa có một đường tải riêng qua `DocumentRecord.originalSource` (artifact `original-docx` giữ nguyên 100% byte gốc). Khi tài liệu được chỉnh sửa và xuất mới, hệ thống tự động bảo toàn các part chưa nhận diện (`unsupportedParts` như Charts, VBA, Custom Properties) để đóng gói lại vào file `.docx` mới.

## Giới hạn hiệu năng v2.0

Import parser chạy trong Web Worker, nhưng editing surface vẫn render document trong một ProseMirror instance liên tục. Compatibility “Supported” không đồng nghĩa mọi file 100–200 trang đều đạt cùng typing latency. Hệ thống tích hợp phải benchmark corpus thật theo [`docs/performance.md`](./docs/performance.md) trước khi đặt SLA.
