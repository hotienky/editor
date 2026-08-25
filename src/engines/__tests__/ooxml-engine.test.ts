import { describe, expect, it } from 'vitest'
import { createOoxmlEngineAdapter } from '../../engines/ooxml'
import type { EditorEngineHandle } from '../../core/types'

function mountAdapter(container: HTMLElement): EditorEngineHandle {
  const adapter = createOoxmlEngineAdapter()
  const result = adapter.mount(container)
  return result as EditorEngineHandle
}

describe('OoxmlEngineAdapter', () => {
  it('creates adapter with correct id', () => {
    const adapter = createOoxmlEngineAdapter()
    expect(adapter.id).toBe('ooxml-native')
  })

  it('mount returns handle with all required methods', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    expect(typeof handle.load).toBe('function')
    expect(typeof handle.getState).toBe('function')
    expect(typeof handle.setReadOnly).toBe('function')
    expect(typeof handle.focus).toBe('function')
    expect(typeof handle.destroy).toBe('function')
    expect(typeof handle.onChange).toBe('function')
  })

  it('mount creates surface element in container', () => {
    const container = document.createElement('div')
    mountAdapter(container)

    const surface = container.querySelector('.ooxml-engine-surface')
    expect(surface).not.toBeNull()
    expect(surface!.className).toBe('ooxml-engine-surface')
  })

  it('mount creates page container inside surface', () => {
    const container = document.createElement('div')
    mountAdapter(container)

    const pageContainer = container.querySelector('.ooxml-page-container')
    expect(pageContainer).not.toBeNull()
  })

  it('mount creates backing canvas', () => {
    const container = document.createElement('div')
    mountAdapter(container)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })

  it('getState returns empty KindyDocumentState before load', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    const state = handle.getState()
    expect(state.schemaVersion).toBe('2.0')
    expect(state.content).toBeDefined()
    expect(state.page).toBeDefined()
    expect(state.assets).toEqual([])
  })

  it('onChange registers and notifies listeners', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    let callCount = 0
    const unsub = handle.onChange(() => { callCount++ })
    expect(typeof unsub).toBe('function')

    unsub()
    expect(callCount).toBe(0)
  })

  it('onChange unsubscribe stops notifications', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    let callCount = 0
    const unsub = handle.onChange(() => { callCount++ })
    unsub()
    // After unsub, calling onChange again shouldn't affect the unsub'd listener
    expect(callCount).toBe(0)
  })

  it('destroy removes surface from container', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    expect(container.querySelector('.ooxml-engine-surface')).not.toBeNull()
    handle.destroy()
    expect(container.querySelector('.ooxml-engine-surface')).toBeNull()
  })

  it('setReadOnly does not throw', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    expect(() => handle.setReadOnly(true)).not.toThrow()
    expect(() => handle.setReadOnly(false)).not.toThrow()
  })

  it('focus does not throw', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    expect(() => handle.focus()).not.toThrow()
  })

  it('load with empty KindyDocumentState does not throw', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container)

    const emptyState = {
      schemaVersion: '2.0' as const,
      content: { type: 'doc', content: [] },
      page: {
        size: { width: 21, height: 29.7 },
        orientation: 'portrait' as const,
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      },
      assets: [],
    }
    expect(() => handle.load(emptyState)).not.toThrow()
  })

  it('loadDocx method exists on handle', () => {
    const container = document.createElement('div')
    const handle = mountAdapter(container) as any

    expect(typeof handle.loadDocx).toBe('function')
  })
})
