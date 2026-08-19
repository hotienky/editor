<template>
  <modal
    :visible="visible"
    width="min(300px, 88vw)"
    :footer="false"
    @close="emits('close')"
  >
    <template #header>
      <icon name="copyright" />
      {{ t('about.title') }}
    </template>
    <div
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 2;
        padding: 30px 0 0;
      "
    >
      <img src="@/assets/images/logo.svg" width="160" style="display: flex" />
      <p>
        {{ t('about.version') }}: v{{ version }} ({{ t('about.openSource') }})
      </p>
      <p v-html="t('about.poweredBy')"></p>
      <p>
        <a href="https://github.com/hotienky/editor" target="_blank">
          Github
        </a>
      </p>
    </div>
  </modal>
</template>

<script setup>
import { version } from '@/utils/copyright'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})
const emits = defineEmits(['close'])

const { locale } = useI18n()
</script>

<style lang="less" scoped>
img {
  margin-bottom: 30px;
}
p {
  margin: 3px 0 !important;
  line-height: 1.5;
  a,
  :deep(a) {
    color: var(--kindy-primary-color);
    font-weight: 500;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}
:deep(.kindy-divider) {
  margin: 30px 0 15px;
  font-size: 12px;
}
</style>
