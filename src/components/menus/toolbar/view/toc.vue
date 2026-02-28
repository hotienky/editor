<template>
  <menus-button
    ico="toc"
    :text="page.showToc ? t('toc.hide') : t('toc.show')"
    huge
    @menu-click="page.showToc = !page.showToc"
  />
</template>

<script setup>
const page = inject('page')
</script>
