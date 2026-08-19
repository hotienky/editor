<template>
  <div ref="commentContainerRef" class="kindy-comment-container">
    <div class="kindy-comment-title">
      <icon name="comment" class="kindy-comment-title-icon" />
      <span>{{ t('comment.title') }}</span>
      <span class="kindy-comment-count">{{
        commentStore.comments.length
      }}</span>
      <div class="kindy-dialog__close" @click="close">
        <icon name="close" />
      </div>
    </div>
    <div class="kindy-comment-toolbar">
      <t-button
        theme="primary"
        size="small"
        block
        :disabled="!editor?.isEditable"
        @click="addNew"
      >
        <icon name="comment" />
        {{ t('comment.add') }}
      </t-button>
    </div>
    <div class="kindy-comment-content kindy-scrollbar">
      <div
        v-if="commentStore.comments.length === 0"
        class="kindy-comment-empty"
      >
        <icon name="comment" class="kindy-comment-empty-icon" />
        <p>{{ t('comment.empty') }}</p>
        <p class="kindy-comment-empty-tip">{{ t('comment.emptyTip') }}</p>
      </div>
      <div
        v-for="item in orderedComments"
        :key="item.id"
        class="kindy-comment-item"
        :class="{
          active: commentStore.activeId === item.id,
          resolved: item.resolved,
        }"
        :id="`kindy-comment-${item.id.replaceAll('_', '')}`"
      >
        <div class="kindy-comment-item-header">
          <t-avatar
            :size="'28px'"
            :image="getUserAvatar(item.userId)"
            :alt="item.user"
          >
            {{ item.user?.[0] }}
          </t-avatar>
          <span class="kindy-comment-item-user">{{ item.user }}</span>
          <span class="kindy-comment-item-time">{{
            timeAgo(item.createdAt)
          }}</span>
          <div class="kindy-comment-item-actions">
            <tooltip
              :content="
                item.resolved ? t('comment.reopen') : t('comment.resolve')
              "
            >
              <t-button
                size="small"
                shape="square"
                variant="text"
                :disabled="!editor?.isEditable"
                @click="commentStore.setResolved(item.id, !item.resolved)"
              >
                <icon :name="item.resolved ? 'reset-outlined' : 'check'" />
              </t-button>
            </tooltip>
            <tooltip :content="t('comment.delete')">
              <t-button
                size="small"
                shape="square"
                variant="text"
                :disabled="!editor?.isEditable"
                @click="onDelete(item)"
              >
                <icon name="node-delete" />
              </t-button>
            </tooltip>
          </div>
        </div>
        <div
          v-if="snippets[item.id] && !item.resolved"
          class="kindy-comment-snippet"
          :style="{ backgroundColor: item.color }"
          @click="commentStore.focus(item.id)"
        >
          {{ snippets[item.id] }}
        </div>
        <div
          v-else-if="snippets[item.id]"
          class="kindy-comment-snippet resolved"
        >
          {{ snippets[item.id] }}
        </div>
        <div
          v-if="!editingId || editingId !== item.id"
          class="kindy-comment-body"
          @dblclick="startEdit(item)"
        >
          <span v-if="item.text">{{ item.text }}</span>
          <span v-else class="kindy-comment-body-empty">{{
            t('comment.noBody')
          }}</span>
        </div>
        <div v-else class="kindy-comment-edit">
          <t-textarea
            v-model="draft"
            :placeholder="t('comment.placeholder')"
            :maxlength="500"
            autofocus
            @blur="saveEdit(item)"
          />
          <div class="kindy-comment-edit-actions">
            <t-button size="small" variant="text" @click="cancelEdit(item)">{{
              t('comment.cancel')
            }}</t-button>
            <t-button size="small" theme="primary" @click="saveEdit(item)">{{
              t('comment.save')
            }}</t-button>
          </div>
        </div>
        <div class="kindy-comment-replies">
          <div
            v-for="reply in item.replies"
            :key="reply.id"
            class="kindy-comment-reply"
          >
            <t-avatar
              :size="'22px'"
              :image="getUserAvatar(reply.userId)"
              :alt="reply.user"
            >
              {{ reply.user?.[0] }}
            </t-avatar>
            <div class="kindy-comment-reply-body">
              <div class="kindy-comment-reply-name">
                <span>{{ reply.user }}</span>
                <span class="kindy-comment-item-time">{{
                  timeAgo(reply.createdAt)
                }}</span>
              </div>
              <div class="kindy-comment-reply-text">{{ reply.text }}</div>
            </div>
          </div>
        </div>
        <div v-if="!item.resolved" class="kindy-comment-reply-input">
          <t-input
            v-model="replyDraft"
            :placeholder="t('comment.replyPlaceholder')"
            :disabled="!editor?.isEditable"
            @enter="onReply(item)"
          />
        </div>
        <div v-if="item.resolved" class="kindy-comment-resolved-tip">
          <icon name="check" />
          {{ t('comment.resolvedTip') }}
        </div>
      </div>
    </div>
    <div class="kindy-comment-resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import { timeAgo } from '@/utils/time-ago'

