<template>
  <menus-button
    ico="viewer"
    :text="t('base.viewer')"
    huge
    @menu-click="viewer = true"
  />
</template>

<script setup>
const viewer = inject('viewer')
</script>
