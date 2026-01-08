<template>
  <menus-button
    :text="t('bubbleMenu.textBox.writingMode')"
    ico="writing-mode"
    menu-type="dropdown"
    hide-text
    :select-options="writingModes"
    @click="setWritingMode"
  />
</template>

<script setup>
const editor = inject('editor')

const writingModes = [
  {
    content: t('bubbleMenu.textBox.horizontalTb'),
    value: 'auto',
    active: editor.value?.isActive({ writingMode: 'horizontal-tb' }),
  },
  {
    content: t('bubbleMenu.textBox.verticalLr'),
    value: 'vertical-lr',
    active: editor.value?.isActive({ writingMode: 'vertical-lr' }),
  },
  {
    content: t('bubbleMenu.textBox.verticalRl'),
    value: 'vertical-rl',
    active: editor.value?.isActive({ writingMode: 'vertical-rl' }),
  },
]

const setWritingMode = ({ content, value }) => {
  if (!content) {
    return
  }
  editor.value?.commands.updateAttributes('textBox', { writingMode: value })
}
</script>
