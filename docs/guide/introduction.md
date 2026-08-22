# Giới thiệu & Tổng quan

**Kindy Editor v2** là SDK Document Library chuyên sâu cho định dạng DOCX, xây dựng bằng **Vue 3** và **Tiptap/ProseMirror**. Thư viện cung cấp toàn bộ giao diện quản lý tài liệu, editor soạn thảo phân trang chuẩn in ấn trên web, lịch sử phiên bản, bộ giải mã (codec) DOCX OOXML và hợp đồng API chuẩn để ứng dụng chủ kết nối backend của mình.

---

## Ranh giới trách nhiệm (Architecture Boundary)

Để đảm bảo tính linh hoạt tối đa cho các hệ thống doanh nghiệp, Kindy Editor tuân thủ nghiêm ngặt nguyên tắc phân tách trách nhiệm:

### 1. Kindy SDK chịu trách nhiệm:
- Cung cấp giao diện tương tác: `KindyDocumentLibrary`, `KindyDocumentLibraryShell`, Explorer, Editor và VersionPanel.
- Chuẩn hóa máy trạng thái UI: `idle`, `dirty`, `saving`, `saved`, `read-only`, `preview`, `conflict`, `error`.
- Chuyển đổi DOCX sang ProseMirror JSON (`KindyDocumentState`) và ngược lại.
- Báo cáo mức độ tương thích DOCX ([Compatibility Matrix](https://github.com/hotienky/editor/blob/main/CAPABILITIES.md)) và xuất file OOXML DOCX chuẩn.
- Quản lý cơ chế Autosave (debouncing, cancellation, concurrency check).
- Cung cấp các adapter chuẩn (`RestDocumentAdapter`, `MemoryDocumentAdapter`).

### 2. Server Ứng dụng chủ chịu trách nhiệm:
- Xác thực người dùng (Authentication), phân quyền (Authorization) và cô lập dữ liệu theo Tenant.
- Cơ sở dữ liệu lưu trữ metadata, object storage (S3/MinIO) lưu file DOCX và artifact.
- Cơ chế sinh `revisionId` và phát hiện xung đột ghi đè đồng thời (Optimistic Concurrency Control).
- Quét mã độc (Antivirus/Malware scan), giới hạn dung lượng upload (Quota) và cấp Signed URL tải file an toàn.
- Yjs provider / WebSocket server khi kích hoạt tính năng cộng tác thời gian thực (Realtime Collaboration).

---

## Các tính năng chính của v2.0

* **Import DOCX Web Worker**: Giải nén ZIP, phân tích cú pháp OOXML ngoài luồng chính (main thread) tránh đơ giao diện; trả về `CompatibilityReport` cảnh báo tính năng ngoài chuẩn.
* **Chỉnh sửa chuẩn Hợp đồng (Contract Preset)**: Mặc định bật toolbar compact, giao diện chỉ hiển thị dạng trang in (page-only), ruler, header/footer, bảng biểu chuyên nghiệp.
* **Quản lý phiên bản (Versions & Revisions)**: Tự động lưu ngầm, lưu thủ công có gắn nhãn, xem trước snapshot lịch sử ở chế độ Read-only và khôi phục trạng thái cũ.
* **Chiến lược Dual-Artifact**: Giữ nguyên vẹn 100% byte-for-byte file DOCX gốc vừa import nếu người dùng chưa sửa đổi; xuất DOCX mới khi đã có revision chỉnh sửa.
* **Đa nền tảng**: Sử dụng linh hoạt trong Vue 3, React, Angular, Vanilla JS hoặc Headless Core trong Node.js / SSR.
