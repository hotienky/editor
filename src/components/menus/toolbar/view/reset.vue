<template>
  <menus-button
    ico="clear-cache"
    :text="t('resetAll.title')"
    huge
    @menu-click="reset(false)"
  />
</template>

<script setup>
const reset = inject('reset')
</script>
