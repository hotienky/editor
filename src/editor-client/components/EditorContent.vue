<template>
  <div class="umo-editor-content" ref="containerRef">
    <div class="umo-viewport">
      <div class="umo-viewport-content">
        <div
          v-for="page in pages"
          :key="page.pageNumber"
          :data-page="page.pageNumber"
          class="umo-page"
          :style="getPageStyle(page)"
        >
          <div class="umo-page-content" :style="getContentStyle()">
            <!-- Page content rendered here -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'

const props = defineProps({
  document: {
    type: Object,
    default: null,
  },
  layout: {
    type: Object,
    default: null,
  },
  pageOptions: {
    type: Object,
    default: () => ({}),
  },
  selection: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:document', 'update:selection'])

// ─── Refs ───────────────────────────────────────────────────────────────────

const containerRef = ref(null)

// ─── Computed ───────────────────────────────────────────────────────────────

const pages = computed(() => props.layout?.pages || [])

// ─── Methods ────────────────────────────────────────────────────────────────

const getPageStyle = (page) => {
  const size = props.pageOptions.size || { width: 21, height: 29.7 }
  const orientation = props.pageOptions.orientation || 'portrait'

  const width = orientation === 'landscape' ? size.height : size.width
  const height = orientation === 'landscape' ? size.width : size.height

  return {
    width: `${width}cm`,
    minHeight: `${height}cm`,
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: '2px',
    position: 'relative',
  }
}

const getContentStyle = () => {
  const margin = props.pageOptions.margin || {}
  return {
    padding: `${margin.top || 2.54}cm ${margin.right || 2.54}cm ${margin.bottom || 2.54}cm ${margin.left || 2.54}cm`,
  }
}
</script>

<style scoped>
.umo-editor-content {
  flex: 1;
  overflow: auto;
  background-color: #f1f5f9;
}

.umo-viewport {
  min-height: 100%;
}

.umo-viewport-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.umo-page {
  /* Page styles */
}

.umo-page-content {
  /* Page content styles */
}
</style>
