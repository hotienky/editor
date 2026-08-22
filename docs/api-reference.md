# API reference

Public API của `kindy-editor@2`. TypeScript declarations trong package là nguồn chính xác khi tài liệu và runtime khác nhau.

## Package entrypoints

```ts
import { KindyEditor, KindyDocumentLibrary } from 'kindy-editor'
import 'kindy-editor/style'
```

`kindy-editor` export UI, core, codecs, engines và mock helpers.

```ts
import {
  createDocumentLibrary,
  createRestDocumentAdapter,
} from 'kindy-editor/core'
```

`kindy-editor/core` chỉ export types, client, state, errors và adapters; entrypoint này không tải Vue UI.

## `KindyDocumentLibrary`

Workspace hoàn chỉnh kết nối UI với `DocumentLibraryClient`.

### Props

| Prop | Type | Default | Ghi chú |
|---|---|---|---|
| `adapter` | `DocumentApiAdapter` | — | Bắt buộc nếu không truyền `client` |
| `client` | `DocumentLibraryClient` | — | Client do ứng dụng chủ quản lý |
| `autosave` | `{ enabled?: boolean; delay?: number }` | client default | Delay tối thiểu 250ms |
| `stateSyncDelay` | `number` | `300` | Gom chuỗi transaction trước khi tạo canonical JSON; tối thiểu 32ms |
| `docxProfile` | `'kindy-docx-v2.0' \| 'kindy-docx-v2.1' \| 'kindy-docx-v2.2'` | `kindy-docx-v2.0` | Profile strict dùng cho import/export; chỉ nâng khi integration đã chấp nhận capability matrix tương ứng |
| `collaboration` | `CollaborationAdapter` | — | Adapter realtime của host; workspace connect/disconnect theo vòng đời document/editor |
| `user` | `{ id?, name?, color? }` | — | Identity dùng chung cho Track Changes và collaboration |
| `locale` | `string` | `vi-VN` | Library UI và editor locale |
| `theme` | `Record<string,string>` | `{}` | CSS variable overrides |
| `messages` | `Partial<KindyLibraryMessages>` | `{}` | Override Library UI labels |
| `ui` | `Partial<KindyLibraryUiOptions>` | defaults | Layout/density/panels |
| `editorOptions` | `Record<string,unknown>` | preset Contract | Override cấu hình `KindyEditor`; mặc định compact và page-only |
| `showVersions` | `boolean` | `true` | Backward-compatible versions switch |
| `confirmCompatibility` | `(report) => boolean \| Promise<boolean>` | `window.confirm` | Xác nhận best-effort import/export |

Phải truyền đúng một trong `adapter` hoặc `client`. Khi tự truyền client, component không destroy client lúc unmount.

### Events

| Event | Payload |
|---|---|
| `ready` | `{ document, editor }` |
| `opened` | `DocumentSnapshot` |
| `changed` | `DocumentSnapshot` |
| `save-started` | `{ documentId, reason }` |
| `saved` | `SaveResult & { documentId }` |
| `save-failed` | `DocumentLibraryError` |
| `created` | `DocumentSummary` |
| `imported` | `DocumentSummary` |
| `compatibility-warning` | `CompatibilityReport` |
| `version-restored` | `DocumentSnapshot` |
| `printed` | `DocumentRecord` |
| `locale-changed` | `string` |
| `error` | `unknown` |

### Exposed handle

```ts
workspace.client
workspace.openDocument(document)
workspace.closeDocument()
workspace.save()
workspace.exportDocx({ mode, store, fileName, preferOriginal })
workspace.downloadDocx()
workspace.importDocument() // mở file picker và import qua client/adapter
workspace.preparePrint()
workspace.print()
workspace.getState()
workspace.flushState()
workspace.getEditor()
workspace.refresh()
workspace.toggleExplorer(open?)
workspace.toggleVersions(open?)
```

