import { describe, expect, it } from 'vitest'
import { cloneDocumentState, createEmptyDocumentState, migrateDocumentState } from '../state'

describe('KindyDocumentState migrations', () => {
  it('migrates a v1 ProseMirror document and adds page defaults', () => {
    const state = migrateDocumentState({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Xin chào' }] }] })
    expect(state.schemaVersion).toBe('2.0')
    expect(state.content.content[0].content[0].text).toBe('Xin chào')
    expect(state.page.size).toEqual({ width: 21, height: 29.7 })
    expect(state.assets).toEqual([])
  })

  it('returns independent state objects', () => {
    const first = createEmptyDocumentState()
    const second = createEmptyDocumentState()
    first.page.margin.top = 1
    expect(second.page.margin.top).toBe(2.54)
  })

  it('clones reactive-style proxies into plain JSON data', () => {
    const source = new Proxy({ assets: [], page: { margin: { top: 2.54 } } }, {})
    const cloned = cloneDocumentState(source)

    expect(cloned).toEqual({ assets: [], page: { margin: { top: 2.54 } } })
    expect(cloned).not.toBe(source)
  })
})
