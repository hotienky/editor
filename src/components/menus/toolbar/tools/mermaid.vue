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
      <div class="umo-mermaid-container">
        <div class="umo-mermaid-editor">
          <div class="umo-mermaid-toolbar">
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
            class="umo-mermaid-code"
            autofocus
            :placeholder="t('tools.mermaid.placeholder')"
          />
        </div>
        <div class="umo-mermaid-render">
          <div
            class="umo-mermaid-title"
            v-text="t('tools.mermaid.preview')"
          ></div>
          <div
            ref="mermaidRef"
            class="umo-mermaid-svg umo-scrollbar"
            v-html="svgCode"
          ></div>
        </div>
      </div>
    </modal>
  </menus-button>
</template>

<script setup>
import svg64 from 'svg64'

import { shortId } from '@/utils/short-id'

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
const uploadFileMap = inject('uploadFileMap')

let dialogVisible = $ref(false)

// 工具栏
const themes = [
  { label: t('tools.mermaid.themes.default'), value: 'default' },
  { label: t('tools.mermaid.themes.base'), value: 'base' },
  { label: t('tools.mermaid.themes.dark'), value: 'dark' },
  { label: t('tools.mermaid.themes.forest'), value: 'forest' },
  { label: t('tools.mermaid.themes.neutral'), value: 'neutral' },
]
let localConfig = $ref({})

const copyCode = () => {
  const { copy } = useClipboard({
    source: mermaidCode,
  })
  copy()
  useMessage('success', {
    attach: container,
    content: t('tools.mermaid.copied'),
  })
}

//  初始化 Mermaid
const mermaidInit = () => {
  mermaid.initialize({
    darkMode: false,
    startOnLoad: false,
    fontSize: 12,
    securityLevel: 'loose',
    ...localConfig,
  })
}

// 渲染 Mermaid
let mermaidCode = $ref(props.content)
let svgCode = $ref('')
const mermaidRef = $ref(null)
const renderMermaid = async () => {
  try {
    svgCode = await mermaid.render('mermaid-svg', mermaidCode)
  } catch {
    svgCode = ''
  }
}
watch(
  () => dialogVisible,
  async (visible) => {
    if (visible) {
      localConfig = { ...props.config }
      mermaidCode = props.content || 'graph TB\na-->b'
    }
  },
  { immediate: true },
)
watch(
  () => [localConfig, mermaidCode],
  async () => {
    if (!mermaidCode || mermaidCode === '') return
    await nextTick()
    mermaidInit()
    renderMermaid()
  },
  { deep: true },
)

// 创建或更新 Mermaid
const setMermaid = () => {
  if (mermaidCode === '') {
    useMessage('error', {
      attach: container,
      content: t('tools.mermaid.notEmpty'),
    })
    return
  }
  if (!props.content || (props.content && props.content !== mermaidCode)) {
    const id = shortId(10)
    const svg = mermaidRef.querySelector('svg')
    const { width, height } = svg.getBoundingClientRect()
    const name = `mermaid-${shortId()}.svg`
    const blob = new Blob([svg.outerHTML], {
      type: 'image/svg+xml',
    })
    const file = new File([blob], name, {
      type: 'image/svg+xml',
    })
    uploadFileMap.value.set(id, file)
    const imageOptions = {
      id,
      type: 'mermaid',
      name,
      size: file.size,
      src: svg64(svgCode),
      config: JSON.stringify(localConfig),
      content: mermaidCode,
      width,
      height,
      equalProportion: false,
    }
    editor.value?.chain().focus().setImage(imageOptions, !!props.content).run()
  }
  dialogVisible = false
}
</script>

<style lang="less" scoped>
.umo-mermaid-container {
  display: flex;
  .umo-mermaid-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .umo-mermaid-toolbar {
    display: flex;
    align-items: center;
    padding: 2px;
  }
  .umo-mermaid-code {
    width: 320px;
    margin-left: 2px;
    flex: 1;
    :deep(.umo-textarea__inner) {
      height: 100%;
      resize: none;
    }
  }
  .umo-mermaid-render {
    flex: 1;
    margin-left: 20px;
    border: solid 1px var(--td-border-level-2-color);
    border-radius: var(--umo-radius);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    .umo-mermaid-title {
      background-color: var(--umo-button-hover-background);
      padding: 0 10px;
      position: absolute;
      font-size: 12px;
      border-bottom-right-radius: var(--umo-radius);
    }
    .umo-mermaid-svg {
      box-sizing: border-box;
      height: 320px;
      padding: 40px 20px 20px;
      overflow: auto;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
