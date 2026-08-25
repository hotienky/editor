<template>
  <div
    ref="rootEl"
    class="kindy-float-comment"
    :class="{
      active: isActive || isExpanded,
      resolved: comment.resolved,
    }"
    :style="{ top: position.top + 'px', '--comment-accent': comment.color }"
  >
    <!-- Compact indicator (Google Docs style) -->
    <div
      v-if="!isExpanded"
      class="kindy-float-comment-indicator"
      @click="expand"
    >
      <div class="indicator-line" :style="{ background: comment.color }" />
      <div class="indicator-avatar" :style="{ background: comment.color }">
        {{ comment.user?.[0] || '?' }}
      </div>
      <div class="indicator-snippet">{{ comment.text || snippet || '' }}</div>
      <div class="indicator-meta">
        <span class="indicator-author">{{ comment.user }}</span>
        <span v-if="comment.replies?.length" class="indicator-replies">{{ comment.replies.length }}</span>
      </div>
    </div>

    <!-- Expanded card -->
    <div v-else class="kindy-float-comment-card">
      <div class="card-header">
        <div class="card-avatar" :style="{ background: comment.color }">
          {{ comment.user?.[0] || '?' }}
        </div>
        <div class="card-meta">
          <span class="card-author">{{ comment.user }}</span>
          <span class="card-time">{{ formatTime(comment.createdAt) }}</span>
        </div>
        <button class="card-collapse" @click="isExpanded = false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Comment body -->
      <div v-if="editingId !== comment.id" class="card-body" @dblclick="startEdit">
        {{ comment.text || '' }}
      </div>

      <!-- Edit mode -->
      <div v-else class="card-edit">
        <textarea
          ref="editInput"
          v-model="draft"
          :placeholder="t('comment.placeholder')"
          maxlength="500"
          class="card-edit-input"
          @blur="saveEdit"
          @keydown.escape="cancelEdit"
        />
        <div class="card-edit-actions">
          <button class="btn-ghost" @mousedown.prevent="cancelEdit">Hủy</button>
          <button class="btn-primary" @mousedown.prevent="saveEdit">Lưu</button>
        </div>
      </div>

      <!-- Replies -->
      <div v-if="comment.replies?.length" class="card-replies">
        <div v-for="reply in comment.replies" :key="reply.id" class="card-reply">
          <div class="reply-avatar" :style="{ background: getColor(reply.user) }">
            {{ reply.user?.[0] || '?' }}
          </div>
          <div class="reply-content">
            <div class="reply-meta">
              <span class="reply-author">{{ reply.user }}</span>
              <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
            </div>
            <div class="reply-text">{{ reply.text }}</div>
          </div>
        </div>
      </div>

      <!-- Reply input -->
      <div v-if="!comment.resolved" class="card-reply-input">
        <input
          v-model="replyDraft"
          placeholder="Trả lời..."
          :disabled="!editor?.isEditable"
          class="reply-input"
          @keydown.enter="onReply"
        />
      </div>

      <!-- Actions -->
      <div class="card-actions">
        <button
          class="action-btn"
          :class="{ resolved: comment.resolved }"
          :disabled="!editor?.isEditable"
          @click.stop="$emit('resolve', comment.id)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <template v-if="comment.resolved">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </template>
            <template v-else>
              <polyline points="20 6 9 17 4 12" />
            </template>
          </svg>
          {{ comment.resolved ? 'Mở lại' : 'Giải quyết' }}
        </button>
        <button
          class="action-btn danger"
          :disabled="!editor?.isEditable"
          @click.stop="$emit('delete', comment.id)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, nextTick, watch } from 'vue'
import { colorForUser } from '@/composables/comment-store'

const props = defineProps({
  comment: { type: Object, required: true },
  position: { type: Object, required: true },
  snippet: { type: String, default: '' },
  isActive: { type: Boolean, default: false },
  editingId: { type: String, default: null },
})

const emit = defineEmits(['focus', 'resolve', 'delete', 'edit', 'save-edit', 'cancel-edit', 'reply', 'measured'])

const editor = inject('editor')
const { t } = useI18n()

const rootEl = ref(null)
const isExpanded = ref(false)
const draft = ref(props.comment.text || '')
const replyDraft = ref('')
const editInput = ref(null)

const measureHeight = () => {
  nextTick(() => {
    const el = rootEl.value
    if (el) {
      const h = el.getBoundingClientRect().height
      if (h > 0) emit('measured', h)
    }
  })
}

