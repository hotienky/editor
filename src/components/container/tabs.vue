<template>
  <div v-if="isTabsVisible" class="kindy-tabs-sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <div class="kindy-tabs-header">
      <div v-if="!isCollapsed" class="tabs-title">
        <icon name="file" />
        <span>TABS TÀI LIỆU ({{ tabs.length }})</span>
      </div>
      <t-button
        variant="text"
        shape="square"
        size="small"
        @click="isCollapsed = !isCollapsed"
      >
        <icon :name="isCollapsed ? 'chevron-right' : 'chevron-left'" />
      </t-button>
    </div>

    <div v-if="!isCollapsed" class="kindy-tabs-list">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.id"
        class="kindy-tab-item"
        :class="{ 'is-active': tab.id === activeTabId }"
        @click="switchTab(tab.id)"
      >
        <icon name="file-text" class="tab-icon" />
        <span v-if="editingTabId !== tab.id" class="tab-label" @dblclick.stop="startRename(tab)">
          {{ tab.title }}
        </span>
        <input
          v-else
          v-model="renameTitle"
          class="tab-rename-input"
          @blur="saveRename(tab.id)"
          @keyup.enter="saveRename(tab.id)"
        />

        <div class="tab-actions">
          <t-dropdown :options="getTabMenuOptions(tab, index)" @click="(data) => handleTabAction(tab, data)">
            <t-button variant="text" shape="square" size="small" @click.stop>
              <icon name="more" />
            </t-button>
          </t-dropdown>
        </div>
      </div>

      <t-button
        block
        variant="dashed"
        size="small"
        class="add-tab-btn"
        @click="addTab()"
      >
        <icon name="add" /> Thêm Tab mới
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useDocumentTabs } from '@/composables/document-tabs'

const editor = inject('editor')
const {
  tabs,
  activeTabId,
  isTabsVisible,
  addTab,
  removeTab,
  duplicateTab,
  moveTab,
  switchTab,
  renameTab,
} = useDocumentTabs(editor)

const isCollapsed = ref(false)
const editingTabId = ref(null)
const renameTitle = ref('')

const startRename = (tab) => {
  editingTabId.value = tab.id
  renameTitle.value = tab.title
}

const saveRename = (id) => {
  if (editingTabId.value) {
    renameTab(id, renameTitle.value)
    editingTabId.value = null
  }
}

const getTabMenuOptions = (tab, index) => [
  { content: 'Đổi tên (Rename)', value: 'rename' },
  { content: 'Nhân bản (Duplicate)', value: 'duplicate' },
  { content: 'Di chuyển lên', value: 'move-up', disabled: index === 0 },
  { content: 'Di chuyển xuống', value: 'move-down', disabled: index === tabs.value.length - 1 },
  { content: 'Xóa Tab', value: 'delete', disabled: tabs.value.length <= 1 },
]

const handleTabAction = (tab, data) => {
  switch (data.value) {
    case 'rename':
      startRename(tab)
      break
    case 'duplicate':
      duplicateTab(tab.id)
      break
    case 'move-up':
      moveTab(tab.id, -1)
      break
    case 'move-down':
      moveTab(tab.id, 1)
      break
    case 'delete':
      removeTab(tab.id)
      break
  }
}
</script>

<style lang="less" scoped>
.kindy-tabs-sidebar {
  width: 220px;
  background: #ffffff;
  border-right: 1px solid var(--kindy-border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  user-select: none;
  z-index: 10;

  &.is-collapsed {
    width: 42px;
  }

  .kindy-tabs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f1f5f9;

    .tabs-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #64748b;
    }
  }

  .kindy-tabs-list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow-y: auto;
  }

  .kindy-tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: #334155;
    transition: background 0.15s ease;

    &:hover {
      background: #f1f5f9;
    }

    &.is-active {
      background: #e0f2fe;
      color: #0284c7;
      font-weight: 600;
    }

    .tab-icon {
      font-size: 15px;
      flex-shrink: 0;
    }

    .tab-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tab-rename-input {
      flex: 1;
      border: 1px solid #0284c7;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 12px;
      outline: none;
    }

    .tab-actions {
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    &:hover .tab-actions {
      opacity: 1;
    }
  }

  .add-tab-btn {
    margin-top: 8px;
  }
}
</style>
