import { reactive } from 'vue'
import { useStorage } from '@vueuse/core'

import { NodeSelection } from '@tiptap/pm/state'

import { shortId } from '@/utils/short-id'

// Bảng màu highlight theo người dùng (giống Word)
const COMMENT_COLORS = [
  'rgba(255, 213, 79, 0.4)',
  'rgba(255, 159, 191, 0.45)',
  'rgba(131, 211, 255, 0.45)',
  'rgba(167, 255, 167, 0.5)',
  'rgba(230, 175, 255, 0.45)',
  'rgba(255, 218, 185, 0.5)',
  'rgba(201, 242, 233, 0.55)',
  'rgba(255, 243, 176, 0.5)',
]

const colorIndex = (id) => {
  let hash = 0
  const key = String(id || '')
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Màu cố định cho từng người dùng
export const colorForUser = (id) =>
  COMMENT_COLORS[colorIndex(id) % COMMENT_COLORS.length]

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

// Store bình luận: single source of truth lúc chạy,
// được đồng bộ xuống document (mark) và đọc ngược lại từ document
export const createCommentStore = (options, editorRef) => {
  const visibleStorage = useStorage('kindy-comment-sidebar-visible', false)

  const store = reactive({
    comments: [],
    activeId: null,
    visible: visibleStorage,
    // Đánh dấu comment vừa được tạo để sidebar tự mở chế độ nhập nội dung
    pendingAdd: false,
  })

  const currentUser = () => options.value?.user || {}

  const createThread = (text = '') => {
    const user = currentUser()
    return {
      id: shortId(),
      user: user.label || user.id || t('comment.anonymous'),
      userId: user.id || '',
      color: colorForUser(user.id || user.label || 'anonymous'),
      text,
      replies: [],
      resolved: false,
      createdAt: Date.now(),
      resolvedAt: null,
    }
  }

  // Tìm comment đang tồn tại trong vùng chọn
  const findCommentInSelection = (editor) => {
    const { doc, selection } = editor.state
    let id = null
    doc.nodesBetween(selection.from, selection.to, (node) => {
      if (id) {
        return false
      }
      if (node.isText) {
        for (const mark of node.marks) {
          const { type, attrs } = mark
          const { id: commentId } = attrs
          if (type.name === 'comment') {
            id = commentId
            break
          }
        }
      }
      return !id
    })
    return id
  }

  // Thêm comment trên vùng đang chọn, mở sidebar và tập trung vào thread mới
  const addComment = (text = '') => {
    const editor = editorRef.value
    if (!editor) {
      return null
    }
    const { selection } = editor.state
    if (selection.empty || selection instanceof NodeSelection) {
      return null
    }
    // Vùng chọn đã có comment: tập trung tới comment đó
    const existingId = findCommentInSelection(editor)
    if (existingId) {
      store.activeId = existingId
      return { id: existingId, existing: true }
    }
    const thread = createThread(text)
    editor.chain().focus().setComment(thread).run()
    store.comments.push(thread)
    store.activeId = thread.id
    store.pendingAdd = true
    return thread
  }

  // Cập nhật nội dung thread + đồng bộ xuống mọi span của comment
  const updateThread = (id, patch) => {
    const editor = editorRef.value
    const index = store.comments.findIndex((item) => item.id === id)
    if (index < 0) {
      return null
    }
    const next = { ...store.comments[index], ...patch, id }
    store.comments[index] = next
    if (editor) {
      editor.chain().updateCommentThread({ id, thread: next }).run()
    }
    return next
  }

  const addReply = (id, text) => {
    const thread = store.comments.find((item) => item.id === id)
    if (!thread || !text) {
      return null
    }
    const user = currentUser()
    return updateThread(id, {
      replies: [
        ...thread.replies,
        {
          id: shortId(),
          user: user.label || user.id || t('comment.anonymous'),
          userId: user.id || '',
          text,
          createdAt: Date.now(),
        },
      ],
    })
  }

  const setResolved = (id, resolved) => {
    const thread = store.comments.find((item) => item.id === id)
    if (!thread) {
      return null
    }
    return updateThread(id, {
      resolved,
      resolvedAt: resolved ? Date.now() : null,
    })
  }

  const removeComment = (id) => {
    const editor = editorRef.value
    const index = store.comments.findIndex((item) => item.id === id)
    if (index < 0) {
      return false
    }
    if (editor) {
      editor.chain().focus().removeComment(id).run()
    }
    store.comments.splice(index, 1)
    if (store.activeId === id) {
      store.activeId = store.comments[0]?.id || null
    }
    return true
  }

  // Di chuyển con trỏ tới vùng comment và đánh dấu active
  const focus = (id) => {
    store.activeId = id
    return editorRef.value?.chain().focusComment(id).run()
  }

  const toggle = (value) => {
    store.visible = value === undefined ? !store.visible : value
  }

  const getCommentCount = () => store.comments.length

  const getComment = (id) =>
    store.comments.find((item) => item.id === id) || null

  // Xóa cờ "comment mới" sau khi sidebar đã xử lý
  const consumePendingAdd = () => {
    store.pendingAdd = false
  }

  // Đọc lại toàn bộ thread từ document (sau load, undo/redo, xóa text...)
  const syncFromDoc = () => {
    const editor = editorRef.value
    if (!editor) {
      return
    }
    const found = []
    editor.state.doc.descendants((node) => {
      if (!node.isText) {
        return
      }
      for (const mark of node.marks) {
        if (mark.type.name !== 'comment') {
          continue
        }
        const { id } = mark.attrs
        if (!id || found.some((item) => item.id === id)) {
          continue
        }
        let thread = parseThread(mark.attrs.thread)
        if (!thread) {
          thread = {
            id,
            user: mark.attrs.user || t('comment.anonymous'),
            userId: '',
            color: mark.attrs.color || 'rgba(255, 213, 79, 0.4)',
            text: '',
            replies: [],
            resolved: false,
            createdAt: Date.now(),
            resolvedAt: null,
          }
        }
        found.push(thread)
      }
    })
    store.comments = found
    if (!found.some((item) => item.id === store.activeId)) {
      store.activeId = found[0]?.id || null
    }
  }

  return Object.assign(store, {
    addComment,
    updateThread,
    addReply,
    setResolved,
    removeComment,
    focus,
    toggle,
    getCommentCount,
    getComment,
    consumePendingAdd,
    syncFromDoc,
  })
}
