# Migration v1 → v2

v2 là breaking release.

## State

V1 thường lưu HTML hoặc raw ProseMirror JSON. V2 lưu:

```ts
const state = migrateDocumentState(rawProseMirrorJson)
// { schemaVersion: '2.0', content, page, assets }
```

SDK tự migrate lúc mở; server chỉ ghi state mới sau lần save kế tiếp.

## Save callback

Khuyến nghị thay `onSave`/`onFileUpload` bằng `DocumentApiAdapter`. Giai đoạn chuyển tiếp:

```ts
const adapter = createLegacyCallbackAdapter({
  async onSave({ state }) {
    await oldSaveEndpoint(state)
  },
})
```

Legacy adapter phục vụ migration, không mô phỏng đầy đủ backend/versioning v1.

## DOCX

V1 Word toolbar tạo HTML Blob mang đuôi `.docx`. V2 tạo ZIP/OOXML thật bằng `exportDocx`. Import state không còn lấy HTML layout từ `docx-preview`; `docx-preview` không phải canonical converter.

## PDF

Xóa mọi code kỳ vọng `exportPdf()` trả Blob. Dùng `preparePrint()` và `print()`.

## Mount helper

```ts
const { app, instance, unmount } = mountKindyEditor(element, options)
instance.getState()
```

V2 trả thêm `instance` là editor handle.

