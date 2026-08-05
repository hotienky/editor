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
const commentStore = inject('commentStore')

const onClick = () => {
  const added = commentStore.addComment()
  commentStore.toggle(added ? true : undefined)
}
</script>
