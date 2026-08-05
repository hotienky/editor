# kindy-editor (Kindy Editor)

Trình biên tập tài liệu chuẩn Office (Word-like Document Editor) hiện đại dựa trên **Vue 3** và **Tiptap 3**. Được tùy biến, tối ưu hóa và hỗ trợ 100% giao diện **Tiếng Việt**.

[![npm version](https://img.shields.io/npm/v/kindy-editor.svg)](https://www.npmjs.com/package/kindy-editor)
[![license](https://img.shields.io/github/license/hotienky/editor.svg)](./LICENSE)

---

## ✨ Tính năng nổi bật

- 📄 **Phân trang dạng Word (Page-based Pagination)**: Hỗ trợ ngắt trang, căn lề, khổ giấy (A4, A3, Letter, Legal...) chân trang & đầu trang (Header/Footer).
- 💬 **Hệ thống Bình luận (Word-style Comments)**: Bôi đen văn bản để gắn bình luận, phản hồi (Reply), hoàn thành (Resolve), cuộn mượt và highlight từng người dùng theo tọa độ Y.
- 🇻🇳 **Tiếng Việt 100%**: Chuẩn hóa toàn bộ nhãn giao diện, bộ cỡ chữ tiêu chuẩn (`pt`), từ điển ký hiệu và phông chữ mượt mà.
- 🎨 **Giao diện hiện đại (Ribbon & Classic)**: Hỗ trợ 2 chế độ thanh công cụ dạng Ribbon (như MS Word) hoặc Classic, chế độ tối (Dark mode).
- 🌐 **Đa nền tảng**: Tích hợp dễ dàng vào **Vue 3**, **React.js**, **Next.js**, **Nuxt 3**, **Angular**, **Svelte**, hoặc **Vanilla JS (CDN)**.
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

## 🚀 Hướng dẫn tích hợp (Integration Guides)

Thư viện `kindy-editor` hỗ trợ đa dạng môi trường dự án:

### 1. Vue 3 (Vite / Webpack)

```vue
<template>
  <div style="height: 100vh;">
    <KindyEditor ref="editorRef" v-bind="editorOptions" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { KindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const editorRef = ref(null)
const editorOptions = ref({
  locale: 'vi-VN',
  document: {
    title: 'Tài liệu mới',
    content: '<h1>Nội dung ban đầu</h1>',
  },
  async onSave(content) {
    console.log('Đã lưu:', content)
  },
})
</script>
```

### 2. Vue 3 Global Plugin (`main.js`)

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import { useKindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const app = createApp(App)

// Đăng ký toàn cục component <KindyEditor />
app.use(useKindyEditor, {
  locale: 'vi-VN',
  theme: 'light',
})

app.mount('#app')
```

### 3. React.js (SPA)

Dùng hàm helper `mountKindyEditor`:

```tsx
import React, { useEffect, useRef } from 'react'
import { mountKindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

export function KindyEditorReact(props) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const instance = mountKindyEditor(containerRef.current, props)
    return () => instance.unmount()
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
}
```

### 4. Next.js (App Router / Pages Router)

Vì Rich Text Editor thao tác với DOM trình duyệt, hãy load Client Component bằng `next/dynamic` (`ssr: false`):

```tsx
'use client'

import dynamic from 'next/dynamic'

const KindyEditor = dynamic(
  () => import('./KindyEditorReact').then((mod) => mod.KindyEditorReact),
  { ssr: false }
)

export default function DocumentPage() {
  return (
    <main style={{ height: '100vh' }}>
      <KindyEditor locale="vi-VN" />
    </main>
  )
}
```

### 5. Angular Component

```typescript
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { mountKindyEditor } from 'kindy-editor';
import 'kindy-editor/style';

@Component({
  selector: 'app-kindy-editor',
  template: `<div #editorContainer style="height: 100vh; width: 100%;"></div>`
})
export class KindyEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @Input() locale: string = 'vi-VN';
  private instance: any;

  ngAfterViewInit() {
    this.instance = mountKindyEditor(this.editorContainer.nativeElement, {
      locale: this.locale,
    });
  }

  ngOnDestroy() {
    if (this.instance) {
      this.instance.unmount();
    }
  }
}
```

### 6. Svelte / SvelteKit Component

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { mountKindyEditor } from 'kindy-editor';
  import 'kindy-editor/style';

  export let locale = 'vi-VN';
  let container;
  let instance;

  onMount(() => {
    instance = mountKindyEditor(container, { locale });
  });

  onDestroy(() => {
    if (instance) instance.unmount();
  });
</script>

<div bind:this={container} style="height: 100vh; width: 100%;"></div>
```

### 7. SolidJS Component

```tsx
import { onMount, onCleanup } from 'solid-js';
import { mountKindyEditor } from 'kindy-editor';
import 'kindy-editor/style';

export function KindyEditorSolid(props) {
  let containerRef;
  let instance;

  onMount(() => {
    instance = mountKindyEditor(containerRef, {
      locale: 'vi-VN',
      ...props,
    });
  });

  onCleanup(() => {
    if (instance) instance.unmount();
  });

  return <div ref={containerRef} style={{ height: '100vh', width: '100%' }} />;
}
```

### 8. Vanilla JS / CDN (Direct Script Tag)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/kindy-editor/dist/kindy-editor.css">
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://unpkg.com/kindy-editor/dist/kindy-editor.iife.js"></script>
</head>
<body>
  <div id="editor-container" style="height: 100vh;"></div>

  <script>
    const { mountKindyEditor } = KindyEditor;
    mountKindyEditor('#editor-container', {
      locale: 'vi-VN',
    });
  </script>
</body>
</html>
```

---

## ⚙️ Cấu hình (Props & Options API)

| Thuộc tính | Kiểu dữ liệu | Mặc định | Mô tả |
|---|---|---|---|
| `locale` | `string` | `'vi-VN'` | Ngôn ngữ giao diện (`vi-VN`, `en-US`, `zh-CN`) |
| `theme` | `string` | `'light'` | Chế độ giao diện (`light`, `dark`, `auto`) |
| `skin` | `string` | `'default'` | Phong cách thanh công cụ (`default`, `modern`) |
| `height` | `string` | `'100%'` | Chiều cao khung biên tập |
| `toolbar.mode` | `string` | `'ribbon'` | Chế độ thanh công cụ (`ribbon` hoặc `classic`) |
| `document.title` | `string` | `''` | Tiêu đề tài liệu mặc định |
| `document.content` | `string` \| `object` | `''` | Nội dung HTML hoặc JSON ban đầu |
| `document.readOnly` | `boolean` | `false` | Chế độ chỉ đọc (Chỉ xem) |
| `document.autoSave` | `object` | `{ enabled: false }` | Tự động lưu (`enabled: true, interval: 30000`) |

---

## 🛠️ Danh sách Phương thức (Methods API)

Thông qua `ref` của component (hoặc `mountKindyEditor` instance):

```javascript
// 1. Lấy nội dung HTML
const html = editorRef.value.getContent('html')

// 2. Lấy nội dung JSON
const json = editorRef.value.getContent('json')

// 3. Đặt nội dung mới
editorRef.value.setContent('<h1>Nội dung mới</h1>')

// 4. Chèn nội dung tại vị trí con trỏ
editorRef.value.insertContent('<p>Đoạn văn mới</p>')

// 5. Xuất tài liệu PDF
await editorRef.value.exportPdf('tai-lieu.pdf')

// 6. Xuất trang thành hình ảnh
await editorRef.value.exportImage('png', 'tai-lieu.png')

// 7. In tài liệu
editorRef.value.print()

// 8. Đổi giao diện tối / sáng
editorRef.value.setTheme('dark')
```

---

## 💬 Hệ thống Bình luận (Word-style Comments)

### Cơ chế lưu trữ:
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

### Lưu trữ Cơ sở dữ liệu (Database Integration):
- **Cách 1 (Khuyên dùng)**: Lưu toàn bộ chuỗi HTML chứa thẻ `<span data-comment>` vào 1 cột `content TEXT` trong Database. Khi mở lại, bình luận tự động khôi phục 100%.
- **Cách 2**: Lưu riêng danh sách mảng object comment qua API `editorRef.value.getComments()`.

---

## 💻 Dự án Mẫu (Examples)

Thư mục `examples/` chứa các ứng dụng mẫu đầy đủ:
- ⚛️ **[examples/react-demo](./examples/react-demo)**: React.js + IndexedDB Database Persistence.

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