const getColor = (user) => colorForUser(user || 'anonymous')

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút`
  if (hrs < 24) return `${hrs} giờ`
  if (days < 7) return `${days} ngày`
  return d.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
}

const expand = () => {
  isExpanded.value = true
  emit('focus', props.comment.id)
}

watch(
  () => props.editingId,
  (val) => {
    if (val === props.comment.id) {
      isExpanded.value = true
      draft.value = props.comment.text || ''
      nextTick(() => editInput.value?.focus())
    }
  },
)

const startEdit = () => {
  if (!editor?.value?.isEditable) return
  emit('edit', props.comment.id)
}

const saveEdit = () => {
  emit('save-edit', props.comment.id, draft.value.trim())
}

const cancelEdit = () => {
  emit('cancel-edit', props.comment.id)
}

const onReply = () => {
  const text = replyDraft.value.trim()
  if (!text) return
  emit('reply', props.comment.id, text)
  replyDraft.value = ''
}

onMounted(measureHeight)
onUpdated(measureHeight)
</script>

<style lang="less">
.kindy-float-comment {
  position: absolute;
  left: 0;
  width: 280px;
  z-index: 200;
  pointer-events: auto;
  transition: opacity 0.15s ease;

  &.resolved {
    opacity: 0.5;
  }

  &.active .kindy-float-comment-indicator {
    box-shadow: 0 0 0 2px var(--comment-accent, #1a73e8);
  }
}

/* ─── Compact Indicator ──────────────────────────────────────────────── */
.kindy-float-comment-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  max-width: 280px;

  &:hover {
    border-color: var(--comment-accent, #1a73e8);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }
}

.indicator-line {
  width: 3px;
  height: 24px;
  min-height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
}

.indicator-avatar {
  width: 22px;
  height: 22px;
  min-width: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.indicator-snippet {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.indicator-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.indicator-author {
  font-size: 10px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.indicator-replies {
  font-size: 9px;
  color: #999;
  background: #f0f0f0;
  padding: 0 4px;
  border-radius: 8px;
}

/* ─── Expanded Card ──────────────────────────────────────────────────── */
.kindy-float-comment-card {
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-avatar {
  width: 26px;
  height: 26px;
  min-width: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.card-meta {
  flex: 1;
  min-width: 0;
}

.card-author {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #202124;
  line-height: 1.2;
}

.card-time {
  display: block;
  font-size: 10px;
  color: #999;
  line-height: 1.2;
}

.card-collapse {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  padding: 0;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: #f1f3f4;
    color: #333;
  }
}

.card-body {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.4;
  color: #333;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: text;
  max-height: 120px;
  overflow-y: auto;
}

.card-edit {
  margin-top: 8px;
}

.card-edit-input {
  width: 100%;
  min-height: 50px;
  padding: 6px 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.4;
  resize: vertical;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 1px #1a73e8;
  }
}

.card-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

.btn-ghost {
  padding: 4px 10px;
  border: none;
  background: none;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  &:hover { background: #f1f3f4; }
}

.btn-primary {
  padding: 4px 10px;
  border: none;
  background: #1a73e8;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  &:hover { background: #1557b0; }
}

/* ─── Replies ────────────────────────────────────────────────────────── */
.card-replies {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-reply {
  display: flex;
  gap: 6px;
}

.reply-avatar {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  margin-top: 1px;
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reply-author {
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.reply-time {
  font-size: 10px;
  color: #999;
}

.reply-text {
  margin-top: 1px;
  font-size: 12px;
  line-height: 1.3;
  color: #444;
  word-break: break-word;
}

/* ─── Reply Input ────────────────────────────────────────────────────── */
.card-reply-input {
  margin-top: 8px;
}

.reply-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  background: #f8f9fa;
  box-sizing: border-box;
  transition: background 0.15s, border-color 0.15s;

  &::placeholder { color: #999; }
  &:focus { background: #fff; border-color: #1a73e8; }
  &:disabled { opacity: 0.5; }
}

/* ─── Actions ────────────────────────────────────────────────────────── */
.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: none;
  background: none;
  border-radius: 4px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;

  &:hover:not(:disabled) {
    background: #f1f3f4;
    color: #333;
  }
  &:disabled { opacity: 0.3; cursor: default; }
  &.resolved { color: #1a73e8; }
  &.danger:hover:not(:disabled) { color: #d93025; }
}
</style>
