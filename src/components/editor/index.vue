<template>
  <editor-content
    class="kindy-editor-content"
    :class="{
      'show-bookmark': page.showBookmark,
      'show-line-number': page.showLineNumber,
      'format-painter': editor?.view?.painter?.enabled,
      'is-empty': editor?.isEmpty && editor?.state.doc.childCount <= 1,
      'is-readonly': !editor?.isEditable,
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
      v-show="!editor?.view?.painter?.enabled"
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
import { getSerializer } from '@umo/document'

const destroyed = inject('destroyed')
const page = inject('page')
const options = inject('options')
const uploadFileMap = inject('uploadFileMap')
const historyRecords = inject('historyRecords')

const $document = useState('document', options)

const defaultLineHeight = $computed(
  () => options.value.dicts?.lineHeights?.find((item) => item.default)?.value,
)

const container = inject('container')
const commentStore = inject('commentStore')

// Re-read comments when document content changes (undo/redo, text deletion...)
const syncComments = useDebounceFn(() => {
  commentStore?.syncFromDoc()
}, 600)

const extensions = getDefaultExtensions({
  container,
  options,
  uploadFileMap,
})

// 同步文档内容 (JSON as primary format)
let syncContentTimer = null
const syncDocumentContent = (targetEditor = editorInstance) => {
  if (!$document.value || !targetEditor) {
    return
  }
  // JSON is the canonical storage format
  $document.value.content = targetEditor.getJSON()
}
const scheduleSyncDocumentContent = () => {
  if (syncContentTimer !== null) {
    clearTimeout(syncContentTimer)
  }
  syncContentTimer = setTimeout(() => {
    syncContentTimer = null
    syncDocumentContent(editorInstance)
  }, 800)
}
const flushSyncDocumentContent = () => {
  if (syncContentTimer !== null) {
    clearTimeout(syncContentTimer)
    syncContentTimer = null
  }
  syncDocumentContent(editorInstance)
}

// Handle list item keyboard events
const getActiveListItemType = (selection) => {
  const { $from } = selection
  const { depth: maxDepth } = $from
  for (let depth = maxDepth; depth > 0; depth -= 1) {
    const currentNode = $from.node(depth)
    const nodeName = currentNode?.type?.name
    if (nodeName === 'listItem' || nodeName === 'taskItem') {
      return nodeName
    }
  }
  return null
}
const handleEditorKeyDown = (view, event) => {
  const customHandleKeyDown = options.value.document?.editorProps?.handleKeyDown
  const modifier = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (modifier && !event.altKey && !event.isComposing && key === 'z') {
    const handled = event.shiftKey
      ? editorInstance.commands.redo()
      : editorInstance.commands.undo()
    if (handled) event.preventDefault()
    return handled
  }
  if (modifier && !event.altKey && !event.shiftKey && !event.isComposing && key === 'y') {
    const handled = editorInstance.commands.redo()
    if (handled) event.preventDefault()
    return handled
  }
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.isComposing &&
    editorInstance.commands.setPageBreak()
  ) {
    event.preventDefault()
    return true
  }
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing
  ) {
    const itemType = getActiveListItemType(view.state.selection)
    if (itemType && editorInstance.commands.splitListItem(itemType)) {
      event.preventDefault()
      return true
    }
  }
  return customHandleKeyDown?.(view, event) || false
}

// Parse content: accept both JSON (new) and HTML (legacy)
const parseContent = (content) => {
  if (!content) return ''
  // If it's already a ProseMirror JSON object
  if (typeof content === 'object' && content.type === 'doc') {
    return content
  }
  // If it's a JSON string
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      if (parsed && parsed.type === 'doc') return parsed
    } catch {
      // Not JSON, treat as HTML
    }
  }
  // Legacy HTML content
  return contentTransform(content)
}

const editorInstance = new Editor({
  editable: !options.value.document?.readOnly,
  autofocus: options.value.document?.autofocus,
  content: parseContent(options.value.document?.content),
  enableInputRules: inputAndPasteRules(options),
  enablePasteRules: inputAndPasteRules(options),
  editorProps: {
    attributes: {
      class: 'kindy-editor',
    },
    ...options.value.document?.editorProps,
    handleKeyDown: handleEditorKeyDown,
  },
  // enableContentCheck: true,
  parseOptions: options.value.document?.parseOptions,
  extensions: [...extensions, ...options.value.extensions],
  onCreate({ editor }) {
    if (options.value.disableExtensions.includes('math')) {
      migrateMathStrings(editor)
    }
  },
  onUpdate({ editor }) {
    addHistory(historyRecords, 'editor', editor?.state?.history$)
    scheduleSyncDocumentContent()
    syncComments()
  },
  onBlur() {
    flushSyncDocumentContent()
  },
})
const editor = inject('editor')
editor.value = editorInstance
editor.value.storage.container = container
// Sync comments from document content after editor is created
commentStore?.syncFromDoc()
watch(
  () => options.value,
  () => {
    editor.value.storage.options = options.value
  },
  { immediate: true },
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
  window.addEventListener('beforeunload', flushSyncDocumentContent)
  window.addEventListener('pagehide', flushSyncDocumentContent)
  document.addEventListener('visibilitychange', flushSyncDocumentContent)
})

// Destroy editor instance
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', flushSyncDocumentContent)
  window.removeEventListener('pagehide', flushSyncDocumentContent)
  document.removeEventListener('visibilitychange', flushSyncDocumentContent)
  flushSyncDocumentContent()
  editorInstance.unmount()
})
</script>

<style lang="less">
@import '@/assets/styles/editor.less';
@import '@/assets/styles/drager.less';
</style>
