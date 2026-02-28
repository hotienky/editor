<template>
  <menus-button
    ico="layout-web"
    :text="t('layout.web')"
    huge
    :menu-active="page.layout === 'web'"
    @menu-click="page.layout = 'web'"
  />
</template>

<script setup>
const page = inject('page')
</script>
