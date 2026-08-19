<template>
  <footer class="umo-editor-footer">
    <slot />
  </footer>
</template>

<script setup>
</script>

<style scoped>
.umo-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 12px;
  background-color: #fff;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #64748b;
}
</style>
