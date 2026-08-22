# Hướng dẫn tích hợp Document Library SDK v2

## 1. Ranh giới trách nhiệm

Kindy SDK chịu trách nhiệm:

- Hiển thị responsive `DocumentLibraryShell`, Explorer, Editor và VersionPanel.
- Chuẩn hóa trạng thái UI `idle/dirty/saving/saved/read-only/preview/conflict/error`.
- Chuyển DOCX thuộc compatibility profile sang ProseMirror JSON.
- Validate OOXML, báo feature ngoài profile và export OOXML DOCX thật.
- Debounce autosave, cancellation, event và optimistic concurrency.
- Chuẩn hóa API client, REST adapter và error codes.

Server ứng dụng chủ chịu trách nhiệm:

- User, authentication, authorization và tenant isolation.
- Database metadata, object storage, retention, backup và audit log.
- Sinh revision/version bền vững, chống ghi đè đồng thời.
- Malware scanning, quota, rate limiting và signed URL nếu sử dụng.
- Yjs provider/WebSocket server nếu bật realtime.

## 1.1. UI engine và lifecycle

`KindyDocumentLibrary` là orchestration component; `KindyDocumentLibraryShell` chỉ làm layout. Luồng mở tài liệu chuẩn:

```text
Explorer open event
  → client.open(documentId)
  → adapter.loadState
  → migrate KindyDocumentState
  → mount KindyEditor
  → apply capabilities.edit
  → ready/opened events
```

Không để Explorer, toolbar tùy biến hoặc application component ghi thẳng storage. Mọi save/version/artifact phải đi qua workspace handle, `DocumentLibraryClient` hoặc adapter để giữ `baseRevisionId` và event semantics.

Khi preview một version cũ, workspace chỉ load snapshot read-only và giữ live snapshot riêng. Chỉ `restoreVersion` mới thay state hiện hành ở backend. Chi tiết UI, slots và theme nằm tại [`docs/ui-engine.md`](./docs/ui-engine.md).

## 2. Dữ liệu lưu trên server

Một triển khai tối thiểu thường có:

```text
documents
  id, title, file_name, folder_id, tags, metadata
  current_revision_id, current_version_id, created_at, updated_at

document_revisions
  id, document_id, base_revision_id, state_json, reason
  client_mutation_id (unique per document), created_at, created_by

document_versions
  id, document_id, revision_id, number, label, created_at, created_by

document_artifacts
  id, document_id, version_id, format, object_key
  file_name, mime_type, size, checksum, created_at

folders
  id, parent_id, name
```

`state_json` là `KindyDocumentState`. Không dùng HTML làm state lâu dài. Artifact `original-docx` phải giữ nguyên bytes người dùng upload; artifact `docx` là output của serializer.

## 3. Save và conflict

`PUT /documents/{id}/state` nhận:

```json
{
  "state": { "schemaVersion": "2.0", "content": {}, "page": {}, "assets": [] },
  "baseRevisionId": "rev-10",
  "reason": "autosave",
  "clientMutationId": "70f8..."
}
```

Transaction phía server:

1. Lock hoặc compare-and-swap document.
2. Nếu `current_revision_id !== baseRevisionId`, trả HTTP 409 với code `VERSION_CONFLICT`.
3. Nếu `clientMutationId` đã xử lý, trả lại kết quả cũ (idempotency).
4. Ghi revision mới và cập nhật `current_revision_id` atomically.
5. Với manual save, có thể tạo version bền vững và trả trong `version`.

SDK dừng autosave sau conflict. Ứng dụng chủ phải cho người dùng reload hoặc tạo document copy; không nên tự merge âm thầm.

## 4. Import DOCX

```text
File input
  → Worker validate ZIP/OOXML
  → compatibility report
  → semantic conversion
  → người dùng xác nhận warning
  → POST /documents/import (original file + JSON + report)
```

Các guard server vẫn bắt buộc dù client đã validate:

- Extension, MIME, magic bytes và OOXML content types.
- Giới hạn compressed size, uncompressed size, số ZIP entry và compression ratio.
- Từ chối encrypted/password-protected package.
- Virus/malware scanning.
- Không tin file name hoặc URL do client gửi.

## 5. Export DOCX và print/PDF

`exportDocx(state)` mặc định strict. Khi có node ngoài profile, hàm ném `DOCX_UNSUPPORTED`. UI có thể hiển thị report rồi gọi lại `{ mode: 'best-effort' }` sau khi người dùng xác nhận.

Profile mặc định là `kindy-docx-v2.0`. Dùng `{ profile: 'kindy-docx-v2.1' }`
cho sections/header/footer và `kindy-docx-v2.2` cho comments/Track Changes.
Workspace nhận prop `docxProfile` tương ứng; không tự nâng profile âm thầm.

DOCX output là ZIP/OOXML từ package `docx`; test phải kiểm tra `word/document.xml` và mở qua LibreOffice/Word mà không repair.

PDF v2.0:

```ts
await workspace.preparePrint()
workspace.print()
```

Nếu hệ thống cần PDF Blob deterministic hoặc render server-side, đó là service của ứng dụng chủ và nằm ngoài runtime browser của SDK.

## 6. Auth và transport

```ts
const adapter = createRestDocumentAdapter({
  baseUrl: '/document-api',
  transport: async (url, init) => fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  }),
})
```

Không đưa access token vào Kindy state, asset metadata, localStorage hoặc log. Backend phải kiểm tra quyền trên từng document/artifact/version; quyền UI chỉ giúp ẩn thao tác, không phải security boundary.

## 7. Audit

Audit phía server tối thiểu gồm: actor, tenant, document, action, revision/version, timestamp, result, IP/request ID và client mutation ID. Không log toàn bộ nội dung hợp đồng hay token. Các action quan trọng: import, view, save, export, artifact download, restore, permission denied và conflict.

## 8. Realtime

`YjsCollaborationAdapter` chỉ nhận `providerFactory`:

```ts
const collaboration = createYjsCollaborationAdapter({
  providerFactory: ({ documentId, user, editor }) => createCompanyYjsProvider({ documentId, user, editor }),
})
```

SDK không tạo WebSocket URL và không ship server. Provider phải xử lý auth, reconnect, awareness và document isolation.

## 9. Contract test

Chạy cùng một test suite với Memory adapter, REST mock và adapter thật. Tối thiểu kiểm tra create → load → save → conflict → versions → restore → artifact. OpenAPI không quy định auth bắt buộc để không khóa kiến trúc của hệ thống tích hợp.

## 10. Production checklist

- Chạy `npm run typecheck`, `npm test` và `npm run build` với đúng package lock.
- Validate OpenAPI implementation bằng contract test.
- Kiểm tra permission ở backend, không chỉ dựa vào `document.capabilities` trên UI.
- Test import/export bằng golden DOCX corpus và Microsoft Word/LibreOffice.
- Test responsive layout và keyboard navigation sau khi override theme.
- Benchmark corpus 100 trang của hệ thống theo [`docs/performance.md`](./docs/performance.md).
- Thiết lập backup/restore object storage và database; SDK không thực hiện backup.
