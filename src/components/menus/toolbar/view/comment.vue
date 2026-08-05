<template>
  <menus-button
    ico="comment"
    :text="commentStore.visible ? t('comment.hide') : t('comment.show')"
    huge
    :active="commentStore.visible"
    @menu-click="commentStore.toggle()"
  />
</template>

<script setup>
const commentStore = inject('commentStore')
</script>
