<template>
  <menus-button
    ico="comment"
    :text="t('comment.add')"
    huge
    :active="commentStore.visible"
    @menu-click="onClick"
  />
</template>

<script setup>
import { inject } from 'vue'

const commentStore = inject('commentStore')

const onClick = () => {
  commentStore.addComment()
  commentStore.toggle(true)
}
</script>
