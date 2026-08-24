<template>
  <div class="kindy-status-bar">
    <div class="kindy-status-left">
      <span class="kindy-status-item">Page {{ page }} of {{ totalPages }}</span>
      <span class="kindy-status-divider">|</span>
      <span class="kindy-status-item">{{ wordCount }} words</span>
      <span class="kindy-status-divider">|</span>
      <span class="kindy-status-item">{{ charCount }} characters</span>
    </div>

    <div class="kindy-status-right">
      <div class="kindy-zoom-controls">
        <button class="kindy-zoom-btn" @click="zoomOut">−</button>
        <span class="kindy-zoom-value">{{ zoom }}%</span>
        <button class="kindy-zoom-btn" @click="zoomIn">+</button>
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
.kindy-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.kindy-status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kindy-status-item {
  font-size: 12px;
}

.kindy-status-divider {
  color: #cbd5e1;
}

.kindy-status-right {
  display: flex;
  align-items: center;
}

.kindy-zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.kindy-zoom-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.kindy-zoom-btn:hover {
  background-color: #f1f5f9;
}

.kindy-zoom-value {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
}
</style>
