<template>
  <menus-button text="PDF" ico="pdf" huge @menu-click="exportFile.pdf = true" />
</template>

<script setup>
const exportFile = inject('exportFile')
</script>
