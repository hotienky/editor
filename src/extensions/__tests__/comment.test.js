import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'

import Comment from '../comment'

const importedComment = {
  id: 'comment-9',
  user: 'Người duyệt',
  color: 'rgba(255, 213, 79, 0.4)',
  thread: JSON.stringify({
    id: 'comment-9',
    user: 'Người duyệt',
    text: 'Bổ sung thông tin',
    replies: [],
    resolved: false,
  }),
}

describe('Comment mark editability', () => {
  it('keeps imported DOCX comment text editable and removes the mark with its text', () => {
    const editor = new Editor({
      extensions: [StarterKit, Comment],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: '…………….', marks: [{ type: 'comment', attrs: importedComment }] }],
        }],
      },
    })

    expect(editor.isEditable).toBe(true)
    editor.commands.setTextSelection({ from: 1, to: 7 })
    expect(editor.commands.deleteSelection()).toBe(true)
    expect(editor.getText()).toBe('')

    let hasCommentMark = false
    editor.state.doc.descendants((node) => {
      if (node.marks.some((mark) => mark.type.name === 'comment')) hasCommentMark = true
    })
    expect(hasCommentMark).toBe(false)
    editor.destroy()
  })
})
