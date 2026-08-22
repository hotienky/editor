import { describe, expect, it } from 'vitest'

import { createEditorDocumentState } from '../editor-state'

const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

describe('editor canonical state', () => {
  it('preserves assets and section header/footer variants', () => {
    const firstContent = { type: 'doc', content: [paragraph('Trang đầu')] }
    const evenContent = { type: 'doc', content: [paragraph('Trang chẵn')] }
    const header = {
      enable: true,
      text: 'Mặc định',
      variants: {
        first: { text: 'Trang đầu', content: firstContent },
        even: { text: 'Trang chẵn', content: evenContent },
      },
      differentFirstPage: true,
      differentOddEven: true,
    }
    const state = createEditorDocumentState({
      content: { type: 'doc', content: [paragraph('Nội dung')] },
      assets: [{ id: 'logo', kind: 'image', url: 'data:image/png;base64,AA==' }],
      page: {
        size: { width: 21, height: 29.7 },
        orientation: 'portrait',
        margin: { top: 2, right: 2, bottom: 2, left: 2 },
        header,
        sections: [{
          id: 'section-landscape',
          fromBlockId: 'section-break-1',
          pageNumberStart: 3,
          size: { width: 29.7, height: 21 },
          orientation: 'landscape',
          margin: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
          header,
        }],
      },
    })

    expect(state.assets).toEqual([
      { id: 'logo', kind: 'image', url: 'data:image/png;base64,AA==' },
    ])
    expect(state.page.header).toMatchObject({
      enabled: true,
      text: 'Mặc định',
      firstText: 'Trang đầu',
      evenText: 'Trang chẵn',
      differentFirstPage: true,
      differentOddEven: true,
    })
    expect(state.page.header.firstContent).toEqual(firstContent)
    expect(state.page.sections).toHaveLength(1)
    expect(state.page.sections[0]).toMatchObject({
      id: 'section-landscape',
      fromBlockId: 'section-break-1',
      pageNumberStart: 3,
      size: { width: 29.7, height: 21 },
      orientation: 'landscape',
    })
    expect(state.page.sections[0].header.evenContent).toEqual(evenContent)
  })
})
