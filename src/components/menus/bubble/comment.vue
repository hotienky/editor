<template>
  <menus-button
    ico="comment"
    :text="t('comment.add')"
    hide-text
    huge
    :disabled="!editor?.isEditable || editor?.state?.selection?.empty"
    @menu-click="onClick"
  />
</template>

<script setup>
const editor = inject('editor')
const commentStore = inject('commentStore')

const onClick = () => {
  commentStore.addComment()
  commentStore.toggle(true)
}
</script>
