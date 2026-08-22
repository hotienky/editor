import { Editor } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'

import { DocxParagraphLayout, DocxTab } from '../docx-layout'
import Indent from '../indent'
import LineHeight from '../line-height'
import PageBreak from '../page-break'
import SearchReplace from '../search-replace'
import { Table, TableCell, TableHeader, TableRow } from '../table'
import TextAlign from '../text-align'

const textNodes = (editor) => {
  const output = []
  editor.state.doc.descendants((node) => {
    if (node.isText) output.push(node)
  })
  return output
}

const nodesByType = (editor, type) => {
  const output = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === type) output.push({ node, pos })
  })
  return output
}

describe('Contract editing transactions', () => {
  it('replaces Vietnamese text, applies character formatting and supports undo/redo', () => {
    const editor = new Editor({
      extensions: [StarterKit, TextStyleKit],
      content: '<p>Hợp đồng nguyên tắc</p>',
    })

    editor.chain()
      .setTextSelection({ from: 1, to: 9 })
      .insertContent('Văn bản')
      .setTextSelection({ from: 1, to: 8 })
      .toggleBold()
      .toggleItalic()
      .toggleUnderline()
      .setFontFamily('Times New Roman')
      .setFontSize('13pt')
      .setColor('#C00000')
      .run()

    expect(editor.getText()).toContain('Văn bản nguyên tắc')
    expect(textNodes(editor)[0].marks.map((mark) => mark.type.name)).toEqual(expect.arrayContaining([
      'bold', 'italic', 'underline', 'textStyle',
    ]))
    expect(textNodes(editor)[0].marks.find((mark) => mark.type.name === 'textStyle')?.attrs).toMatchObject({
      fontFamily: 'Times New Roman',
      fontSize: '13pt',
      color: '#C00000',
    })

    editor.commands.undo()
    expect(editor.getText()).toContain('Hợp đồng nguyên tắc')
    editor.commands.redo()
    expect(editor.getText()).toContain('Văn bản nguyên tắc')
    editor.destroy()
  })

  it('edits alignment, line spacing and imported DOCX indentation in canonical layout state', () => {
    const editor = new Editor({
      extensions: [StarterKit, DocxParagraphLayout, Indent, TextAlign, LineHeight],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: {
            docxLayout: { left: 1.2, tabStops: [{ position: 3.17, alignment: 'center' }] },
            indent: 1.2,
            indentUnit: 'cm',
          },
          content: [{ type: 'text', text: 'ĐẠI DIỆN BÊN A' }],
        }],
      },
    })

    editor.chain().setTextSelection(2).setTextAlign('right').setLineHeight(1.5).setIndent().run()
    let [paragraph] = editor.getJSON().content
    expect(paragraph.attrs).toMatchObject({ textAlign: 'right', lineHeight: 1.5, indentUnit: 'cm' })
    expect(paragraph.attrs.docxLayout).toMatchObject({
      left: 2.47,
      tabStops: [{ position: 3.17, alignment: 'center' }],
    })

    editor.commands.setOutdent()
    ;[paragraph] = editor.getJSON().content
    expect(paragraph.attrs.docxLayout.left).toBeCloseTo(1.2, 4)
    expect(paragraph.attrs.indent).toBeCloseTo(1.2, 4)
    editor.destroy()
  })

  it('edits lists, tables, images, DOCX tabs and manual page breaks without replacing the document', () => {
    const editor = new Editor({
      extensions: [StarterKit, Table, TableRow, TableCell, TableHeader, Image, PageBreak, DocxParagraphLayout, DocxTab],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { docxLayout: { tabStops: [{ position: 3.17, alignment: 'center' }] } },
          content: [
            { type: 'docxTab', attrs: { position: 3.17, alignment: 'center', index: 0 } },
            { type: 'text', text: 'Bên A' },
          ],
        }],
      },
    })

    editor.commands.deleteRange({ from: 1, to: 2 })
    expect(nodesByType(editor, 'docxTab')).toHaveLength(0)

    editor.commands.setTextSelection({ from: 1, to: 6 })
    expect(editor.commands.toggleOrderedList()).toBe(true)
    expect(nodesByType(editor, 'orderedList')).toHaveLength(1)
    editor.commands.setTextSelection('end')
    expect(editor.commands.keyboardShortcut('Mod-Enter')).toBe(true)
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(1)
    editor.commands.undo()
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(0)

    editor.commands.selectAll()
    editor.commands.setContent('<p>Bảng hợp đồng</p>')
    editor.commands.setTextSelection('end')
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })).toBe(true)
    expect(nodesByType(editor, 'tableRow')).toHaveLength(2)
    expect(editor.commands.addRowAfter()).toBe(true)
    expect(nodesByType(editor, 'tableRow')).toHaveLength(3)
    expect(editor.commands.addColumnAfter()).toBe(true)
    expect(nodesByType(editor, 'tableCell')).toHaveLength(9)

    editor.commands.setTextSelection('end')
    expect(editor.commands.setImage({ src: 'data:image/png;base64,AA==', alt: 'Logo' })).toBe(true)
    expect(nodesByType(editor, 'image')).toHaveLength(1)
    editor.commands.updateAttributes('image', { width: 120, height: 40 })
    expect(nodesByType(editor, 'image')[0].node.attrs).toMatchObject({ width: 120, height: 40 })

    editor.commands.setTextSelection('end')
    expect(editor.commands.keyboardShortcut('Mod-Enter')).toBe(true)
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(1)
    editor.commands.undo()
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(0)
    editor.commands.redo()
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(1)
    editor.destroy()
  })

  it('finds and replaces Vietnamese text immediately and keeps the replacement undoable', () => {
    const editor = new Editor({
      extensions: [StarterKit, SearchReplace],
      content: '<p>Bên A thanh toán cho Bên A trong 30 ngày.</p>',
    })

    expect(editor.commands.setSearchTerm('Bên A')).toBe(true)
    expect(editor.storage.searchAndReplace.results).toHaveLength(2)
    expect(editor.commands.setReplaceTerm('Bên mua')).toBe(true)
    expect(editor.commands.replaceAll()).toBe(true)
    expect(editor.getText()).toBe('Bên mua thanh toán cho Bên mua trong 30 ngày.')
    editor.commands.undo()
    expect(editor.getText()).toBe('Bên A thanh toán cho Bên A trong 30 ngày.')

    editor.commands.setCaseSensitive(true)
    editor.commands.setSearchTerm('bên a')
    expect(editor.storage.searchAndReplace.results).toHaveLength(0)
    editor.destroy()
  })
})
