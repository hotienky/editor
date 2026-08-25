import { reactive } from 'vue'
import { useStorage } from '@vueuse/core'

import { NodeSelection } from '@tiptap/pm/state'

import { shortId } from '@/utils/short-id'

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

export const colorForUser = (id) =>
  COMMENT_COLORS[colorIndex(id) % COMMENT_COLORS.length]

const parseThread = (raw) => {
  if (typeof raw !== 'string' || raw === '') return null
  try {
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

// ─── Event Emitter ─────────────────────────────────────────────────────────
// Fires events so external systems (API, WebSocket, etc.) can react
// Usage: commentStore.on('created', (thread) => api.post('/comments', thread))
const createEventEmitter = () => {
  const listeners = new Map()

  const on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(fn)
    return () => listeners.get(event)?.delete(fn)
  }

  const emit = (event, payload) => {
    listeners.get(event)?.forEach((fn) => {
      try { fn(payload) } catch (e) { console.error(`[CommentEvent] ${event}:`, e) }
    })
  }

  return { on, emit }
}

export const COMMENT_EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  REPLY_ADDED: 'reply_added',
  RESOLVED: 'resolved',
  DELETED: 'deleted',
  SYNCED: 'synced',
}

export const createCommentStore = (options, editorRef) => {
  const visibleStorage = useStorage('kindy-comment-sidebar-visible', false)
  const events = createEventEmitter()

  const store = reactive({
    comments: [],
    activeId: null,
    visible: visibleStorage,
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

  const findCommentInSelection = (editor) => {
    const { doc, selection } = editor.state
    let id = null
    doc.nodesBetween(selection.from, selection.to, (node) => {
      if (id) return false
      if (node.isText) {
        for (const mark of node.marks) {
          if (mark.type.name === 'comment') {
            ;({ id } = mark.attrs)
            break
          }
        }
      }
      return !id
    })
    return id
  }

  const addComment = (text = '') => {
    const editor = editorRef.value
    if (!editor) return null
    const { selection } = editor.state
    if (selection.empty || selection instanceof NodeSelection) return null

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

    events.emit(COMMENT_EVENTS.CREATED, { ...thread })
    return thread
  }

  const updateThread = (id, patch) => {
    const editor = editorRef.value
    const index = store.comments.findIndex((item) => item.id === id)
    if (index < 0) return null

    const prev = { ...store.comments[index] }
    const next = { ...prev, ...patch, id }
    store.comments[index] = next

    if (editor) {
      editor.chain().updateCommentThread({ id, thread: next }).run()
    }

    events.emit(COMMENT_EVENTS.UPDATED, { prev, next })
    return next
  }

  const addReply = (id, text) => {
    const thread = store.comments.find((item) => item.id === id)
    if (!thread || !text) return null

    const user = currentUser()
    const reply = {
      id: shortId(),
      user: user.label || user.id || t('comment.anonymous'),
      userId: user.id || '',
      text,
      createdAt: Date.now(),
    }

    updateThread(id, { replies: [...thread.replies, reply] })
    events.emit(COMMENT_EVENTS.REPLY_ADDED, { commentId: id, reply })
    return reply
  }

  const setResolved = (id, resolved) => {
    const thread = store.comments.find((item) => item.id === id)
    if (!thread) return null

    updateThread(id, {
      resolved,
      resolvedAt: resolved ? Date.now() : null,
    })
    events.emit(COMMENT_EVENTS.RESOLVED, { commentId: id, resolved })
  }

  const removeComment = (id) => {
    const editor = editorRef.value
    const index = store.comments.findIndex((item) => item.id === id)
    if (index < 0) return false

    const removed = { ...store.comments[index] }

    if (editor) {
      editor.chain().focus().removeComment(id).run()
    }
    store.comments.splice(index, 1)
    if (store.activeId === id) {
      store.activeId = store.comments[0]?.id || null
    }

    events.emit(COMMENT_EVENTS.DELETED, removed)
    return true
  }

  const focus = (id) => {
    store.activeId = id
    return editorRef.value?.chain().focusComment(id).run()
  }

  const toggle = (value) => {
    store.visible = value === undefined ? !store.visible : value
  }

  const getCommentCount = () => store.comments.length
  const getComment = (id) => store.comments.find((item) => item.id === id) || null
  const consumePendingAdd = () => { store.pendingAdd = false }

  const syncFromDoc = () => {
    const editor = editorRef.value
    if (!editor) return

    const found = []
    editor.state.doc.descendants((node) => {
      if (!node.isText) return
      for (const mark of node.marks) {
        if (mark.type.name !== 'comment') continue
        const { id } = mark.attrs
        if (!id || found.some((item) => item.id === id)) continue

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
    events.emit(COMMENT_EVENTS.SYNCED, { comments: [...found] })
  }

  // Subscribe to events: store.on('created', (data) => ...)
  const { on } = events

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
    on,
  })
}