`exportDocx()` trả `{ blob, report, source }` nhưng không tự download; `source` là `original` hoặc `serialized`. Mặc định hàm ưu tiên blob gốc nếu `DocumentRecord.originalSource.revisionId` vẫn là revision đang mở; đặt `preferOriginal: false` để buộc serialize. `downloadDocx()` cũng ưu tiên artifact gốc (Blob hoặc URL), sau đó mới chạy flow strict → confirm best-effort → download.
`save()` luôn flush transaction đang chờ. `flushState()` chỉ đồng bộ editor vào client và đánh dấu dirty, không tự tạo version.

## `KindyDocumentLibraryShell`

Layout component không có IO hoặc document state.

### Props

```ts
{
  density?: 'compact' | 'comfortable'
  explorerWidth?: string
  versionsWidth?: string
  explorerOpen?: boolean
  versionsOpen?: boolean
  showExplorer?: boolean
  showVersions?: boolean
  showTopbar?: boolean
  theme?: Record<string, string>
}
```

Slots: `explorer`, `topbar`, default workspace content, `versions`.

Event: `close-panels` khi người dùng click scrim ở viewport nhỏ.

## `KindyDocumentExplorer`

Component Explorer độc lập. Component gọi trực tiếp `client.listDocuments`, `adapter.listTemplates`, `adapter.listFolders`, import codec và `client.create/import`.

### Props

```ts
{
  client: DocumentLibraryClient
  selectedId?: string
  locale?: string
  messages?: Partial<KindyLibraryMessages>
  confirmCompatibility?: (report: CompatibilityReport) => boolean | Promise<boolean>
  closable?: boolean
  pageSize?: number
}
```

Events: `open`, `created`, `imported`, `compatibility-warning`, `error`, `close`.

Slots: `title`, `actions`, `document`.

Handle: `refresh()`, `clearSearch()`.

Refresh mới abort request cũ để tránh kết quả search đến sai thứ tự.

## `KindyVersionPanel`

### Props

```ts
{
  client: DocumentLibraryClient
  documentId?: string
  currentVersionId?: string
  previewVersionId?: string
  canRestore?: boolean
  locale?: string
  messages?: Partial<KindyLibraryMessages>
  closable?: boolean
}
```

Events: `preview`, `restore`, `error`, `close`.

Handle: `refresh()`.

Panel không tự load snapshot hoặc restore; component cha quyết định hành động khi nhận event.

## `KindyEditor`

Editor Vue độc lập. Props đầy đủ vẫn tương thích options hiện có; các prop chính:

```ts
interface KindyEditorOptions {
  locale?: 'vi-VN' | 'en-US' | 'zh-CN' | 'it-IT' | 'ru-RU'
  theme?: 'light' | 'dark' | 'auto'
  skin?: 'default' | 'modern'
  height?: string
  toolbar?: Record<string, unknown>
  statusbar?: Record<string, boolean>
  page?: Record<string, unknown>
  document?: {
    title?: string
    content?: string | JSONContent
    assets?: AssetReference[]
    readOnly?: boolean
    autoSave?: { enabled: boolean; interval?: number }
  }
  translations?: Record<string, Record<string, string>>
}
```

### Contract editor preset

```ts
CONTRACT_EDITOR_OPTIONS
createContractEditorOptions(overrides?)
```

Preset mặc định của `KindyDocumentLibrary` dùng `toolbar.defaultMode = 'classic'`, `toolbar.allowModeSwitch = false`, các nhóm `base/insert/table/page/export`, `page.layouts = ['page']` và vô hiệu hóa các extension ngoài phạm vi hợp đồng. Trong workspace, Import/Export trên toolbar được chuyển sang pipeline của `DocumentLibraryClient` để giữ đúng revision và artifact. Các field status bar:

```ts
{
  showOutline, showSpellcheck, showShortcuts, showReset,
  showLayout, showPageStatus, showWordCount, showBranding,
  showFullscreen, showPreview, showZoom, showLocale
}
```

Các method public thường dùng:

```ts
editor.setContent(content, options?)
editor.insertContent(content)
editor.getContent(type?)
editor.getJSON()
editor.getState()
editor.getHTML()
editor.getText()
editor.getPage()
editor.setPage(page)
editor.setReadOnly(readOnly)
editor.focus()
editor.preparePrint()
editor.print()
editor.saveContent()
editor.useEditor() // raw Tiptap Editor
```

