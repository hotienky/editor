# DOCX Codecs & Print/PDF

Kindy Editor v2 sở hữu hệ thống bộ giải mã (Codecs) chuyên biệt để import và export tài liệu Microsoft Word (.docx).

---

## 1. Import DOCX trong Web Worker

Để đảm bảo hiệu năng tối ưu ngay cả với các tài liệu Word lớn (hàng trăm trang, nhiều hình ảnh), quá trình phân tích tệp DOCX (giải nén ZIP, parse XML DrawingML/VML/OOXML) được thực thi trong **Web Worker** ngầm.

### Luồng Import DOCX:

```text
[File DOCX] 
   └──> Web Worker giải nén & parse OOXML
          └──> Trích xuất State JSON (KindyDocumentState)
          └──> Tạo báo cáo tương thích (CompatibilityReport)
          └──> Người dùng duyệt cảnh báo (nếu có)
          └──> POST /documents/import lên Backend
```

### Sử dụng Codec độc lập:

```ts
import { importDocxInWorker } from 'kindy-editor'

const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const result = await importDocxInWorker(file, {
  mode: 'best-effort',
  profile: 'kindy-docx-v2.0',
})

console.log('Document State:', result.state)
console.log('Báo cáo tương thích:', result.report)

if (result.report.issues.length > 0) {
  console.warn('Một số định dạng phức tạp có thể bị giản lược:', result.report.issues)
}
```

---

## 2. Xuất DOCX chuẩn OOXML (Export DOCX)

Khi xuất file, Kindy Editor sử dụng bộ serialize chuyển đổi `KindyDocumentState` sang tệp ZIP chứa cấu trúc XML chuẩn của Office Open XML (`word/document.xml`, `word/_rels/`, `[Content_Types].xml`...). File DOCX xuất ra mở mượt mà trên Microsoft Word, LibreOffice, Google Docs mà không bị lỗi cấu trúc (corrupt).

```ts
import { exportDocx } from 'kindy-editor'

// Xuất file từ Document State hiện tại
const output = await exportDocx(currentState, {
  profile: 'kindy-docx-v2.0',
  mode: 'strict', // 'strict' hoặc 'best-effort'
})

// Tải file về máy
import { saveAs } from 'file-saver'
saveAs(output.blob, 'hop-dong-kinh-te.docx')
```

---

## 3. Profiles Tương thích DOCX (Capability Profiles)

SDK hỗ trợ 3 mức profile theo tiêu chuẩn:

| Profile | Hỗ trợ tính năng | Khi nào sử dụng |
|---|---|---|
| `kindy-docx-v2.0` (Mặc định) | Đoạn văn, Heading, List, Table, Image, Bold/Italic/Color, Rulers & Tabs, Watermark. | Các văn bản, hợp đồng tiêu chuẩn thông dụng. |
| `kindy-docx-v2.1` | Thêm Header & Footer nhiều trang (Odd/Even/First page), Sections nhiều cột, Comments, Đánh dấu sửa đổi (Track Changes), Revisions. | Báo cáo, sách, tài liệu in ấn nhiều chương mục; quy trình thẩm định, duyệt hợp đồng nhiều bên. |

---

## 4. In ấn và Xuất PDF (Print to PDF)

Kindy Editor tích hợp sẵn module chuẩn bị trang in (`preparePrint`) chuẩn theo pixel và CSS `@media print`:

```ts
// Kích hoạt qua instance của Workspace
await workspace.value.preparePrint()
workspace.value.print()
```
