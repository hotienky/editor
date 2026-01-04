<template>
  <menus-button
    :ico="fullscreen ? 'full-screen-exit' : 'full-screen'"
    :text="fullscreen ? t('fullscreen.disable') : t('fullscreen.title')"
    shortcut="Ctrl+F11"
    huge
    :menu-active="fullscreen"
    @menu-click="fullscreen = !fullscreen"
  />
</template>

<script setup>
const fullscreen = inject('fullscreen')
</script>
