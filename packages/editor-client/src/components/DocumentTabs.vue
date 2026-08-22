<template>
  <div class="umo-document-tabs">
    <div class="umo-tabs-list">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="umo-tab"
        :class="{ active: tab.id === activeTab }"
        @click="$emit('select', tab.id)"
      >
        <span class="umo-tab-title">{{ tab.title }}</span>
        <button
          v-if="tabs.length > 1"
          class="umo-tab-close"
          @click.stop="$emit('close', tab.id)"
        >
          ×
        </button>
      </div>
    </div>
    <button class="umo-tab-add" @click="$emit('add')">+</button>
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
.umo-document-tabs {
  display: flex;
  align-items: center;
  width: 200px;
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.umo-tabs-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}

.umo-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
}

.umo-tab:hover {
  background-color: #f1f5f9;
}

.umo-tab.active {
  background-color: #e0e7ff;
  border-left: 3px solid #3b82f6;
}

.umo-tab-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.umo-tab-close {
  padding: 0 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
}

.umo-tab-close:hover {
  color: #ef4444;
}

.umo-tab-add {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
}

.umo-tab-add:hover {
  background-color: #f1f5f9;
}
</style>
