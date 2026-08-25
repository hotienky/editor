import type { JSONContent } from '@tiptap/core'
import type { App, Component, DefineComponent } from 'vue'

export type SaveReason = 'autosave' | 'manual'
export type ArtifactFormat = 'docx' | 'pdf' | 'original-docx'
export type DocumentErrorCode = 'DOCX_INVALID' | 'DOCX_UNSUPPORTED' | 'IMPORT_FAILED' | 'EXPORT_FAILED' | 'ADAPTER_ERROR' | 'NETWORK_ERROR' | 'VERSION_CONFLICT' | 'DOCUMENT_NOT_FOUND' | 'OPERATION_CANCELLED'

export interface KindyPageMargin { top: number; right: number; bottom: number; left: number }
export interface KindyHeaderFooterState { enabled: boolean; content?: JSONContent; text?: string; firstContent?: JSONContent; firstText?: string; evenContent?: JSONContent; evenText?: string; differentFirstPage?: boolean; differentOddEven?: boolean }
export interface KindySectionState { id: string; fromBlockId?: string; pageNumberStart?: number; size: { width: number; height: number }; orientation: 'portrait' | 'landscape'; margin: KindyPageMargin; header?: KindyHeaderFooterState; footer?: KindyHeaderFooterState }
export interface KindyPageState { size: { width: number; height: number }; orientation: 'portrait' | 'landscape'; margin: KindyPageMargin; background?: string; watermark?: Record<string, unknown>; header?: KindyHeaderFooterState; footer?: KindyHeaderFooterState; sections?: KindySectionState[] }
export interface AssetReference { id: string; kind: 'image' | 'video' | 'audio' | 'file' | 'other'; url?: string; mimeType?: string; fileName?: string; size?: number; metadata?: Record<string, unknown> }
export interface KindyDocumentState { schemaVersion: '2.0'; content: JSONContent; page: KindyPageState; assets: AssetReference[] }

export type KindyLibraryDensity = 'compact' | 'comfortable'
export interface KindyLibraryUiOptions { density: KindyLibraryDensity; explorerWidth: string; versionsWidth: string; showTopbar: boolean; showExplorer: boolean; showVersions: boolean }
export interface KindyLibraryMessages {
  documents: string; newDocument: string; importDocx: string; search: string; clearSearch: string; loading: string; empty: string; emptyDescription: string; untitled: string; chooseTemplate: string; useTemplate: string; allFolders: string; compatibilityConfirm: string; versions: string; noVersions: string; preview: string; restore: string; restoring: string; refresh: string; close: string; openDocuments: string; openVersions: string; moreActions: string; selectDocument: string; selectDocumentDescription: string; saving: string; saved: string; unsaved: string; readOnly: string; currentVersion: string; previewingVersion: string; backToCurrent: string; save: string; downloadDocx: string; print: string; retry: string; loadFailed: string
}
export const DEFAULT_LIBRARY_UI: Readonly<KindyLibraryUiOptions>
export const DEFAULT_LIBRARY_THEME: Readonly<Record<string, string>>
export const VI_LIBRARY_MESSAGES: Readonly<KindyLibraryMessages>
export const EN_LIBRARY_MESSAGES: Readonly<KindyLibraryMessages>
export function resolveLibraryUi(options?: Partial<KindyLibraryUiOptions>): KindyLibraryUiOptions
export function resolveLibraryMessages(locale?: string, overrides?: Partial<KindyLibraryMessages>): KindyLibraryMessages
export function createLibraryTheme(overrides?: Record<string, string>): Record<string, string>

export interface KindyContractToolbarOptions { showSaveLabel: boolean; defaultMode: 'classic' | 'ribbon'; allowModeSwitch: boolean; menus: Array<'base' | 'insert' | 'table' | 'tools' | 'page' | 'view' | 'export'> }
export interface KindyContractStatusbarOptions { showOutline: boolean; showSpellcheck: boolean; showShortcuts: boolean; showReset: boolean; showLayout: boolean; showPageStatus: boolean; showWordCount: boolean; showBranding: boolean; showFullscreen: boolean; showPreview: boolean; showZoom: boolean; showLocale: boolean }
export interface KindyContractEditorOptions { editorKey: string; toolbar: KindyContractToolbarOptions; statusbar: KindyContractStatusbarOptions; page: { layouts: ['page']; showRuler: boolean }; disableExtensions: string[] }
export const CONTRACT_EDITOR_OPTIONS: Readonly<KindyContractEditorOptions>
export function createContractEditorOptions(overrides?: Record<string, unknown>): KindyContractEditorOptions & Record<string, unknown>

