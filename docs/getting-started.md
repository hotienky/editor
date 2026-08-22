# Bắt đầu với Kindy Document Library SDK v2

Tài liệu này tạo một workspace DOCX chạy bằng Memory adapter, sau đó chuyển sang REST adapter.

## 1. Yêu cầu môi trường

- Node.js `^20.19.0` hoặc `>=22.12.0`.
- Vue `^3.5.0` khi dùng UI.
- Trình duyệt hiện đại có `fetch`, `AbortController`, Web Worker và `structuredClone` hoặc JSON fallback.

## 2. Cài package

```bash
npm install kindy-editor vue
```

Import stylesheet một lần tại entry của ứng dụng:

```ts
import 'kindy-editor/style'
```

Container của workspace phải có chiều cao xác định:

```css
html, body, #app { height: 100%; margin: 0; }
.document-screen { height: 100vh; }
```

## 3. Demo bằng Memory adapter

```vue
<template>
  <div class="document-screen">
    <KindyDocumentLibrary
      :adapter="adapter"
      :autosave="{ enabled: true, delay: 1500 }"
      locale="vi-VN"
      @error="console.error"
    />
  </div>
</template>

<script setup lang="ts">
import {
  KindyDocumentLibrary,
  createMemoryDocumentAdapter,
} from 'kindy-editor'
import 'kindy-editor/style'

const adapter = createMemoryDocumentAdapter({
  folders: [
    { id: 'contracts', name: 'Hợp đồng', parentId: null },
    { id: 'forms', name: 'Biểu mẫu', parentId: null },
  ],
})
</script>
```

Từ giao diện, chọn **Tạo mới**, nhập nội dung, chờ autosave hoặc nhấn **Lưu** để tạo version bền vững trong adapter.

Memory adapter không dùng `localStorage`; reload trang sẽ mất dữ liệu.

## 4. Kết nối REST backend

Đổi adapter mà không thay UI:

```ts
import { createRestDocumentAdapter } from 'kindy-editor'

const adapter = createRestDocumentAdapter({
  baseUrl: '/api/document-library',
  transport: async (url, init) => {
    const token = await getAccessToken()
    return fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  },
})
```

SDK không giữ token. Backend phải kiểm tra quyền trên từng document, version và artifact; `capabilities` chỉ điều khiển UI.

Các endpoint và schema nằm trong [`../openapi/document-api.yaml`](../openapi/document-api.yaml).

## 5. Seed document và template

`MemoryDocumentAdapter` nhận `DocumentSnapshot[]` để test tích hợp:

```ts
import {
  createEmptyDocumentState,
  createMemoryDocumentAdapter,
} from 'kindy-editor'

const state = createEmptyDocumentState({
  content: {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Nội dung mẫu' }],
    }],
  },
})

const adapter = createMemoryDocumentAdapter({
  documents: [{
    document: {
      id: 'template-1',
      title: 'Mẫu hợp đồng',
      fileName: 'mau-hop-dong.docx',
      isTemplate: true,
      currentRevisionId: 'rev-1',
      currentVersionId: 'version-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      capabilities: { view: true, edit: false },
    },
    state,
    revisionId: 'rev-1',
    version: {
      id: 'version-1',
      documentId: 'template-1',
      number: 1,
      revisionId: 'rev-1',
      reason: 'template',
      createdAt: new Date().toISOString(),
    },
  }],
})
```

## 6. Lấy workspace handle

```vue
<KindyDocumentLibrary ref="workspace" :adapter="adapter" />
```

```ts
const state = workspace.value.getState()
await workspace.value.save()

const result = await workspace.value.exportDocx({
  mode: 'strict',
  store: true,
})

workspace.value.print()
workspace.value.toggleExplorer(false)
workspace.value.toggleVersions(true)
```

Các method công khai đầy đủ nằm trong [API reference](./api-reference.md).

## 7. Kiểm tra integration tối thiểu

Trước khi nối backend thật, kiểm tra tuần tự:

1. Explorer tải được document, folder và template.
2. Create/import trả document rồi `loadState` mở được snapshot.
3. Gõ nội dung làm phát `changed` và autosave gọi `saveState`.
4. Manual save tạo version và VersionPanel làm mới.
5. Mở version phải read-only; quay lại bản hiện hành phải editable.
6. Restore tạo revision/version mới, không sửa bytes của version cũ.
7. Export tạo ZIP/OOXML hợp lệ; print mở được print dialog.
8. Hai client lưu cùng `baseRevisionId` phải khiến client thứ hai nhận `VERSION_CONFLICT`.

Với DOCX thực tế, kiểm tra thêm `CompatibilityReport`: floating image sẽ được làm phẳng thành inline; EMF/WMF/TIFF không thuộc profile render ổn định. Sections/header/footer dùng `docxProfile="kindy-docx-v2.1"`; comments/Track Changes dùng v2.2. Xem ma trận hỗ trợ trước khi bật strict profile cao hơn.

## 8. Bước tiếp theo

- [UI engine](./ui-engine.md)
- [Backend và security](../GUIDE.md)
- [DOCX compatibility](../CAPABILITIES.md)
- [Performance](./performance.md)
