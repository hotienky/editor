---
layout: home

hero:
  name: "Kindy Editor v2"
  text: "DOCX Document Library SDK & Vue 3 Editor"
  tagline: "Bộ công cụ soạn thảo và quản lý tài liệu DOCX chuyên nghiệp trên web, xây dựng trên nền tảng Tiptap/ProseMirror với Headless TypeScript Core."
  image:
    src: /logo.svg
    alt: Kindy Editor Logo
  actions:
    - theme: brand
      text: Bắt đầu tích hợp →
      link: /guide/getting-started
    - theme: alt
      text: Tra cứu API
      link: /api/components
    - theme: alt
      text: Trải nghiệm Live Demo
      link: /examples/live-demo

features:
  - icon: 📄
    title: Chuyên biệt cho DOCX
    details: Import DOCX trong Web Worker với báo cáo tương thích (Compatibility Report), export DOCX OOXML chuẩn và in/xuất PDF trực tiếp từ trình duyệt.
  - icon: 🧩
    title: Tích hợp linh hoạt (Headless & UI)
    details: Cung cấp đầy đủ Workspace component cho Vue 3, mount helper cho React/Angular/JS, cùng headless client độc lập cho môi trường Node.js/SSR.
  - icon: 🔒
    title: Quản lý Phiên bản & Chống xung đột
    details: Tự động lưu (Autosave có debounce), quản lý snapshot lịch sử phiên bản, khôi phục bản cũ và kiểm soát đồng thời lạc quan (Optimistic Concurrency).
  - icon: 🔌
    title: Độc lập hạ tầng (Adapter-driven)
    details: Không trói buộc backend/database. Tích hợp dễ dàng qua REST Adapter chuẩn OpenAPI 3.1 hoặc tự viết Custom Adapter (GraphQL, Supabase, Firebase...).
  - icon: 🎨
    title: Preset Soạn thảo Hợp đồng
    details: Toolbar tinh gọn, chế độ phân trang (pagination) chuẩn in ấn A4/Letter, header/footer, ruler, bảng biểu nâng cao và watermark.
  - icon: ⚡
    title: Tối ưu cho Tài liệu dài
    details: Kiến trúc phân trang cache block, render canvas mượt mà, hỗ trợ tài liệu lên tới 100+ trang mà không giật lag.
---

<div style="margin-top: 3rem; text-align: center;">
  <h2>Kiến trúc tích hợp tổng quan</h2>
</div>

```text
Ứng dụng chủ (Host Application)
  ├── KindyDocumentLibrary (Workspace hoàn chỉnh)
  │    ├── DocumentLibraryShell (Layout 3 vùng responsive)
  │    ├── KindyDocumentExplorer (Quản lý cây thư mục & file)
  │    ├── KindyEditor (Tiptap / ProseMirror Editor phân trang)
  │    └── KindyVersionPanel (Lịch sử phiên bản & khôi phục)
  ├── DocumentLibraryClient (Headless state manager)
  └── DocumentApiAdapter (Cầu nối REST / GraphQL / Custom)
```
