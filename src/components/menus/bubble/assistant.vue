<template>
  <menus-button
    ico="assistant"
    :text="t('assistant.text')"
    @menu-click="openAssistant"
  />
</template>

<script setup>
const editor = inject('editor')
const assistant = inject('assistant')
const openAssistant = () => {
  assistant.value = true
  editor.value?.commands.focus()
}
</script>
