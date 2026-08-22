# Headless Client & Core API

Tra cứu các hàm và class thuộc subpath `kindy-editor/core`.

---

## 1. `createDocumentLibrary(options)`

Tạo một headless client instance quản lý trạng thái tài liệu:

```typescript
import { createDocumentLibrary, createRestDocumentAdapter } from 'kindy-editor/core'

const client = createDocumentLibrary({
  adapter: createRestDocumentAdapter({ baseUrl: 'https://api.yourdomain.com' }),
  autosave: { enabled: true, delay: 5000 },
})
```

### Các Phương thức của `DocumentLibraryClient`:

- `open(documentId: string): Promise<DocumentSnapshot>`: Mở một tài liệu và nạp snapshot mới nhất.
- `updateState(state: KindyDocumentState): void`: Cập nhật trạng thái mới nhất từ editor vào client (đánh dấu dirty).
- `save(reason?: 'autosave' | 'manual'): Promise<SaveResult>`: Gửi yêu cầu lưu trạng thái đến adapter.
- `create(input: CreateDocumentInput): Promise<DocumentRecord>`: Tạo một tài liệu mới.
- `import(input: ImportDocumentInput): Promise<DocumentRecord>`: Import một file DOCX.
- `restoreVersion(versionId: string): Promise<DocumentSnapshot>`: Khôi phục phiên bản.
- `on(eventName: string, handler: Function): Function`: Đăng ký lắng nghe sự kiện. Trả về hàm hủy đăng ký (unsubscribe).
- `destroy(): void`: Giải phóng client và ngắt toàn bộ timer autosave.

---

## 2. Mã lỗi chuẩn (`DocumentLibraryError`)

Khi xảy ra sự cố, SDK ném hoặc phát sự kiện chứa `DocumentLibraryError` với các mã lỗi chuẩn:

| Error Code | Ý nghĩa | Hành động đề xuất |
|---|---|---|
| `VERSION_CONFLICT` | Server trả về HTTP 409 do `baseRevisionId` không còn là bản mới nhất. | Hiển thị thông báo để người dùng chọn tải lại hoặc lưu bản sao mới. |
| `DOCUMENT_NOT_FOUND` | Tài liệu không tồn tại trên server (HTTP 404). | Chuyển hướng người dùng về danh sách tài liệu. |
| `DOCX_INVALID` | Tệp tin upload không phải định dạng DOCX/ZIP OOXML hợp lệ. | Yêu cầu người dùng kiểm tra lại file. |
| `DOCX_UNSUPPORTED` | Tệp DOCX chứa các cấu trúc ngoài phạm vi hỗ trợ ở chế độ strict. | Chuyển sang chế độ `best-effort` hoặc cảnh báo người dùng. |
| `NETWORK_ERROR` | Mất kết nối internet hoặc không gọi được backend. | Hiển thị cảnh báo mất mạng và tạm dừng autosave. |
| `ADAPTER_ERROR` | Lỗi phát sinh từ server backend (500, 400...). | Kiểm tra log backend hoặc thuộc tính `error.details`. |
