<template>
  <header class="kindy-editor-header">
    <div class="kindy-editor-header-left">
      <div class="kindy-logo">
        <span class="kindy-logo-icon">📝</span>
        <span class="kindy-logo-text">Kindy Editor</span>
      </div>
    </div>

    <div class="kindy-editor-header-center">
      <input
        v-model="title"
        class="kindy-title-input"
        type="text"
        placeholder="Untitled Document"
        @blur="handleTitleBlur"
      />
      <span v-if="isSaving" class="kindy-save-status">Saving...</span>
      <span v-else class="kindy-save-status saved">Saved</span>
    </div>

    <div class="kindy-editor-header-right">
      <button class="kindy-btn kindy-btn-ghost" @click="$emit('export')">
        Export
      </button>
      <button class="kindy-btn kindy-btn-primary" @click="$emit('save')">
        Save
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Untitled Document',
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:title', 'save', 'export'])

const title = ref(props.title)

watch(
  () => props.title,
  (newTitle) => {
    title.value = newTitle
  },
)

const handleTitleBlur = () => {
  emit('update:title', title.value)
}
</script>

<style scoped>
.kindy-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.kindy-editor-header-left {
  display: flex;
  align-items: center;
}

.kindy-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.kindy-logo-icon {
  font-size: 20px;
}

.kindy-editor-header-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kindy-title-input {
  border: none;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  outline: none;
  min-width: 200px;
}

.kindy-save-status {
  font-size: 12px;
  color: #94a3b8;
}

.kindy-save-status.saved {
  color: #22c55e;
}

.kindy-editor-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kindy-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.kindy-btn-primary {
  background-color: #3b82f6;
  color: #fff;
}

.kindy-btn-primary:hover {
  background-color: #2563eb;
}

.kindy-btn-ghost {
  background-color: transparent;
  color: #64748b;
}

.kindy-btn-ghost:hover {
  background-color: #f1f5f9;
}
</style>