export interface DocumentCapabilities { view?: boolean; edit?: boolean; comment?: boolean; review?: boolean; download?: boolean; restore?: boolean; manage?: boolean }
export interface DocumentSummary { id: string; title: string; fileName: string; folderId?: string | null; tags?: string[]; currentVersionId?: string; currentRevisionId?: string; isTemplate?: boolean; updatedAt: string; createdAt?: string; capabilities?: DocumentCapabilities }
export interface OriginalDocxSource { artifactId: string; revisionId: string; format: 'original-docx'; fileName: string; compatibilityReport?: CompatibilityReport }
export interface DocumentRecord extends DocumentSummary { description?: string; metadata?: Record<string, unknown>; originalSource?: OriginalDocxSource }
export interface DocumentVersion { id: string; documentId: string; number: number; revisionId: string; reason: SaveReason | 'create' | 'import' | 'restore' | 'template'; createdAt: string; createdBy?: { id?: string; name?: string }; label?: string }
export interface DocumentSnapshot { document: DocumentRecord; state: KindyDocumentState; revisionId: string; version?: DocumentVersion }
export interface DocumentArtifact { id: string; documentId: string; versionId?: string; format: ArtifactFormat; fileName: string; mimeType: string; size?: number; url?: string; blob?: Blob; createdAt: string }
export interface Folder { id: string; name: string; parentId?: string | null }
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export interface DocumentQuery { search?: string; folderId?: string | null; tags?: string[]; page?: number; pageSize?: number; templatesOnly?: boolean }
export interface CreateDocumentInput { title: string; fileName?: string; folderId?: string | null; tags?: string[]; templateId?: string; state?: KindyDocumentState; metadata?: Record<string, unknown> }
export interface CompatibilityIssue { code: string; feature: string; message: string; severity: 'info' | 'warning' | 'error'; location?: string }
export interface CompatibilityReport { profile: 'kindy-docx-v2.0' | 'kindy-docx-v2.1'; supported: boolean; issues: CompatibilityIssue[] }
export interface ImportDocumentInput extends CreateDocumentInput { file: File | Blob; state: KindyDocumentState; compatibilityReport?: CompatibilityReport }
export interface SaveStateInput { state: KindyDocumentState; baseRevisionId: string; reason: SaveReason; clientMutationId: string }
export interface SaveResult { revisionId: string; savedAt: string; version?: DocumentVersion }
export interface StoreArtifactInput { format: ArtifactFormat; blob: Blob; fileName: string; versionId?: string; compatibilityReport?: CompatibilityReport }

export interface DocumentApiAdapter {
  listDocuments(query?: DocumentQuery, signal?: AbortSignal): Promise<Page<DocumentSummary>>
  getDocument(documentId: string, signal?: AbortSignal): Promise<DocumentRecord>
  createDocument(input: CreateDocumentInput, signal?: AbortSignal): Promise<DocumentRecord>
  importDocument(input: ImportDocumentInput, signal?: AbortSignal): Promise<DocumentRecord>
  updateDocument(documentId: string, patch: Partial<DocumentRecord>, signal?: AbortSignal): Promise<DocumentRecord>
  loadState(documentId: string, versionId?: string, signal?: AbortSignal): Promise<DocumentSnapshot>
  saveState(documentId: string, input: SaveStateInput, signal?: AbortSignal): Promise<SaveResult>
  listVersions(documentId: string, query?: DocumentQuery, signal?: AbortSignal): Promise<Page<DocumentVersion>>
  restoreVersion(documentId: string, versionId: string, signal?: AbortSignal): Promise<DocumentSnapshot>
  listFolders(query?: DocumentQuery, signal?: AbortSignal): Promise<Folder[]>
  listTemplates(query?: DocumentQuery, signal?: AbortSignal): Promise<Page<DocumentSummary>>
  storeArtifact(documentId: string, input: StoreArtifactInput, signal?: AbortSignal): Promise<DocumentArtifact>
  getArtifact(documentId: string, artifactId: string, signal?: AbortSignal): Promise<DocumentArtifact>
}

export class DocumentLibraryError extends Error { readonly code: DocumentErrorCode; readonly status?: number; readonly details?: unknown }
export const DOCUMENT_ERROR_CODES: readonly DocumentErrorCode[]
export const KINDY_DOCUMENT_SCHEMA_VERSION: '2.0'
export const DEFAULT_PAGE_STATE: KindyPageState
export function createEmptyDocumentState(overrides?: Partial<KindyDocumentState>): KindyDocumentState
export function migrateDocumentState(input: unknown): KindyDocumentState
export function createEditorDocumentState(input: { content: JSONContent; page?: Record<string, unknown>; assets?: AssetReference[] }): KindyDocumentState

