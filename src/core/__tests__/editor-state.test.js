import { describe, expect, it } from 'vitest'

import { createEditorDocumentState, mergeEditorDocumentState } from '../editor-state'
import { createEmptyDocumentState } from '../state'

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

  it('persists edited page zones without dropping host-managed state', () => {
    const base = createEmptyDocumentState({
      assets: [{ id: 'logo', kind: 'image', url: '/assets/logo.png' }],
      page: {
        ...createEmptyDocumentState().page,
        headerDistance: 0.9,
        footerDistance: 1.1,
        sections: [{
          id: 'section-1',
          size: { width: 21, height: 29.7 },
          orientation: 'portrait',
          margin: { top: 2, right: 2, bottom: 2, left: 2 },
        }],
      },
    })
    const live = createEmptyDocumentState({
      content: { type: 'doc', content: [paragraph('Body mới')] },
      page: {
        ...base.page,
        header: { enabled: true, content: { type: 'doc', content: [paragraph('Header mới')] } },
        footer: { enabled: true, content: { type: 'doc', content: [paragraph('Footer mới')] } },
      },
    })

    const merged = mergeEditorDocumentState(base, { content: live.content, page: live.page })

    expect(merged.content.content[0].content[0].text).toBe('Body mới')
    expect(merged.page.header.content.content[0].content[0].text).toBe('Header mới')
    expect(merged.page.footer.content.content[0].content[0].text).toBe('Footer mới')
    expect(merged.page.headerDistance).toBe(0.9)
    expect(merged.page.sections).toEqual(base.page.sections)
    expect(merged.assets).toEqual(base.assets)
  })
})
