<template>
  <modal
    :visible="visible"
    width="min(532px, 92vw)"
    @confirm="submitQrcode"
    @close="emit('update:visible', false)"
  >
    <template #header>
      <icon name="qrcode" />
      {{ dialogTitle }}
    </template>
    <div class="kindy-qrcode-container">
      <div class="kindy-qrcode-toolbar">
        <menus-button
          style="width: 126px"
          :text="t('tools.qrcode.level')"
          :select-options="levels"
          menu-type="select"
          :select-value="config.ecl"
          @menu-click="(value) => (config.ecl = value)"
        />
        <menus-button menu-type="input" :tooltip="t('tools.qrcode.paddingTip')">
          <t-input-number
            v-model="config.padding"
            size="small"
            theme="normal"
            :max="10"
            :min="0"
            :allow-input-over-limit="false"
          >
            <template #label>
              <span v-text="t('tools.qrcode.padding')"></span>
            </template>
          </t-input-number>
        </menus-button>
        <menus-button menu-type="input" :tooltip="t('tools.qrcode.widthTip')">
          <t-input-number
            v-model="config.width"
            size="small"
            theme="normal"
            :max="1024"
            :min="64"
            :allow-input-over-limit="false"
          >
            <template #label>
              <span v-text="t('tools.qrcode.width')"></span>
            </template>
          </t-input-number>
        </menus-button>
        <t-divider layout="vertical" />
        <menus-toolbar-base-color
          :text="t('tools.qrcode.color')"
          :default-color="config.color"
          modeless
          @change="(value) => (config.color = value)"
        />
        <menus-toolbar-base-background-color
          :text="t('tools.qrcode.bgColor')"
          :default-color="config.background"
          modeless
          @change="(value) => (config.background = value)"
        />
      </div>
      <div class="kindy-qrcode-code">
        <t-textarea
          v-model="config.content"
          maxlength="200"
          show-limit-number
          autofocus
          autosize
          :placeholder="t('tools.qrcode.placeholder')"
        />
        <div
          v-if="renderError && config.content !== ''"
          class="kindy-barcode-error"
          v-text="t('tools.qrcode.renderError')"
        ></div>
      </div>
      <div class="kindy-qrcode-render">
        <div
          class="kindy-qrcode-title"
          v-text="t('tools.qrcode.preview')"
        ></div>
        <div class="kindy-qrcode-svg kindy-scrollbar">
          <div
            v-if="!svgCode"
            class="kindy-qrcode-empty"
            v-text="t('tools.qrcode.notEmpty')"
          ></div>
          <div v-else class="kindy-svg-render" v-html="svgCode"></div>
        </div>
      </div>
    </div>
  </modal>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import { qrcode } from 'pure-svg-code'
import { svgToDataURL } from '@/utils/file'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  content: {
    type: String,
    default: '',
  },
  value: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: 'editor',
  },
})

const emit = defineEmits(['update:visible', 'confirm'])

const container = inject('container')
const { t } = useI18n()

const levels = [
  { label: t('tools.qrcode.levelL'), value: 'L' },
  { label: t('tools.qrcode.levelM'), value: 'M' },
  { label: t('tools.qrcode.levelQ'), value: 'Q' },
  { label: t('tools.qrcode.levelH'), value: 'H' },
]
const defaultConfig = {
  content: '',
  padding: 1,
  width: 256,
  height: 256,
  color: '#000000',
  background: '#ffffff',
  ecl: 'M',
}

const dialogTitle = computed(() =>
  props.value?.src || props.value?.url || props.content
    ? t('tools.qrcode.edit')
    : t('tools.qrcode.text'),
)

let config = ref({ ...defaultConfig })
let svgCode = ref(null)
let renderError = ref(false)

const resolveInitialContent = () => props.content || props.value?.content || ''

const parseInitialConfig = () => {
  const sourceContent = resolveInitialContent()
  if (!sourceContent) {
    return { ...defaultConfig }
  }
  try {
    return {
      ...defaultConfig,
      ...JSON.parse(sourceContent),
    }
  } catch {
    return { ...defaultConfig }
  }
}

const renderQrcode = () => {
  try {
    svgCode = null
    config.height = config.width
    svgCode = qrcode(config)
    renderError = false
  } catch {
    svgCode = null
    renderError = true
  }
}

const submitQrcode = () => {
  if (renderError || !svgCode) {
    useMessage('error', {
      attach: container,
      content: t('tools.qrcode.renderError'),
    })
    return
  }
  if (config.content === '') {
    useMessage('error', {
      attach: container,
      content: t('tools.qrcode.notEmpty'),
    })
    return
  }
  emit('confirm', {
    url: svgToDataURL(svgCode),
    content: JSON.stringify(config),
    width: config.width,
    height: config.height,
    name: t('tools.qrcode.text'),
    type: 'image/svg+xml',
  })
  emit('update:visible', false)
}

watch(
  () => props.visible,
  (value) => {
    if (!value) {
      return
    }
    config = parseInitialConfig()
    renderQrcode()
  },
  { immediate: true },
)

watch(
  () => config,
  () => {
    if (props.visible) {
      renderQrcode()
    }
  },
  { deep: true },
)
</script>

<style lang="less" scoped>
.kindy-qrcode-container {
  padding: 2px;
  .kindy-qrcode-toolbar {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
  .kindy-qrcode-code {
    margin-bottom: 10px;
    :deep(.kindy-textarea__inner) {
      height: 100%;
      resize: none;
    }
    .kindy-barcode-error {
      font-size: 12px;
      color: var(--kindy-error-color);
    }
  }
  .kindy-qrcode-render {
    border: solid 1px var(--td-border-level-2-color);
    border-radius: var(--kindy-radius);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    .kindy-qrcode-title {
      background-color: var(--kindy-button-hover-background);
      padding: 0 10px;
      position: absolute;
      font-size: 12px;
      border-bottom-right-radius: var(--kindy-radius);
    }
    .kindy-qrcode-empty {
      color: var(--kindy-text-color-light);
      font-size: 12px;
      margin: 40px;
    }
    .kindy-qrcode-svg {
      box-sizing: border-box;
      padding: 30px 10px;
      min-height: 100px;
      overflow: auto;
      color: var(--kindy-text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      > .kindy-svg-render {
        border: solid 1px var(--kindy-border-color-light);
        :deep(svg) {
          display: block;
          width: 256px;
          height: 256px;
        }
      }
    }
  }
}
</style>
