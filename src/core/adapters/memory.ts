import { DocumentLibraryError } from '../errors'
import { cloneDocumentState, createEmptyDocumentState, migrateDocumentState } from '../state'
import type {
  CreateDocumentInput,
  DocumentApiAdapter,
  DocumentArtifact,
  DocumentQuery,
  DocumentRecord,
  DocumentSnapshot,
  DocumentSummary,
  DocumentVersion,
  Folder,
  ImportDocumentInput,
  Page,
  SaveResult,
  SaveStateInput,
  StoreArtifactInput,
} from '../types'

const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
const now = () => new Date().toISOString()
const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DocumentLibraryError('OPERATION_CANCELLED', 'Operation was cancelled.')
}

function paginate<T>(items: T[], query: DocumentQuery = {}): Page<T> {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.max(1, query.pageSize || 20)
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }
}

function cloneArtifact(value: DocumentArtifact) {
  const { blob, ...metadata } = value
  return { ...cloneDocumentState(metadata), blob }
}

export class MemoryDocumentAdapter implements DocumentApiAdapter {
  private documents = new Map<string, DocumentRecord>()
  private states = new Map<string, DocumentSnapshot>()
  private versions = new Map<string, DocumentVersion[]>()
  private versionStates = new Map<string, DocumentSnapshot>()
  private artifacts = new Map<string, DocumentArtifact>()
  private folders: Folder[]

  constructor(seed: { documents?: DocumentSnapshot[]; folders?: Folder[] } = {}) {
    this.folders = cloneDocumentState(seed.folders || [])
    seed.documents?.forEach((snapshot) => this.seed(snapshot))
  }

  private seed(snapshot: DocumentSnapshot) {
    const value = cloneDocumentState(snapshot)
    value.state = migrateDocumentState(value.state)
    this.documents.set(value.document.id, value.document)
    this.states.set(value.document.id, value)
    if (value.version) {
      this.versions.set(value.document.id, [value.version])
      this.versionStates.set(value.version.id, value)
    }
  }

  private requireDocument(documentId: string) {
    const document = this.documents.get(documentId)
    if (!document) throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', `Document ${documentId} was not found.`, { status: 404 })
    return document
  }

  async listDocuments(query: DocumentQuery = {}, signal?: AbortSignal) {
    throwIfAborted(signal)
    const search = query.search?.toLocaleLowerCase()
    let items = [...this.documents.values()].filter((item) => query.templatesOnly ? item.isTemplate : !item.isTemplate)
    if (search) items = items.filter((item) => `${item.title} ${item.fileName}`.toLocaleLowerCase().includes(search))
    if (query.folderId !== undefined) items = items.filter((item) => item.folderId === query.folderId)
    if (query.tags?.length) items = items.filter((item) => query.tags!.every((tag) => item.tags?.includes(tag)))
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return paginate(cloneDocumentState(items), query)
  }

  async getDocument(documentId: string, signal?: AbortSignal) {
    throwIfAborted(signal)
    return cloneDocumentState(this.requireDocument(documentId))
  }

  async createDocument(input: CreateDocumentInput, signal?: AbortSignal) {
    throwIfAborted(signal)
    const documentId = id('doc')
    const createdAt = now()
    const document: DocumentRecord = {
      id: documentId,
      title: input.title,
      fileName: input.fileName || `${input.title || 'Untitled'}.docx`,
      folderId: input.folderId,
      tags: input.tags || [],
      isTemplate: false,
      currentRevisionId: id('rev'),
      createdAt,
      updatedAt: createdAt,
      metadata: input.metadata,
      capabilities: { view: true, edit: true, comment: true, review: true, download: true, restore: true, manage: true },
    }
    const version = this.makeVersion(document, input.templateId ? 'template' : 'create')
    document.currentVersionId = version.id
    this.documents.set(document.id, document)
    const templateState = input.templateId ? this.states.get(input.templateId)?.state : undefined
    if (input.templateId && !templateState) throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', `Template ${input.templateId} was not found.`, { status: 404 })
    const state = input.state || templateState || createEmptyDocumentState()
    const snapshot = { document, state, revisionId: document.currentRevisionId!, version }
    this.states.set(document.id, cloneDocumentState(snapshot))
    this.versionStates.set(version.id, cloneDocumentState(snapshot))
    return cloneDocumentState(document)
  }

  async importDocument(input: ImportDocumentInput, signal?: AbortSignal) {
    throwIfAborted(signal)
    const document = await this.createDocument({ ...input, state: input.state }, signal)
    const versions = this.versions.get(document.id) || []
    if (versions[0]) versions[0].reason = 'import'
    if (input.file) {
      const original: StoreArtifactInput = {
        format: 'original-docx',
        blob: input.file,
        fileName: input.fileName || document.fileName,
        versionId: document.currentVersionId,
        compatibilityReport: input.compatibilityReport,
      }
      const artifact = await this.storeArtifact(document.id, original, signal)
      return this.updateDocument(document.id, {
        originalSource: {
          artifactId: artifact.id,
          revisionId: document.currentRevisionId!,
          format: 'original-docx',
          fileName: artifact.fileName,
          compatibilityReport: input.compatibilityReport,
        },
      }, signal)
    }
    return document
  }

