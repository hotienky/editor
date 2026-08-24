import { describe, expect, it } from 'vitest'
import type { JSONContent } from '../../../core/types'
import { canvasDataToProseMirror, canvasElementsToProseMirror, proseMirrorToCanvasData } from '../bridge'

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
      attrs: {
        textAlign: 'justify',
        lineHeight: 1.5,
        indent: 1.27,
        margin: { top: '12', bottom: '6' },
        docxLayout: {
          leftTwip: 720,
          firstLineTwip: 360,
          keepNext: true,
          tabStops: [{ alignment: 'center', position: 6.35, positionTwip: 3600, leader: 'dot' }],
        },
      },
      content: [
        {
          type: 'text',
          text: 'Bên A ',
          marks: [
            { type: 'bold' },
            {
              type: 'comment',
              attrs: {
                id: 'comment-7',
                user: 'Lê Pháp chế',
                color: 'rgba(255, 213, 79, 0.4)',
                thread: JSON.stringify({ id: 'comment-7', user: 'Lê Pháp chế', text: 'Kiểm tra điều khoản', replies: [], resolved: false, createdAt: 1_700_000_000_000 }),
              },
            },
            { type: 'trackChange', attrs: { id: 'change-9', type: 'insert', author: 'Nguyễn A', timestamp: 1_700_000_100_000 } },
          ],
        },
        { type: 'text', text: 'đồng ý ký kết.', marks: [{ type: 'textStyle', attrs: { fontFamily: 'Times New Roman', fontSize: '12pt' } }] },
        { type: 'hardBreak' },
        { type: 'docxTab', attrs: { alignment: 'center', position: 6.35, positionTwip: 3600, leader: 'dot', index: 0 } },
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
        attrs: {
          id: 'logo-1',
          name: 'logo.png',
          size: 1234,
          src: 'data:image/png;base64,AA==',
          width: 120,
          height: 40,
          alt: 'logo',
          inline: true,
          uploaded: true,
        },
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

  it('does not drop DOCX paragraph, review, tab or image metadata after a Canvas edit cycle', () => {
    const restored = canvasDataToProseMirror(proseMirrorToCanvasData(contractFixture))
    const paragraph = restored.content?.[1]
    const reviewedText = paragraph?.content?.[0]
    const tab = paragraph?.content?.find((node) => node.type === 'docxTab')
    const hardBreak = paragraph?.content?.find((node) => node.type === 'hardBreak')
    const image = restored.content?.at(-1)?.content?.[0]

    expect(paragraph?.attrs).toEqual(contractFixture.content?.[1].attrs)
    expect(reviewedText?.marks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'comment', attrs: expect.objectContaining({ id: 'comment-7', user: 'Lê Pháp chế' }) }),
      expect.objectContaining({ type: 'trackChange', attrs: expect.objectContaining({ id: 'change-9', author: 'Nguyễn A' }) }),
    ]))
    expect(JSON.parse(String(reviewedText?.marks?.find((mark) => mark.type === 'comment')?.attrs?.thread))).toMatchObject({
      text: 'Kiểm tra điều khoản',
      createdAt: 1_700_000_000_000,
    })
    expect(hardBreak).toMatchObject({ type: 'hardBreak' })
    expect(tab?.attrs).toMatchObject({ positionTwip: 3600, alignment: 'center', leader: 'dot' })
    expect(image?.attrs).toMatchObject({ id: 'logo-1', name: 'logo.png', size: 1234, uploaded: true })
  })

  it('keeps paragraph boundaries when Canvas compacts adjacent text elements', () => {
    const projected = proseMirrorToCanvasData({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'Đoạn thứ nhất.' }] },
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'Đoạn thứ hai.' }] },
      ],
    })
    const boundary = projected.main.find((element) => element.value === '\n')
    expect(boundary?.extension).toMatchObject({ kindyBlockBoundary: true })

    const restored = canvasElementsToProseMirror([{ value: 'Đoạn thứ nhất.\nĐoạn thứ hai.' }])
    expect(restored.content).toHaveLength(2)
    expect(restored.content?.map((node) => node.content?.[0]?.text)).toEqual([
      'Đoạn thứ nhất.',
      'Đoạn thứ hai.',
    ])
  })

  it('maps Word justify and distributed alignment to different Canvas modes', () => {
    const projected = proseMirrorToCanvasData({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'Căn đều theo từ.' }] },
        { type: 'paragraph', attrs: { textAlign: 'distribute' }, content: [{ type: 'text', text: 'Căn phân tán.' }] },
      ],
    })
    expect(projected.main.find((element) => element.value === 'C')?.rowFlex).toBe('justify')
    const distributed = projected.main.find((element, index) => (
      element.value === 'C' && index > 0 && element.rowFlex === 'alignment'
    ))
    expect(distributed?.rowFlex).toBe('alignment')
  })
})
