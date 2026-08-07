<template>
  <div v-if="suggestions.length > 0" class="kindy-suggestions-panel">
    <div class="suggestions-header">
      <icon name="edit" />
      <span>ĐỀ XUẤT CHỈNH SỬA ({{ suggestions.length }})</span>
    </div>

    <div class="suggestions-list">
      <div
        v-for="item in suggestions"
        :key="item.id"
        class="suggestion-card"
      >
        <div class="card-author">
          <t-avatar size="small" :content="item.author?.name?.[0] || 'U'" />
          <span class="author-name">{{ item.author?.name || 'Người dùng' }}</span>
          <span class="card-time">{{ item.createdAt }}</span>
        </div>

        <div class="card-content">
          <span class="action-type" :class="item.type">
            {{ item.type === 'insert' ? 'Thêm:' : 'Xóa:' }}
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
            ✓ Duyệt
          </t-button>
          <t-button
            theme="default"
            size="small"
            variant="outline"
            @click="rejectSuggestion(item.id)"
          >
            ✗ Từ chối
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const suggestions = ref([
  {
    id: 'sug-1',
    type: 'insert',
    text: 'tính năng cộng tác thời gian thực',
    author: { name: 'Nguyễn Văn A' },
    createdAt: 'Vừa xong',
  },
])

const acceptSuggestion = (id) => {
  const idx = suggestions.value.findIndex((s) => s.id === id)
  if (idx !== -1) suggestions.value.splice(idx, 1)
}

const rejectSuggestion = (id) => {
  const idx = suggestions.value.findIndex((s) => s.id === id)
  if (idx !== -1) suggestions.value.splice(idx, 1)
}
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