const container = inject('container')
const editor = inject('editor')
const options = inject('options')
const commentStore = inject('commentStore')

const commentList = $computed(() => {
  const raw = commentStore?.comments
  if (Array.isArray(raw)) return raw
  if (raw && Array.isArray(raw.value)) return raw.value
  return []
})

// Sắp xếp: comment chưa giải quyết trước, mới nhất trước
const orderedComments = $computed(() =>
  [...commentList].sort((a, b) => {
    if (a.resolved !== b.resolved) {
      return a.resolved ? 1 : -1
    }
    return b.createdAt - a.createdAt
  }),
)

// Avatar người dùng
const getUserAvatar = (userId) => {
  if (!userId) {
    return ''
  }
  const user = options.value.users?.find((item) => item.id === userId)
  return user?.avatar || ''
}

// Đoạn văn bản được comment (lấy từ DOM, cập nhật khi document thay đổi)
const docVersion = ref(0)
onMounted(() => {
  editor.value?.on('update', () => {
    docVersion.value += 1
  })
})
const snippets = $computed(() => {
  docVersion.value
  const map = {}
  const editorEl = editor.value?.view.dom
  for (const item of commentList) {
    map[item.id] =
      editorEl
        ?.querySelector(`[data-comment="${item.id}"]`)
        ?.textContent?.trim() || ''
  }
  return map
})

// Thêm comment mới từ vùng đang chọn
const addNew = () => {
  const thread = commentStore.addComment()
  if (thread && !thread.existing) {
    commentStore.focus(thread.id)
    startEdit(thread)
  } else if (thread?.existing) {
    commentStore.focus(thread.id)
  } else {
    const dialog = useAlert({
      attach: container,
      theme: 'warning',
      header: t('comment.add'),
      body: t('comment.selectTextTip'),
      onConfirm() {
        dialog.destroy()
      },
    })
  }
}

// Sửa nội dung comment
const editingId = ref(null)
const draft = ref('')
const startEdit = (item) => {
  if (!editor?.isEditable || !item) {
    return
  }
  editingId.value = item.id
  draft.value = item.text || ''
}
const saveEdit = (item) => {
  if (editingId.value !== item.id) {
    return
  }
  const text = draft.value.trim()
  if (!text && !item.text) {
    // If empty text for brand new comment, remove comment
    commentStore.removeComment(item.id)
  } else {
    commentStore.updateThread(item.id, { text })
  }
  editingId.value = null
  draft.value = ''
}
const cancelEdit = (item) => {
  if (item && !item.text) {
    commentStore.removeComment(item.id)
  }
  editingId.value = null
  draft.value = ''
}

// Trả lời comment
const replyDraft = ref('')
const onReply = (item) => {
  const text = replyDraft.value.trim()
  if (!text) {
    return
  }
  commentStore.addReply(item.id, text)
  replyDraft.value = ''
}

// Watch for pendingAdd flag from commentStore to auto focus & edit newly added comment
watch(
  () => commentStore?.pendingAdd,
  (isPending) => {
    if (isPending) {
      const activeItem = commentStore.comments.find((item) => item.id === commentStore.activeId)
      if (activeItem) {
        commentStore.focus(activeItem.id)
        startEdit(activeItem)
      }
      commentStore.consumePendingAdd()
    }
  },
)

// Xóa comment
const onDelete = (item) => {
  const dialog = useConfirm({
    attach: container,
    theme: 'warning',
    header: t('comment.delete'),
    body: t('comment.deleteConfirm'),
    confirmBtn: {
      theme: 'danger',
      content: t('comment.delete'),
    },
    onConfirm() {
      dialog.destroy()
      commentStore.removeComment(item.id)
    },
  })
}

// Đóng panel
const close = () => {
  commentStore.toggle(false)
}

// Kéo thay đổi độ rộng
const baseWidth = 320
const minWidth = baseWidth / 1.5
const maxWidth = baseWidth * 2
const commentContainerRef = ref(null)
const isResizing = ref(false)
const startX = ref(0)
const initialWidth = ref(baseWidth)
let resizeFrame = 0
let pendingWidth = null

const applyWidth = (width) => {
  if (commentContainerRef.value) {
    commentContainerRef.value.style.width = `${width}px`
  }
}
const flushWidth = () => {
  resizeFrame = 0
  if (pendingWidth === null) {
    return
  }
  applyWidth(pendingWidth)
}
const startResize = (event) => {
  if (!commentContainerRef.value) {
    return
  }
  event.preventDefault()
  isResizing.value = true
  startX.value = event.clientX
  initialWidth.value = parseInt(
    getComputedStyle(commentContainerRef.value).width,
    10,
  )
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
}
const resize = (event) => {
  if (!isResizing.value) {
    return
  }
  const offsetX = startX.value - event.clientX
  pendingWidth = Math.min(
    maxWidth,
    Math.max(minWidth, initialWidth.value + offsetX),
  )
  if (!resizeFrame) {
    resizeFrame = requestAnimationFrame(flushWidth)
  }
}
const stopResize = () => {
  if (!isResizing.value) {
    return
  }
  isResizing.value = false
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
    flushWidth()
  }
  pendingWidth = null
}
onBeforeUnmount(() => {
  stopResize()
})

