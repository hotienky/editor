<template>
  <menus-button
    ico="undo"
    :text="t('base.undo')"
    shortcut="Ctrl+Z"
    hide-text
    :disabled="!canUndo"
    @menu-click="menuClick"
  />
</template>

<script setup>
const canUndo = inject('canUndo')
const menuClick = inject('undoHistory')
</script>
