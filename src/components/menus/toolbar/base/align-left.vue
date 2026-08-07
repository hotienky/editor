<template>
  <menus-button
    ico="align-left"
    :text="t('base.align.left')"
    shortcut="Ctrl+Shift+L"
    hide-text
    :menu-active="
      editor?.isActive({ textAlign: 'left' }) ||
      editor?.isActive({ nodeAlign: 'flex-start' })
    "
    :disabled="
      !editor?.can().chain().focus().setTextAlign('left').run() &&
      !editor?.can().chain().focus().setNodeAlign('flex-start').run()
    "
    @menu-click="setAlignLeft"
  />
</template>

<script setup>
import { execute } from '@/editing'
const editor = inject('editor')
const setAlignLeft = () => {
  execute(editor.value, 'setTextAlign', 'left')
  execute(editor.value, 'setNodeAlign', 'flex-start')
}
</script>