// Khi mở sidebar, cuộn tới comment đang active
watch(
  () => commentStore?.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        scrollToActive()
      })
    }
  },
)
const scrollToActive = () => {
  const id = commentStore?.activeId
  if (!id) {
    return
  }
  const el = commentContainerRef.value?.querySelector(
    `#kindy-comment-${id.replaceAll('_', '')}`,
  )
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// Tự mở chế độ nhập nội dung khi comment vừa được tạo (từ toolbar/bubble)
watch(
  () => commentStore?.pendingAdd,
  (val) => {
    if (!val) {
      return
    }
    const thread = commentStore?.getComment(commentStore?.activeId)
    commentStore?.consumePendingAdd()
    if (thread) {
      nextTick(() => {
        startEdit(thread)
      })
    }
  },
  { immediate: true },
)
</script>

<style lang="less">
.kindy-comment-container {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 80vw);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  z-index: 210;
  background-color: var(--kindy-color-white);
  border-left: solid 1px var(--kindy-border-color);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.06);

  .kindy-comment-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 14px 15px 10px;
    font-size: 15px;
    font-weight: 500;
    border-bottom: solid 1px var(--kindy-border-color-light);
    .kindy-comment-title-icon {
      font-size: 18px;
      color: var(--kindy-primary-color);
    }
    .kindy-comment-count {
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      box-sizing: border-box;
      border-radius: 9px;
      background-color: var(--kindy-primary-color);
      color: #fff;
      font-size: 12px;
      line-height: 18px;
      text-align: center;
    }
    .kindy-dialog__close {
      margin-left: auto;
    }
  }
  .kindy-comment-toolbar {
    padding: 10px 15px;
    border-bottom: solid 1px var(--kindy-border-color-light);
    .kindy-button-content {
      gap: 4px;
    }
  }
  .kindy-comment-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .kindy-comment-empty {
    margin-top: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--kindy-text-color-light);
    font-size: 13px;
    gap: 6px;

    .kindy-comment-empty-icon {
      font-size: 44px;
      opacity: 0.4;
      margin: 0 auto 6px auto;
      display: block;
    }

    .kindy-comment-empty-tip {
      font-size: 12px;
      opacity: 0.7;
    }
  }
  .kindy-comment-item {
    border: solid 1px var(--kindy-border-color);
    border-radius: var(--kindy-radius);
    padding: 10px;
    transition:
      box-shadow 0.2s ease,
      border-color 0.2s ease;
    &.active {
      border-color: var(--kindy-primary-color);
      box-shadow: 0 0 0 2px
        var(--kindy-primary-color-frozen, rgba(0, 0, 0, 0.04));
    }
    &.resolved {
      opacity: 0.65;
      background-color: rgba(0, 0, 0, 0.02);
    }
    .kindy-comment-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      .kindy-comment-item-user {
        font-size: 13px;
        font-weight: 500;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .kindy-comment-item-time {
        font-size: 12px;
        color: var(--kindy-text-color-light);
        white-space: nowrap;
      }
      .kindy-comment-item-actions {
        display: flex;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
    }
    &:hover .kindy-comment-item-actions {
      opacity: 1;
    }
    .kindy-comment-snippet {
      margin-top: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      &.resolved {
        background-color: rgba(0, 0, 0, 0.06);
        color: var(--kindy-text-color-light);
      }
    }
    .kindy-comment-body {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      cursor: pointer;
      .kindy-comment-body-empty {
        color: var(--kindy-text-color-light);
      }
    }
    .kindy-comment-edit {
      margin-top: 8px;
      .kindy-comment-edit-actions {
        display: flex;
        justify-content: flex-end;
        gap: 4px;
        margin-top: 6px;
      }
    }
    .kindy-comment-replies {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      .kindy-comment-reply {
        display: flex;
        gap: 6px;
        .kindy-comment-reply-body {
          flex: 1;
          background-color: var(--kindy-button-hover-background);
          border-radius: 4px;
          padding: 6px 8px;
          .kindy-comment-reply-name {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 500;
          }
          .kindy-comment-reply-text {
            margin-top: 2px;
            font-size: 13px;
            line-height: 1.5;
            word-break: break-word;
          }
        }
      }
    }
    .kindy-comment-reply-input {
      margin-top: 8px;
    }
    .kindy-comment-resolved-tip {
      margin-top: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      background-color: var(--kindy-button-hover-background);
      color: var(--kindy-text-color-light);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
  .kindy-comment-resize-handle {
    position: absolute;
    top: 0;
    left: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    background-color: transparent;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 4px;
      width: 2px;
      height: 100%;
      opacity: 0.5;
      background-color: transparent;
      transition: background-color 0.2s ease;
    }
    &:hover::before {
      background-color: var(--kindy-primary-color);
    }
  }
}
</style>
