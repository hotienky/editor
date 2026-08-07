<template>
  <menus-button
    ico="underline"
    :text="t('base.underline')"
    shortcut="Ctrl+U"
    hide-text
    :menu-active="editor?.isActive('underline')"
    :disabled="!editor?.can().chain().focus().toggleUnderline().run()"
    @menu-click="execute(editor, 'toggleUnderline')"
  />
</template>

<script setup>
import { execute } from '@/editing'
const editor = inject('editor')
</script>
