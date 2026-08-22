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

  it('keeps changes made while a save is in flight dirty for the next save', async () => {
    const adapter = createMemoryDocumentAdapter()
    const saveState = adapter.saveState.bind(adapter)
    let releaseFirstSave
    let announceFirstSave
    const firstSaveStarted = new Promise((resolve) => { announceFirstSave = resolve })
    const firstSaveGate = new Promise((resolve) => { releaseFirstSave = resolve })
    let saveCount = 0
    adapter.saveState = vi.fn(async (...args) => {
      saveCount += 1
      if (saveCount === 1) {
        announceFirstSave()
        await firstSaveGate
      }
      return saveState(...args)
    })

    const client = new DocumentLibraryClient({ adapter, autosave: { enabled: false } })
    await client.create({ title: 'Concurrent edit' })
    const state = (text) => createEmptyDocumentState({
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
    })
    client.updateState(state('Bản đang lưu'))
    const firstSave = client.save()
    await firstSaveStarted
    client.updateState(state('Bản chỉnh trong lúc lưu'))
    releaseFirstSave()
    await firstSave

    expect(client.hasUnsavedChanges).toBe(true)
    await client.save()
    expect(client.hasUnsavedChanges).toBe(false)
    expect((await adapter.loadState(client.current.document.id)).state.content.content[0].content[0].text).toBe('Bản chỉnh trong lúc lưu')
  })
})
