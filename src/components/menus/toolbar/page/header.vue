<template>
  <menus-button
    ico="page-header"
    :text="page.header?.enable ? t('page.header.hide') : t('page.header.show')"
    huge
    @menu-click="toggleHeader"
  />
</template>

<script setup>
import { inject } from 'vue'

const page = inject('page')

const toggleHeader = () => {
  if (!page.value.header) {
    page.value.header = { enable: true, text: '' }
  }
  page.value.header.enable = !page.value.header.enable
}
</script>
