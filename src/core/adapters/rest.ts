import { DocumentLibraryError, toDocumentLibraryError } from '../errors'
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

export type DocumentTransport = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface RestDocumentAdapterOptions {
  baseUrl: string
  transport?: DocumentTransport
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function queryString(query?: DocumentQuery) {
  if (!query) return ''
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)))
    else params.set(key, String(value))
  })
  const result = params.toString()
  return result ? `?${result}` : ''
}

export class RestDocumentAdapter implements DocumentApiAdapter {
  private readonly baseUrl: string
  private readonly transport: DocumentTransport

  constructor(options: RestDocumentAdapterOptions) {
    if (!options?.baseUrl) throw new TypeError('RestDocumentAdapter requires baseUrl.')
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.transport = options.transport || globalThis.fetch.bind(globalThis)
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
      const response = await this.transport(`${this.baseUrl}${path}`, init)
      if (!response.ok) {
        let details: unknown
        try { details = await response.json() } catch { details = await response.text() }
        const code = response.status === 404
          ? 'DOCUMENT_NOT_FOUND'
          : response.status === 409
            ? 'VERSION_CONFLICT'
            : 'ADAPTER_ERROR'
        throw new DocumentLibraryError(code, `Document API returned ${response.status}.`, {
          status: response.status,
          details,
        })
      }
      if (response.status === 204) return undefined as T
      return await response.json() as T
    } catch (error) {
      if (error instanceof DocumentLibraryError) throw error
      throw toDocumentLibraryError(error, 'NETWORK_ERROR')
    }
  }

  private json<T>(path: string, method: string, body?: unknown, signal?: AbortSignal) {
    return this.request<T>(path, {
      method,
      signal,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  listDocuments(query?: DocumentQuery, signal?: AbortSignal) {
    return this.request<Page<DocumentSummary>>(`/documents${queryString(query)}`, { signal })
  }

  getDocument(documentId: string, signal?: AbortSignal) {
    return this.request<DocumentRecord>(`/documents/${encodeURIComponent(documentId)}`, { signal })
  }

  createDocument(input: CreateDocumentInput, signal?: AbortSignal) {
    return this.json<DocumentRecord>('/documents', 'POST', input, signal)
  }

  importDocument(input: ImportDocumentInput, signal?: AbortSignal) {
    const data = new FormData()
    data.set('file', input.file, input.fileName || 'document.docx')
    data.set('metadata', JSON.stringify({
      title: input.title,
      fileName: input.fileName,
      folderId: input.folderId,
      tags: input.tags,
      metadata: input.metadata,
    }))
    data.set('state', JSON.stringify(input.state))
    if (input.compatibilityReport) data.set('compatibilityReport', JSON.stringify(input.compatibilityReport))
    return this.request<DocumentRecord>('/documents/import', { method: 'POST', body: data, signal })
  }

  updateDocument(documentId: string, patch: Partial<DocumentRecord>, signal?: AbortSignal) {
    return this.json<DocumentRecord>(`/documents/${encodeURIComponent(documentId)}`, 'PATCH', patch, signal)
  }

  loadState(documentId: string, versionId?: string, signal?: AbortSignal) {
    const suffix = versionId ? `?versionId=${encodeURIComponent(versionId)}` : ''
    return this.request<DocumentSnapshot>(`/documents/${encodeURIComponent(documentId)}/state${suffix}`, { signal })
  }

  saveState(documentId: string, input: SaveStateInput, signal?: AbortSignal) {
    return this.json<SaveResult>(`/documents/${encodeURIComponent(documentId)}/state`, 'PUT', input, signal)
  }

  listVersions(documentId: string, query?: DocumentQuery, signal?: AbortSignal) {
    return this.request<Page<DocumentVersion>>(
      `/documents/${encodeURIComponent(documentId)}/versions${queryString(query)}`,
      { signal },
    )
  }

  restoreVersion(documentId: string, versionId: string, signal?: AbortSignal) {
    return this.json<DocumentSnapshot>(
      `/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/restore`,
      'POST',
      undefined,
      signal,
    )
  }

  listFolders(query?: DocumentQuery, signal?: AbortSignal) {
    return this.request<Folder[]>(`/folders${queryString(query)}`, { signal })
  }

  listTemplates(query?: DocumentQuery, signal?: AbortSignal) {
    return this.request<Page<DocumentSummary>>(`/templates${queryString(query)}`, { signal })
  }

  storeArtifact(documentId: string, input: StoreArtifactInput, signal?: AbortSignal) {
    const data = new FormData()
    data.set('file', input.blob, input.fileName)
    data.set('fileName', input.fileName)
    data.set('format', input.format)
    if (input.versionId) data.set('versionId', input.versionId)
    if (input.compatibilityReport) data.set('compatibilityReport', JSON.stringify(input.compatibilityReport))
    return this.request<DocumentArtifact>(`/documents/${encodeURIComponent(documentId)}/artifacts`, {
      method: 'POST', body: data, signal,
    })
  }

  getArtifact(documentId: string, artifactId: string, signal?: AbortSignal) {
    return this.request<DocumentArtifact>(
      `/documents/${encodeURIComponent(documentId)}/artifacts/${encodeURIComponent(artifactId)}`,
      { signal },
    )
  }
}

export const createRestDocumentAdapter = (options: RestDocumentAdapterOptions) => new RestDocumentAdapter(options)
