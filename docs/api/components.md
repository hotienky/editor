# UI Components Reference

Tra cứu chi tiết các Component được export bởi gói `kindy-editor`.

---

## 1. `<KindyDocumentLibrary />`

Workspace hoàn chỉnh tích hợp toàn bộ các phân vùng làm việc.

### Props

| Tên Prop | Kiểu dữ liệu | Mặc định | Mô tả |
|---|---|---|---|
| `adapter` | `DocumentApiAdapter` | `undefined` | Adapter kết nối backend (Bắt buộc nếu không truyền `client`). |
| `client` | `DocumentLibraryClient` | `undefined` | Client instance do ứng dụng chủ tự quản lý. |
| `autosave` | `{ enabled?: boolean; delay?: number }` | `{ enabled: true, delay: 5000 }` | Cấu hình tự động lưu (Delay tối thiểu 250ms). |
| `locale` | `string` | `'vi-VN'` | Ngôn ngữ giao diện (`vi-VN`, `en-US`, `zh-CN`). |
| `theme` | `Record<string, string>` | `{}` | Các biến CSS Variables ghi đè giao diện. |
| `messages` | `Partial<KindyLibraryMessages>` | `{}` | Tùy biến nhãn văn bản của UI. |
| `docxProfile` | `'kindy-docx-v2.0' \| 'kindy-docx-v2.1' \| 'kindy-docx-v2.2'` | `'kindy-docx-v2.0'` | Profile tương thích DOCX cho import/export. |
| `collaboration` | `CollaborationAdapter` | `undefined` | Adapter cộng tác realtime. |
| `user` | `{ id?: string; name?: string; color?: string }` | `undefined` | Định danh người dùng hiện tại. |
| `ui` | `Partial<KindyLibraryUiOptions>` | `{}` | Tùy biến kích thước cột sidebar, layout mật độ. |
| `editorOptions` | `Record<string, any>` | `CONTRACT_EDITOR_OPTIONS` | Tùy biến cấu hình thanh công cụ và editor. |

### Events

| Tên Event | Payload | Mô tả |
|---|---|---|
| `ready` | `{ document, editor }` | Phát khi editor và tài liệu đã sẵn sàng. |
| `opened` | `DocumentSnapshot` | Phát khi mở xong một tài liệu. |
| `changed` | `DocumentSnapshot` | Phát khi nội dung tài liệu bị thay đổi (dirty). |
| `save-started` | `{ documentId, reason }` | Bắt đầu quá trình lưu (autosave hoặc manual). |
| `saved` | `SaveResult & { documentId }` | Lưu thành công vào backend. |
| `save-failed` | `DocumentLibraryError` | Quá trình lưu thất bại (xung đột, mạng...). |
| `created` | `DocumentSummary` | Đã tạo thành công tài liệu mới. |
| `imported` | `DocumentSummary` | Đã import thành công file DOCX mới. |
| `compatibility-warning` | `CompatibilityReport` | Cảnh báo tính năng DOCX ngoài chuẩn. |
| `version-restored` | `DocumentSnapshot` | Đã khôi phục về phiên bản cũ. |

### Methods (Exposed via `ref`)

```typescript
const workspace = ref<KindyDocumentLibraryInstance>()

workspace.value.openDocument(docSummary) // Mở tài liệu
workspace.value.save()                   // Lưu ngay lập tức
workspace.value.downloadDocx()           // Tải file DOCX
workspace.value.print()                  // In ấn / Xuất PDF
workspace.value.getState()               // Lấy KindyDocumentState hiện tại
workspace.value.toggleExplorer(open?)    // Đóng/mở Sidebar Explorer
workspace.value.toggleVersions(open?)    // Đóng/mở Panel lịch sử phiên bản
```

---

## 2. `<KindyEditor />`

Trình soạn thảo phân trang độc lập.

### Props

| Tên Prop | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `document` | `{ content: JSONContent; assets?: AssetReference[] }` | Dữ liệu nội dung khởi tạo. |
| `page` | `KindyPageState` | Cấu hình khổ giấy, căn lề và header/footer. |
| `readOnly` | `boolean` | Chế độ chỉ đọc (khóa chỉnh sửa). |
| `locale` | `string` | Ngôn ngữ giao diện editor. |
| `options` | `EditorOptions` | Tùy biến thanh công cụ, font chữ, ruler. |
