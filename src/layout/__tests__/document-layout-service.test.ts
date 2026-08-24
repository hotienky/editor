import { describe, expect, it } from 'vitest'

import { paginateFromDOM } from '@/utils/dom-page-calculator'

import { createDomDocumentLayoutService } from '../document-layout-service'
import type { KindyLayoutGeometry, KindyLayoutSection } from '../types'

const cmToPx = (centimeters: number) => centimeters * 10

const geometry: KindyLayoutGeometry = {
  pageWidth: 800,
  pageHeight: 1_100,
  pageWidthCm: 21,
  pageHeightCm: 29.7,
  contentHeight: 900,
  marginTop: 100,
  marginBottom: 100,
  pageGap: 24,
  orientation: 'portrait',
}

const section: KindyLayoutSection = {
  index: 0,
  id: 'section-1',
  pageNumberStart: 1,
  config: {
    header: { enable: true, text: 'Hợp đồng' },
    footer: { enable: true, text: 'Trang' },
  },
}

const createEditor = (heights: number[]) => {
  const editor = document.createElement('div')
  const mutableHeights = [...heights]
  Object.defineProperty(editor, 'clientWidth', { configurable: true, value: 600 })
  const blocks = heights.map((_height, index) => {
    const block = document.createElement('p')
    Object.defineProperty(block, 'offsetHeight', {
      configurable: true,
      get: () => mutableHeights[index],
    })
    editor.append(block)
    return block
  })
  document.body.append(editor)
  return { editor, blocks, heights: mutableHeights }
}

const sectionLayout = {
  initialGeometry: geometry,
  initialSection: section,
  transitions: new Map(),
}

