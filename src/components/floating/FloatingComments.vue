<template>
  <div ref="containerEl" class="kindy-floating-comments">
    <FloatingCommentCard
      v-for="item in positionedComments"
      :key="item.id"
      :comment="item.comment"
      :position="item.position"
      :snippet="item.snippet"
      :is-active="commentStore.activeId === item.id"
      :editing-id="editingId"
      @focus="onFocus"
      @resolve="onResolve"
      @delete="onDelete"
      @edit="startEdit"
      @save-edit="saveEdit"
      @cancel-edit="cancelEdit"
      @reply="onReply"
      @measured="onCardMeasured(item.id, $event)"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import FloatingCommentCard from './FloatingCommentCard.vue'

const editor = inject('editor')
const commentStore = inject('commentStore')
const container = inject('container')
const { t } = useI18n()

const editingId = ref(null)
const docVersion = ref(0)
const containerEl = ref(null)
const cardHeights = ref({})

const orderedComments = computed(() => {
  const raw = commentStore?.comments
  const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.value) ? raw.value : [])
  return [...list].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
    return b.createdAt - a.createdAt
  })
})

const snippets = computed(() => {
  docVersion.value // trigger recompute on doc change
  const map = {}
  const editorEl = editor?.value?.view?.dom
  if (!editorEl) return map
  for (const item of orderedComments.value) {
    map[item.id] =
      editorEl.querySelector(`[data-comment="${item.id}"]`)?.textContent?.trim() || ''
  }
  return map
})

const positionedComments = computed(() => {
  const editorEl = editor?.value?.view?.dom
  const wrapper = editorEl?.closest('.kindy-page-editor-wrap')
  if (!editorEl || !wrapper) return []

  const wrapperRect = wrapper.getBoundingClientRect()
  const results = []

  for (const item of orderedComments.value) {
    const el = editorEl.querySelector(`[data-comment="${item.id}"]`)
    if (!el) continue

    // Use offsetTop relative to wrapper for unscaled coordinate system
    let top = 0
    let current = el
    while (current && current !== wrapper) {
      top += current.offsetTop || 0
      current = current.offsetParent
    }
    top = Math.max(0, top)

    results.push({
      id: item.id,
      comment: item,
      position: { top },
      snippet: snippets.value[item.id] || '',
    })
  }

  // Stack cards using measured heights
  let lastBottom = 0
  for (const res of results) {
    if (res.position.top < lastBottom + 6) {
      res.position.top = lastBottom + 6
    }
    const h = cardHeights.value[res.id] || 38
    lastBottom = res.position.top + h
  }

  return results
})

const onCardMeasured = (id, height) => {
  if (height > 0 && cardHeights.value[id] !== height) {
    cardHeights.value[id] = height
  }
}

const onFocus = (id) => {
  commentStore?.focus(id)
}

const onResolve = (id) => {
  const thread = commentStore?.comments?.find(c => c.id === id)
  if (thread) {
    commentStore?.setResolved(id, !thread.resolved)
  }
}

const onDelete = (id) => {
  const dialog = useConfirm({
    attach: container,
    theme: 'warning',
    header: t('comment.delete'),
    body: t('comment.deleteConfirm'),
    confirmBtn: { theme: 'danger', content: t('comment.delete') },
    onConfirm() {
      dialog.destroy()
      commentStore?.removeComment(id)
    },
  })
}

const startEdit = (id) => {
  if (!editor?.value?.isEditable) return
  editingId.value = id
}

const saveEdit = (id, text) => {
  if (editingId.value !== id) return
  if (!text && !commentStore?.getComment(id)?.text) {
    commentStore?.removeComment(id)
  } else {
    commentStore?.updateThread(id, { text })
  }
  editingId.value = null
}

const cancelEdit = (id) => {
  const thread = commentStore?.getComment(id)
  if (thread && !thread.text) {
    commentStore?.removeComment(id)
  }
  editingId.value = null
}

const onReply = (id, text) => {
  commentStore?.addReply(id, text)
}

const updateDocVersion = () => {
  docVersion.value += 1
}

// Find the scroll container for position recalculation
const getScrollContainer = () => {
  const editorEl = editor?.value?.view?.dom
  return editorEl?.closest('.kindy-zoomable-container')
}

let scrollCleanup = null

onMounted(() => {
  editor?.value?.on('update', updateDocVersion)

  // Recalculate positions on scroll
  const scroller = getScrollContainer()
  if (scroller) {
    const onScroll = () => { docVersion.value += 1 }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scrollCleanup = () => scroller.removeEventListener('scroll', onScroll)
  }
})

onBeforeUnmount(() => {
  editor?.value?.off('update', updateDocVersion)
  scrollCleanup?.()
})

watch(
  () => commentStore?.visible,
  (visible) => {
    if (visible) {
      nextTick(() => updateDocVersion())
    }
  },
)
</script>

<style lang="less">
.kindy-floating-comments {
  position: absolute;
  top: 0;
  left: calc(100% + 20px);
  width: 280px;
  pointer-events: none;
  z-index: 200;
  overflow: visible;

  .kindy-float-comment {
    pointer-events: auto;
  }
}
</style>
