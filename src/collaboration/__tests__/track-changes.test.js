import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { describe, expect, it } from 'vitest'
import TrackChanges, { collectTrackChanges } from '../track-changes'

describe('TrackChanges', () => {
  it('records inserted text with author metadata and accepts it', () => {
    const editor = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>Gốc</p>' })
    editor.commands.enableTrackChanges({ name: 'Nguyễn A' })
    editor.commands.focus('end')
    editor.commands.insertContent(' mới')
    const changes = editor.commands.getTrackChanges()
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ type: 'insert', author: 'Nguyễn A', text: ' mới' })
    editor.commands.acceptTrackChange(changes[0].id)
    expect(editor.getText()).toBe('Gốc mới')
    expect(editor.commands.getTrackChanges()).toEqual([])
    editor.destroy()
  })

  it('rejects inserted text', () => {
    const editor = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>A</p>' })
    editor.commands.enableTrackChanges({ name: 'Reviewer' })
    editor.commands.focus('end')
    editor.commands.insertContent('B')
    const [change] = editor.commands.getTrackChanges()
    editor.commands.rejectTrackChange(change.id)
    expect(editor.getText()).toBe('A')
    editor.destroy()
  })

  it('reads suggestions without dispatching a transaction', () => {
    const editor = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>A</p>' })
    let transactions = 0
    editor.on('transaction', () => { transactions += 1 })

    expect(collectTrackChanges(editor.state)).toEqual([])
    expect(transactions).toBe(0)
    editor.destroy()
  })

  it('marks a deletion and supports accept or reject without losing text early', () => {
    const accepted = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>ABC</p>' })
    accepted.commands.enableTrackChanges({ name: 'Reviewer' })
    accepted.commands.setTextSelection({ from: 2, to: 3 })
    accepted.commands.deleteTrackedSelection()
    expect(accepted.getText()).toBe('ABC')
    const [deleted] = accepted.commands.getTrackChanges()
    expect(deleted).toMatchObject({ type: 'delete', author: 'Reviewer', text: 'B' })
    accepted.commands.acceptTrackChange(deleted.id)
    expect(accepted.getText()).toBe('AC')
    accepted.destroy()

    const rejected = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>ABC</p>' })
    rejected.commands.enableTrackChanges({ name: 'Reviewer' })
    rejected.commands.setTextSelection({ from: 2, to: 3 })
    rejected.commands.deleteTrackedSelection()
    rejected.commands.rejectAllTrackChanges()
    expect(rejected.getText()).toBe('ABC')
    expect(rejected.commands.getTrackChanges()).toEqual([])
    rejected.destroy()
  })

  it('keeps tracked insertion consistent through undo and redo', () => {
    const editor = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>A</p>' })
    editor.commands.enableTrackChanges({ name: 'Reviewer' })
    editor.commands.focus('end')
    editor.commands.insertContent('B')
    expect(editor.commands.getTrackChanges()).toHaveLength(1)
    editor.commands.undo()
    expect(editor.getText()).toBe('A')
    expect(editor.commands.getTrackChanges()).toEqual([])
    editor.commands.redo()
    expect(editor.getText()).toBe('AB')
    expect(editor.commands.getTrackChanges()).toHaveLength(1)
    editor.destroy()
  })

  it('tracks and accepts deleted text inside a table cell', () => {
    const editor = new Editor({
      extensions: [StarterKit, TableKit, TrackChanges],
      content: { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{
        type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ABC' }] }],
      }] }] }] },
    })
    editor.commands.enableTrackChanges({ name: 'Reviewer' })
    let textPosition = 0
    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text === 'ABC') textPosition = position
    })
    editor.commands.setTextSelection({ from: textPosition + 1, to: textPosition + 2 })
    editor.commands.deleteTrackedSelection()
    const [change] = editor.commands.getTrackChanges()
    expect(change).toMatchObject({ type: 'delete', text: 'B' })
    editor.commands.acceptTrackChange(change.id)
    expect(editor.getText()).toContain('AC')
    editor.destroy()
  })

  it('captures programmatic deletion as a review change', () => {
    const editor = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>ABC</p>' })
    editor.commands.enableTrackChanges({ name: 'API Reviewer' })
    editor.commands.setTextSelection({ from: 2, to: 3 })
    editor.commands.deleteSelection()

    expect(editor.getText()).toBe('ABC')
    expect(editor.commands.getTrackChanges()).toEqual([
      expect.objectContaining({ type: 'delete', author: 'API Reviewer', text: 'B' }),
    ])
    editor.destroy()
  })

  it('records both sides of a replacement transaction', () => {
    const editor = new Editor({ extensions: [StarterKit, TrackChanges], content: '<p>ABC</p>' })
    editor.commands.enableTrackChanges({ name: 'Reviewer' })
    editor.commands.setTextSelection({ from: 2, to: 3 })
    editor.commands.insertContent('X')

    expect(editor.getText()).toBe('ABXC')
    expect(editor.commands.getTrackChanges()).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'delete', text: 'B' }),
      expect.objectContaining({ type: 'insert', text: 'X' }),
    ]))
    editor.destroy()
  })
})
