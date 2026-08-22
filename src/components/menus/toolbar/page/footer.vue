<template>
  <menus-button
    ico="page-footer"
    :text="t('page.footer.text')"
    huge
    @menu-click="openFooterDialog"
  />
</template>

<script setup>
import { inject } from 'vue'

const page = inject('page')
const editor = inject('editor')

const openFooterDialog = () => {
  if (!page.value.footer) {
    page.value.footer = { enable: true }
  } else {
    page.value.footer.enable = true
  }
  if (editor.value) {
    editor.value.emit('open-header-footer', 'footer')
  }
}
</script>
