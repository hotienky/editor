# kindy-editor (Kindy Editor)

Trình biên tập tài liệu chuẩn Office (Word-like Document Editor) hiện đại dựa trên **Vue 3** và **Tiptap 3**. Được tùy biến, tối ưu hóa và hỗ trợ 100% giao diện **Tiếng Việt**.

[![npm version](https://img.shields.io/npm/v/kindy-editor.svg)](https://www.npmjs.com/package/kindy-editor)
[![license](https://img.shields.io/github/license/hotienky/editor.svg)](./LICENSE)

---

## ✨ Tính năng nổi bật

- 📄 **Phân trang dạng Word (Page-based Pagination)**: Hỗ trợ ngắt trang, căn lề, khổ giấy (A4, A3, Letter, Legal...) chân trang & đầu trang (Header/Footer).
- 💬 **Hệ thống Bình luận (Word-style Comments)**: Bôi đen văn bản để gắn bình luận, phản hồi (Reply), hoàn thành (Resolve), cuộn mượt và highlight từng người dùng.
- 🇻🇳 **Tiếng Việt 100%**: Chuẩn hóa toàn bộ nhãn giao diện, bộ cỡ chữ tiêu chuẩn (`pt`), từ điển ký hiệu và phông chữ mượt mà.
- 🎨 **Giao diện hiện đại (Ribbon & Classic)**: Hỗ trợ 2 chế độ thanh công cụ dạng Ribbon (như MS Word) hoặc Classic, chế độ tối (Dark mode).
- 🔠 **Phông chữ hệ thống & Web Fonts chuẩn**: Tích hợp phông hệ thống mượt nét (`San Francisco`, `Segoe UI`, `Roboto`, `Arial`, `Times New Roman`...) không bị vỡ hay lệch dấu Tiếng Việt.
- 🗄️ **Lưu trữ linh hoạt**: Tự động mã hóa nhúng bình luận vào HTML/JSON hoặc tách riêng lưu vào cơ sở dữ liệu (Database).

---

## 📦 Cài đặt

```bash
npm install kindy-editor
# hoặc
pnpm add kindy-editor
# hoặc
yarn add kindy-editor
```

---

## 🚀 Hướng dẫn sử dụng nhanh (Quick Start)

```vue
<template>
  <div style="height: 100vh;">
    <KindyEditor ref="editorRef" :options="editorOptions" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { KindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const editorRef = ref(null)

const editorOptions = ref({
  locale: 'vi-VN', // Sử dụng tiếng Việt mặc định
  document: {
    title: 'Tài liệu mẫu',
    content:
      '<h1>Chào mừng bạn đến với Kindy Editor!</h1><p>Bôi đen đoạn chữ này để thử tính năng bình luận.</p>',
  },
  // Sự kiện lưu (Ctrl + S hoặc bấm nút Lưu)
  async onSave(content, page, document) {
    console.log('Nội dung HTML/JSON đã lưu:', content)
    // Tích hợp API lưu vào Database của bạn tại đây
    return { success: true }
  },
})
</script>
```

---

## 💬 Hướng dẫn & API Hệ thống Bình luận (Comments)

### 1. Cơ chế hoạt động

Bình luận được lưu trực tiếp dưới dạng thẻ `span` chứa thuộc tính `data-comment` và `data-thread` trong tài liệu HTML/JSON:

```html
<span
  data-comment="c1a2b3"
  data-color="rgba(255, 213, 79, 0.4)"
  data-thread='{"id":"c1a2b3","text":"Cần chỉnh sửa","replies":[]}'
  class="kindy-comment"
>
  Đoạn văn bản được bình luận
</span>
```

### 2. Các API tương tác với Bình luận

Thông qua `ref` của component `<KindyEditor ref="editorRef" />`:

```javascript
// 1. Thêm bình luận cho vùng bôi đen hiện tại
editorRef.value.addComment('Nội dung bình luận mới')

// 2. Thêm phản hồi (Reply) cho 1 bình luận
editorRef.value.addReply(commentId, 'Nội dung phản hồi')

// 3. Đánh dấu Đã giải quyết (Resolve) hoặc Mở lại
editorRef.value.resolveComment(commentId, true) // true: Đã giải quyết, false: Mở lại

// 4. Xóa bình luận
editorRef.value.removeComment(commentId)

// 5. Tập trung con trỏ & cuộn màn hình tới vị trí bình luận
editorRef.value.focusComment(commentId)

// 6. Lấy danh sách toàn bộ bình luận dưới dạng mảng Object
const comments = editorRef.value.getComments()

// 7. Đếm tổng số bình luận
const total = editorRef.value.getCommentCount()

// 8. Ẩn / Hiện thanh Sidebar bình luận
editorRef.value.toggleCommentSidebar(true) // true: hiện, false: ẩn
```

---

## 🗄️ Hướng dẫn tích hợp Cơ sở dữ liệu (Database Integration)

### Cách 1: Gộp chung vào Nội dung (Khuyên dùng - Đơn giản nhất)

Khi bạn lưu `content` thu được từ `onSave` hoặc `editorRef.value.getHTML()`, toàn bộ bình luận đã nằm sẵn bên trong thẻ `<span data-comment>`:

- **Lưu DB**: Lưu chuỗi `content` vào cột `content TEXT` trong bảng `documents`.
- **Đọc DB**: Truyền lại `content` vào `:options="{ document: { content: data.content } }"` ➔ Bình luận tự động hiển thị lại 100%.

### Cách 2: Tách Bình luận ra Bảng Database riêng

Nếu bạn muốn quản lý bình luận riêng trong bảng `comments` (để thông báo, phân quyền):

```javascript
const saveToBackend = async () => {
  const htmlContent = editorRef.value.getHTML()
  const commentsList = editorRef.value.getComments()

  await fetch('/api/documents/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docId: 'doc_123',
      content: htmlContent,
      comments: commentsList, // Danh sách mảng comment object
    }),
  })
}
```

---

## 🛠️ Lệnh phát triển (Development Commands)

```bash
# Cài đặt phụ thuộc
npm install

# Chạy server phát triển (Dev server tại http://localhost:9000/kindy-editor)
npm run dev

# Đóng gói sản phẩm (Production build ra thư mục dist/)
npm run build

# Định dạng code
npm run format
```

---

## 📄 License & Credits

- Phát hành theo giấy phép [MIT License](./LICENSE).
- Dựa trên mã nguồn gốc [Umo Editor](https://github.com/umodoc/editor) bởi đội ngũ umodoc.
- Bản quyền thuộc về **Kindy** ([GitHub](https://github.com/hotienky)).