describe('DocumentLayoutService DOM contract', () => {
  it('preserves the existing block pagination projection', () => {
    const { editor } = createEditor([600, 400])
    const service = createDomDocumentLayoutService({ cmToPx })
    const expected = paginateFromDOM(
      editor,
      cmToPx,
      undefined,
      sectionLayout,
    )

    const result = service.layout({
      editorDom: editor,
      sectionLayout,
      documentRevision: 7,
      reason: 'open',
    })

    expect(result.pageAssignments).toEqual(expected)
    expect(result.layoutTree).toMatchObject({
      totalPages: 2,
      version: 1,
      documentRevision: '7',
    })
    expect(result.layoutTree.pages).toHaveLength(2)
    expect(result.visualBreaks).toHaveLength(1)
    expect(result.manualBreaks).toHaveLength(0)
    expect(result.layoutTree.pages[0]).toMatchObject({
      pageNumber: 1,
      sectionId: 'section-1',
      header: { text: 'Hợp đồng' },
      footer: { text: 'Trang' },
    })
  })

  it('owns measurement invalidation and reports cache telemetry', () => {
    const { editor, blocks } = createEditor([300, 300])
    const service = createDomDocumentLayoutService({ cmToPx })

    const first = service.layout({ editorDom: editor, sectionLayout, reason: 'open' })
    expect(first.telemetry).toMatchObject({
      reason: 'open',
      totalBlocks: 2,
      measuredBlocks: 2,
      cacheMisses: 2,
      invalidatedBlocks: 0,
    })

    const cached = service.layout({ editorDom: editor, sectionLayout, reason: 'manual' })
    expect(cached.telemetry).toMatchObject({
      measuredBlocks: 0,
      cacheHits: 2,
      cacheMisses: 0,
    })

    service.invalidate({
      scope: 'block',
      element: blocks[1],
      blockIndex: 1,
      reason: 'transaction',
    })
    const changed = service.layout({
      editorDom: editor,
      sectionLayout,
      documentRevision: 1,
      reason: 'transaction',
    })
    expect(changed.telemetry).toMatchObject({
      documentRevision: '1',
      reason: 'transaction',
      invalidatedBlocks: 1,
      firstInvalidatedBlock: 1,
      measuredBlocks: 1,
      cacheHits: 1,
    })
    expect(service.getTelemetry()).toEqual(changed.telemetry)
  })

  it('keeps manual breaks semantic and projects their page separator', () => {
    const { editor } = createEditor([200, 0, 300])
    editor.children[1].classList.add('kindy-page-break')
    const service = createDomDocumentLayoutService({ cmToPx })
    const result = service.layout({ editorDom: editor, sectionLayout, reason: 'manual' })

    expect(result.layoutTree.totalPages).toBe(2)
    expect(result.manualBreaks).toHaveLength(1)
    expect(result.manualBreaks[0]).toMatchObject({
      blockIndex: 1,
      pageNumber: 2,
      sectionId: 'section-1',
    })
    expect(result.visualBreaks).toHaveLength(0)
  })

  it('queries the canonical registry without creating another page model', () => {
    const { editor } = createEditor([600, 400])
    const service = createDomDocumentLayoutService({ cmToPx })
    const { layoutTree } = service.layout({ editorDom: editor, sectionLayout })

    expect(service.getPage(2, layoutTree)?.blockStart).toBe(1)
    expect(service.getPageAtPosition({ blockIndex: 1 }, layoutTree)?.pageNumber).toBe(2)
    expect(service.getPositionAtPoint(1, { x: 10, y: 10 }, layoutTree)).toBeNull()
    expect(service.getVisiblePages({ scrollTop: 0, height: 900, bufferPages: 0 }, layoutTree))
      .toEqual([layoutTree.pages[0]])
  })

  it('keeps ephemeral block/page identities stable across equivalent layouts', () => {
    const { editor, blocks } = createEditor([1_850])
    const service = createDomDocumentLayoutService({ cmToPx })
    const first = service.layout({ editorDom: editor, sectionLayout })
    const firstPageIds = first.layoutTree.pages.map(({ id }) => id)
    const [blockId] = first.layoutTree.blockIds

    expect(first.layoutTree.pages).toHaveLength(3)
    expect(new Set(firstPageIds).size).toBe(3)
    expect(first.layoutTree.pages.every((page) => page.startBlockId === blockId)).toBe(true)

    service.invalidate({ scope: 'block', element: blocks[0], reason: 'resize' })
    const second = service.layout({ editorDom: editor, sectionLayout, reason: 'resize' })
    expect(second.layoutTree.blockIds).toEqual([blockId])
    expect(second.layoutTree.pages.map(({ id }) => id)).toEqual(firstPageIds)
  })

  it('keeps invalidated-cache output equal to a full recomputation', () => {
    const { editor, blocks, heights } = createEditor([600, 200, 200])
    const service = createDomDocumentLayoutService({ cmToPx })
    service.layout({ editorDom: editor, sectionLayout })

    heights[1] = 400
    service.invalidate({
      scope: 'block',
      element: blocks[1],
      blockIndex: 1,
      reason: 'transaction',
    })
    const incremental = service.layout({
      editorDom: editor,
      sectionLayout,
      documentRevision: 2,
      reason: 'transaction',
    })
    const full = paginateFromDOM(editor, cmToPx, undefined, sectionLayout)

    expect(incremental.pageAssignments).toEqual(full)
    expect(incremental.telemetry).toMatchObject({
      firstInvalidatedBlock: 1,
      measuredBlocks: 1,
      cacheHits: 2,
    })
  })

  it('supports cancellation and idempotent cleanup', () => {
    const { editor } = createEditor([200])
    const service = createDomDocumentLayoutService({ cmToPx })
    const controller = new AbortController()
    controller.abort()

    expect(() => service.layout({ editorDom: editor, signal: controller.signal }))
      .toThrowError(/cancelled/)

    service.destroy()
    service.destroy()
    expect(service.getTelemetry()).toBeNull()
    expect(() => service.layout({ editorDom: editor })).toThrowError(/destroyed/)
  })
})
