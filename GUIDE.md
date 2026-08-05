# Hướng Dẫn Sử Dụng Chi Tiết & Tích Hợp API Backend `kindy-editor`

Tài liệu này hướng dẫn chi tiết cách khai thác **toàn bộ tính năng** của trình biên tập `kindy-editor` và cách **kết nối API Backend / Database** chuẩn thương mại.

---

## 📌 MỤC LỤC

1. [Tổng Quan & Cài Đặt](#1-tổng-quan--cài-đặt)
2. [Hướng Dẫn Tích Hợp Tất Cả Các Framework](#2-hướng-dẫn-tích-hợp-tất-cả-các-framework)
3. [Hướng Dẫn Chi Tiết Tất Cả Tính Năng](#3-hướng-dẫn-chi-tiết-tất-cả-tính-năng)
   - [3.1. Phân trang dạng Word & Khổ giấy](#31-phân-trang-dạng-word--khổ-giấy)
   - [3.2. Hệ thống Bình luận (Word-Style Comments)](#32-hệ-thống-bình-luận-word-style-comments)
   - [3.3. Chữ ký điện tử & Con dấu](#33-chữ-ký-điện-tử--con-dấu)
   - [3.4. Định dạng văn bản & Phông chữ Tiếng Việt](#34-định-dạng-văn-bản--phông-chữ-tiếng-việt)
   - [3.5. Chèn Bảng & Thao tác Ô](#35-chèn-bảng--thao-tác-ô)
   - [3.6. Chèn Hình ảnh, Video, Audio & File đính kèm](#36-chèn-hình-ảnh-video-audio--file-đính-kèm)
   - [3.7. Công thức toán học (KaTeX) & Code Block](#37-công-thức-toán-học-katex--code-block)
   - [3.8. Tìm kiếm & Thay thế (Search & Replace)](#38-tìm-kiếm--thay-thế-search--replace)
   - [3.9. Xuất file PDF, Hình ảnh & In ấn](#39-xuất-file-pdf-hình-ảnh--in-ấn)
   - [3.10. Chế độ giao diện (Ribbon/Classic, Dark Mode, ReadOnly)](#310-chế-độ-giao-diện-ribbonclassic-dark-mode-readonly)
4. [Tích Hợp API Backend & Database (Full API Connection Guide)](#4-tích-hợp-api-backend--database-full-api-connection-guide)
   - [4.1. Thiết kế Cấu trúc Database (Database Schema)](#41-thiết-kế-cấu-trúc-database-database-schema)
   - [4.2. API Lưu tài liệu & Tự động lưu (`onSave` / `autoSave`)](#42-api-lưu-tài-liệu--tự-động-lưu-onsave--autosave)
   - [4.3. API Tải tệp lên Server / Cloud Storage (`onFileUpload`)](#43-api-tải-tệp-lên-server--cloud-storage-onfileupload)
   - [4.4. API Tìm kiếm người dùng Mention (`onMentionSearch`)](#44-api-tìm-kiếm-người-dùng-mention-onmentionsearch)
   - [4.5. Lịch sử & Quản lý phiên bản tài liệu (Document History / Revisions)](#45-lịch-sử--quản-lý-phiên-bản-tài-liệu-document-history--revisions)
5. [Tra Cứu Phương Thức API (Methods Reference)](#5-tra-cứu-phương-thức-api-methods-reference)

---

## 1. TỔNG QUAN & CÀI ĐẶT

`kindy-editor` là trình biên tập văn bản WYSIWYG chuẩn Office hiện đại được đóng gói đa định dạng (ESM, CJS, IIFE CDN, TypeScript).

```bash
# Cài đặt qua NPM
npm install kindy-editor

# hoặc Yarn / PNPM
yarn add kindy-editor
pnpm add kindy-editor
```

---

## 2. HƯỚNG DẪN TÍCH HỢP TẤT CẢ CÁC FRAMEWORK

### 2.1. Vue 3 (SPA & Global Plugin)

```vue
<template>
  <div style="height: 100vh;">
    <KindyEditor ref="editorRef" v-bind="options" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { KindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const editorRef = ref(null)
const options = ref({
  locale: 'vi-VN',
  theme: 'light',
  document: {
    title: 'Hợp đồng kinh tế',
    content: '<h1>HỢP ĐỒNG MẪU</h1><p>Nội dung hợp đồng...</p>',
  },
  async onSave(content) {
    await fetch('/api/documents/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: content.html })
    })
  }
})
</script>
```

### 2.2. React.js

Dùng hàm helper `mountKindyEditor`:

```tsx
import React, { useEffect, useRef } from 'react'
import { mountKindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

export function KindyEditorReact(props) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const instance = mountKindyEditor(containerRef.current, {
      locale: 'vi-VN',
      ...props
    })
    return () => instance.unmount()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
}
```

### 2.3. Next.js (App Router & Pages Router)

Tạo Client Component với `next/dynamic` (`ssr: false`):

```tsx
'use client'
import dynamic from 'next/dynamic'

const KindyEditor = dynamic(
  () => import('./KindyEditorReact').then((mod) => mod.KindyEditorReact),
  { ssr: false }
)

export default function Page() {
  return (
    <main style={{ height: '100vh' }}>
      <KindyEditor locale="vi-VN" />
    </main>
  )
}
```

### 2.4. Vanilla JS / HTML Direct (CDN)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/kindy-editor/dist/kindy-editor.css">
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://unpkg.com/kindy-editor/dist/kindy-editor.iife.js"></script>
</head>
<body>
  <div id="editor" style="height: 100vh;"></div>
  <script>
    const { mountKindyEditor } = KindyEditor;
    mountKindyEditor('#editor', { locale: 'vi-VN' });
  </script>
</body>
</html>
```

---

## 3. HƯỚNG DẪN CHI TIẾT TẤT CẢ TÍNH NĂNG

### 3.1. Phân trang dạng Word & Khổ giấy
- **Khổ giấy chuẩn**: A4 (210x297mm), A3, A5, Letter, Legal...
- **Căn lề (Margin)**: Lề trên, dưới, trái, phải tính theo `mm` hoặc `px`.
- **Hướng trang**: Dọc (Portrait) hoặc Ngang (Landscape).
- **Header & Footer**: Nhập nội dung đầu trang, chân trang và đánh số trang tự động.
- **Ngắt trang (Page Break)**: Chèn ngắt trang chủ động bằng phím `Ctrl + Enter` hoặc qua menu *Chèn > Ngắt trang*.

Cấu hình trong Option:
```javascript
page: {
  layouts: ['page', 'web'], // 'page': phân trang Word, 'web': cuộn liên tục
  defaultMargin: { top: 20, bottom: 20, left: 25, right: 25 },
  defaultOrientation: 'portrait',
}
```

---

### 3.2. Hệ thống Bình luận (Word-Style Comments)
- **Tạo bình luận**: Bôi đen đoạn chữ ➔ Bấm nút **Bình luận** (hoặc ấn `Ctrl + Alt + M`).
- **Tọa độ Y**: Bình luận trên Sidebar bên phải tự động cuộn khớp chính xác hàng ngang của đoạn chữ được chọn trên trang.
- **Phản hồi (Reply)**: Nhập bình luận con trong từng thẻ thảo luận.
- **Hoàn thành (Resolve)**: Bấm biểu tượng tích xanh ➔ Thẻ bình luận chuyển sang màu xám mờ (`kindy-comment-resolved`), giữ văn bản sạch sẽ.
- **Xóa / Từ chối (Reject)**: Bấm biểu tượng thùng rác ➔ Gỡ bỏ thẻ bình luận, khôi phục văn bản gốc.

---

### 3.3. Chữ ký điện tử & Con dấu
- **Vẽ ký trực tuyến**: Hỗ trợ nét vẽ mượt (Smooth curves), chỉnh màu nét (Line color), độ dày nét (Line width), và nút Xóa/Hủy.
- **Tải ảnh chữ ký**: Tải ảnh từ máy tính ➔ Cắt ảnh (Crop tool) ngay trong giao diện.
- **Chèn con dấu**: Hỗ trợ chèn ảnh con dấu tròn/vuông nổi trên trang văn bản.

---

### 3.4. Định dạng văn bản & Phông chữ Tiếng Việt
- **Bộ phông Tiếng Việt nét mịn**: `San Francisco`, `Segoe UI`, `Roboto`, `Arial`, `Times New Roman`, `Courier New`...
- **Kích thước font**: Tính theo điểm `pt` tiêu chuẩn Word (8pt - 72pt).
- **Định dạng**: In đậm (`Ctrl+B`), In nghiêng (`Ctrl+I`), Gạch chân (`Ctrl+U`), Gạch ngang, Chỉ số trên (`X²`), Chỉ số dưới (`H₂O`).
- **Màu chữ & Highlight**: Bộ bảng màu HSL phong phú, hỗ trợ Gradient và Custom Hex Color.

---

### 3.5. Chèn Bảng & Thao tác Ô
- **Khởi tạo**: Chọn lưới số dòng x số cột (VD: 3x4, 5x5).
- **Thao tác**: Thêm dòng trên/dưới, Thêm cột trái/phải, Xóa dòng/cột, Xóa toàn bộ bảng.
- **Gộp & Tách ô (Merge/Split Cells)**: Bôi đen các ô ➔ Bấm *Gộp ô* hoặc *Tách ô*.
- **Tùy chỉnh ô**: Đổi màu nền ô (Cell background), Đường viền (Border style & color), Căn lề nội dung ô (Trái, Giữa, Phải).

---

### 3.6. Chèn Hình ảnh, Video, Audio & File đính kèm
- **Hình ảnh**: Thay đổi kích thước (Resize handles), Cắt hình ảnh (Crop), Căn vị trí (Trái, Giữa, Phải, Nổi tràn lề), Đặt tiêu đề ảnh (Caption).
- **Video & Audio**: Nhúng video MP4/WebM hoặc liên kết Youtube/Vimeo có sẵn trình phát đa phương tiện.
- **File đính kèm**: Hiển thị thẻ Card đính kèm gồm tên tệp, dung lượng `KB/MB` và nút Tải về.

---

### 3.7. Công thức toán học (KaTeX) & Code Block
- **Công thức Toán**: Nhập công thức dạng TeX/LaTeX (VD: `\frac{-b \pm \sqrt{b^2-4ac}}{2a}`) ➔ Render KaTeX sắc nét.
- **Khối Mã nguồn (Code Block)**: Hỗ trợ tô màu cú pháp (Syntax Highlighting) cho JavaScript, Python, C++, HTML, CSS, Java, SQL...

---

### 3.8. Tìm kiếm & Thay thế (Search & Replace)
- Nhấn `Ctrl + F` hoặc bấm nút *Tìm kiếm & Thay thế*.
- Hỗ trợ: Phân biệt hoa thường (Match Case), Thay thế từng từ (Replace), Thay thế tất cả (Replace All), Hiển thị số lượng kết quả tìm thấy.

---

### 3.9. Xuất file PDF, Hình ảnh & In ấn
- **Xuất PDF**: Chuyển đổi toàn bộ các trang tài liệu chuẩn lề A4 thành tệp PDF chất lượng cao.
- **Xuất Hình ảnh**: Xuất trang thành tệp PNG hoặc JPEG.
- **In ấn**: Gọi hộp thoại in `Ctrl + P` chuẩn trình duyệt.

---

### 3.10. Chế độ giao diện (Ribbon/Classic, Dark Mode, ReadOnly)
- **Ribbon mode**: Thanh công cụ chia theo các Tab (*Chính, Chèn, Xem, Công cụ*) chuẩn Microsoft Word.
- **Classic mode**: Thanh công cụ 1 hàng gọn nhẹ chuẩn Google Docs.
- **Dark mode**: Chế độ tối tự động hoặc bật thủ công.
- **ReadOnly**: Chế độ Chỉ đọc (Xem tài liệu, không cho phép chỉnh sửa).

---

## 4. TÍCH HỢP API BACKEND & DATABASE (FULL API CONNECTION GUIDE)

### 4.1. Thiết kế Cấu trúc Database (Database Schema)

Dưới đây là sơ đồ SQL chuẩn cho MySQL / PostgreSQL để lưu trữ tài liệu, bình luận và lịch sử phiên bản:

```sql
-- 1. Bảng lưu trữ Tài liệu (Documents)
CREATE TABLE documents (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL, -- Lưu chuỗi HTML chứa cả thẻ bình luận nhúng
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  created_by VARCHAR(64) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng lưu trữ Lịch sử phiên bản (Document Revisions)
CREATE TABLE document_revisions (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL,
  version INT NOT NULL,
  content LONGTEXT NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 3. (Tùy chọn) Bảng lưu vết Bình luận riêng nếu cần hệ thống Thông báo (Comments Audit Log)
CREATE TABLE comments_log (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  comment_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'resolved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4.2. API Lưu tài liệu & Tự động lưu (`onSave` / `autoSave`)

Cấu hình trong Option `kindy-editor`:

```javascript
const options = {
  locale: 'vi-VN',
  document: {
    title: 'Báo cáo doanh số Q3',
    content: initialHtmlFromDatabase,
    autoSave: {
      enabled: true,
      interval: 30000, // Tự động lưu mỗi 30 giây
    },
  },
  
  // Hàm Callback được gọi khi bấm nút "Lưu" hoặc ấn Ctrl + S hoặc Tự động lưu
  async onSave(content, page, document) {
    try {
      const response = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: document.id || 'doc_101',
          title: document.title,
          html: content.html, // Chuỗi HTML chứa văn bản & bình luận
          json: content.json, // (Tùy chọn) JSON object nếu cần
        }),
      })

      const data = await response.json()
      if (data.success) {
        return { success: true, message: 'Đã lưu tài liệu thành công!' }
      }
      return { success: false, message: data.errorMessage }
    } catch (error) {
      return { success: false, message: 'Lỗi kết nối Server' }
    }
  },
}
```

---

### 4.3. API Tải tệp lên Server / Cloud Storage (`onFileUpload`)

Khi người dùng chèn Hình ảnh, Video, Audio hoặc Tệp đính kèm, `kindy-editor` sẽ gọi callback `onFileUpload` để đẩy tệp lên Server / AWS S3 / Cloudinary:

```javascript
const options = {
  async onFileUpload(file) {
    const formData = new FormData()
    formData.append('file', file)

    // Đẩy tệp lên Backend API của bạn
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    // Backend trả về đường dẫn URL và thông tin tệp
    return {
      id: data.fileId,
      url: data.fileUrl, // URL xem ảnh/tệp (VD: 'https://cdn.mysite.com/uploads/img.png')
      name: file.name,
      type: file.type,
      size: file.size,
    }
  },

  // Callback khi người dùng xóa tệp khỏi tài liệu
  async onFileDelete(id, url, type) {
    await fetch(`/api/upload/${id}`, { method: 'DELETE' })
  },
}
```

---

### 4.4. API Tìm kiếm người dùng Mention (`onMentionSearch`)

Khi người dùng gõ ký tự `@` trên tài liệu, `kindy-editor` gọi callback `onMentionSearch` để gợi ý danh sách nhân viên/thành viên từ Server:

```javascript
const options = {
  async onMentionSearch(query) {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
    const users = await res.json()
    
    // Trả về mảng danh sách người dùng
    return users.map((user) => ({
      id: user.id,
      label: user.fullName, // Tên hiển thị khi gõ @
      avatar: user.avatarUrl,
      bio: user.department,
    }))
  },
}
```

---

### 4.5. Lịch sử & Quản lý phiên bản tài liệu (Document History / Revisions)

Khi gọi API lưu từ phía Client, ở Backend Node.js / Express / Python / Java, bạn xử lý lưu bản ghi Revision như sau:

#### Ví dụ Node.js / Express Controller Backend:

```javascript
app.post('/api/documents/save', async (req, res) => {
  const { id, title, html } = req.body
  const userId = req.user.id

  // 1. Cập nhật bản ghi tài liệu chính
  await db.query(
    `INSERT INTO documents (id, title, content, created_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = ?, content = ?, updated_at = NOW()`,
    [id, title, html, userId, title, html]
  )

  // 2. Tính số version tiếp theo
  const [rows] = await db.query(
    `SELECT COUNT(*) as total FROM document_revisions WHERE document_id = ?`,
    [id]
  )
  const nextVersion = (rows[0].total || 0) + 1

  // 3. Lưu một bản ghi lịch sử vào document_revisions
  await db.query(
    `INSERT INTO document_revisions (id, document_id, version, content, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [`rev_${Date.now()}`, id, nextVersion, html, userId]
  )

  res.json({ success: true, version: nextVersion })
})
```

---

## 5. TRA CỨU PHƯƠNG THỨC API (METHODS REFERENCE)

Khi gắn `ref="editorRef"` trên Vue/React hoặc dùng `mountKindyEditor`:

```javascript
// 1. Lấy nội dung HTML
const html = editorRef.value.getContent('html')

// 2. Lấy nội dung JSON
const json = editorRef.value.getContent('json')

// 3. Lấy chữ thô Plain Text
const text = editorRef.value.getContent('text')

// 4. Đặt nội dung mới
editorRef.value.setContent('<h1>Nội dung mới</h1>')

// 5. Chèn nội dung tại con trỏ
editorRef.value.insertContent('<p>Đoạn văn mới</p>')

// 6. Lấy danh sách toàn bộ Bình luận (Mảng Object)
const comments = editorRef.value.getComments()

// 7. Giải quyết / Accept bình luận
editorRef.value.setResolved(commentId, true)

// 8. Từ chối / Xóa bình luận
editorRef.value.removeComment(commentId)

// 9. Xuất file PDF
await editorRef.value.exportPdf('tai-lieu.pdf')

// 10. Xuất hình ảnh PNG/JPEG
await editorRef.value.exportImage('png', 'tai-lieu.png')

// 11. In tài liệu
editorRef.value.print()

// 12. Đổi giao diện Sáng/Tối
editorRef.value.setTheme('dark')
```
