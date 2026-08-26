# Kindy Editor - Project Mẫu Tích Hợp

Dự án mẫu minh họa cách cài đặt và tích hợp thư viện [`kindy-editor`](https://www.npmjs.com/package/kindy-editor) vào ứng dụng web (TypeScript/Vanilla JS/Vite).

---

## 1. Cài đặt thư viện

Cài đặt package qua npm hoặc yarn/pnpm:

```bash
npm install kindy-editor
```

---

## 2. Cách sử dụng cơ bản

Tạo một container HTML và khởi tạo editor:

### HTML
```html
<div id="editor-container" style="width: 100vw; height: 100vh;"></div>
```

### TypeScript / JavaScript
```ts
import { KindyEditor } from "kindy-editor";

// Khởi tạo editor
const editor = new KindyEditor({
  container: document.getElementById("editor-container")!,
  user: {
    id: "user-123",
    firstName: "Nguyễn",
    lastName: "Văn A",
  },
  language: "vi", // "vi" (Tiếng Việt) hoặc "en" (English)
  mode: "edit",   // "edit" | "suggest" | "view"
});
```

---

## 3. Các tính năng mở rộng

### Xuất tài liệu (Export PDF / DOCX)
```ts
// Xuất PDF
const pdfBlob = await editor.exportPdf();

// Xuất file Word .docx (bao gồm comments & track changes)
const docxBlob = await editor.exportDocx();
```

### Lắng nghe Public Events
```ts
// Lắng nghe sự kiện thay đổi tài liệu
editor.events.on("document.changed", (event) => {
  console.log("Document changed:", event.data);
});

// Lắng nghe sự kiện export
editor.events.on("document.export.completed", (event) => {
  console.log("Export completed:", event.data);
});

// Lắng nghe tất cả sự kiện
editor.events.on("*", (event) => {
  console.log(`[Event ${event.type}]`, event.data);
});
```

### Thay đổi ngôn ngữ và chế độ soạn thảo động
```ts
// Đổi ngôn ngữ UI
editor.setLanguage("en"); // hoặc "vi"

// Đổi chế độ soạn thảo
editor.setMode("suggest"); // Chế độ đề xuất / theo dõi thay đổi
editor.setMode("view");    // Chế độ chỉ đọc
editor.setMode("edit");    // Chế độ chỉnh sửa bình thường
```

---

## 4. Chạy dự án mẫu này

Từ thư mục root của monorepo:

```bash
# Chạy dự án demo
npm run demo
```

Hoặc chạy trực tiếp từ thư mục `examples/demo-app`:
```bash
cd examples/demo-app
npm run dev
```
Trình duyệt sẽ mở tại `http://localhost:3000`.
