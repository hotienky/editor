<template>
  <menus-button
    ico="preview"
    :text="t('preview.title')"
    huge
    :menu-active="page.preview.enabled"
    @menu-click="page.preview.enabled = !page.preview.enabled"
  />
</template>

<script setup>
const page = inject('page')
</script>
