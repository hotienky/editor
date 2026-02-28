<template>
  <menus-button
    ico="footnote"
    :text="t('insert.footnote')"
    huge
    @menu-click="editor?.commands.addFootnote"
  />
</template>

<script setup>
const editor = inject('editor')
</script>
