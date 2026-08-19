<template>
  <header class="umo-editor-header">
    <div class="umo-editor-header-left">
      <div class="umo-logo">
        <span class="umo-logo-icon">📝</span>
        <span class="umo-logo-text">UMO Editor</span>
      </div>
    </div>

    <div class="umo-editor-header-center">
      <input
        v-model="title"
        class="umo-title-input"
        type="text"
        placeholder="Untitled Document"
        @blur="handleTitleBlur"
      />
      <span v-if="isSaving" class="umo-save-status">Saving...</span>
      <span v-else class="umo-save-status saved">Saved</span>
    </div>

    <div class="umo-editor-header-right">
      <button class="umo-btn umo-btn-ghost" @click="$emit('export')">
        Export
      </button>
      <button class="umo-btn umo-btn-primary" @click="$emit('save')">
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
.umo-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.umo-editor-header-left {
  display: flex;
  align-items: center;
}

.umo-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.umo-logo-icon {
  font-size: 20px;
}

.umo-editor-header-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.umo-title-input {
  border: none;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  outline: none;
  min-width: 200px;
}

.umo-save-status {
  font-size: 12px;
  color: #94a3b8;
}

.umo-save-status.saved {
  color: #22c55e;
}

.umo-editor-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.umo-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.umo-btn-primary {
  background-color: #3b82f6;
  color: #fff;
}

.umo-btn-primary:hover {
  background-color: #2563eb;
}

.umo-btn-ghost {
  background-color: transparent;
  color: #64748b;
}

.umo-btn-ghost:hover {
  background-color: #f1f5f9;
}
</style>
