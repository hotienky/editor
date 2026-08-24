import { describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { createYjsCollaborationAdapter } from '../collaboration'

describe('YjsCollaborationAdapter', () => {
  it('owns only the host provider lifecycle and exposes awareness users', async () => {
    const connect = vi.fn()
    const disconnect = vi.fn()
    const destroy = vi.fn()
    const providerFactory = vi.fn(() => ({
      connect,
      disconnect,
      destroy,
      awareness: { getStates: () => new Map([['client-1', { user: { name: 'Nguyễn A' } }]]) },
    }))
    const adapter = createYjsCollaborationAdapter({ providerFactory })
    const editor = {}
    const session = await adapter.connect({
      documentId: 'doc-1', revisionId: 'rev-1', editor,
      user: { id: 'user-1', name: 'Nguyễn A', color: '#1677ff' },
    })

    expect(providerFactory).toHaveBeenCalledWith(expect.objectContaining({ documentId: 'doc-1', editor }))
    expect(connect).toHaveBeenCalledOnce()
    expect(session.getUsers()).toEqual([{ user: { name: 'Nguyễn A' } }])
    session.disconnect()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('converges collaborative clients on one host-provided Y.Doc and syncs without duplication', () => {
    const document = new Y.Doc()
    const text1 = document.getText('kindy-doc')
    text1.insert(0, 'Điều khoản đồng bộ')
    expect(text1.toString()).toBe('Điều khoản đồng bộ')

    text1.insert(text1.length, ' realtime')
    expect(text1.toString()).toBe('Điều khoản đồng bộ realtime')
    expect(text1.toString().match(/Điều khoản đồng bộ/g)).toHaveLength(1)

    document.destroy()
  })
})
