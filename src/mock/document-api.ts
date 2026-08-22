import { DocumentLibraryError } from '../core/errors'
import { createMemoryDocumentAdapter, type MemoryDocumentAdapter } from '../core/adapters/memory'
import type { DocumentQuery, ImportDocumentInput, StoreArtifactInput } from '../core/types'

export interface MockDocumentApiOptions {
  adapter?: MemoryDocumentAdapter
  baseUrl?: string
  latency?: number
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json' },
})

function query(url: URL): DocumentQuery {
  return {
    search: url.searchParams.get('search') || undefined,
    folderId: url.searchParams.has('folderId') ? url.searchParams.get('folderId') : undefined,
    tags: url.searchParams.getAll('tags'),
    page: Number(url.searchParams.get('page')) || undefined,
    pageSize: Number(url.searchParams.get('pageSize')) || undefined,
  }
}

async function formDataValue(data: FormData, name: string) {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

/** Fetch-compatible, framework-neutral mock implementation for demos and contract tests. */
export function createMockDocumentTransport(options: MockDocumentApiOptions = {}) {
  const adapter = options.adapter || createMemoryDocumentAdapter()
  const baseUrl = (options.baseUrl || 'https://kindy.mock').replace(/\/$/, '')

  const transport = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (options.latency) await new Promise((resolve) => setTimeout(resolve, options.latency))
    if (init.signal?.aborted) throw new DOMException('Operation cancelled.', 'AbortError')
    const url = new URL(String(input), baseUrl)
    const method = (init.method || 'GET').toUpperCase()
    const path = url.pathname
    const body = async () => init.body ? JSON.parse(String(init.body)) : undefined
    try {
      if (path === '/documents' && method === 'GET') return json(await adapter.listDocuments(query(url)))
      if (path === '/documents' && method === 'POST') return json(await adapter.createDocument(await body()), 201)
      if (path === '/documents/import' && method === 'POST') {
        const data = init.body as FormData
        const metadata = JSON.parse(await formDataValue(data, 'metadata'))
        const input: ImportDocumentInput = {
          ...metadata,
          file: data.get('file') as Blob,
          state: JSON.parse(await formDataValue(data, 'state')),
          compatibilityReport: data.has('compatibilityReport') ? JSON.parse(await formDataValue(data, 'compatibilityReport')) : undefined,
        }
        return json(await adapter.importDocument(input), 201)
      }
      if (path === '/folders' && method === 'GET') return json(await adapter.listFolders(query(url)))
      if (path === '/templates' && method === 'GET') return json(await adapter.listTemplates(query(url)))

      const artifact = path.match(/^\/documents\/([^/]+)\/artifacts\/([^/]+)$/)
      if (artifact && method === 'GET') return json(await adapter.getArtifact(decodeURIComponent(artifact[1]), decodeURIComponent(artifact[2])))
      const artifacts = path.match(/^\/documents\/([^/]+)\/artifacts$/)
      if (artifacts && method === 'POST') {
        const data = init.body as FormData
        const file = data.get('file') as Blob
        const input: StoreArtifactInput = {
          blob: file, fileName: String(data.get('fileName') || '') || (file as File).name || 'artifact', format: String(data.get('format')) as StoreArtifactInput['format'],
          versionId: String(data.get('versionId') || '') || undefined,
          compatibilityReport: data.has('compatibilityReport') ? JSON.parse(await formDataValue(data, 'compatibilityReport')) : undefined,
        }
        return json(await adapter.storeArtifact(decodeURIComponent(artifacts[1]), input), 201)
      }
      const restore = path.match(/^\/documents\/([^/]+)\/versions\/([^/]+)\/restore$/)
      if (restore && method === 'POST') return json(await adapter.restoreVersion(decodeURIComponent(restore[1]), decodeURIComponent(restore[2])))
      const versions = path.match(/^\/documents\/([^/]+)\/versions$/)
      if (versions && method === 'GET') return json(await adapter.listVersions(decodeURIComponent(versions[1]), query(url)))
      const state = path.match(/^\/documents\/([^/]+)\/state$/)
      if (state && method === 'GET') return json(await adapter.loadState(decodeURIComponent(state[1]), url.searchParams.get('versionId') || undefined))
      if (state && method === 'PUT') return json(await adapter.saveState(decodeURIComponent(state[1]), await body()))
      const document = path.match(/^\/documents\/([^/]+)$/)
      if (document && method === 'GET') return json(await adapter.getDocument(decodeURIComponent(document[1])))
      if (document && method === 'PATCH') return json(await adapter.updateDocument(decodeURIComponent(document[1]), await body()))
      return json({ code: 'DOCUMENT_NOT_FOUND', message: `No mock route for ${method} ${path}.` }, 404)
    } catch (error) {
      if (error instanceof DocumentLibraryError) return json({ code: error.code, message: error.message, details: error.details }, error.status || 500)
      return json({ code: 'ADAPTER_ERROR', message: error instanceof Error ? error.message : String(error) }, 500)
    }
  }

  return { adapter, transport, baseUrl }
}