  async updateDocument(documentId: string, patch: Partial<DocumentRecord>, signal?: AbortSignal) {
    throwIfAborted(signal)
    const document = this.requireDocument(documentId)
    const updated = { ...document, ...cloneDocumentState(patch), id: document.id, updatedAt: now() }
    this.documents.set(documentId, updated)
    const snapshot = this.states.get(documentId)
    if (snapshot) snapshot.document = cloneDocumentState(updated)
    for (const versionSnapshot of this.versionStates.values()) {
      if (versionSnapshot.document.id === documentId) versionSnapshot.document = cloneDocumentState(updated)
    }
    return cloneDocumentState(updated)
  }

  async loadState(documentId: string, versionId?: string, signal?: AbortSignal) {
    throwIfAborted(signal)
    this.requireDocument(documentId)
    const snapshot = versionId ? this.versionStates.get(versionId) : this.states.get(documentId)
    if (!snapshot || snapshot.document.id !== documentId) {
      throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', `Version ${versionId} was not found.`, { status: 404 })
    }
    return cloneDocumentState(snapshot)
  }

  async saveState(documentId: string, input: SaveStateInput, signal?: AbortSignal): Promise<SaveResult> {
    throwIfAborted(signal)
    const document = this.requireDocument(documentId)
    if (document.currentRevisionId !== input.baseRevisionId) {
      throw new DocumentLibraryError('VERSION_CONFLICT', 'The document has a newer revision.', {
        status: 409,
        details: { currentRevisionId: document.currentRevisionId },
      })
    }
    const revisionId = id('rev')
    document.currentRevisionId = revisionId
    document.updatedAt = now()
    const version = input.reason === 'manual' ? this.makeVersion(document, 'manual') : undefined
    if (version) document.currentVersionId = version.id
    const snapshot: DocumentSnapshot = {
      document: cloneDocumentState(document),
      state: migrateDocumentState(input.state),
      revisionId,
      version,
    }
    this.states.set(documentId, snapshot)
    if (version) this.versionStates.set(version.id, cloneDocumentState(snapshot))
    return { revisionId, savedAt: document.updatedAt, version: cloneDocumentState(version) }
  }

  async listVersions(documentId: string, query: DocumentQuery = {}, signal?: AbortSignal) {
    throwIfAborted(signal)
    this.requireDocument(documentId)
    return paginate(cloneDocumentState(this.versions.get(documentId) || []).reverse(), query)
  }

  async restoreVersion(documentId: string, versionId: string, signal?: AbortSignal) {
    throwIfAborted(signal)
    const source = await this.loadState(documentId, versionId, signal)
    const document = this.requireDocument(documentId)
    const revisionId = id('rev')
    document.currentRevisionId = revisionId
    document.updatedAt = now()
    const version = this.makeVersion(document, 'restore')
    document.currentVersionId = version.id
    const snapshot = { document: cloneDocumentState(document), state: source.state, revisionId, version }
    this.states.set(documentId, cloneDocumentState(snapshot))
    this.versionStates.set(version.id, cloneDocumentState(snapshot))
    return cloneDocumentState(snapshot)
  }

  async listFolders(_query?: DocumentQuery, signal?: AbortSignal) { throwIfAborted(signal); return cloneDocumentState(this.folders) }

  async listTemplates(query: DocumentQuery = {}, signal?: AbortSignal) {
    return this.listDocuments({ ...query, templatesOnly: true }, signal)
  }

  async storeArtifact(documentId: string, input: StoreArtifactInput, signal?: AbortSignal) {
    throwIfAborted(signal)
    this.requireDocument(documentId)
    const artifact: DocumentArtifact = {
      id: id('artifact'), documentId, versionId: input.versionId, format: input.format,
      fileName: input.fileName, mimeType: input.blob?.type || 'application/octet-stream',
      size: input.blob?.size || 0, blob: input.blob, createdAt: now(),
    }
    this.artifacts.set(artifact.id, artifact)
    return cloneArtifact(artifact)
  }

  async getArtifact(documentId: string, artifactId: string, signal?: AbortSignal) {
    throwIfAborted(signal)
    this.requireDocument(documentId)
    const artifact = this.artifacts.get(artifactId)
    if (!artifact || artifact.documentId !== documentId) {
      throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', `Artifact ${artifactId} was not found.`, { status: 404 })
    }
    return cloneArtifact(artifact)
  }

  private makeVersion(document: DocumentRecord, reason: DocumentVersion['reason']) {
    const list = this.versions.get(document.id) || []
    const version: DocumentVersion = {
      id: id('version'), documentId: document.id, number: list.length + 1,
      revisionId: document.currentRevisionId!, reason, createdAt: now(),
    }
    list.push(version)
    this.versions.set(document.id, list)
    return version
  }
}

export const createMemoryDocumentAdapter = (seed?: ConstructorParameters<typeof MemoryDocumentAdapter>[0]) => new MemoryDocumentAdapter(seed)
