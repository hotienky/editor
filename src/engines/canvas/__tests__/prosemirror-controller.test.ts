import { describe, expect, it, vi } from 'vitest'
import { CanvasDocumentController } from '../prosemirror-controller'

describe('CanvasDocumentController', () => {
  it('commits canvas mutations as ProseMirror transactions', () => {
    const controller = new CanvasDocumentController({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản đầu' }] }],
    })
    const listener = vi.fn()
    controller.onTransaction(listener)

    controller.replaceDocument({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bản sửa' }] }],
    })

    expect(controller.getJSON().content?.[0].content?.[0].text).toBe('Bản sửa')
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][1].getMeta('kindy:origin')).toBe('canvas')
  })

  it('blocks canvas input in read-only mode but permits snapshot loading', () => {
    const controller = new CanvasDocumentController({ type: 'doc', content: [{ type: 'paragraph' }] })
    controller.setEditable(false)

    expect(controller.replaceDocument({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Không được ghi' }] }] })).toBe(false)
    expect(controller.replaceDocument({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Phiên bản đã tải' }] }] }, 'load')).toBe(true)
    expect(JSON.stringify(controller.getJSON())).toContain('Phiên bản đã tải')
  })
})

