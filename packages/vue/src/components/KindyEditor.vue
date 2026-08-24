<template>
  <div
    ref="containerRef"
    :class="['kindy-editor', className]"
    :style="editorStyle"
  >
    <div class="kindy-viewport">
      <div class="kindy-viewport-content">
        <div
          v-for="page in pages"
          :key="page.pageNumber"
          :data-page="page.pageNumber"
          class="kindy-page"
        >
          <div class="kindy-page-content">
            <!-- Page content will be rendered here -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useEditor } from '../composables/useEditor'

// ─── Props ──────────────────────────────────────────────────────────────────

const props = defineProps({
  className: {
    type: String,
    default: '',
  },
  config: {
    type: Object,
    default: () => ({}),
  },
})

// ─── Editor Setup ───────────────────────────────────────────────────────────

const {
  document,
  layout,
  pageOptions,
  updateDocument,
  updateSelection,
} = useEditor(props.config)

// ─── Refs ───────────────────────────────────────────────────────────────────

const containerRef = ref(null)

// ─── Computed ───────────────────────────────────────────────────────────────

const pages = computed(() => layout.value?.pages || [])

const editorStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}))
</script>

<style scoped>
.kindy-editor {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
}

.kindy-editor:focus {
  outline: none;
}

.kindy-viewport {
  flex: 1;
  overflow: auto;
  background-color: #f1f5f9;
}

.kindy-viewport-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.kindy-page {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 2px;
  position: relative;
}
</style>
