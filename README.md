# Kindy Editor v2

Kindy Editor là SDK Document Library chuyên cho DOCX, xây dựng bằng Vue 3 và Tiptap/ProseMirror. Thư viện cung cấp giao diện quản lý tài liệu, editor trên web, lịch sử phiên bản, DOCX codec và hợp đồng API để ứng dụng chủ kết nối backend của mình.

Kindy Editor **không** cung cấp backend, database, authentication, object storage hoặc nghiệp vụ hợp đồng. JSON `KindyDocumentState` là trạng thái chỉnh sửa chuẩn; DOCX gốc và DOCX export là artifact do server ứng dụng chủ lưu.

## Phạm vi v2.0

- Import DOCX trong Web Worker, kiểm tra ZIP/OOXML và trả `CompatibilityReport`.
- Chỉnh sửa nội dung bằng Tiptap/ProseMirror với preset `Contract`: toolbar compact, page-only và chỉ giữ công cụ cần cho hợp đồng.
- Explorer theo thư mục, tìm kiếm, tạo tài liệu trống và tạo từ template.
- Autosave có debounce, cancellation và optimistic concurrency.
- Lưu thủ công tạo version, xem read-only và khôi phục version.
- Export DOCX OOXML thật bằng package `docx`.
- In hoặc Save as PDF qua print dialog của trình duyệt.
- UI engine có shell responsive, theme tokens, locale messages, slots và typed hooks.

Khả năng round-trip DOCX chỉ được cam kết trong [Kindy DOCX Compatibility Profile](./CAPABILITIES.md). Kindy không phải Microsoft Word layout engine và không cam kết giữ nguyên mọi tính năng OOXML.

Ngoại lệ duy nhất có thể bảo đảm byte-for-byte là tài liệu vừa import và **chưa có revision chỉnh sửa**: workspace tải lại artifact `original-docx` thay vì serialize JSON. Sau lần chỉnh sửa/save đầu tiên, DOCX mới được dựng từ `KindyDocumentState` và chỉ có cam kết theo compatibility profile.

## Kiến trúc

```text
Ứng dụng chủ
  ├─ KindyDocumentLibrary
  │    ├─ DocumentLibraryShell       layout/responsive/theme
  │    ├─ KindyDocumentExplorer      list/search/folder/import/template
  │    ├─ KindyEditor                Tiptap/ProseMirror editor
  │    └─ KindyVersionPanel          preview/restore
  ├─ DocumentLibraryClient           autosave/conflict/events
  ├─ DOCX codecs / browser print
  └─ DocumentApiAdapter
       ├─ RestDocumentAdapter
       ├─ MemoryDocumentAdapter
       └─ adapter riêng của ứng dụng
```

UI không gọi URL cố định và không biết token. Mọi IO đi qua `DocumentApiAdapter`.

## Cài đặt

```bash
npm install kindy-editor
```

```ts
import 'kindy-editor/style'
```

Vue phải được cài trong ứng dụng chủ và đáp ứng peer dependency `vue ^3.5.0`.

## Quick start với REST API

```vue
<template>
  <KindyDocumentLibrary
    ref="workspace"
    :adapter="adapter"
    :autosave="{ enabled: true, delay: 5000 }"
    :ui="{ explorerWidth: '320px', versionsWidth: '300px' }"
    :theme="{ '--kindy-library-primary': '#0b74de' }"
    locale="vi-VN"
    style="height: 100vh"
    @saved="onSaved"
    @error="onError"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  KindyDocumentLibrary,
  createRestDocumentAdapter,
} from 'kindy-editor'
import 'kindy-editor/style'

const workspace = ref()
const adapter = createRestDocumentAdapter({
  baseUrl: '/document-api',
  transport: (url, init) => fetch(url, {
    ...init,
    credentials: 'include',
    headers: { ...init?.headers, 'x-tenant-id': 'acme' },
  }),
})

function onSaved(result: unknown) {
  console.info('Saved', result)
}

function onError(error: unknown) {
  console.error(error)
}
</script>
```

Server phải triển khai contract trong [`openapi/document-api.yaml`](./openapi/document-api.yaml). OpenAPI không bắt buộc cơ chế auth; cookie, bearer token hoặc API gateway do ứng dụng chủ quyết định.

### UI hợp đồng mặc định

`KindyDocumentLibrary` tự dùng `CONTRACT_EDITOR_OPTIONS`: toolbar một hàng theo hướng Google Docs, chỉ có Định dạng/Chèn/Bảng/Trang/Xuất, không có Web view, Mermaid, biểu đồ, media web hoặc chuyển đổi số tiếng Trung. Nhóm Xuất chỉ gọi pipeline an toàn của Document Library cho Import DOCX, Export DOCX và In/PDF. Thanh trạng thái chỉ còn `Trang X / Y`, số ký tự, zoom và ngôn ngữ.

Ứng dụng chủ vẫn có thể override rõ ràng qua `editorOptions`:

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  :editor-options="{
    toolbar: { menus: ['base', 'insert', 'table', 'page', 'export'] },
    statusbar: { showLocale: false },
  }"
/>
```

Để dùng preset với `KindyEditor` độc lập:

```ts
import { createContractEditorOptions } from 'kindy-editor'

const editorOptions = createContractEditorOptions({ locale: 'vi-VN' })
```

## Chạy demo không cần backend

```ts
import { createMemoryDocumentAdapter } from 'kindy-editor'

const adapter = createMemoryDocumentAdapter()
```

`MemoryDocumentAdapter` chỉ dành cho demo và test; dữ liệu mất khi reload trang.

Trong repository:

```bash
npm install
npm run dev
```

Mở `http://localhost:9000/kindy-editor`.

