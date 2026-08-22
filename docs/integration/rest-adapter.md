# REST Document Adapter

`RestDocumentAdapter` là cầu nối mặc định của SDK để giao tiếp với hệ thống Backend thông qua giao thức HTTP REST.

---

## 1. Khởi tạo REST Adapter

```typescript
import { createRestDocumentAdapter } from 'kindy-editor'

const adapter = createRestDocumentAdapter({
  // Đường dẫn gốc của API server
  baseUrl: 'https://api.yourdomain.com/v1/document-api',

  // Tùy biến hàm transport (fetch) để gắn headers, auth token, tenant
  transport: (url, init) => {
    return fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...init?.headers,
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'x-tenant-id': 'acme-corp',
      },
    })
  },
})
```

---

## 2. Danh sách các API Endpoints mà Backend cần hỗ trợ

| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/documents` | Lấy danh sách tài liệu (hỗ trợ phân trang `page`, `pageSize`, tìm kiếm `search`, lọc theo `folderId`). |
| `POST` | `/documents` | Tạo một tài liệu mới (trống hoặc từ mẫu template). |
| `GET` | `/documents/{id}` | Lấy chi tiết thông tin metadata của tài liệu. |
| `PATCH` | `/documents/{id}` | Cập nhật tiêu đề, tags hoặc metadata tài liệu. |
| `POST` | `/documents/import` | Upload file DOCX gốc, metadata và `KindyDocumentState` (Multipart form-data). |
| `GET` | `/documents/{id}/state` | Lấy snapshot nội dung `KindyDocumentState` hiện tại (hoặc theo `versionId`). |
| `PUT` | `/documents/{id}/state` | Lưu trạng thái mới (kèm `baseRevisionId` để kiểm tra xung đột). |
| `GET` | `/documents/{id}/versions` | Lấy danh sách lịch sử các phiên bản (Versions). |
| `POST` | `/documents/{id}/versions/{versionId}/restore` | Khôi phục trạng thái về phiên bản cũ. |
| `POST` | `/documents/{id}/artifacts` | Lưu trữ file artifact xuất ra (DOCX/PDF). |
| `GET` | `/folders` | Lấy danh sách cây thư mục phân cấp. |
| `GET` | `/templates` | Lấy danh sách các tài liệu mẫu. |

---

## 3. Quản lý Xử lý Lỗi

`RestDocumentAdapter` chuẩn hóa các HTTP Status Code thành các mã lỗi chuẩn của SDK:

- **404**: Chuyển thành lỗi `DOCUMENT_NOT_FOUND`.
- **409**: Chuyển thành lỗi `VERSION_CONFLICT` (Kích hoạt luồng dừng autosave).
- **500+ / Lỗi khác**: Chuyển thành `ADAPTER_ERROR` kèm chi tiết phản hồi từ server.
- **Mất mạng / Network Fail**: Chuyển thành `NETWORK_ERROR`.
