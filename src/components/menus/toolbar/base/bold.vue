<template>
  <menus-button
    ico="bold"
    :text="t('base.bold')"
    shortcut="Ctrl+B"
    hide-text
    :menu-active="editor?.isActive('bold')"
    :disabled="!editor?.can().chain().focus().toggleBold().run()"
    @menu-click="execute(editor, 'toggleBold')"
  />
</template>

<script setup>
import { execute } from '@umo/editor'
const editor = inject('editor')
</script>
