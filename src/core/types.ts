import type { JSONContent } from '@tiptap/core'

export const KINDY_DOCUMENT_SCHEMA_VERSION = '2.0' as const

export type KindyDocumentSchemaVersion = typeof KINDY_DOCUMENT_SCHEMA_VERSION
export type SaveReason = 'autosave' | 'manual'
export type ArtifactFormat = 'docx' | 'pdf' | 'original-docx'

export interface KindyPageMargin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface KindyHeaderFooterState {
  enabled: boolean
  content?: JSONContent
  text?: string
  firstContent?: JSONContent
  firstText?: string
  evenContent?: JSONContent
  evenText?: string
  differentFirstPage?: boolean
  differentOddEven?: boolean
}

export interface KindySectionState {
  id: string
  fromBlockId?: string
  pageNumberStart?: number
  size: { width: number; height: number }
  orientation: 'portrait' | 'landscape'
  margin: KindyPageMargin
  header?: KindyHeaderFooterState
  footer?: KindyHeaderFooterState
}

export interface KindyPageState {
  size: { width: number; height: number }
  orientation: 'portrait' | 'landscape'
  margin: KindyPageMargin
  background?: string
  watermark?: Record<string, unknown>
  header?: KindyHeaderFooterState
  footer?: KindyHeaderFooterState
  sections?: KindySectionState[]
}

export interface AssetReference {
  id: string
  kind: 'image' | 'video' | 'audio' | 'file' | 'other'
  url?: string
  mimeType?: string
  fileName?: string
  size?: number
  metadata?: Record<string, unknown>
}

export interface KindyDocumentState {
  schemaVersion: KindyDocumentSchemaVersion
  content: JSONContent
  page: KindyPageState
  assets: AssetReference[]
}

export interface DocumentCapabilities {
  view?: boolean
  edit?: boolean
  comment?: boolean
  review?: boolean
  download?: boolean
  restore?: boolean
  manage?: boolean
}

export interface DocumentSummary {
  id: string
  title: string
  fileName: string
  folderId?: string | null
  tags?: string[]
  currentVersionId?: string
  currentRevisionId?: string
  isTemplate?: boolean
  updatedAt: string
  createdAt?: string
  capabilities?: DocumentCapabilities
}

export interface DocumentRecord extends DocumentSummary {
  description?: string
  metadata?: Record<string, unknown>
}

export interface DocumentVersion {
  id: string
  documentId: string
  number: number
  revisionId: string
  reason: SaveReason | 'create' | 'import' | 'restore' | 'template'
  createdAt: string
  createdBy?: { id?: string; name?: string }
  label?: string
}

export interface DocumentSnapshot {
  document: DocumentRecord
  state: KindyDocumentState
  revisionId: string
  version?: DocumentVersion
}

export interface DocumentArtifact {
  id: string
  documentId: string
  versionId?: string
  format: ArtifactFormat
  fileName: string
  mimeType: string
  size?: number
  url?: string
  blob?: Blob
  createdAt: string
}

export interface Folder {
  id: string
  name: string
  parentId?: string | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DocumentQuery {
  search?: string
  folderId?: string | null
  tags?: string[]
  page?: number
  pageSize?: number
  templatesOnly?: boolean
}

export interface CreateDocumentInput {
  title: string
  fileName?: string
  folderId?: string | null
  tags?: string[]
  templateId?: string
  state?: KindyDocumentState
  metadata?: Record<string, unknown>
}

export interface ImportDocumentInput extends CreateDocumentInput {
  file: File | Blob
  state: KindyDocumentState
  compatibilityReport?: CompatibilityReport
}

export interface SaveStateInput {
  state: KindyDocumentState
  baseRevisionId: string
  reason: SaveReason
  clientMutationId: string
}

export interface SaveResult {
  revisionId: string
  savedAt: string
  version?: DocumentVersion
}

export interface StoreArtifactInput {
  format: ArtifactFormat
  blob: Blob
  fileName: string
  versionId?: string
  compatibilityReport?: CompatibilityReport
}

export type CompatibilitySeverity = 'info' | 'warning' | 'error'

export interface CompatibilityIssue {
  code: string
  feature: string
  message: string
  severity: CompatibilitySeverity
  location?: string
}

export interface CompatibilityReport {
  profile: 'kindy-docx-v2.0' | 'kindy-docx-v2.1' | 'kindy-docx-v2.2'
  supported: boolean
  issues: CompatibilityIssue[]
}

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

export interface EditorEngineHandle {
  load(state: KindyDocumentState): Promise<void> | void
  getState(): KindyDocumentState
  setReadOnly(readOnly: boolean): void
  focus(): void
  destroy(): void
  onChange(listener: (state: KindyDocumentState) => void): () => void
}

export interface EditorEngineAdapter {
  readonly id: string
  mount(container: HTMLElement, options?: Record<string, unknown>): Promise<EditorEngineHandle> | EditorEngineHandle
}

export interface CollaborationSession {
  disconnect(): void
  getUsers?(): unknown[]
}

export interface CollaborationAdapter {
  connect(context: {
    documentId: string
    revisionId: string
    user?: { id?: string; name?: string; color?: string }
    editor: unknown
  }): Promise<CollaborationSession> | CollaborationSession
}
