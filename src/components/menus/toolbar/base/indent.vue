<template>
  <menus-button
    :text="t('base.indent')"
    ico="indent"
    shortcut="Tab"
    hide-text
    :disabled="!editor?.can().chain().focus().setIndent().run()"
    @menu-click="editor?.chain().focus().setIndent().run()"
  />
</template>

<script setup>
const editor = inject('editor')
</script>