export interface DocumentLibraryClientOptions { adapter: DocumentApiAdapter; autosave?: { enabled?: boolean; delay?: number }; codecs?: Record<string, unknown>; engine?: EditorEngineAdapter; locale?: string; theme?: Record<string, string> }
export class DocumentLibraryClient {
  constructor(options: DocumentLibraryClientOptions)
  readonly adapter: DocumentApiAdapter
  readonly codecs?: Record<string, unknown>
  readonly engine?: EditorEngineAdapter
  readonly locale: string
  readonly theme: Record<string, string>
  readonly current: DocumentSnapshot | null
  readonly hasUnsavedChanges: boolean
  readonly hasConflict: boolean
  on(event: string, listener: (payload: any) => void): () => boolean
  listDocuments(query?: DocumentQuery, signal?: AbortSignal): Promise<Page<DocumentSummary>>
  open(documentId: string, versionId?: string, signal?: AbortSignal): Promise<DocumentSnapshot>
  create(input: CreateDocumentInput, signal?: AbortSignal): Promise<DocumentSnapshot>
  import(input: ImportDocumentInput, signal?: AbortSignal): Promise<DocumentSnapshot>
  updateState(state: KindyDocumentState): DocumentSnapshot
  save(reason?: SaveReason): Promise<SaveResult>
  restore(versionId: string, signal?: AbortSignal): Promise<DocumentSnapshot>
  storeArtifact(input: StoreArtifactInput, signal?: AbortSignal): Promise<DocumentArtifact>
  resolveConflict(snapshot: DocumentSnapshot): void
  destroy(): void
}
export function createDocumentLibrary(options: DocumentLibraryClientOptions): DocumentLibraryClient

export type DocumentTransport = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export class RestDocumentAdapter implements DocumentApiAdapter { constructor(options: { baseUrl: string; transport?: DocumentTransport }) }
export function createRestDocumentAdapter(options: { baseUrl: string; transport?: DocumentTransport }): RestDocumentAdapter
export class MemoryDocumentAdapter implements DocumentApiAdapter { constructor(seed?: { documents?: DocumentSnapshot[]; folders?: Folder[] }) }
export function createMemoryDocumentAdapter(seed?: { documents?: DocumentSnapshot[]; folders?: Folder[] }): MemoryDocumentAdapter
export function createLegacyCallbackAdapter(options?: { onSave?: (payload: { json: JSONContent; state: KindyDocumentState }, page: KindyPageState) => Promise<unknown>; onFileUpload?: (file: File | Blob) => Promise<unknown> }): DocumentApiAdapter

export const DOCX_MIME: string
export const KINDY_DOCX_PROFILE: 'kindy-docx-v2.0'
export interface DocxImportLimits { maxCompressedBytes: number; maxUncompressedBytes: number; maxEntries: number; maxCompressionRatio: number; maxMediaBytes: number; maxSingleMediaBytes: number }
export const DEFAULT_DOCX_IMPORT_LIMITS: DocxImportLimits
export interface DocxImportResult { state: KindyDocumentState; report: CompatibilityReport; messages: Array<{ type: string; message: string }> }
export interface DocxExportResult { blob: Blob; report: CompatibilityReport }
export function inspectDocx(file: Blob, limits?: Partial<DocxImportLimits>, profile?: CompatibilityReport['profile']): Promise<{ report: CompatibilityReport; documentXml: string }>
export function extractDocxPackage(file: Blob, limits?: Partial<DocxImportLimits>): Promise<{ contentTypes: string; documentXml: string; relationshipsXml?: string; numberingXml?: string; media: Record<string, Uint8Array> }>
export function ooxmlToDocumentState(parts: Awaited<ReturnType<typeof extractDocxPackage>>): KindyDocumentState
export function importDocx(file: Blob, options?: { mode?: 'strict' | 'best-effort'; profile?: CompatibilityReport['profile']; limits?: Partial<DocxImportLimits> }): Promise<DocxImportResult>
export function importDocxInWorker(file: Blob, options?: { mode?: 'strict' | 'best-effort'; profile?: CompatibilityReport['profile']; signal?: AbortSignal; limits?: Partial<DocxImportLimits> }): Promise<DocxImportResult>
export function exportDocx(state: KindyDocumentState, options?: { mode?: 'strict' | 'best-effort'; profile?: CompatibilityReport['profile'] }): Promise<DocxExportResult>
export function createDocxCodec(): { import: typeof importDocx; export: typeof exportDocx; inspect: typeof inspectDocx }

