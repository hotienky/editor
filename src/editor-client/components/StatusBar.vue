<template>
  <div class="umo-status-bar">
    <div class="umo-status-left">
      <span class="umo-status-item">Page {{ page }} of {{ totalPages }}</span>
      <span class="umo-status-divider">|</span>
      <span class="umo-status-item">{{ wordCount }} words</span>
      <span class="umo-status-divider">|</span>
      <span class="umo-status-item">{{ charCount }} characters</span>
    </div>

    <div class="umo-status-right">
      <div class="umo-zoom-controls">
        <button class="umo-zoom-btn" @click="zoomOut">−</button>
        <span class="umo-zoom-value">{{ zoom }}%</span>
        <button class="umo-zoom-btn" @click="zoomIn">+</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  charCount: {
    type: Number,
    default: 0,
  },
  zoom: {
    type: Number,
    default: 100,
  },
})

const emit = defineEmits(['update:zoom'])

const zoomIn = () => {
  emit('update:zoom', Math.min(500, props.zoom + 10))
}

const zoomOut = () => {
  emit('update:zoom', Math.max(25, props.zoom - 10))
}
</script>

<style scoped>
.umo-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.umo-status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.umo-status-item {
  font-size: 12px;
}

.umo-status-divider {
  color: #cbd5e1;
}

.umo-status-right {
  display: flex;
  align-items: center;
}

.umo-zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.umo-zoom-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.umo-zoom-btn:hover {
  background-color: #f1f5f9;
}

.umo-zoom-value {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
}
</style>