Khi editor nằm trong `KindyDocumentLibrary`, không bật `document.autoSave`; workspace dùng `DocumentLibraryClient` làm pipeline lưu duy nhất.

## `mountKindyEditor`

```ts
const mounted = mountKindyEditor(container, props)

mounted.app       // Vue App
mounted.instance  // KindyEditor handle
mounted.unmount()
```

`container` là HTMLElement hoặc CSS selector.

## `KindyDocumentState`

```ts
interface KindyDocumentState {
  schemaVersion: '2.0'
  content: JSONContent
  page: KindyPageState
  assets: AssetReference[]
}
```

State phải là JSON serializable. Không lưu Vue proxy, DOM node, File object hoặc callback trong state.

`DocumentRecord` của một tài liệu import có thể chứa:

```ts
originalSource?: {
  artifactId: string
  revisionId: string
  format: 'original-docx'
  fileName: string
  compatibilityReport?: CompatibilityReport
}
```

Backend REST phải trả binding này từ `/documents/import` nếu muốn workspace hỗ trợ tải nguyên bản byte-for-byte.

```ts
const state = createEmptyDocumentState({ content, page, assets })
const migrated = migrateDocumentState(input)
```

`migrateDocumentState` chấp nhận raw ProseMirror document v1 và bọc thành state v2.

## `DocumentLibraryClient`

```ts
const client = createDocumentLibrary({
  adapter,
  autosave: { enabled: true, delay: 1500 },
  codecs,
  engine,
  locale: 'vi-VN',
  theme,
})
```

### Properties

```ts
client.adapter
client.current             // clone của snapshot hiện tại hoặc null
client.hasUnsavedChanges
client.hasConflict
```

### Methods

```ts
client.listDocuments(query?, signal?)
client.open(documentId, versionId?, signal?)
client.create(input, signal?)
client.import(input, signal?)
const snapshot = client.updateState(state)
client.save('autosave' | 'manual')
client.restore(versionId, signal?)
client.storeArtifact(input, signal?)
client.resolveConflict(snapshot)
client.destroy()
```

`updateState` trả snapshot clone, đánh dấu dirty và lên lịch autosave. Nếu có save đang chạy, `save()` chờ save đó hoàn tất rồi mới chạy lượt kế tiếp. Backend phải dùng `baseRevisionId` để compare-and-swap.

### Client events

```ts
const off = client.on('saved', listener)
off()
```

Events: `opened`, `imported`, `changed`, `save-started`, `saved`, `save-failed`, `version-restored`, `error`.

## `DocumentApiAdapter`

```ts
interface DocumentApiAdapter {
  listDocuments(query?, signal?): Promise<Page<DocumentSummary>>
  getDocument(documentId, signal?): Promise<DocumentRecord>
  createDocument(input, signal?): Promise<DocumentRecord>
  importDocument(input, signal?): Promise<DocumentRecord>
  updateDocument(documentId, patch, signal?): Promise<DocumentRecord>
  loadState(documentId, versionId?, signal?): Promise<DocumentSnapshot>
  saveState(documentId, input, signal?): Promise<SaveResult>
  listVersions(documentId, query?, signal?): Promise<Page<DocumentVersion>>
  restoreVersion(documentId, versionId, signal?): Promise<DocumentSnapshot>
  listFolders(query?, signal?): Promise<Folder[]>
  listTemplates(query?, signal?): Promise<Page<DocumentSummary>>
  storeArtifact(documentId, input, signal?): Promise<DocumentArtifact>
  getArtifact(documentId, artifactId, signal?): Promise<DocumentArtifact>
}
```

Mọi method phải tôn trọng `AbortSignal` nếu transport hỗ trợ cancellation.

### Save input

```ts
interface SaveStateInput {
  state: KindyDocumentState
  baseRevisionId: string
  reason: 'autosave' | 'manual'
  clientMutationId: string
}
```

Backend trả HTTP 409 hoặc lỗi `VERSION_CONFLICT` khi `baseRevisionId` không phải revision hiện hành.

