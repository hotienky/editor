import { watch } from 'vue'
import { COMMENT_EVENTS } from './comment-store'

/**
 * Bind comment store events to an external API (persistence layer).
 *
 * Usage:
 *   const commentStore = createCommentStore(options, editorRef)
 *   useCommentApi(commentStore, {
 *     baseUrl: '/api/comments',
 *     headers: { Authorization: 'Bearer ...' },
 *   })
 *
 * The returned object exposes an `init()` call to bulk-load existing
 * comments from the API into the store on mount.
 */
export const useCommentApi = (store, api) => {
  const baseUrl = api.baseUrl || '/api/comments'
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(api.headers || {}),
  })

  const request = (method, path, body) => {
    const url = `${baseUrl}${path}`
    const opts = { method, headers: getHeaders() }
    if (body) opts.body = JSON.stringify(body)
    return fetch(url, opts).then((res) => {
      if (!res.ok) throw new Error(`[CommentAPI] ${method} ${path} → ${res.status}`)
      return res.json().catch(() => null)
    })
  }

  // ── Bind store events ────────────────────────────────────────────────
  const unsubs = []

  unsubs.push(
    store.on(COMMENT_EVENTS.CREATED, (thread) => {
      request('POST', '', thread).catch((e) =>
        console.warn('[CommentAPI] Failed to persist comment:', e),
      )
    }),
  )

  unsubs.push(
    store.on(COMMENT_EVENTS.UPDATED, ({ next }) => {
      request('PUT', `/${next.id}`, next).catch((e) =>
        console.warn('[CommentAPI] Failed to update comment:', e),
      )
    }),
  )

  unsubs.push(
    store.on(COMMENT_EVENTS.REPLY_ADDED, ({ commentId, reply }) => {
      request('POST', `/${commentId}/replies`, reply).catch((e) =>
        console.warn('[CommentAPI] Failed to persist reply:', e),
      )
    }),
  )

  unsubs.push(
    store.on(COMMENT_EVENTS.RESOLVED, ({ commentId, resolved }) => {
      request('PATCH', `/${commentId}`, { resolved }).catch((e) =>
        console.warn('[CommentAPI] Failed to resolve comment:', e),
      )
    }),
  )

  unsubs.push(
    store.on(COMMENT_EVENTS.DELETED, (thread) => {
      request('DELETE', `/${thread.id}`).catch((e) =>
        console.warn('[CommentAPI] Failed to delete comment:', e),
      )
    }),
  )

  // ── Init: load all comments from API ─────────────────────────────────
  const init = () =>
    request('GET', '')
      .then((comments) => {
        if (Array.isArray(comments)) {
          comments.forEach((c) => {
            if (!store.getComment(c.id)) {
              store.comments.push(c)
            }
          })
        }
      })
      .catch((e) =>
        console.warn('[CommentAPI] Failed to load comments:', e),
      )

  // ── Cleanup ──────────────────────────────────────────────────────────
  const destroy = () => {
    unsubs.forEach((fn) => fn())
    unsubs.length = 0
  }

  return { init, destroy }
}
