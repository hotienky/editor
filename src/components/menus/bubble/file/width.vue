<template>
  <menus-button
    ico="auto-width"
    :text="t('bubbleMenu.file.autoWidth')"
    :menu-active="editor?.getAttributes('file')?.fitWidth"
    @menu-click="changeWidth"
  />
</template>

<script setup>
const editor = inject('editor')

const changeWidth = () => {
  const { fitWidth } = editor.value.getAttributes('file')
  editor.value?.commands.updateAttributes('file', {
    fitWidth: !fitWidth,
  })
}
</script>
