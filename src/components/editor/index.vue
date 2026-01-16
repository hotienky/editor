<template>
  <editor-content
    class="umo-editor-content"
    :class="{
      'show-bookmark': page.showBookmark,
      'show-line-number': page.showLineNumber,
      'format-painter': editor?.view?.painter?.enabled,
      'is-empty': editor?.isEmpty && editor?.state.doc.childCount <= 1,
      'is-readonly': !editor?.editable,
      'show-model': assistant,
    }"
    :editor="editor"
    :style="{
      lineHeight: defaultLineHeight,
    }"
    :spellcheck="
      options.document?.enableSpellcheck && $document.enableSpellcheck
    "
  />
  <template v-if="editor && !destroyed">
    <menus-block
      v-if="options.document?.enableBlockMenu"
      v-show="
        page.zoomLevel === 100 && !page.preview?.enabled && editor.isEditable
      "
    />
    <menus-bubble
      v-if="options.document?.enableBubbleMenu"
      v-show="!editor?.view?.painter?.enabled && !editor?.isEmpty"
    >
      <template #bubble_menu="props">
        <slot name="bubble_menu" v-bind="props" />
      </template>
    </menus-bubble>
  </template>
</template>

<script setup>
import { migrateMathStrings } from '@tiptap/extension-mathematics'
import { Editor, EditorContent } from '@tiptap/vue-3'

import { getDefaultExtensions, inputAndPasteRules } from '@/extensions'
import { contentTransform } from '@/utils/content-transform'
import { addHistory } from '@/utils/history-record'
import { loadResource } from '@/utils/load-resource'

const destroyed = inject('destroyed')
const page = inject('page')
const options = inject('options')
const uploadFileMap = inject('uploadFileMap')

const historyRecords = inject('historyRecords')
// 助手
const assistant = inject('assistant')

const $document = useState('document', options)

const defaultLineHeight = $computed(
  () => options.value.dicts?.lineHeights?.find((item) => item.default)?.value,
)

const container = inject('container')
const extensions = getDefaultExtensions({
  container,
  options,
  uploadFileMap,
})

const editorInstance = new Editor({
  editable: !options.value.document?.readOnly,
  autofocus: options.value.document?.autofocus,
  content: contentTransform(options.value.document?.content),
  enableInputRules: inputAndPasteRules(options),
  enablePasteRules: inputAndPasteRules(options),
  editorProps: {
    attributes: {
      class: 'umo-editor',
    },
    ...options.value.document?.editorProps,
  },
  // enableContentCheck: true,
  parseOptions: options.value.document?.parseOptions,
  extensions: [...extensions, ...options.value.extensions],
  onCreate({ editor }) {
    migrateMathStrings(editor)
  },
  onUpdate({ editor }) {
    addHistory(historyRecords, 'editor', editor?.state?.history$)
    useDebounceFn(() => {
      $document.value.content = editor.getHTML()
    }, 3000)()
  },
})
const editor = inject('editor')
editor.value = editorInstance
editor.value.storage.container = container
watch(
  () => options.value,
  () => {
    editor.value.storage.options = options.value
  },
  { immediate: true, deep: true },
)

onMounted(() => {
  const { disableExtensions, cdnUrl } = options.value
  const has = (name) => !disableExtensions.includes(name)
  const libUrl = `${cdnUrl}/libs`
  if (has('math')) {
    loadResource(`${libUrl}/katex/katex.min.css`, 'css', 'katex-style')
  }
  if (has('mermaid')) {
    loadResource(`${libUrl}/mermaid/mermaid.min.js`, 'script', 'mermaid-script')
  }
})

// 销毁编辑器实例
onBeforeUnmount(() => {
  editorInstance.unmount()
})
</script>

<style lang="less">
@import '@/assets/styles/editor.less';
@import '@/assets/styles/drager.less';
</style>
