<template>
  <menus-button
    ico="unlink"
    :text="t('insert.link.remove')"
    hide-text
    @menu-click="unsetLink"
  />
</template>

<script setup>
const editor = inject('editor')

const unsetLink = () => {
  editor.value.commands.unsetLink()
}
</script>
