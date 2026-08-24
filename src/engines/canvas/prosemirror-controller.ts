import type { JSONContent } from '../../core/types'
import { history, redo, undo } from 'prosemirror-history'
import { Node as ProseMirrorNode, Schema } from 'prosemirror-model'
import { EditorState, type Transaction } from 'prosemirror-state'

const paragraphAttrs = {
  textAlign: { default: null },
  align: { default: null },
  lineHeight: { default: null },
  margin: { default: null },
  indent: { default: null },
  docxLayout: { default: null },
}

const cellAttrs = {
  colspan: { default: 1 },
  rowspan: { default: 1 },
  colwidth: { default: null },
  verticalAlign: { default: null },
  background: { default: null },
  docxLayout: { default: null },
}

export const canvasDocumentSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*', attrs: paragraphAttrs },
    heading: {
      group: 'block',
      content: 'inline*',
      defining: true,
      attrs: { ...paragraphAttrs, level: { default: 1 } },
    },
    blockquote: { group: 'block', content: 'block+' },
    horizontalRule: { group: 'block', atom: true },
    pageBreak: { group: 'block', atom: true, attrs: { id: { default: null } } },
    sectionBreak: {
      group: 'block',
      atom: true,
      attrs: { id: { default: null }, type: { default: 'nextPage' }, page: { default: null } },
    },
    bulletList: { group: 'block', content: 'listItem+', attrs: { tight: { default: false } } },
    orderedList: {
      group: 'block',
      content: 'listItem+',
      attrs: { start: { default: 1 }, tight: { default: false } },
    },
    listItem: { content: 'paragraph block*', defining: true },
    table: {
      group: 'block',
      content: 'tableRow+',
      tableRole: 'table',
      attrs: { style: { default: null }, docxLayout: { default: null } },
    },
    tableRow: {
      content: '(tableCell | tableHeader)+',
      tableRole: 'row',
      attrs: {
        height: { default: null },
        repeatHeader: { default: false },
        cantSplit: { default: false },
      },
    },
    tableCell: { content: 'block+', tableRole: 'cell', isolating: true, attrs: cellAttrs },
    tableHeader: { content: 'block+', tableRole: 'header_cell', isolating: true, attrs: cellAttrs },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline', selectable: false },
    docxTab: {
      inline: true,
      group: 'inline',
      atom: true,
      attrs: {
        alignment: { default: 'left' },
        position: { default: null },
        positionTwip: { default: null },
        leader: { default: 'none' },
        index: { default: 0 },
      },
    },
    inlineImage: {
      inline: true,
      group: 'inline',
      atom: true,
      attrs: {
        id: { default: null },
        name: { default: null },
        size: { default: null },
        src: { default: '' },
        alt: { default: '' },
        title: { default: null },
        width: { default: null },
        height: { default: null },
        display: { default: 'inline' },
        inline: { default: true },
        uploaded: { default: false },
      },
    },
    image: {
      group: 'block',
      atom: true,
      attrs: {
        id: { default: null },
        name: { default: null },
        size: { default: null },
        src: { default: '' },
        alt: { default: '' },
        title: { default: null },
        width: { default: null },
        height: { default: null },
        display: { default: 'block' },
        inline: { default: false },
        uploaded: { default: false },
      },
    },
  },
  marks: {
    bold: {},
    italic: {},
    underline: {},
    strike: {},
    subscript: {},
    superscript: {},
    textStyle: {
      attrs: {
        fontFamily: { default: null },
        fontSize: { default: null },
        color: { default: null },
        backgroundColor: { default: null },
      },
    },
    link: {
      attrs: { href: { default: '' }, target: { default: null }, rel: { default: null } },
      inclusive: false,
    },
    comment: {
      attrs: {
        id: { default: null },
        user: { default: null },
        color: { default: null },
        thread: { default: null },
      },
    },
    trackChange: {
      attrs: {
        id: { default: null },
        type: { default: 'insert' },
        author: { default: 'Unknown' },
        timestamp: { default: null },
      },
    },
  },
})

const fallbackDocument = () => canvasDocumentSchema.node('doc', null, [canvasDocumentSchema.node('paragraph')])

const documentFromJSON = (content: JSONContent): ProseMirrorNode => {
  try {
    return ProseMirrorNode.fromJSON(canvasDocumentSchema, content)
  } catch (error) {
    console.warn('[kindy-editor] CanvasEngine received content outside its compatibility profile.', error)
    return fallbackDocument()
  }
}

export type CanvasDocumentTransactionListener = (
  content: JSONContent,
  transaction: Transaction,
) => void

/**
 * Headless canonical document model used while the CanvasEngine owns layout,
 * painting and pointer/keyboard input. Every canvas mutation is committed as a
 * ProseMirror transaction before it is exposed to the SDK save pipeline.
 */
export class CanvasDocumentController {
  private state: EditorState
  private editable = true
  private listeners = new Set<CanvasDocumentTransactionListener>()

  constructor(content: JSONContent) {
    this.state = EditorState.create({
      schema: canvasDocumentSchema,
      doc: documentFromJSON(content),
      plugins: [history()],
    })
  }

  getJSON(): JSONContent {
    return this.state.doc.toJSON() as JSONContent
  }

  getState(): EditorState {
    return this.state
  }

  isEditable() {
    return this.editable
  }

  setEditable(editable: boolean) {
    this.editable = editable
  }

  replaceDocument(content: JSONContent, origin = 'canvas') {
    if (!this.editable && origin === 'canvas') return false
    const nextDocument = documentFromJSON(content)
    const transaction = this.state.tr
      .replaceWith(0, this.state.doc.content.size, nextDocument.content)
      .setMeta('kindy:origin', origin)
    this.dispatchTransaction(transaction)
    return true
  }

  dispatchTransaction(transaction: Transaction) {
    this.state = this.state.apply(transaction)
    const content = this.getJSON()
    this.listeners.forEach((listener) => listener(content, transaction))
  }

  undo() {
    return undo(this.state, (transaction) => this.dispatchTransaction(transaction))
  }

  redo() {
    return redo(this.state, (transaction) => this.dispatchTransaction(transaction))
  }

  onTransaction(listener: CanvasDocumentTransactionListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  destroy() {
    this.listeners.clear()
  }
}
