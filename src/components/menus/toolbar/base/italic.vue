<template>
  <menus-button
    :text="t('base.italic')"
    ico="italic"
    shortcut="Ctrl+I"
    hide-text
    :menu-active="editor?.isActive('italic')"
    :disabled="!editor?.can().chain().focus().toggleItalic().run()"
    @menu-click="execute(editor, 'toggleItalic')"
  />
</template>

<script setup>
import { execute } from '@umo/editor'
const editor = inject('editor')
</script>
