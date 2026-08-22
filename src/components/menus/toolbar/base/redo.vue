<template>
  <menus-button
    ico="redo"
    :text="t('base.redo')"
    shortcut="Ctrl+Y / Ctrl+Shift+Z"
    hide-text
    :disabled="!canRedo"
    @menu-click="menuClick"
  />
</template>

<script setup>
const canRedo = inject('canRedo')
const menuClick = inject('redoHistory')
</script>
