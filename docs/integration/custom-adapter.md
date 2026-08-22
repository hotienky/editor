# Tự viết Custom Adapter

Nếu hệ thống của bạn sử dụng **GraphQL**, **gRPC-Web**, **Supabase**, **Firebase**, hoặc lưu trữ cục bộ (**IndexedDB/LocalStorage**), bạn có thể dễ dàng viết một Custom Adapter thực thi interface `DocumentApiAdapter`.

---

## Interface `DocumentApiAdapter`

```typescript
export interface DocumentApiAdapter {
  listDocuments(query?: DocumentQuery, signal?: AbortSignal): Promise<Page<DocumentSummary>>
  getDocument(documentId: string, signal?: AbortSignal): Promise<DocumentRecord>
  createDocument(input: CreateDocumentInput, signal?: AbortSignal): Promise<DocumentRecord>
  importDocument(input: ImportDocumentInput, signal?: AbortSignal): Promise<DocumentRecord>
  updateDocument(documentId: string, patch: Partial<DocumentRecord>, signal?: AbortSignal): Promise<DocumentRecord>
  deleteDocument?(documentId: string, signal?: AbortSignal): Promise<void>
  loadState(documentId: string, versionId?: string, signal?: AbortSignal): Promise<DocumentSnapshot>
  saveState(documentId: string, input: SaveStateInput, signal?: AbortSignal): Promise<SaveResult>
  listVersions(documentId: string, query?: PageQuery, signal?: AbortSignal): Promise<Page<DocumentVersion>>
  restoreVersion(documentId: string, versionId: string, signal?: AbortSignal): Promise<DocumentSnapshot>
  storeArtifact(documentId: string, input: StoreArtifactInput, signal?: AbortSignal): Promise<DocumentArtifact>
  listFolders?(signal?: AbortSignal): Promise<Folder[]>
  listTemplates?(signal?: AbortSignal): Promise<DocumentSummary[]>
}
```

---

## Ví dụ: Custom Adapter dùng Supabase hoặc Firebase

```typescript
import type { DocumentApiAdapter, SaveStateInput, DocumentSnapshot } from 'kindy-editor'
import { supabase } from './supabaseClient'

export class SupabaseDocumentAdapter implements DocumentApiAdapter {
  async listDocuments() {
    const { data } = await supabase.from('documents').select('*')
    return { items: data || [], total: data?.length || 0, page: 1, pageSize: 50, hasMore: false }
  }

  async loadState(documentId: string): Promise<DocumentSnapshot> {
    const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).single()
    const { data: rev } = await supabase.from('document_revisions').select('*').eq('id', doc.current_revision_id).single()

    return {
      document: doc,
      state: rev.state_json,
      revisionId: rev.id,
    }
  }

  async saveState(documentId: string, input: SaveStateInput) {
    // 1. Kiểm tra Optimistic Concurrency
    const { data: currentDoc } = await supabase.from('documents').select('current_revision_id').eq('id', documentId).single()
    if (currentDoc.current_revision_id !== input.baseRevisionId) {
      const err: any = new Error('Conflict')
      err.code = 'VERSION_CONFLICT'
      throw err
    }

    // 2. Tạo revision mới
    const newRevId = `rev-${Date.now()}`
    await supabase.from('document_revisions').insert({
      id: newRevId,
      document_id: documentId,
      state_json: input.state,
      reason: input.reason,
    })

    // 3. Cập nhật current_revision_id
    await supabase.from('documents').update({ current_revision_id: newRevId }).eq('id', documentId)

    return { revisionId: newRevId }
  }

  // Triển khai các phương thức còn lại...
}
```
