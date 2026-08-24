<template>
  <div
    :class="['kindy-toolbar', className]"
    :style="toolbarStyle"
  >
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ─── Props ──────────────────────────────────────────────────────────────────

const props = defineProps({
  className: {
    type: String,
    default: '',
  },
})

// ─── Computed ───────────────────────────────────────────────────────────────

const toolbarStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
}))
</script>

<style scoped>
.kindy-toolbar {
  /* Toolbar styles */
}
</style>
