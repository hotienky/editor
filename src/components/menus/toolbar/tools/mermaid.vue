<template>
  <menus-button
    :ico="content ? 'edit' : 'mermaid'"
    :text="content ? t('tools.mermaid.edit') : t('tools.mermaid.text')"
    huge
    @menu-click="dialogVisible = true"
  >
    <modal
      :visible="dialogVisible"
      icon="mermaid"
      width="960px"
      @confirm="setMermaid"
      @close="dialogVisible = false"
    >
      <template #header>
        <icon name="mermaid" />
        {{ content ? t('tools.mermaid.edit') : t('tools.mermaid.text') }}
      </template>
      <div class="kindy-mermaid-container">
        <div class="kindy-mermaid-editor">
          <div class="kindy-mermaid-toolbar">
            <menus-button
              style="width: 100px"
              menu-type="select"
              :text="t('tools.mermaid.theme')"
              :select-options="themes"
              :select-value="localConfig.theme"
              @menu-click="(value) => (localConfig.theme = value)"
            />
            <menus-button
              ico="copy"
              :tooltip="t('tools.mermaid.copy')"
              hide-text
              @menu-click="copyCode"
            />
            <menus-button
              ico="node-delete"
              :tooltip="t('tools.mermaid.clear')"
              hide-text
              @menu-click="mermaidCode = ''"
            />
          </div>
          <t-textarea
            v-model="mermaidCode"
            class="kindy-mermaid-code"
            autofocus
            :placeholder="t('tools.mermaid.placeholder')"
          />
        </div>
        <div class="kindy-mermaid-render">
          <div
            class="kindy-mermaid-title"
            v-text="t('tools.mermaid.preview')"
          ></div>
          <div class="kindy-mermaid-error" v-if="errorTxt">{{ errorTxt }}</div>
          <div
            v-else
            ref="mermaidRef"
            class="kindy-mermaid-svg kindy-scrollbar"
            v-html="svgCode"
          ></div>
        </div>
      </div>
      <t-checkbox
        class="kindy-mermaid-keep-size"
        v-if="content && content !== ''"
        v-model="keepSize"
      >
        {{ t('tools.mermaid.keepSize') }}
      </t-checkbox>
    </modal>
  </menus-button>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import { getSelectionNode } from '@/utils/selection'
import { shortId } from '@/utils/short-id'
import { svgToDataURL } from '@/utils/file'

const props = defineProps({
  config: {
    type: Object,
    default: () => ({
      theme: 'default',
    }),
  },
  content: {
    type: String,
    default: undefined,
  },
})

const editor = inject('editor')
const container = inject('container')

const dialogVisible = ref(false)

// 工具栏
const themes = [
  { label: t('tools.mermaid.themes.default'), value: 'default' },
  { label: t('tools.mermaid.themes.base'), value: 'base' },
  { label: t('tools.mermaid.themes.dark'), value: 'dark' },
  { label: t('tools.mermaid.themes.forest'), value: 'forest' },
  { label: t('tools.mermaid.themes.neutral'), value: 'neutral' },
]
let localConfig = ref({})

const copyCode = () => {
  useCopy(mermaidCode, t('tools.mermaid.copied'), container)
}

// 初始化 Mermaid
const mermaidInit = () => {
  const { mermaid } = window
  if (!mermaid) return
  mermaid.initialize({
    darkMode: false,
    startOnLoad: false,
    fontSize: 12,
    securityLevel: 'loose',
    ...localConfig,
  })
}

// 渲染 Mermaid
let mermaidCode = ref(props.content || '')
let svgCode = ref('')
let errorTxt = ref('')
const mermaidRef = ref(null)

const renderMermaid = async () => {
  const { mermaid } = window

  if (!mermaid) {
    svgCode = ''
    errorTxt = t('tools.mermaid.notLoaded')
    return
  }

  if (!mermaidCode || mermaidCode.trim() === '') {
    svgCode = ''
    errorTxt = t('tools.mermaid.codeEmpty')
    return
  }

  const renderId = `mermaid-svg-${shortId(8)}`

  try {
    const { svg } = await mermaid.render(renderId, mermaidCode)
    svgCode = svg
    errorTxt = ''
  } catch (err) {
    svgCode = ''
    errorTxt = t('tools.mermaid.renderError')
  }
}

watch(
  () => dialogVisible,
  async (visible) => {
    if (visible) {
      localConfig = { ...props.config }
      mermaidCode = props.content || 'graph TB\na-->b'
      await nextTick()
      mermaidInit()
      renderMermaid()
    }
  },
  { immediate: true },
)

watch(
  () => [localConfig.theme, mermaidCode],
  async () => {
    if (!dialogVisible || !mermaidCode || mermaidCode === '') return
    await nextTick()
    mermaidInit()
    renderMermaid()
  },
)

// 创建或更新 Mermaid
const keepSize = ref(false)
const setMermaid = () => {
  if (mermaidCode === '') {
    useMessage('error', {
      attach: container,
      content: t('tools.mermaid.notEmpty'),
    })
    return
  }

  if (!props.content || (props.content && props.content !== mermaidCode)) {
    const svg = mermaidRef?.querySelector('svg')

    if (!svg) {
      return
    }

    if (errorTxt) {
      useMessage('error', {
        attach: container,
        content: t('tools.mermaid.renderError'),
      })
      return
    }

    const { width, height } = svg.getBoundingClientRect()
    const { attrs } = getSelectionNode(editor.value) || {}

    const imageOptions = {
      id: shortId(10),
      type: 'mermaid',
      src: svgToDataURL(svgCode),
      config: JSON.stringify(localConfig),
      content: mermaidCode,
      alt: t('tools.mermaid.text'),
      width: keepSize ? attrs?.width || width : width,
      height: keepSize ? attrs?.height || height : height,
      equalProportion: false,
    }

    editor.value?.chain().focus().setImage(imageOptions, !!props.content).run()
  }

  dialogVisible.value = false
}
</script>

<style lang="less" scoped>
.kindy-mermaid-container {
  display: flex;
  .kindy-mermaid-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .kindy-mermaid-toolbar {
    display: flex;
    align-items: center;
    padding: 2px;
  }
  .kindy-mermaid-code {
    width: 320px;
    margin-left: 2px;
    flex: 1;
    :deep(.kindy-textarea__inner) {
      height: 100%;
      resize: none;
    }
  }
  .kindy-mermaid-render {
    flex: 1;
    margin-left: 20px;
    border: solid 1px var(--td-border-level-2-color);
    border-radius: var(--kindy-radius);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    .kindy-mermaid-title {
      background-color: var(--kindy-button-hover-background);
      padding: 0 10px;
      position: absolute;
      font-size: 12px;
      border-bottom-right-radius: var(--kindy-radius);
    }
    .kindy-mermaid-error {
      height: 320px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--kindy-text-color-light);
      font-size: 12px;
    }
    .kindy-mermaid-svg {
      box-sizing: border-box;
      height: 320px;
      padding: 40px 20px 20px;
      overflow: auto;
      display: flex;
      justify-content: center;
    }
  }
}
.kindy-mermaid-keep-size {
  position: absolute;
  bottom: 30px;
}
</style>
