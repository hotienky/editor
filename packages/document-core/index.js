/**
 * UMO Editor 2.0 - Core Document AST Model & Command Engine
 * Pure Document-First Architecture (Decoupled from DOM)
 */

export class DocumentModel {
  constructor(metadata = {}) {
    this.metadata = {
      title: 'Tài liệu UMO 2.0',
      created: Date.now(),
      updated: Date.now(),
      ...metadata,
    }
    this.sections = [this.createDefaultSection()]
  }

  createDefaultSection() {
    return {
      id: `section-${Date.now()}`,
      orientation: 'portrait',
      pageSize: { width: '21cm', height: '29.7cm' },
      margins: { top: '2.5cm', bottom: '2.5cm', left: '2.5cm', right: '2.5cm' },
      header: { enable: true, text: 'Đầu trang - Header' },
      footer: { enable: true, text: 'Chân trang - Footer' },
      blocks: [
        {
          id: `block-${Date.now()}`,
          type: 'paragraph',
          inlines: [
            {
              type: 'text',
              value: 'Chào mừng bạn đến với Nền tảng Tài liệu UMO Editor 2.0 (Document-First Engine)!',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ],
    }
  }

  toJSON() {
    return {
      metadata: this.metadata,
      sections: this.sections,
    }
  }

  static fromJSON(json) {
    const doc = new DocumentModel(json.metadata)
    if (json.sections) {
      doc.sections = json.sections
    }
    return doc
  }
}

/**
 * Command Engine - All mutations pass through explicit Command instances
 */
export class CommandEngine {
  constructor(document) {
    this.document = document
    this.history = []
    this.redoStack = []
  }

  execute(command) {
    const result = command.execute(this.document)
    this.history.push(command)
    this.redoStack = []
    this.document.metadata.updated = Date.now()
    return result
  }

  undo() {
    const command = this.history.pop()
    if (command) {
      command.undo(this.document)
      this.redoStack.push(command)
    }
  }

  redo() {
    const command = this.redoStack.pop()
    if (command) {
      command.execute(this.document)
      this.history.push(command)
    }
  }
}

export class InsertTextCommand {
  constructor(sectionIndex, blockIndex, position, text) {
    this.sectionIndex = sectionIndex
    this.blockIndex = blockIndex
    this.position = position
    this.text = text
  }

  execute(document) {
    const block = document.sections[this.sectionIndex]?.blocks[this.blockIndex]
    if (block && block.inlines) {
      block.inlines.push({ type: 'text', value: this.text })
    }
  }

  undo(document) {
    const block = document.sections[this.sectionIndex]?.blocks[this.blockIndex]
    if (block && block.inlines) {
      block.inlines.pop()
    }
  }
}
