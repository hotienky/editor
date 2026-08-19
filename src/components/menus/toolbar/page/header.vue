<template>
  <menus-button
    ico="page-header"
    :text="t('page.header.text')"
    huge
    @menu-click="openHeaderDialog"
  />
</template>

<script setup>
import { inject } from 'vue'

const page = inject('page')
const editor = inject('editor')

const openHeaderDialog = () => {
  if (!page.value.header) {
    page.value.header = { enable: true }
  } else {
    page.value.header.enable = true
  }
  if (editor.value) {
    editor.value.emit('open-header-footer', 'header')
  }
}
</script>
