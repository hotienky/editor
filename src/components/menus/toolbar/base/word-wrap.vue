<template>
  <menus-button
    :text="t('base.wordWrap.text')"
    ico="word-wrap"
    menu-type="dropdown"
    hide-text
    :select-options="wordWraps"
    :disabled="
      !editor?.can().chain().focus().setWordWrap().run() ||
      editor?.isActive('image')
    "
    @click="setWordWrap"
  >
  </menus-button>
</template>

<script setup>
const editor = inject('editor')

const wordWraps = computed(() => [
  {
    content: t('base.wordWrap.normal'),
    value: 'normal',
    active: editor.value?.isActive({ wordWrap: 'normal' }),
  },
  {
    content: t('base.wordWrap.breakWord'),
    value: 'break-word',
    active: editor.value?.isActive({ wordWrap: 'break-word' }),
  },
  {
    content: t('base.wordWrap.breakAll'),
    value: 'break-all',
    active: editor.value?.isActive({ wordWrap: 'break-all' }),
  },
])

const setWordWrap = ({ content, value }) => {
  if (!content) {
    return
  }
  editor.value?.chain().focus().setWordWrap(value).run()
}
</script>
