<template>
  <menus-button
    ico="auto-width"
    :text="t('bubbleMenu.file.autoWidth')"
    :menu-active="!!editor?.getAttributes('file')?.width"
    @menu-click="changeWidth"
  />
</template>

<script setup>
const editor = inject('editor')

const changeWidth = () => {
  const { width } = editor.value.getAttributes('file')
  editor.value?.commands.updateAttributes('file', {
    width: width ? null : '100%',
  })
}
</script>