## REST adapter

```ts
const adapter = createRestDocumentAdapter({
  baseUrl: '/document-api',
  transport: customFetch,
})
```

`transport` có cùng contract với `fetch`. REST adapter map:

- HTTP 404 → `DOCUMENT_NOT_FOUND`.
- HTTP 409 → `VERSION_CONFLICT`.
- HTTP lỗi khác → `ADAPTER_ERROR`.
- Fetch/transport failure → `NETWORK_ERROR`.

## Memory adapter

```ts
const adapter = createMemoryDocumentAdapter({
  documents: snapshots,
  folders,
})
```

Manual save tạo version; autosave chỉ tạo revision. Restore tạo revision và version mới. Adapter giữ Blob trong memory và không bền vững qua reload.

## DOCX codecs

```ts
inspectDocx(file)
extractDocxPackage(file, limits?)
ooxmlToDocumentState(parts)
importDocx(file, options?)
importDocxInWorker(file, options?)
exportDocx(state, options?)
createDocxCodec()
```

### Import options

```ts
{
  mode?: 'strict' | 'best-effort'
  signal?: AbortSignal       // worker variant
  limits?: Partial<DocxImportLimits>
}
```

Limits mặc định kiểm tra compressed bytes, uncompressed bytes, số ZIP entry và compression ratio.

### Results

```ts
interface DocxImportResult {
  state: KindyDocumentState
  report: CompatibilityReport
  messages: Array<{ type: string; message: string }>
}

interface DocxExportResult {
  blob: Blob
  report: CompatibilityReport
}
```

## Errors

```ts
class DocumentLibraryError extends Error {
  readonly code: DocumentErrorCode
  readonly status?: number
  readonly details?: unknown
}
```

Codes:

```text
DOCX_INVALID
DOCX_UNSUPPORTED
IMPORT_FAILED
EXPORT_FAILED
ADAPTER_ERROR
NETWORK_ERROR
VERSION_CONFLICT
DOCUMENT_NOT_FOUND
OPERATION_CANCELLED
```

Không kiểm tra message string; luôn branch theo `error.code`.

## UI theme/messages helpers

```ts
DEFAULT_LIBRARY_UI
DEFAULT_LIBRARY_THEME
VI_LIBRARY_MESSAGES
EN_LIBRARY_MESSAGES
resolveLibraryUi(options)
resolveLibraryMessages(locale, overrides)
createLibraryTheme(overrides)
```

Xem [UI engine](./ui-engine.md).

## Engine adapter

```ts
interface EditorEngineAdapter {
  readonly id: string
  mount(container, options?): EditorEngineHandle | Promise<EditorEngineHandle>
}
```

V2 ship `TiptapEngineAdapter`:

```ts
const engine = createTiptapEngineAdapter()
const handle = engine.mount(container, options)
await handle.load(state)
handle.onChange(nextState => {})
handle.setReadOnly(true)
handle.destroy()
```

`EditorEngineAdapter` là extension boundary. Workspace Vue hiện dùng `KindyEditor` trực tiếp; adapter phù hợp khi ứng dụng muốn mount engine theo kiểu headless controller.

## Collaboration adapter

```ts
const collaboration = createYjsCollaborationAdapter({
  providerFactory: context => createCompanyProvider(context),
})

// Workspace sở hữu vòng đời connect/disconnect; Yjs editor extensions/provider
// vẫn do ứng dụng chủ cấu hình vì SDK không ship collaboration server.
<KindyDocumentLibrary
  :adapter="documentAdapter"
  :collaboration="collaboration"
  :user="{ id: currentUser.id, name: currentUser.name, color: currentUser.color }"
/>
```

SDK không ship WebSocket server. Ứng dụng chủ chịu trách nhiệm auth, document isolation, provider lifecycle và awareness.

## Mock REST transport

```ts
const mock = createMockDocumentTransport({ latency: 20 })
const adapter = createRestDocumentAdapter({
  baseUrl: mock.baseUrl,
  transport: mock.transport,
})
```

Mock dùng Memory adapter phía sau và phù hợp cho contract test không cần HTTP server.
