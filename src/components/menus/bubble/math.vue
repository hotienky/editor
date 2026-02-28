<template>
  <menus-toolbar-tools-math
    ico="edit"
    :tooltip="t('tools.math.edit')"
    :latex="latex"
    :type="type"
  />
</template>

<script setup>
const editor = inject('editor')

const type = computed(() => {
  if (editor.value?.isActive('blockMath')) {
    return 'block'
  }
  if (editor.value?.isActive('inlineMath')) {
    return 'inline'
  }
  return null
})

const latex = computed(() => {
  let node = null
  if (editor.value?.isActive('blockMath')) {
    node = editor.value?.getAttributes('blockMath')
  }
  if (editor.value?.isActive('inlineMath')) {
    node = editor.value?.getAttributes('inlineMath')
  }
  return node?.latex || ''
})
</script>
