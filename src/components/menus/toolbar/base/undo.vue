<template>
  <menus-button
    ico="undo"
    :text="t('base.undo')"
    shortcut="Ctrl+Z"
    hide-text
    :disabled="historyRecords.done.length === 0"
    @menu-click="menuClick"
  />
</template>

<script setup>
const historyRecords = inject('historyRecords')
const menuClick = inject('undoHistory')
</script>