export interface CollaborationSession { disconnect(): void; getUsers?(): unknown[] }
export interface CollaborationAdapter { connect(context: { documentId: string; revisionId: string; user?: { id?: string; name?: string; color?: string }; editor: unknown }): Promise<CollaborationSession> | CollaborationSession }
export class YjsCollaborationAdapter implements CollaborationAdapter { constructor(options: { providerFactory(context: { documentId: string; user?: { id?: string; name?: string; color?: string }; editor: unknown }): unknown | Promise<unknown> }) }
export function createYjsCollaborationAdapter(options: ConstructorParameters<typeof YjsCollaborationAdapter>[0]): YjsCollaborationAdapter

export interface KindyEditorOptions { editorKey?: string; locale?: 'vi-VN' | 'en-US' | 'zh-CN' | 'it-IT' | 'ru-RU'; theme?: 'light' | 'dark' | 'auto'; skin?: 'default' | 'modern'; height?: string; toolbar?: Partial<KindyContractToolbarOptions>; statusbar?: Partial<KindyContractStatusbarOptions>; page?: Record<string, unknown>; document?: { title?: string; content?: string | JSONContent; assets?: AssetReference[]; readOnly?: boolean; autoSave?: { enabled: boolean; interval?: number } }; translations?: Record<string, Record<string, string>>; disableExtensions?: string[]; [key: string]: unknown }
export interface KindyDocumentLibraryProps {
  adapter?: DocumentApiAdapter
  client?: DocumentLibraryClient
  autosave?: { enabled?: boolean; delay?: number }
  stateSyncDelay?: number
  docxProfile?: CompatibilityReport['profile']
  locale?: string
  theme?: Record<string, string>
  messages?: Partial<KindyLibraryMessages>
  ui?: Partial<KindyLibraryUiOptions>
  editorOptions?: Record<string, unknown>
  collaboration?: CollaborationAdapter
  user?: { id?: string; name?: string; color?: string }
  showVersions?: boolean
  confirmCompatibility?: (report: CompatibilityReport) => boolean | Promise<boolean>
}
export interface KindyEditorHandle {
  setContent(content: string | JSONContent, options?: object): void
  getContent(type?: 'html' | 'json' | 'text'): string | JSONContent
  getJSON(): JSONContent
  getState(): KindyDocumentState
  getPage(): Record<string, unknown>
  preparePrint(): Promise<{ html: string; page: Record<string, unknown> }>
  print(): void
  saveContent(): Promise<void>
  markContentSaved(): void
  setReadOnly(readOnly?: boolean): void
  focus(): void
  destroy(): void
}
export interface KindyDocumentLibraryHandle {
  importDocument(): void
  downloadDocx(): Promise<void>
  print(): void
}
export const KindyEditor: DefineComponent<KindyEditorOptions, KindyEditorHandle, object>
export const KindyDocumentLibrary: DefineComponent<KindyDocumentLibraryProps, KindyDocumentLibraryHandle, object>
export const KindyDocumentLibraryShell: Component
export const KindyMenuButton: Component
export const KindyDialog: Component
export const KindyTooltip: Component
export function mountKindyEditor(container: HTMLElement | string, props?: Partial<KindyEditorOptions>): { unmount(): void; app: App; instance: KindyEditorHandle }
export const useKindyEditor: { install(app: App, options?: Partial<KindyEditorOptions>): void }

export interface EditorEngineHandle { load(state: KindyDocumentState): void | Promise<void>; getState(): KindyDocumentState; setReadOnly(readOnly: boolean): void; focus(): void; destroy(): void; onChange(listener: (state: KindyDocumentState) => void): () => void }
export interface EditorEngineAdapter { readonly id: string; mount(container: HTMLElement, options?: Record<string, unknown>): EditorEngineHandle | Promise<EditorEngineHandle> }
export class TiptapEngineAdapter implements EditorEngineAdapter { readonly id: 'tiptap'; mount(container: HTMLElement, options?: Record<string, unknown>): EditorEngineHandle }
export function createTiptapEngineAdapter(): TiptapEngineAdapter

export function createMockDocumentTransport(options?: { adapter?: MemoryDocumentAdapter; baseUrl?: string; latency?: number }): { adapter: MemoryDocumentAdapter; transport: DocumentTransport; baseUrl: string }

export default KindyEditor
