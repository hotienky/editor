<template>
  <menus-button
    ico="video"
    :text="t('insert.video')"
    huge
    @menu-click="
      editor
        ?.chain()
        .focus()
        .selectFiles('video', container, uploadFileMap)
        .run()
    "
  />
</template>

<script setup>
const container = inject('container')
const editor = inject('editor')
const uploadFileMap = inject('uploadFileMap')
</script>
