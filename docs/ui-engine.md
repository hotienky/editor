# UI engine

UI v2 được chia thành hai lớp: component trình bày và workspace orchestration. Cách chia này giúp ứng dụng chủ có thể dùng trọn bộ UI hoặc lấy từng component mà không làm thay đổi storage contract.

## Thành phần

```text
KindyDocumentLibrary                  orchestration
  └─ KindyDocumentLibraryShell       layout engine
       ├─ KindyDocumentExplorer      document navigation
       ├─ KindyEditor                editing surface
       └─ KindyVersionPanel          version navigation
```

`KindyDocumentLibrary` chịu trách nhiệm mở snapshot, đồng bộ editor state với `DocumentLibraryClient`, autosave, preview/restore và export. `KindyDocumentLibraryShell` chỉ chịu trách nhiệm layout, responsive và slots; shell không gọi API.

## Cấu hình layout

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  :ui="{
    density: 'comfortable',
    explorerWidth: '320px',
    versionsWidth: '300px',
    showTopbar: true,
    showExplorer: true,
    showVersions: true,
  }"
/>
```

```ts
interface KindyLibraryUiOptions {
  density: 'compact' | 'comfortable'
  explorerWidth: string
  versionsWidth: string
  showTopbar: boolean
  showExplorer: boolean
  showVersions: boolean
}
```

Desktop dùng layout ba vùng. Từ breakpoint `1024px` trở xuống, Explorer và Versions trở thành drawer có scrim; workspace handle hoặc các nút topbar có thể mở/đóng panel.

## Theme tokens

Truyền CSS variables qua prop `theme`:

```ts
const theme = {
  '--kindy-library-bg': '#f5f7fb',
  '--kindy-library-surface': '#ffffff',
  '--kindy-library-sidebar-bg': '#ffffff',
  '--kindy-library-text': '#172033',
  '--kindy-library-muted': '#667085',
  '--kindy-library-border': '#d0d5dd',
  '--kindy-library-selection': '#e8f3ff',
  '--kindy-library-selection-text': '#075985',
  '--kindy-library-primary': '#0b74de',
  '--kindy-library-primary-hover': '#095fae',
  '--kindy-library-danger': '#b42318',
  '--kindy-library-radius': '10px',
  '--kindy-library-shadow': '0 18px 48px rgb(15 23 42 / 14%)',
}
```

`createLibraryTheme(overrides)` hợp nhất override với token mặc định:

```ts
import { createLibraryTheme } from 'kindy-editor'

const theme = createLibraryTheme({
  '--kindy-library-primary': '#7c3aed',
})
```

Theme của Library shell độc lập với `theme`/`skin` nội bộ của `KindyEditor`. Truyền cấu hình editor qua `editorOptions`:

```vue
<KindyDocumentLibrary
  :adapter="adapter"
  :editor-options="{
    theme: 'light',
    skin: 'modern',
    toolbar: { mode: 'ribbon' },
  }"
/>
```

Workspace luôn ghi đè `document.content`, `document.readOnly` và tắt autosave legacy của editor để tránh hai autosave pipeline chạy đồng thời.

## Locale và message override

UI ship message mặc định cho `vi-VN` và fallback English cho locale khác:

```vue
<KindyDocumentLibrary
  locale="vi-VN"
  :messages="{
    documents: 'Kho văn bản',
    newDocument: 'Soạn văn bản',
    downloadDocx: 'Tải bản Word',
  }"
/>
```

Các export liên quan:

```ts
VI_LIBRARY_MESSAGES
EN_LIBRARY_MESSAGES
resolveLibraryMessages(locale, overrides)
```

`messages` của Library UI không thay toàn bộ locale message của editor toolbar. Toolbar vẫn dùng hệ thống i18n của `KindyEditor`.

## Slots

### Workspace slots

| Slot | Slot props | Mục đích |
|---|---|---|
| `topbar` | `document`, `status`, `save` | Thay toàn bộ topbar mặc định |
| `empty` | — | Empty state khi chưa mở document |
| `explorer-actions` | `refresh`, `busy` | Thêm action ở Explorer |
| `document` | `document` | Bổ sung UI cho mỗi document item |

Các slot khác được chuyển tiếp vào `KindyEditor`, ví dụ bubble menu hoặc toolbar slot mà editor hỗ trợ.

```vue
<KindyDocumentLibrary :adapter="adapter">
  <template #topbar="{ document, status, save }">
    <CompanyToolbar
      :title="document?.title"
      :status="status"
      @save="save"
    />
  </template>

  <template #explorer-actions="{ refresh }">
    <button @click="refresh">Đồng bộ</button>
  </template>
</KindyDocumentLibrary>
```

### Dùng shell độc lập

```vue
<KindyDocumentLibraryShell
  :explorer-open="explorerOpen"
  :versions-open="versionsOpen"
  @close-panels="closeMobileDrawers"
>
  <template #explorer><CompanyExplorer /></template>
  <template #topbar><CompanyToolbar /></template>
  <CompanyEditor />
  <template #versions><CompanyVersions /></template>
</KindyDocumentLibraryShell>
```

Shell không quản lý state mở panel; component cha là source of truth.

## Workspace handle

```ts
interface KindyDocumentLibraryHandle {
  client: DocumentLibraryClient
  openDocument(document: DocumentSummary): Promise<void>
  closeDocument(): void
  save(): Promise<unknown>
  exportDocx(options?): Promise<DocxExportResult>
  downloadDocx(): Promise<void>
  preparePrint(): Promise<unknown>
  print(): void
  getState(): KindyDocumentState
  getEditor(): KindyEditorHandle | null
  refresh(): Promise<void>
  toggleExplorer(open?: boolean): void
  toggleVersions(open?: boolean): void
}
```

## Trạng thái UI

Topbar chuẩn hóa các trạng thái:

- `idle`: chưa mở document.
- `ready`/`saved`: state hiện tại đã đồng bộ.
- `dirty`: đã thay đổi và đang chờ autosave/manual save.
- `saving`: adapter đang lưu.
- `readonly`: document không có quyền edit.
- `preview`: đang xem một version cũ.
- `conflict`: backend trả `VERSION_CONFLICT`.
- `error`: lỗi import/load/save/export khác.

Preview version dùng editor read-only và không thay `DocumentLibraryClient.current`. Nút “Quay lại bản hiện hành” phục hồi live snapshot; restore mới thay live snapshot và tạo version mới qua adapter.

## Accessibility

- Explorer, workspace và VersionPanel có landmark/ARIA label riêng.
- Loading dùng `aria-busy` và `role=status`.
- Error dùng `role=alert` và có retry.
- Active document dùng `aria-current=page`.
- Nút icon có accessible name.
- Animation spinner tuân theo `prefers-reduced-motion`.

Ứng dụng chủ vẫn phải kiểm tra keyboard navigation và contrast sau khi override theme.
