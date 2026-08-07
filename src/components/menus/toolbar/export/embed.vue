<template>
  <menus-button
    ico="embed"
    :text="t('export.embed.text')"
    huge
    @menu-click="dialogVisible = true"
  />
  <modal
    :visible="dialogVisible"
    width="460px"
    :confirm-btn="t('export.embed.copy')"
    @confirm="copyEmbed"
    @close="dialogVisible = false"
  >
    <template #header>
      <icon name="embed" />
      {{ t('export.embed.title') }}
    </template>
    <div class="kindy-embed-container">
      <div class="kindy-embed-tip" v-text="t('export.embed.tip')"></div>
      <t-textarea
        class="kindy-embed-textarea"
        :value="embedValue"
        readonly
        autosize
      ></t-textarea>
    </div>
  </modal>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
const options = inject('options')
const container = inject('container')
const dialogVisible = ref(false)

const embedValue = computed(() => {
  return `<iframe src="${options.value.shareUrl}" width="100%" height="720px" frameborder="0" allowfullscreen="true"></iframe>`
})

const copyEmbed = () => {
  useCopy(embedValue, t('export.embed.copied'), container)
  dialogVisible.value = false
}
</script>

<style lang="less" scoped>
.kindy-embed-container {
  padding: 2px;
  .kindy-embed-tip {
    font-size: 12px;
    color: var(--kindy-text-color-light);
    margin-bottom: 6px;
    line-height: 1.4;
  }
  .kindy-embed-textarea {
    :deep(textarea) {
      word-break: break-all;
      word-wrap: break-word;
    }
  }
}
</style>
