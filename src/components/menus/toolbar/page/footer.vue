<template>
  <menus-button
    ico="page-footer"
    :text="page.footer?.enable ? t('page.footer.hide') : t('page.footer.show')"
    huge
    @menu-click="toggleFooter"
  />
</template>

<script setup>
import { inject } from 'vue'

const page = inject('page')

const toggleFooter = () => {
  if (!page.value.footer) {
    page.value.footer = { enable: true, text: '' }
  }
  page.value.footer.enable = !page.value.footer.enable
}
</script>
