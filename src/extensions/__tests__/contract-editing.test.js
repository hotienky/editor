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
import { getDocxLayoutCentimeters } from '@/utils/ooxml-units'

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
  it('keeps Shift+Enter as a soft line break inside the current paragraph', () => {
    const editor = new Editor({
      extensions: [StarterKit, PageBreak, TextAlign],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { textAlign: 'right' },
          content: [{ type: 'text', text: 'Trước Sau', marks: [{ type: 'bold' }] }],
        }],
      },
    })

    editor.commands.setTextSelection(6)
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    editor.view.dom.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(editor.getJSON().content).toMatchObject([{
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [
        { text: 'Trước' },
        { type: 'hardBreak' },
        { text: ' Sau' },
      ],
    }])
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph')
    expect(editor.state.selection.$from.parent.textContent).toBe('Trước Sau')
    expect(editor.state.storedMarks?.map((mark) => mark.type.name)).toContain('bold')

    editor.commands.undo()
    expect(editor.getText()).toBe('Trước Sau')
    editor.commands.redo()
    expect(nodesByType(editor, 'hardBreak')).toHaveLength(1)
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(0)
    editor.destroy()
  })

  it('splits a list at the page boundary without nesting the break or restarting numbering', () => {
    const editor = new Editor({
      extensions: [StarterKit, PageBreak],
      content: {
        type: 'doc',
        content: [{
          type: 'orderedList',
          attrs: { start: 4 },
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục bốn' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mục năm' }] }] },
          ],
        }],
      },
    })

    const [firstParagraph] = nodesByType(editor, 'paragraph')
    editor.commands.setTextSelection(firstParagraph.pos + firstParagraph.node.nodeSize - 1)
    expect(editor.commands.setPageBreak()).toBe(true)

    const [leftList, pageBreak, rightList] = editor.getJSON().content
    expect(leftList.type).toBe('orderedList')
    expect(leftList.content).toHaveLength(1)
    expect(pageBreak.type).toBe('pageBreak')
    expect(rightList).toMatchObject({
      type: 'orderedList',
      attrs: { start: 5 },
      content: [{ type: 'listItem', content: [{ content: [{ text: 'Mục năm' }] }] }],
    })
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(1)
    expect(editor.state.selection.$from.parent.textContent).toBe('Mục năm')
    editor.destroy()
  })

  it('keeps Ctrl/Cmd+Enter as the standard page-break shortcut', () => {
    const editor = new Editor({
      extensions: [StarterKit, PageBreak],
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trang một' }] }] },
    })
    editor.commands.setTextSelection('end')
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    editor.view.dom.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(editor.getJSON().content.map((node) => node.type)).toEqual([
      'paragraph',
      'pageBreak',
      'paragraph',
    ])
    editor.destroy()
  })

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
    expect(getDocxLayoutCentimeters(paragraph.attrs.docxLayout, 'left')).toBeCloseTo(2.47, 2)
    expect(paragraph.attrs.docxLayout.tabStops).toEqual([{ position: 3.17, alignment: 'center' }])

    editor.commands.setOutdent()
    ;[paragraph] = editor.getJSON().content
    expect(getDocxLayoutCentimeters(paragraph.attrs.docxLayout, 'left')).toBeCloseTo(1.2, 2)
    expect(paragraph.attrs.indent).toBeCloseTo(1.2, 2)
    editor.destroy()
  })

  it('writes ruler indentation through one undoable document transaction', () => {
    const editor = new Editor({
      extensions: [StarterKit, DocxParagraphLayout, Indent],
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { docxLayout: { tabStops: [{ position: 3.17, alignment: 'center' }] } },
            content: [{ type: 'text', text: 'Bên A' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'Bên B' }] },
        ],
      },
    })

    editor.commands.selectAll()
    expect(editor.commands.setDocxParagraphLayout({
      leftTwip: 720,
      rightTwip: 357,
      firstLineTwip: null,
      hangingTwip: 284,
    })).toBe(true)

    const paragraphs = editor.getJSON().content
    expect(paragraphs[0].attrs.docxLayout).toMatchObject({
      leftTwip: 720,
      rightTwip: 357,
      hangingTwip: 284,
      tabStops: [{ position: 3.17, alignment: 'center' }],
    })
    expect(paragraphs[1].attrs).toMatchObject({
      indent: 1.27,
      indentUnit: 'cm',
      docxLayout: { leftTwip: 720, rightTwip: 357, hangingTwip: 284 },
    })

    editor.commands.undo()
    expect(editor.getJSON().content[0].attrs.docxLayout).toEqual({
      tabStops: [{ position: 3.17, alignment: 'center' }],
    })
    expect(editor.getJSON().content[1].attrs.docxLayout).toBeNull()
    editor.commands.redo()
    expect(editor.getJSON().content[1].attrs.docxLayout.leftTwip).toBe(720)
    editor.destroy()
  })

  it('uses paragraph tab stops before falling back to paragraph indentation', () => {
    const editor = new Editor({
      extensions: [StarterKit, DocxParagraphLayout, DocxTab, Indent],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: {
            docxLayout: {
              tabStops: [
                { alignment: 'left', positionTwip: 1800, position: 3.17 },
                { alignment: 'center', positionTwip: 7560, position: 13.33 },
              ],
            },
          },
          content: [{ type: 'text', text: 'Chữ ký' }],
        }],
      },
    })

    editor.commands.setTextSelection(1)
    const firstTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    editor.view.dom.dispatchEvent(firstTab)
    const secondTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    editor.view.dom.dispatchEvent(secondTab)

    expect(firstTab.defaultPrevented).toBe(true)
    expect(secondTab.defaultPrevented).toBe(true)
    expect(nodesByType(editor, 'docxTab').map(({ node }) => node.attrs)).toMatchObject([
      { alignment: 'left', positionTwip: 1800, index: 0 },
      { alignment: 'center', positionTwip: 7560, index: 1 },
    ])
    expect(editor.getJSON().content[0].attrs.indent).toBeNull()
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
    expect(editor.commands.setPageBreak()).toBe(true)
    expect(nodesByType(editor, 'pageBreak')).toHaveLength(1)
    expect(editor.getJSON().content.some((node) => node.type === 'pageBreak')).toBe(true)
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
    expect(editor.commands.setPageBreak()).toBe(true)
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
