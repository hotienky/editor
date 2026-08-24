<template>
  <menus-button
    ico="hard-break"
    :text="t('insert.hardBreak')"
    huge
    @menu-click="editor?.chain().focus().setHardBreak().run()"
  />
</template>

<script setup>
const editor = inject('editor')
</script>
