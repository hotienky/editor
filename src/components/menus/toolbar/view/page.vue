<template>
  <menus-button
    ico="layout-page"
    :text="t('layout.page')"
    huge
    :menu-active="page.layout === 'page'"
    @menu-click="page.layout = 'page'"
  />
</template>

<script setup>
const page = inject('page')
</script>
