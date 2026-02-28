<template>
  <menus-button
    ico="copy"
    :text="t('insert.link.copy')"
    hide-text
    @menu-click="copyLink"
  />
</template>

<script setup>
const container = inject('container')
const editor = inject('editor')

const copyLink = () => {
  const { href } = editor.value.getAttributes('link')
  const { copy } = useClipboard({
    source: ref(href),
  })
  copy()
  useMessage('success', {
    attach: container,
    content: t('insert.link.copySuccess'),
  })
}
</script>
