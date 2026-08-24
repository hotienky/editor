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

## Preset Contract mặc định

Workspace dùng `CONTRACT_EDITOR_OPTIONS` để giữ UI đúng phạm vi soạn hợp đồng:

- Thanh menu contract `Định dạng / Chèn / Bảng / Trang` nằm trên toolbar
  `classic` compact; toolbar khóa một hàng và không hiển thị nút đổi sang ribbon.
- Chỉ có các nhóm chỉnh sửa `base`, `insert`, `table`, `page`.
- Import DOCX, tải DOCX và In/PDF có một vị trí chuẩn ở topbar, không lặp lại trong toolbar chỉnh sửa.
- Với workspace, các action file gọi `DocumentLibraryClient`/adapter; không dùng IO trực tiếp của editor để tránh bỏ qua revision, artifact và compatibility report.
- Chỉ có Page view; Web view bị loại khỏi `page.layouts`.
- Không load menu Mermaid, diagram, chart, web page, media web, Chinese date hoặc Chinese case.
- Status bar chỉ giữ bộ đếm `Trang X / Y`, số ký tự, zoom và locale.

Preset là public API và dùng được cho editor độc lập:

```ts
import {
  CONTRACT_EDITOR_OPTIONS,
  createContractEditorOptions,
} from 'kindy-editor'

const editorOptions = createContractEditorOptions({
  statusbar: { showLocale: false },
})
```

Override được merge theo từng nhóm `toolbar`, `statusbar`, `page`. Nếu truyền `disableExtensions`, mảng của ứng dụng chủ thay thế mảng preset; nhờ đó việc mở rộng UI luôn là quyết định tường minh của host.

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

Explorer mặc định mở trên desktop. Panel Versions luôn đóng khi khởi tạo, kể cả trên màn hình lớn, và chỉ mở sau khi người dùng bấm nút lịch sử. Từ `1024px` trở xuống, Explorer và Versions trở thành drawer có scrim; đổi từ desktop xuống mobile sẽ tự đóng drawer để không che editor.

Khi vùng editor hẹp, topbar luôn giữ action chính `Lưu` (hoặc `Import DOCX` ở empty state) và gom Import/Tải/In/Phiên bản vào menu **Thao tác tài liệu**. Không action nào chỉ bị ẩn bằng CSS mà không có đường truy cập thay thế. Toolbar chỉnh sửa cuộn ngang độc lập, có nút Previous/Next ở hai mép và hỗ trợ wheel/trackpad; status bar cuộn ngang ở mobile để giữ bộ đếm trang và zoom.

## Keyboard và ruler

Preset contract giữ hành vi Word/Google Docs: `Enter` tạo paragraph,
`Shift + Enter` tạo soft line break và `Ctrl/Cmd + Enter` tạo page break.
Page break là node semantic top-level; không được mô phỏng bằng dòng trống.

Ruler đồng bộ theo selection và chỉ commit một transaction khi kết thúc kéo.
Paragraph geometry dùng các trường twip `leftTwip`, `rightTwip`,
`firstLineTwip`, `hangingTwip`; serializer ánh xạ trực tiếp sang `w:ind`.
Tab stop import giữ cả vị trí twip và giá trị centimet dẫn xuất để viewport có
thể render mà không làm mất độ chính xác OOXML.

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
    toolbar: { defaultMode: 'classic' },
    statusbar: { showLocale: true },
  }"
/>
```

Workspace luôn ghi đè `document.content`, `document.readOnly` và tắt autosave legacy của editor để tránh hai autosave pipeline chạy đồng thời.

## Page canvas và điều hướng trang

Ở layout `page`, editor dùng một ProseMirror surface liên tục và chèn page gap bằng decoration. Page gap không hiển thị nhãn nổi trong nội dung; số trang nằm ở status bar theo dạng `Trang hiện tại / tổng trang`. Người dùng có thể bấm bộ đếm, nhập số trang và nhảy tới block đầu của trang đó. Trang hiện tại được cập nhật theo viewport khi cuộn, kể cả khi trang cuối ngắn hơn chiều cao viewport.

Ảnh DrawingML/VML nằm trong DOCX header được render từ canonical header state. Ảnh banner rộng giữ nguyên tỷ lệ và được lặp lại trong header band của các trang tự động tiếp theo. Pagination sử dụng cùng effective header/footer band với canvas để nội dung trang sau không chồng lên logo hoặc footer. Đây vẫn là browser preview; vị trí line-break tự động có thể khác Word do font metrics.

## Locale và message override

Editor ship locale `vi-VN`, `en-US`, `zh-CN`, `it-IT` và `ru-RU`. `locale` truyền từ ứng dụng chủ được ưu tiên hơn giá trị localStorage cũ; đổi ngôn ngữ trong editor có hiệu lực ngay, không reload trang. Workspace đồng bộ Explorer/topbar/Versions trong cùng lần đổi và phát event `locale-changed`. Library shell dùng message tiếng Việt và fallback English:

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
  exportDocx(options?: { mode?, store?, fileName?, preferOriginal? }): Promise<DocxExportResult & { source: 'original' | 'serialized' }>
  downloadDocx(): Promise<void>
  importDocument(): void
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
