# Mở rộng Kindy Editor v2

V2 không công bố một plugin manager tổng quát. Có ba extension boundary được hỗ trợ: UI composition, editor options/extensions và engine adapter.

## 1. UI composition

Ưu tiên slots và component độc lập:

```vue
<KindyDocumentLibrary :adapter="adapter">
  <template #explorer-actions="{ refresh }">
    <button @click="syncThen(refresh)">Đồng bộ DMS</button>
  </template>

  <template #topbar="scope">
    <CompanyDocumentBar v-bind="scope" />
  </template>
</KindyDocumentLibrary>
```

Nếu cần layout hoàn toàn riêng, dùng `KindyDocumentLibraryShell`, `KindyDocumentExplorer`, `KindyEditor` và `KindyVersionPanel` độc lập.

## 2. Tùy biến editor

Truyền option hiện có qua `editorOptions`:

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  :editor-options="{
    toolbar: companyToolbar,
    disableExtensions: ['ai'],
    translations: companyTranslations,
  }"
/>
```

Workspace luôn quản lý các giá trị sau và override option tương ứng:

- `document.title`
- `document.content`
- `document.readOnly`
- `document.autoSave`
- page state thuộc snapshot

Không tạo storage side effect trong Tiptap extension. Persistence phải đi qua `DocumentApiAdapter` để giữ conflict/version semantics.

## 3. Engine adapter

```ts
interface EditorEngineAdapter {
  readonly id: string
  mount(
    container: HTMLElement,
    options?: Record<string, unknown>,
  ): EditorEngineHandle | Promise<EditorEngineHandle>
}

interface EditorEngineHandle {
  load(state: KindyDocumentState): void | Promise<void>
  getState(): KindyDocumentState
  setReadOnly(readOnly: boolean): void
  focus(): void
  destroy(): void
  onChange(listener: (state: KindyDocumentState) => void): () => void
}
```

V2 chỉ ship `CanvasEngineAdapter`. Adapter riêng phải trả đúng canonical `KindyDocumentState`, không trả Canvas `IEditorData` hoặc HTML làm state dài hạn.

## 4. Adapter nghiệp vụ riêng

Đây là extension boundary chính để nối DMS/CRM/ERP:

```ts
class CompanyDocumentAdapter implements DocumentApiAdapter {
  async loadState(documentId, versionId, signal) {
    const response = await companyApi.load({ documentId, versionId, signal })
    return mapCompanySnapshot(response)
  }

  async saveState(documentId, input, signal) {
    return companyApi.compareAndSave({ documentId, ...input, signal })
  }

  // Các method còn lại theo contract.
}
```

Chạy cùng contract tests dùng cho Memory/REST adapter. Không nuốt `VERSION_CONFLICT`; SDK cần code này để dừng autosave.

## 5. Checklist extension

- Không thêm token hoặc secret vào document state.
- Không gọi backend trực tiếp từ toolbar action nếu thao tác thuộc document lifecycle; gọi workspace/client/adapter.
- Extension state phải JSON serializable nếu cần lưu trong document.
- Mọi event listener phải được tháo khi component/engine destroy.
- Tác vụ DOCX nặng phải ở Worker khi có thể.
- Feature DOCX mới chỉ đánh dấu supported sau khi có golden round-trip test.
- Test read-only, undo/redo, IME tiếng Việt, table selection và 100-page corpus.
