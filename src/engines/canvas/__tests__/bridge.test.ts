import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import { canvasDataToProseMirror, proseMirrorToCanvasData } from '../bridge'

const contractFixture: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'HỢP ĐỒNG MUA BÁN', marks: [{ type: 'bold' }] }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'justify', lineHeight: 1.5 },
      content: [
        { type: 'text', text: 'Bên A ', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'đồng ý ký kết.', marks: [{ type: 'textStyle', attrs: { fontFamily: 'Times New Roman', fontSize: '12pt' } }] },
        { type: 'hardBreak' },
        { type: 'text', text: 'Dòng thứ hai.' },
      ],
    },
    {
      type: 'table',
      content: [{
        type: 'tableRow',
        content: [
          { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BÊN A' }] }] },
          { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BÊN B' }] }] },
        ],
      }],
    },
    { type: 'pageBreak' },
    {
      type: 'paragraph',
      content: [{
        type: 'inlineImage',
        attrs: { src: 'data:image/png;base64,AA==', width: 120, height: 40, alt: 'logo' },
      }],
    },
  ],
}

describe('CanvasEngine ProseMirror bridge', () => {
  it('projects contract content to canvas without replacing canonical JSON', () => {
    const canvas = proseMirrorToCanvasData(contractFixture)

    expect(canvas.main.some((element) => element.type === 'title')).toBe(true)
    expect(canvas.main.some((element) => element.type === 'table')).toBe(true)
    expect(canvas.main.some((element) => element.type === 'pageBreak')).toBe(true)
    const title = canvas.main.find((element) => element.type === 'title')
    expect(title?.valueList?.map((element) => element.value).join('')).toBe('HỢP ĐỒNG MUA BÁN')
  })

  it('round-trips Vietnamese text, tables, images and manual page breaks', () => {
    const restored = canvasDataToProseMirror(proseMirrorToCanvasData(contractFixture))
    const serialized = JSON.stringify(restored)

    expect(serialized).toContain('HỢP ĐỒNG MUA BÁN')
    expect(serialized).toContain('đồng ý ký kết')
    expect(restored.content?.some((node) => node.type === 'table')).toBe(true)
    expect(restored.content?.some((node) => node.type === 'pageBreak')).toBe(true)
    expect(serialized).toContain('data:image/png;base64,AA==')
  })
})
