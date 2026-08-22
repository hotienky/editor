import { describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import Collaboration from '@tiptap/extension-collaboration'
import StarterKit from '@tiptap/starter-kit'
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

  it('converges two Tiptap editors on one host-provided Y.Doc and reconnects without duplication', () => {
    const document = new Y.Doc()
    const extensions = () => [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document }),
    ]
    const first = new Editor({ extensions: extensions() })
    let second = new Editor({ extensions: extensions() })

    first.commands.insertContent('Điều khoản đồng bộ')
    expect(second.getText()).toBe('Điều khoản đồng bộ')
    second.destroy()

    second = new Editor({ extensions: extensions() })
    expect(second.getText()).toBe('Điều khoản đồng bộ')
    second.commands.focus('end')
    second.commands.insertContent(' realtime')
    expect(first.getText()).toBe('Điều khoản đồng bộ realtime')
    expect(first.getText().match(/Điều khoản đồng bộ/g)).toHaveLength(1)

    first.destroy()
    second.destroy()
    document.destroy()
  })
})
