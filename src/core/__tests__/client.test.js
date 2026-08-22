import { describe, expect, it, vi } from 'vitest'
import { DocumentLibraryClient } from '../client'
import { createMemoryDocumentAdapter } from '../adapters/memory'
import { createEmptyDocumentState } from '../state'

describe('DocumentLibraryClient', () => {
  it('autosaves through saveState', async () => {
    vi.useFakeTimers()
    const adapter = createMemoryDocumentAdapter()
    const client = new DocumentLibraryClient({ adapter, autosave: { enabled: true, delay: 250 } })
    await client.create({ title: 'Autosave' })
    client.updateState(createEmptyDocumentState({ content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'changed' }] }] } }))
    await vi.advanceTimersByTimeAsync(300)
    expect(client.hasUnsavedChanges).toBe(false)
    expect((await adapter.loadState(client.current.document.id)).state.content.content[0].content[0].text).toBe('changed')
    vi.useRealTimers()
  })

  it('pauses saves on VERSION_CONFLICT', async () => {
    const adapter = createMemoryDocumentAdapter()
    const first = new DocumentLibraryClient({ adapter, autosave: { enabled: false } })
    const second = new DocumentLibraryClient({ adapter, autosave: { enabled: false } })
    const created = await first.create({ title: 'Conflict' })
    await second.open(created.document.id)
    first.updateState(createEmptyDocumentState())
    await first.save()
    second.updateState(createEmptyDocumentState())
    await expect(second.save()).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    expect(second.hasConflict).toBe(true)
    await expect(second.save()).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  })
})

