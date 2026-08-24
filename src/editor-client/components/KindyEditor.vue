<template>
  <div class="kindy-editor-client" :class="{ 'is-dark': isDark }">
    <!-- Header -->
    <EditorHeader
      :title="title"
      :is-saving="isSaving"
      @save="handleSave"
      @export="handleExport"
    />

    <!-- Toolbar -->
    <EditorToolbar
      :editor="editor"
      :page-options="pageOptions"
      @update:page-options="updatePageOptions"
    />

    <!-- Main Content Area -->
    <div class="kindy-editor-main">
      <!-- Document Tabs -->
      <DocumentTabs
        :tabs="tabs"
        :active-tab="activeTabId"
        @select="selectTab"
        @close="closeTab"
        @add="addTab"
      />

      <!-- Editor Content -->
      <EditorContent
        ref="contentRef"
        :document="currentDocument"
        :layout="layout"
        :page-options="pageOptions"
        :selection="selection"
        @update:document="updateDocument"
        @update:selection="updateSelection"
      />
    </div>

    <!-- Footer / Status Bar -->
    <EditorFooter>
      <StatusBar
        :page="currentPage"
        :total-pages="totalPages"
        :word-count="wordCount"
        :char-count="charCount"
        :zoom="zoom"
        @update:zoom="setZoom"
      />
    </EditorFooter>
  </div>
</template>

<script setup>
import { ref, computed, provide, onMounted, watch } from 'vue'
import { useKindyEditor } from '../composables/useKindyEditor'
import { useDocumentManager } from '../composables/useDocumentManager'
import { useFileOperations } from '../composables/useFileOperations'

import EditorHeader from './EditorHeader.vue'
import EditorToolbar from './EditorToolbar.vue'
import EditorContent from './EditorContent.vue'
import EditorFooter from './EditorFooter.vue'
import DocumentTabs from './DocumentTabs.vue'
import StatusBar from './StatusBar.vue'

// ─── Props ──────────────────────────────────────────────────────────────────

const props = defineProps({
  config: {
    type: Object,
    default: () => ({}),
  },
  initialContent: {
    type: [String, Object],
    default: '',
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
})

// ─── Emits ──────────────────────────────────────────────────────────────────

const emit = defineEmits(['ready', 'save', 'export', 'change'])

// ─── Composables ────────────────────────────────────────────────────────────

const {
  document,
  layout,
  selection,
  pageOptions,
  updateDocument,
  updateSelection,
  updatePageOptions,
} = useKindyEditor(props.config)

const {
  tabs,
  activeTabId,
  currentDocument,
  selectTab,
  closeTab,
  addTab,
  setCurrentDocument,
} = useDocumentManager()

const {
  save,
  exportDocument,
  isSaving,
} = useFileOperations()

// ─── Refs ───────────────────────────────────────────────────────────────────

const contentRef = ref(null)
const title = ref(props.config.title || 'Untitled Document')
const zoom = ref(100)
const isDark = ref(false)

// ─── Computed ───────────────────────────────────────────────────────────────

const editor = computed(() => contentRef.value?.editor)

const currentPage = computed(() => {
  // Get current page from selection or default to 1
  return selection.value?.page || 1
})

const totalPages = computed(() => layout.value?.totalPages || 1)

const wordCount = computed(() => document.value?.wordCount || 0)

const charCount = computed(() => document.value?.charCount || 0)

// ─── Methods ────────────────────────────────────────────────────────────────

const handleSave = async () => {
  isSaving.value = true
  try {
    await save(currentDocument.value)
    emit('save', currentDocument.value)
  } finally {
    isSaving.value = false
  }
}

const handleExport = async (format) => {
  await exportDocument(currentDocument.value, format)
  emit('export', { document: currentDocument.value, format })
}

const setZoom = (level) => {
  zoom.value = Math.max(25, Math.min(500, level))
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => {
  // Set initial content
  if (props.initialContent) {
    setCurrentDocument({
      content: props.initialContent,
      title: title.value,
    })
  }

  emit('ready', {
    editor: editor.value,
    document: currentDocument.value,
  })
})

// ─── Provide ────────────────────────────────────────────────────────────────

provide('editor', editor)
provide('document', currentDocument)
provide('layout', layout)
provide('pageOptions', pageOptions)
provide('selection', selection)
provide('config', props.config)
provide('isDark', isDark)
provide('zoom', zoom)
</script>

<style lang="less">
@import '../styles/editor.css';

.kindy-editor-client {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8fafc;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.kindy-editor-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Dark mode */
.kindy-editor-client.is-dark {
  background-color: #1a1a2e;
  color: #e0e0e0;
}
</style>
