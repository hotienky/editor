<template>
  <menus-button
    ico="page-break"
    :text="t('page.break')"
    shortcut="Ctrl+Enter"
    huge
    @menu-click="setPageBreak"
  />
</template>

<script setup>
import { useDocumentTabs } from '@/composables/document-tabs'

const editor = inject('editor')
const { addTab } = useDocumentTabs()

const setPageBreak = () => {
  if (editor.value) {
    editor.value.chain().focus().setPageBreak().run()
  }
}
</script>
