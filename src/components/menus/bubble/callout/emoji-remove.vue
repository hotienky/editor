<template>
  <menus-button
    ico="remove"
    :text="t('bubbleMenu.callout.removeEmoji')"
    @menu-click="removeEmoji"
  />
</template>

<script setup>
import { getSelectionNode } from '@/utils/selection'

const emits = defineEmits(['change'])

const editor = inject('editor')

const removeEmoji = () => {
  const callout = editor.value ? getSelectionNode(editor.value) : null
  if (callout) {
    editor.value?.commands.updateAttributes('callout', {
      icon: null,
    })
  }
}
</script>
