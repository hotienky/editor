import { describe, expect, it } from 'vitest'
import { buildOoxmlCharIndex, resolveCharIndex, getDocumentCharCount } from '../ooxml-char-index'
import { applyTransaction, undoTransaction } from '../ooxml-transaction'
import { OoxmlEditor } from '../ooxml-editor'
import type { OoxmlPackage, Paragraph, Run, Text } from '../ooxml-types'

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makePkg(...texts: string[]): OoxmlPackage {
  const children: Paragraph[] = texts.map((t) => ({
    type: 'paragraph',
    content: [{
      type: 'run',
      content: [{ type: 'text', text: t }],
    }],
  }))

  return {
    document: {
      body: { children, sectPr: undefined },
    },
    styles: {
      docDefaults: { rPrDefault: {}, pPrDefault: {} },
      styles: new Map(),
    },
    numbering: { abstractNums: new Map(), nums: new Map() },
    settings: {},
    fontTable: { fonts: new Map() },
    theme: null,
    headers: new Map(),
    footers: new Map(),
    comments: null,
    footnotes: null,
    endnotes: null,
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}

function makeMultiRunPkg(): OoxmlPackage {
  return {
    document: {
      body: {
        children: [
          {
            type: 'paragraph',
            content: [
              { type: 'run', rPr: { b: true }, content: [{ type: 'text', text: 'Hello' }] },
              { type: 'run', rPr: { i: true }, content: [{ type: 'text', text: ' World' }] },
            ],
          },
        ],
        sectPr: undefined,
      },
    },
    styles: {
      docDefaults: { rPrDefault: {}, pPrDefault: {} },
      styles: new Map(),
    },
    numbering: { abstractNums: new Map(), nums: new Map() },
    settings: {},
    fontTable: { fonts: new Map() },
    theme: null,
    headers: new Map(),
    footers: new Map(),
    comments: null,
    footnotes: null,
    endnotes: null,
    contentTypes: { defaults: new Map(), overrides: new Map() },
    relationships: [],
    media: new Map(),
  }
}

// ─── Tests: OoxmlCharIndex ────────────────────────────────────────────────────

describe('buildOoxmlCharIndex', () => {
  it('builds index for single paragraph', () => {
    const pkg = makePkg('Hi')
    const index = buildOoxmlCharIndex(pkg)
    expect(index.length).toBe(2)
    expect(index[0].char).toBe('H')
    expect(index[1].char).toBe('i')
  })

  it('maps charIndex to correct blockIndex', () => {
    const pkg = makePkg('AB', 'CD')
    const index = buildOoxmlCharIndex(pkg)
    expect(index[0].blockIndex).toBe(0)
    expect(index[1].blockIndex).toBe(0)
    expect(index[2].blockIndex).toBe(1)
    expect(index[3].blockIndex).toBe(1)
  })

  it('maps charIndex to correct runIndex', () => {
    const pkg = makeMultiRunPkg()
    const index = buildOoxmlCharIndex(pkg)
    // "Hello" (run 0) + " World" (run 1)
    expect(index[0].runIndex).toBe(0) // H
    expect(index[4].runIndex).toBe(0) // o
    expect(index[5].runIndex).toBe(1) // (space)
    expect(index[6].runIndex).toBe(1) // W
  })

  it('maps charOffset correctly', () => {
    const pkg = makePkg('AB')
    const index = buildOoxmlCharIndex(pkg)
    expect(index[0].charOffset).toBe(0)
    expect(index[1].charOffset).toBe(1)
  })

  it('handles empty document', () => {
    const pkg = makePkg()
    const index = buildOoxmlCharIndex(pkg)
    expect(index).toHaveLength(0)
  })

  it('handles multiple paragraphs', () => {
    const pkg = makePkg('A', 'B', 'C')
    const index = buildOoxmlCharIndex(pkg)
    expect(index.length).toBe(3)
    expect(index[0].blockIndex).toBe(0)
    expect(index[1].blockIndex).toBe(1)
    expect(index[2].blockIndex).toBe(2)
  })
})

describe('resolveCharIndex', () => {
  it('resolves valid charIndex', () => {
    const pkg = makePkg('Hello')
    const pos = resolveCharIndex(pkg, 2)
    expect(pos).not.toBeNull()
    expect(pos!.char).toBe('l')
    expect(pos!.charOffset).toBe(2)
  })

  it('returns null for out-of-range', () => {
    const pkg = makePkg('Hi')
    expect(resolveCharIndex(pkg, -1)).toBeNull()
    expect(resolveCharIndex(pkg, 10)).toBeNull()
  })
})

describe('getDocumentCharCount', () => {
  it('counts characters in single paragraph', () => {
    const pkg = makePkg('Hello')
    expect(getDocumentCharCount(pkg)).toBe(5)
  })

  it('counts across paragraphs', () => {
    const pkg = makePkg('AB', 'CD')
    expect(getDocumentCharCount(pkg)).toBe(4)
  })

  it('counts across runs', () => {
    const pkg = makeMultiRunPkg()
    expect(getDocumentCharCount(pkg)).toBe(11) // "Hello" + " World"
  })
})

// ─── Tests: OoxmlTransaction ──────────────────────────────────────────────────

describe('applyTransaction', () => {
  it('insertText at beginning', () => {
    const pkg = makePkg('Hello')
    const result = applyTransaction(pkg, [
      { type: 'insertText', charIndex: 0, text: 'X' },
    ])
    const text = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = text.content[0] as Text
    expect(textNode.text).toBe('XHello')
    expect(result.inverses).toHaveLength(1)
    expect(result.inverses[0].type).toBe('deleteText')
  })

  it('insertText at end', () => {
    const pkg = makePkg('Hello')
    applyTransaction(pkg, [
      { type: 'insertText', charIndex: 5, text: '!' },
    ])
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = run.content[0] as Text
    expect(textNode.text).toBe('Hello!')
  })

  it('insertText in middle', () => {
    const pkg = makePkg('Hello')
    applyTransaction(pkg, [
      { type: 'insertText', charIndex: 3, text: 'X' },
    ])
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = run.content[0] as Text
    expect(textNode.text).toBe('HelXlo')
  })

  it('deleteText within single run', () => {
    const pkg = makePkg('Hello')
    applyTransaction(pkg, [
      { type: 'deleteText', startIndex: 1, endIndex: 3 },
    ])
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = run.content[0] as Text
    expect(textNode.text).toBe('Hlo')
  })

  it('formatText bolds a run', () => {
    const pkg = makePkg('Hello')
    applyTransaction(pkg, [
      { type: 'formatText', startIndex: 0, endIndex: 5, property: 'b', value: true },
    ])
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    expect(run.rPr?.b).toBe(true)
  })

  it('inverse operations restore original state', () => {
    const pkg = makePkg('Hello')
    const result = applyTransaction(pkg, [
      { type: 'insertText', charIndex: 2, text: 'XY' },
    ])
    // Now undo by applying inverse
    applyTransaction(pkg, result.inverses)
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = run.content[0] as Text
    expect(textNode.text).toBe('Hello')
  })
})

describe('undoTransaction', () => {
  it('undoes an insert', () => {
    const pkg = makePkg('Hello')
    const tx = applyTransaction(pkg, [
      { type: 'insertText', charIndex: 5, text: '!' },
    ])
    undoTransaction(pkg, tx)
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = run.content[0] as Text
    expect(textNode.text).toBe('Hello')
  })

  it('undoes a delete', () => {
    const pkg = makePkg('Hello')
    const tx = applyTransaction(pkg, [
      { type: 'deleteText', startIndex: 1, endIndex: 3 },
    ])
    undoTransaction(pkg, tx)
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const textNode = run.content[0] as Text
    expect(textNode.text).toBe('Hello')
  })

  it('undoes a format', () => {
    const pkg = makePkg('Hello')
    const tx = applyTransaction(pkg, [
      { type: 'formatText', startIndex: 0, endIndex: 5, property: 'b', value: true },
    ])
    undoTransaction(pkg, tx)
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    expect(run.rPr?.b).toBeUndefined()
  })
})

// ─── Tests: OoxmlEditor ───────────────────────────────────────────────────────

describe('OoxmlEditor', () => {
  it('creates editor with layout tree', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    expect(editor.tree).toBeDefined()
    expect(editor.tree.pages.length).toBeGreaterThan(0)
  })

  it('charCount reflects document content', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    expect(editor.charCount).toBe(5)
  })

  it('handleEdit insertText modifies content', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 2 })
    expect(editor.charCount).toBe(6)
  })

  it('handleEdit deleteText modifies content', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({ type: 'deleteText', startIndex: 1, endIndex: 3 })
    expect(editor.charCount).toBe(3)
  })

  it('canUndo / canRedo track state', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    expect(editor.canUndo).toBe(false)
    expect(editor.canRedo).toBe(false)

    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 0 })
    expect(editor.canUndo).toBe(true)
    expect(editor.canRedo).toBe(false)
  })

  it('undo restores previous state', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 0 })
    expect(editor.charCount).toBe(6)

    editor.undo()
    expect(editor.charCount).toBe(5)
  })

  it('redo re-applies undone change', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 0 })
    editor.undo()
    expect(editor.charCount).toBe(5)

    editor.redo()
    expect(editor.charCount).toBe(6)
  })

  it('new edit clears redo stack', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 0 })
    editor.undo()
    expect(editor.canRedo).toBe(true)

    editor.handleEdit({ type: 'insertText', text: 'Y', charIndex: 0 })
    expect(editor.canRedo).toBe(false)
  })

  it('onChange notifies listeners', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    let notified = false
    editor.onChange(() => { notified = true })
    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 0 })
    expect(notified).toBe(true)
  })

  it('onChange unsubscribe works', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    let count = 0
    const unsub = editor.onChange(() => { count++ })
    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 0 })
    unsub()
    editor.handleEdit({ type: 'insertText', text: 'Y', charIndex: 0 })
    expect(count).toBe(1)
  })

  it('formatText applies formatting', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({
      type: 'formatText',
      startIndex: 0,
      endIndex: 5,
      property: 'b',
      value: true,
    })
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    expect(run.rPr?.b).toBe(true)
  })

  it('undo restores formatting', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)
    editor.handleEdit({
      type: 'formatText',
      startIndex: 0,
      endIndex: 5,
      property: 'b',
      value: true,
    })
    editor.undo()
    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    expect(run.rPr?.b).toBeUndefined()
  })

  it('multiple operations round-trip correctly', () => {
    const pkg = makePkg('Hello')
    const editor = new OoxmlEditor(pkg)

    editor.handleEdit({ type: 'insertText', text: 'X', charIndex: 5 }) // HelloX
    editor.handleEdit({ type: 'deleteText', startIndex: 0, endIndex: 1 }) // elloX
    editor.handleEdit({ type: 'insertText', text: 'H', charIndex: 0 }) // HelloX

    const run = (pkg.document.body.children[0] as Paragraph).content[0] as Run
    const text = (run.content[0] as Text).text
    expect(text).toBe('HelloX')
  })
})
