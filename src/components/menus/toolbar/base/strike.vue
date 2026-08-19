<template>
  <menus-button
    ico="strike"
    :text="t('base.strike')"
    shortcut="Ctrl+Shift+X"
    hide-text
    :menu-active="editor?.isActive('strike')"
    :disabled="!editor?.can().chain().focus().toggleStrike().run()"
    @menu-click="execute(editor, 'toggleStrike')"
  />
</template>

<script setup>
import { execute } from '@umo/editor'
const editor = inject('editor')
</script>
