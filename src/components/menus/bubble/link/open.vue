<template>
  <menus-button :text="t('insert.link.open')">
    <a
      class="kindy-link"
      :href="editor?.getAttributes('link').href"
      target="_blank"
      ><icon name="link" /> {{ t('insert.link.open') }}</a
    >
  </menus-button>
</template>

<script setup>
const editor = inject('editor')
</script>

<style lang="less" scoped>
.kindy-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--kindy-primary-color);
  text-decoration: none !important;
}
</style>
