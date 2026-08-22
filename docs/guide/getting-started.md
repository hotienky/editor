# Bắt đầu tích hợp (Quick Start)

Hướng dẫn này giúp bạn cài đặt và nhúng Kindy Editor vào ứng dụng chỉ trong 5 phút.

---

## 1. Cài đặt

Cài đặt package qua npm hoặc pnpm / yarn:

```bash
npm install kindy-editor
```

> **Lưu ý**: Đối với ứng dụng Vue 3, dự án chủ cần đáp ứng peer dependency `vue ^3.5.0`.

---

## 2. Nhúng vào ứng dụng Vue 3

### Cách A: Sử dụng Workspace hoàn chỉnh (`KindyDocumentLibrary`)

Đây là phương thức nhanh nhất để có đầy đủ tính năng: Sidebar quản lý thư mục/tài liệu, Editor soạn thảo và Panel lịch sử phiên bản.

```vue
<template>
  <div style="height: 100vh; width: 100vw;">
    <KindyDocumentLibrary
      ref="workspace"
      :adapter="adapter"
      :autosave="{ enabled: true, delay: 5000 }"
      :ui="{ explorerWidth: '300px', versionsWidth: '280px' }"
      :theme="{ '--kindy-library-primary': '#0b74de' }"
      locale="vi-VN"
      @saved="onSaved"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { KindyDocumentLibrary, createRestDocumentAdapter } from 'kindy-editor'
import 'kindy-editor/style'

const workspace = ref()

// Kết nối REST Adapter với Backend của bạn
const adapter = createRestDocumentAdapter({
  baseUrl: 'https://api.yourdomain.com/v1/document-api',
  transport: (url, init) =>
    fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'x-tenant-id': 'acme-corp',
      },
    }),
})

function onSaved(result: any) {
  console.log('Tài liệu đã lưu thành công:', result)
}

function onError(error: any) {
  console.error('Lỗi thao tác:', error)
}
</script>
```

---

### Cách B: Chỉ sử dụng Editor độc lập (`KindyEditor`)

Nếu ứng dụng của bạn đã có giao diện quản lý file riêng và chỉ muốn nhúng trình soạn thảo:

```vue
<template>
  <KindyEditor
    ref="editorRef"
    :document="{ content: initialContent, assets: [] }"
    :page="{ size: { width: 794, height: 1123 }, orientation: 'portrait' }"
    locale="vi-VN"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { KindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

const editorRef = ref()
const initialContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' }],
    },
  ],
}
</script>
```

---

## 3. Tích hợp với React / Angular / Vanilla JS

SDK cung cấp helper `mountKindyEditor` để dễ dàng nhúng vào bất kỳ framework nào mà không cần viết lại toàn bộ wrapper:

```ts
import { mountKindyEditor } from 'kindy-editor'
import 'kindy-editor/style'

// Khởi tạo editor vào một DOM element
const mounted = mountKindyEditor('#editor-container', {
  locale: 'vi-VN',
  document: {
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Xin chào!' }] }],
    },
  },
})

// Thao tác với instance
console.log('State hiện tại:', mounted.instance.getState())
mounted.instance.setContent(nextContent)

// Hủy bỏ khi unmount component
// mounted.unmount()
```

---

## 4. Sử dụng Headless Client trong Node.js / SSR

Nếu bạn cần xử lý trạng thái tài liệu, kiểm tra revision hoặc chuyển đổi dữ liệu trên server mà không cần giao diện đồ họa, hãy import từ subpath `kindy-editor/core`:

```ts
import { createDocumentLibrary, createRestDocumentAdapter } from 'kindy-editor/core'

const client = createDocumentLibrary({
  adapter: createRestDocumentAdapter({ baseUrl: 'https://api.yourdomain.com' }),
  autosave: { enabled: false },
})

const snapshot = await client.open('doc-id-123')
console.log('Document title:', snapshot.document.title)
```