## Dùng editor độc lập

```vue
<KindyEditor
  ref="editor"
  :document="{ content: initialState.content, assets: initialState.assets }"
  :page="initialState.page"
/>
```

```ts
const state = editor.value.getState()
editor.value.setContent(nextContent)
editor.value.setReadOnly(true)
const printable = await editor.value.preparePrint()
editor.value.print()
```

Vanilla/React/Angular/Svelte có thể dùng mount helper:

```ts
import { mountKindyEditor } from 'kindy-editor'

const mounted = mountKindyEditor('#editor', {
  locale: 'vi-VN',
  document: { content: initialState.content },
})

mounted.instance.setContent(nextState.content)
mounted.instance.print()
mounted.unmount()
```

V2.0 chưa có native React component; wrapper dùng Vue mount helper.

## Dùng headless client

Subpath `kindy-editor/core` không tải Vue UI:

```ts
import {
  createDocumentLibrary,
  createRestDocumentAdapter,
} from 'kindy-editor/core'

const client = createDocumentLibrary({
  adapter: createRestDocumentAdapter({ baseUrl: '/document-api' }),
  autosave: { enabled: true, delay: 5000 },
})

const snapshot = await client.open('document-123')
client.updateState(snapshot.state)
await client.save('manual')
```

`VERSION_CONFLICT` dừng autosave. SDK không tự merge hoặc ghi đè revision mới hơn:

```ts
client.on('save-failed', (error) => {
  if (error.code === 'VERSION_CONFLICT') {
    // Hiển thị lựa chọn reload hoặc lưu thành bản sao.
  }
})
```

`kindy-editor/core` dùng được trong Node/SSR. Entry `kindy-editor` chứa Vue UI và
các công cụ browser như cropper/print, vì vậy chỉ import nó trong bundle phía client.

## Import và export DOCX

```ts
import { importDocxInWorker, exportDocx } from 'kindy-editor'

const imported = await importDocxInWorker(file, {
  mode: 'best-effort',
  profile: 'kindy-docx-v2.0',
})
if (imported.report.issues.length) {
  // Hiển thị warning trước khi tiếp tục.
}

const output = await exportDocx(imported.state) // strict mặc định
```

UI workspace tự xử lý luồng xác nhận best-effort khi import hoặc download. API programmatic mặc định strict và ném `DOCX_UNSUPPORTED` nếu state có feature ngoài profile.
Mặc định là v2.0. Chọn `kindy-docx-v2.1` cho sections/header/footer hoặc
`kindy-docx-v2.2` cho comments/Track Changes sau khi integration đã chạy corpus tương ứng.

`POST /documents/import` phải lưu blob gốc và trả `DocumentRecord.originalSource` gồm `artifactId`, `revisionId`, `format: 'original-docx'` và `fileName`. Nhờ đó `KindyDocumentLibrary.downloadDocx()` trả đúng file gốc khi revision chưa đổi. URL artifact của REST backend phải là URL tải được (thường là signed URL); Memory adapter trả trực tiếp `Blob`.

## Public components

| Export | Mục đích |
|---|---|
| `KindyDocumentLibrary` | Workspace hoàn chỉnh, kết nối adapter và điều phối state |
| `KindyDocumentLibraryShell` | Layout ba vùng độc lập cho UI tùy biến |
| `KindyDocumentExplorer` | List/search/folder/import/template độc lập |
| `KindyEditor` | Editor độc lập |
| `KindyVersionPanel` | Lịch sử version độc lập |

## Events chuẩn

`ready`, `opened`, `changed`, `save-started`, `saved`, `save-failed`, `created`, `imported`, `compatibility-warning`, `version-restored`, `printed`, `error`.

## Error codes

`DOCX_INVALID`, `DOCX_UNSUPPORTED`, `IMPORT_FAILED`, `EXPORT_FAILED`, `ADAPTER_ERROR`, `NETWORK_ERROR`, `VERSION_CONFLICT`, `DOCUMENT_NOT_FOUND`, `OPERATION_CANCELLED`.

## Hiệu năng tài liệu dài

Import parsing đã chạy ngoài main thread. Editor vẫn dùng một ProseMirror instance liên tục; pagination cache phép đo block và workspace gom state sync. Trên production preview cục bộ (Chrome 151, Apple M2/24GB, 40 mẫu), corpus 100 trang text mở khoảng 0,49 giây với typing p95 21,5ms; mixed mở khoảng 0,85 giây với typing p95 36,5ms. Pagination cached của hai corpus lần lượt khoảng 2,8ms và 3,7ms. Đây là regression baseline, không phải SLA cho mọi thiết bị. Corpus mixed 200 trang vẫn chỉ được xem là stress limit. Xem [Performance guide](./docs/performance.md) để biết phương pháp đo và giới hạn.

## Tài liệu

- [Bắt đầu tích hợp](./docs/getting-started.md)
- [UI engine, theme, responsive và slots](./docs/ui-engine.md)
- [API reference](./docs/api-reference.md)
- [Backend, security và adapter](./GUIDE.md)
- [DOCX capability matrix](./CAPABILITIES.md)
- [Performance và tài liệu 100 trang](./docs/performance.md)
- [Migration v1 → v2](./MIGRATION.md)
- [REST OpenAPI](./openapi/document-api.yaml)

## Phát triển và kiểm thử

```bash
npm test
npm run test:e2e
npm run test:package
npm run test:libreoffice # cần có soffice; CI tự cài LibreOffice
npm run typecheck
npm run lint:check
npm run build
```

License: MIT.
