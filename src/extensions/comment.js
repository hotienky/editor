import { Mark, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

// Chuyển chuỗi JSON lưu trong attribute thread về đối tượng thread
const parseThread = (raw) => {
  if (typeof raw !== 'string' || raw === '') {
    return null
  }
  try {
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : null
  } catch (error) {
    return null
  }
}

// Comment: bôi đen đoạn văn bản rồi gắn bình luận (giống Word)
export default Mark.create({
  name: 'comment',
  priority: 1000,
  spanning: false,
  inclusive: false,
  keepOnSplit: false,

  addOptions() {
    return {
      color: 'rgba(255, 213, 79, 0.4)',
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {}
          }
          return { 'data-comment': attributes.id }
        },
      },
      user: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-user'),
        renderHTML: (attributes) => {
          if (!attributes.user) {
            return {}
          }
          return { 'data-user': attributes.user }
        },
      },
      color: {
        default: this.options.color,
        parseHTML: (element) =>
          element.getAttribute('data-color') || this.options.color,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {}
          }
          return { 'data-color': attributes.color }
        },
      },
      thread: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-thread'),
        renderHTML: (attributes) => {
          if (!attributes.thread) {
            return {}
          }
          return { 'data-thread': attributes.thread }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment]' }]
  },

  renderHTML({ mark, HTMLAttributes }) {
    const data = parseThread(mark.attrs.thread)
    const resolved = data && data.resolved
    const classes = ['kindy-comment']
    if (resolved) {
      classes.push('kindy-comment-resolved')
    }
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: classes.join(' '),
        style: resolved
          ? 'background-color: rgba(128,128,128,0.12);'
          : `background-color: ${mark.attrs.color || this.options.color};`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      // Gắn comment vào vùng đang chọn
      setComment:
        (thread) =>
        ({ chain, state }) => {
          const { empty } = state.selection
          if (empty || !thread || !thread.id) {
            return false
          }
          chain()
            .focus()
            .setMark(this.name, {
              id: thread.id,
              user: thread.user,
              color: thread.color,
              thread: JSON.stringify(thread),
            })
            .run()
          return true
        },
      // Xóa toàn bộ mark comment theo id
      removeComment:
        (id) =>
        ({ tr, dispatch }) => {
          if (!dispatch) {
            return true
          }
          const ranges = []
          tr.doc.descendants((node, pos) => {
            if (!node.isText) {
              return
            }
            for (const mark of node.marks) {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                ranges.push([pos, pos + node.nodeSize, mark])
                break
              }
            }
          })
          ranges.forEach(([from, to, mark]) => {
            tr.removeMark(from, to, mark)
          })
          return true
        },
      // Đồng bộ nội dung thread (reply, resolved...) lên mọi span của comment
      updateCommentThread:
        ({ id, thread }) =>
        ({ tr, dispatch }) => {
          if (!id || !dispatch) {
            return false
          }
          const json =
            typeof thread === 'string' ? thread : JSON.stringify(thread)
          const targets = []
          tr.doc.descendants((node, pos) => {
            if (!node.isText) {
              return
            }
            for (const mark of node.marks) {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                targets.push([pos, pos + node.nodeSize, mark])
              }
            }
          })
          targets.forEach(([from, to, mark]) => {
            const updated = mark.type.create({
              ...mark.attrs,
              thread: json,
            })
            tr.removeMark(from, to, mark)
            tr.addMark(from, to, updated)
          })
          return true
        },
      // Lấy danh sách các đoạn [from, to] comment đang chiếm giữ
      getCommentRanges:
        (id) =>
        ({ editor }) => {
          const ranges = []
          if (!editor || !id) {
            return ranges
          }
          editor.state.doc.descendants((node, pos) => {
            if (!node.isText) {
              return
            }
            for (const mark of node.marks) {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                ranges.push([pos, pos + node.nodeSize])
                break
              }
            }
          })
          return ranges
        },
      // Di chuyển con trỏ + cuộn tới vùng comment
      focusComment:
        (id) =>
        ({ editor, tr }) => {
          if (!id) {
            return false
          }
          const ranges = []
          editor.state.doc.descendants((node, pos) => {
            if (!node.isText) {
              return
            }
            for (const mark of node.marks) {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                ranges.push([pos, pos + node.nodeSize])
                break
              }
            }
          })
          if (!ranges.length) {
            return false
          }
          const from = Math.min(...ranges.map((item) => item[0]))
          const to = Math.max(...ranges.map((item) => item[1]))
          const elements = editor.view.dom.querySelectorAll(
            `[data-comment="${id}"]`,
          )
          elements.forEach((el) => {
            el.classList.add('kindy-comment-flash')
            setTimeout(() => {
              el.classList.remove('kindy-comment-flash')
            }, 1500)
          })
          if (elements[0]) {
            elements[0].scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            })
          }
          if (tr) {
            tr.setSelection(new TextSelection(tr.doc.resolve(from)))
            editor.view.dispatch(tr)
          }
          editor.view.focus()
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => {
        const { empty } = this.editor.state.selection
        if (empty) {
          return false
        }
        const commentStore =
          this.editor.storage.container?.commentStore ||
          this.options.commentStore
        if (commentStore) {
          commentStore.addComment()
          return true
        }
        return false
      },
    }
  },
})
