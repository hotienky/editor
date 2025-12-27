<template>
  <menus-button
    ico="tag"
    :text="t('insert.tag')"
    huge
    @menu-click="editor?.chain().focus().insertTag().run()"
  />
</template>

<script setup>
const editor = inject('editor')
</script>
