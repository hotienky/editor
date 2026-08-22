<template>
  <div
    :class="['umo-page', className]"
    :data-page="page.pageNumber"
    :style="pageStyle"
  >
    <div class="umo-page-content" :style="contentStyle">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ─── Props ──────────────────────────────────────────────────────────────────

const props = defineProps({
  page: {
    type: Object,
    required: true,
  },
  pageOptions: {
    type: Object,
    default: () => ({}),
  },
  className: {
    type: String,
    default: '',
  },
})

// ─── Computed ───────────────────────────────────────────────────────────────

const pageStyle = computed(() => {
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
})

const contentStyle = computed(() => {
  const margin = props.pageOptions.margin || {}
  return {
    padding: `${margin.top || 2.54}cm ${margin.right || 2.54}cm ${margin.bottom || 2.54}cm ${margin.left || 2.54}cm`,
  }
})
</script>

<style scoped>
.umo-page {
  /* Page styles */
}

.umo-page-content {
  /* Page content styles */
}
</style>
