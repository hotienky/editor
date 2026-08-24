<template>
  <div class="kindy-document-tabs">
    <div class="kindy-tabs-list">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="kindy-tab"
        :class="{ active: tab.id === activeTab }"
        @click="$emit('select', tab.id)"
      >
        <span class="kindy-tab-title">{{ tab.title }}</span>
        <button
          v-if="tabs.length > 1"
          class="kindy-tab-close"
          @click.stop="$emit('close', tab.id)"
        >
          ×
        </button>
      </div>
    </div>
    <button class="kindy-tab-add" @click="$emit('add')">+</button>
  </div>
</template>

<script setup>
const props = defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  activeTab: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select', 'close', 'add'])
</script>

<style scoped>
.kindy-document-tabs {
  display: flex;
  align-items: center;
  width: 200px;
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.kindy-tabs-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

.kindy-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
}

.kindy-tab:hover {
  background-color: #f1f5f9;
}

.kindy-tab.active {
  background-color: #e0e7ff;
  border-left: 3px solid #3b82f6;
}

.kindy-tab-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kindy-tab-close {
  padding: 0 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
}

.kindy-tab-close:hover {
  color: #ef4444;
}

.kindy-tab-add {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
}

.kindy-tab-add:hover {
  background-color: #f1f5f9;
}
</style>
