<template>
  <div v-if="suggestions.length > 0" class="kindy-suggestions-panel">
    <div class="suggestions-header">
      <icon name="edit" />
      <span>{{ t('suggestions.title', { count: suggestions.length }) }}</span>
    </div>

    <div class="suggestions-list">
      <div
        v-for="item in suggestions"
        :key="item.id"
        class="suggestion-card"
      >
        <div class="card-author">
          <t-avatar size="small" :content="item.author?.[0] || 'U'" />
          <span class="author-name">{{ item.author || t('suggestions.defaultAuthor') }}</span>
          <span class="card-time">{{ formatTime(item.timestamp) }}</span>
        </div>

        <div class="card-content">
          <span class="action-type" :class="item.type">
            {{ item.type === 'insert' ? t('suggestions.actionInsert') : t('suggestions.actionDelete') }}
          </span>
          <span class="text-snippet">"{{ item.text }}"</span>
        </div>

        <div class="card-actions">
          <t-button
            theme="primary"
            size="small"
            variant="base"
            @click="acceptSuggestion(item.id)"
          >
            {{ t('suggestions.accept') }}
          </t-button>
          <t-button
            theme="default"
            size="small"
            variant="outline"
            @click="rejectSuggestion(item.id)"
          >
            {{ t('suggestions.reject') }}
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { collectTrackChanges } from '@/collaboration/track-changes'

const editor = inject('editor')
const suggestions = ref([])
let attachedEditor = null

const refresh = () => {
  suggestions.value = collectTrackChanges(editor.value?.state)
}

const onTransaction = () => refresh()
watch(editor, (value) => {
  attachedEditor?.off('transaction', onTransaction)
  attachedEditor = value
  attachedEditor?.on('transaction', onTransaction)
  refresh()
}, { immediate: true })
onBeforeUnmount(() => attachedEditor?.off('transaction', onTransaction))

const acceptSuggestion = (id) => {
  editor.value?.commands?.acceptTrackChange?.(id)
  refresh()
}

const rejectSuggestion = (id) => {
  editor.value?.commands?.rejectTrackChange?.(id)
  refresh()
}

const formatTime = (timestamp) => timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(Number(timestamp))) : ''
</script>

<style lang="less" scoped>
.kindy-suggestions-panel {
  width: 240px;
  background: #ffffff;
  border-left: 1px solid var(--kindy-border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  user-select: none;
  z-index: 10;

  .suggestions-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #64748b;
  }

  .suggestions-list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .suggestion-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    .card-author {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;

      .author-name {
        font-weight: 600;
        color: #334155;
      }

      .card-time {
        font-size: 10px;
        color: #94a3b8;
        margin-left: auto;
      }
    }

    .card-content {
      font-size: 12px;
      line-height: 1.4;

      .action-type {
        font-weight: 700;
        margin-right: 4px;

        &.insert {
          color: #16a34a;
        }

        &.delete {
          color: #dc2626;
          text-decoration: line-through;
        }
      }

      .text-snippet {
        color: #475569;
        font-style: italic;
      }
    }

    .card-actions {
      display: flex;
      gap: 6px;
      margin-top: 4px;

      button {
        flex: 1;
      }
    }
  }
}
</style>

<style>
.kindy-editor-container span[data-track][data-track-type='insert'] { background: color-mix(in srgb, #22c55e 18%, transparent); text-decoration: underline; text-decoration-color: #16a34a; }
.kindy-editor-container span[data-track][data-track-type='delete'] { background: color-mix(in srgb, #ef4444 14%, transparent); color: #b91c1c; text-decoration: line-through; }
</style>
