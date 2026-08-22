import { TypedEventEmitter } from './emitter'
import { DocumentLibraryError, toDocumentLibraryError } from './errors'
import { cloneDocumentState, createEmptyDocumentState, migrateDocumentState } from './state'
import type {
  CreateDocumentInput,
  DocumentApiAdapter,
  DocumentQuery,
  DocumentSnapshot,
  ImportDocumentInput,
  KindyDocumentState,
  SaveReason,
  StoreArtifactInput,
  EditorEngineAdapter,
} from './types'

export interface DocumentLibraryClientOptions {
  adapter: DocumentApiAdapter
  autosave?: { enabled?: boolean; delay?: number }
  codecs?: Record<string, unknown>
  engine?: EditorEngineAdapter
  locale?: string
  theme?: Record<string, string>
}

export class DocumentLibraryClient extends TypedEventEmitter {
  readonly adapter: DocumentApiAdapter
  readonly codecs?: Record<string, unknown>
  readonly engine?: EditorEngineAdapter
  readonly locale: string
  readonly theme: Record<string, string>
  private autosaveEnabled: boolean
  private autosaveDelay: number
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null
  private saveController: AbortController | null = null
  private savePromise: Promise<ReturnType<DocumentApiAdapter['saveState']> extends Promise<infer T> ? T : never> | null = null
  private snapshot: DocumentSnapshot | null = null
  private dirty = false
  private conflicted = false
  private mutation = 0

  constructor(options: DocumentLibraryClientOptions) {
    super()
    this.adapter = options.adapter
    this.codecs = options.codecs
    this.engine = options.engine
    this.locale = options.locale || 'vi-VN'
    this.theme = options.theme || {}
    this.autosaveEnabled = options.autosave?.enabled ?? true
    this.autosaveDelay = Math.max(250, options.autosave?.delay ?? 30_000)
  }

  get current() { return this.snapshot ? cloneDocumentState(this.snapshot) : null }
  get hasUnsavedChanges() { return this.dirty }
  get hasConflict() { return this.conflicted }

  listDocuments(query?: DocumentQuery, signal?: AbortSignal) {
    return this.adapter.listDocuments(query, signal)
  }

  async open(documentId: string, versionId?: string, signal?: AbortSignal) {
    this.cancelPendingSave()
    const snapshot = await this.adapter.loadState(documentId, versionId, signal)
    snapshot.state = migrateDocumentState(snapshot.state)
    this.snapshot = snapshot
    this.dirty = false
    this.conflicted = false
    const current = this.current!
    this.emit('opened', current)
    return current
  }

  async create(input: CreateDocumentInput, signal?: AbortSignal) {
    const document = await this.adapter.createDocument({ ...input, state: input.state || createEmptyDocumentState() }, signal)
    return this.open(document.id, undefined, signal)
  }

  async import(input: ImportDocumentInput, signal?: AbortSignal) {
    const document = await this.adapter.importDocument({ ...input, state: migrateDocumentState(input.state) }, signal)
    this.emit('imported', { document, compatibilityReport: input.compatibilityReport })
    return this.open(document.id, undefined, signal)
  }

  updateState(state: KindyDocumentState) {
    if (!this.snapshot) throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', 'Open a document before updating state.')
    this.snapshot.state = migrateDocumentState(state)
    this.mutation += 1
    this.dirty = true
    const current = this.current!
    this.emit('changed', current)
    if (this.autosaveEnabled && !this.conflicted) this.scheduleAutosave()
    return current
  }

  async save(reason: SaveReason = 'manual') {
    if (this.savePromise) {
      try { await this.savePromise } catch { /* the conflict/error state is checked below */ }
    }
    const operation = this.performSave(reason)
    this.savePromise = operation
    try { return await operation }
    finally { if (this.savePromise === operation) this.savePromise = null }
  }

  private async performSave(reason: SaveReason) {
    if (!this.snapshot) throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', 'Open a document before saving.')
    if (this.conflicted) throw new DocumentLibraryError('VERSION_CONFLICT', 'Autosave is paused until the conflict is resolved.')
    this.cancelPendingSave(false)
    const controller = new AbortController()
    this.saveController = controller
    const { snapshot } = this
    const savedMutation = this.mutation
    this.emit('save-started', { documentId: snapshot.document.id, reason })
    try {
      const result = await this.adapter.saveState(snapshot.document.id, {
        state: cloneDocumentState(snapshot.state),
        baseRevisionId: snapshot.revisionId,
        reason,
        clientMutationId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      }, controller.signal)
      snapshot.revisionId = result.revisionId
      snapshot.document.currentRevisionId = result.revisionId
      if (result.version) {
        snapshot.version = result.version
        snapshot.document.currentVersionId = result.version.id
      }
      this.dirty = savedMutation !== this.mutation
      this.emit('saved', { ...result, documentId: snapshot.document.id })
      if (this.dirty && this.autosaveEnabled) this.scheduleAutosave()
      return result
    } catch (error) {
      const normalized = toDocumentLibraryError(error)
      if (normalized.code === 'VERSION_CONFLICT') this.conflicted = true
      this.emit('save-failed', normalized)
      this.emit('error', normalized)
      throw normalized
    } finally {
      if (this.saveController === controller) this.saveController = null
    }
  }

  async restore(versionId: string, signal?: AbortSignal) {
    if (!this.snapshot) throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', 'Open a document before restoring a version.')
    const restored = await this.adapter.restoreVersion(this.snapshot.document.id, versionId, signal)
    restored.state = migrateDocumentState(restored.state)
    this.snapshot = restored
    this.dirty = false
    this.conflicted = false
    const current = this.current!
    this.emit('version-restored', current)
    return current
  }

  async storeArtifact(input: StoreArtifactInput, signal?: AbortSignal) {
    if (!this.snapshot) throw new DocumentLibraryError('DOCUMENT_NOT_FOUND', 'Open a document before storing an artifact.')
    return this.adapter.storeArtifact(this.snapshot.document.id, input, signal)
  }

  resolveConflict(snapshot: DocumentSnapshot) {
    this.snapshot = { ...cloneDocumentState(snapshot), state: migrateDocumentState(snapshot.state) }
    this.dirty = false
    this.conflicted = false
  }

  destroy() {
    this.cancelPendingSave()
    this.snapshot = null
    this.clear()
  }

  private scheduleAutosave() {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer)
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null
      if (this.dirty && !this.conflicted) void this.save('autosave').catch(() => undefined)
    }, this.autosaveDelay)
  }

  private cancelPendingSave(abort = true) {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer)
    this.autosaveTimer = null
    if (abort) this.saveController?.abort()
    this.saveController = null
  }
}

export const createDocumentLibrary = (options: DocumentLibraryClientOptions) => new DocumentLibraryClient(options)
