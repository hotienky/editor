<template>
  <menus-button
    ico="share"
    :text="t('export.share.text')"
    huge
    @menu-click="dialogVisible = true"
  />
  <modal
    :visible="dialogVisible"
    width="420px"
    :confirm-btn="t('export.share.copy')"
    @confirm="copyLink"
    @close="dialogVisible = false"
  >
    <template #header>
      <icon name="share" />
      {{ t('export.share.text') }}
    </template>
    <div class="kindy-share-container">
      <div class="kindy-share-tip" v-text="t('export.share.tip')"></div>
      <t-textarea
        class="kindy-share-textarea"
        :value="options.shareUrl"
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

const copyLink = () => {
  useCopy(options.value.shareUrl, t('export.share.copied'), container)
  dialogVisible.value = false
}
</script>

<style lang="less" scoped>
.kindy-share-container {
  padding: 2px;
  .kindy-share-tip {
    font-size: 12px;
    color: var(--kindy-text-color-light);
    margin-bottom: 6px;
    line-height: 1.4;
  }
  .kindy-share-textarea {
    :deep(textarea) {
      word-break: break-all;
      word-wrap: break-word;
    }
  }
}
</style>
