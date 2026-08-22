import { describe, expect, it } from 'vitest'
import { createMockDocumentTransport } from '../../mock/document-api'
import { createRestDocumentAdapter } from '../adapters/rest'
import { createMemoryDocumentAdapter } from '../adapters/memory'
import { createEmptyDocumentState } from '../state'

async function adapterContract(adapter) {
  const document = await adapter.createDocument({ title: 'Hợp đồng mẫu', state: createEmptyDocumentState() })
  const snapshot = await adapter.loadState(document.id)
  const state = createEmptyDocumentState({ content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Điều 1' }] }] } })
  const saved = await adapter.saveState(document.id, { state, baseRevisionId: snapshot.revisionId, reason: 'manual', clientMutationId: 'mutation-1' })
  expect(saved.revisionId).not.toBe(snapshot.revisionId)
  expect((await adapter.loadState(document.id)).state.content.content[0].content[0].text).toBe('Điều 1')
  expect((await adapter.listVersions(document.id)).items.length).toBe(2)
  await expect(adapter.saveState(document.id, { state, baseRevisionId: snapshot.revisionId, reason: 'autosave', clientMutationId: 'stale' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  const restored = await adapter.restoreVersion(document.id, saved.version.id)
  expect(restored.version.reason).toBe('restore')
  const artifact = await adapter.storeArtifact(document.id, { format: 'docx', fileName: 'hop-dong.docx', blob: new Blob(['ooxml'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) })
  expect((await adapter.getArtifact(document.id, artifact.id))).toMatchObject({ documentId: document.id, format: 'docx', fileName: 'hop-dong.docx' })
}

describe('DocumentApiAdapter contract', () => {
  it('passes for MemoryDocumentAdapter', async () => adapterContract(createMemoryDocumentAdapter()))

  it('passes for RestDocumentAdapter through the mock OpenAPI transport', async () => {
    const mock = createMockDocumentTransport()
    await adapterContract(createRestDocumentAdapter({ baseUrl: mock.baseUrl, transport: mock.transport }))
  })

  it('honors cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(createMemoryDocumentAdapter().listDocuments({}, controller.signal)).rejects.toMatchObject({ code: 'OPERATION_CANCELLED' })
  })
})
