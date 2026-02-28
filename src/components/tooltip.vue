<template>
  <t-tooltip
    :content="content"
    theme="light"
    placement="top"
    :attach="container"
    :show-arrow="false"
    destroy-on-close
  >
    <slot />
  </t-tooltip>
</template>

<script setup>
defineProps({
  content: {
    type: String,
    required: true,
  },
})
const container = inject('container')
</script>
