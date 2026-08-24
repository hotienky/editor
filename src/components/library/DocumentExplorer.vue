<template>
  <section class="kindy-explorer" aria-label="Document explorer" :aria-busy="loading">
    <header class="kindy-explorer__header">
      <div class="kindy-explorer__title-row">
        <slot name="title"><h2>{{ copy.documents }}</h2></slot>
        <button v-if="closable" class="kindy-icon-button" type="button" :aria-label="copy.close" @click="$emit('close')">×</button>
      </div>

      <div class="kindy-explorer__primary-actions">
        <button class="kindy-button kindy-button--primary" type="button" :disabled="busy" @click="createBlank">
          <span aria-hidden="true">＋</span>{{ copy.newDocument }}
        </button>
        <label class="kindy-button kindy-button--secondary" :class="{ 'is-disabled': busy }">
          <span aria-hidden="true">⇧</span>{{ copy.importDocx }}
          <input ref="fileInput" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" :disabled="busy" @change="onFileChange">
        </label>
        <slot name="actions" :refresh="refresh" :busy="busy" />
      </div>

      <div v-if="templates.length" class="kindy-explorer__template">
        <label class="kindy-field">
          <span class="kindy-visually-hidden">{{ copy.chooseTemplate }}</span>
          <select v-model="templateId" aria-label="Document template" :disabled="busy">
            <option value="">{{ copy.chooseTemplate }}</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">{{ template.title }}</option>
          </select>
        </label>
        <button class="kindy-button kindy-button--secondary" type="button" :disabled="!templateId || busy" @click="createFromTemplate">{{ copy.useTemplate }}</button>
      </div>

      <label v-if="folders.length" class="kindy-field">
        <span class="kindy-visually-hidden">Document folder</span>
        <select v-model="folderId" aria-label="Document folder" :disabled="loading" @change="refresh">
          <option value="">{{ copy.allFolders }}</option>
          <option v-for="folder in folders" :key="folder.id" :value="folder.id">{{ folder.name }}</option>
        </select>
      </label>

      <label class="kindy-explorer__search">
        <span aria-hidden="true">⌕</span>
        <input v-model="search" type="search" :placeholder="copy.search" :aria-label="copy.search" @input="queueRefresh">
        <button v-if="search" type="button" :aria-label="copy.clearSearch" @click="clearSearch">×</button>
      </label>
    </header>

    <div v-if="errorMessage" class="kindy-explorer__feedback kindy-explorer__feedback--error" role="alert">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="refresh">{{ copy.retry }}</button>
    </div>
    <div v-else-if="loading && !documents.length" class="kindy-explorer__feedback" role="status">
      <span class="kindy-spinner" aria-hidden="true" />{{ copy.loading }}
    </div>

    <ul v-else class="kindy-explorer__documents" aria-live="polite">
      <li v-for="document in documents" :key="document.id">
        <button type="button" :class="{ active: document.id === selectedId }" :aria-current="document.id === selectedId ? 'page' : undefined" @click="$emit('open', document)">
          <span class="kindy-explorer__document-icon" aria-hidden="true">W</span>
          <span class="kindy-explorer__document-copy">
            <strong>{{ document.title }}</strong>
            <small>{{ formatDate(document.updatedAt) }}</small>
            <span v-if="document.tags?.length" class="kindy-explorer__tags">
              <span v-for="tag in document.tags.slice(0, 2)" :key="tag">{{ tag }}</span>
            </span>
          </span>
        </button>
        <slot name="document" :document="document" />
      </li>
      <li v-if="!documents.length" class="kindy-explorer__empty">
        <span class="kindy-explorer__empty-icon" aria-hidden="true">DOCX</span>
        <strong>{{ copy.empty }}</strong>
        <small>{{ copy.emptyDescription }}</small>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { importDocxInWorker } from '../../codecs'
import type { DocumentLibraryClient } from '../../core/client'
import type { CompatibilityReport, DocumentSummary, Folder } from '../../core/types'
import { resolveLibraryMessages, type KindyLibraryMessages } from '../../ui'

defineOptions({ name: 'KindyDocumentExplorer' })

const props = withDefaults(defineProps<{
  client: DocumentLibraryClient
  selectedId?: string
  locale?: string
  messages?: Partial<KindyLibraryMessages>
  confirmCompatibility?: (report: CompatibilityReport) => boolean | Promise<boolean>
  closable?: boolean
  pageSize?: number
  docxProfile?: CompatibilityReport['profile']
}>(), { locale: 'vi-VN', selectedId: '', messages: () => ({}), closable: false, pageSize: 100, docxProfile: 'kindy-docx-v2.0' })

const emit = defineEmits<{
  open: [document: DocumentSummary]
  imported: [document: DocumentSummary]
  created: [document: DocumentSummary]
  compatibilityWarning: [report: CompatibilityReport]
  error: [error: unknown]
  close: []
}>()

const copy = computed(() => resolveLibraryMessages(props.locale, props.messages))
const documents = ref<DocumentSummary[]>([])
const templates = ref<DocumentSummary[]>([])
const folders = ref<Folder[]>([])
const templateId = ref('')
const folderId = ref('')
const loading = ref(false)
const busyAction = ref<'create' | 'template' | 'import' | null>(null)
const busy = computed(() => loading.value || busyAction.value !== null)
const errorMessage = ref('')
const search = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let refreshController: AbortController | undefined

async function refresh() {
  refreshController?.abort()
  const controller = new AbortController()
  refreshController = controller
  loading.value = true
  errorMessage.value = ''
  try {
    const [documentPage, templatePage, folderItems] = await Promise.all([
      props.client.listDocuments({ search: search.value, folderId: folderId.value || undefined, pageSize: props.pageSize }, controller.signal),
      props.client.adapter.listTemplates({ pageSize: props.pageSize }, controller.signal),
      props.client.adapter.listFolders(undefined, controller.signal),
    ])
    if (controller.signal.aborted) return
    documents.value = documentPage.items
    templates.value = templatePage.items
    folders.value = folderItems
  } catch (error) {
    if (controller.signal.aborted) return
    errorMessage.value = error instanceof Error ? error.message : copy.value.loadFailed
    emit('error', error)
  } finally {
    if (refreshController === controller) {
      refreshController = undefined
      loading.value = false
    }
  }
}

function queueRefresh() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(refresh, 250)
}

function clearSearch() {
  search.value = ''
  void refresh()
}

function openImportDialog() {
  if (!busy.value) fileInput.value?.click()
}

async function createBlank() {
  busyAction.value = 'create'
  try {
    const snapshot = await props.client.create({ title: copy.value.untitled, folderId: folderId.value || undefined })
    await refresh()
    emit('created', snapshot.document)
    emit('open', snapshot.document)
  } catch (error) { emit('error', error) }
  finally { busyAction.value = null }
}

async function createFromTemplate() {
  const template = templates.value.find((item) => item.id === templateId.value)
  if (!template) return
  busyAction.value = 'template'
  try {
    const snapshot = await props.client.create({ title: `${template.title} - Bản mới`, templateId: template.id, folderId: folderId.value || undefined })
    await refresh()
    emit('created', snapshot.document)
    emit('open', snapshot.document)
    templateId.value = ''
  } catch (error) { emit('error', error) }
  finally { busyAction.value = null }
}

async function confirmReport(report: CompatibilityReport) {
  if (!report.issues.length) return true
  emit('compatibilityWarning', report)
  if (props.confirmCompatibility) return props.confirmCompatibility(report)
  return typeof window === 'undefined' || window.confirm(copy.value.compatibilityConfirm)
}

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  busyAction.value = 'import'
  try {
    const converted = await importDocxInWorker(file, { mode: 'best-effort', profile: props.docxProfile })
    if (!await confirmReport(converted.report)) return
    const title = file.name.replace(/\.docx$/i, '')
    const snapshot = await props.client.import({ title, fileName: file.name, file, state: converted.state, compatibilityReport: converted.report })
    await refresh()
    emit('imported', snapshot.document)
    emit('open', snapshot.document)
  } catch (error) { emit('error', error) }
  finally {
    busyAction.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
  catch { return value }
}

onMounted(refresh)
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  refreshController?.abort()
})
defineExpose({ refresh, clearSearch, openImportDialog, createBlank })
</script>

<style scoped>
/* Library explorer styles are colocated so Vite and the published CSS share one source. */
.kindy-explorer { display: flex; height: 100%; min-width: 0; flex-direction: column; border-right: 1px solid var(--kindy-library-border); background: var(--kindy-library-sidebar-bg); color: var(--kindy-library-text); }
.kindy-explorer__header { display: grid; gap: 12px; padding: 16px; border-bottom: 1px solid var(--kindy-library-border); }
.kindy-explorer__title-row { display: flex; min-height: 32px; align-items: center; justify-content: space-between; gap: 8px; }
.kindy-explorer__title-row h2 { margin: 0; font-size: 18px; letter-spacing: -0.02em; }
.kindy-explorer__primary-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kindy-button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 5px; cursor: pointer; border: 1px solid var(--kindy-library-border); border-radius: 8px; padding: 7px 11px; background: var(--kindy-library-surface); color: var(--kindy-library-text); font: inherit; font-size: 13px; font-weight: 650; }
.kindy-button:hover:not(:disabled) { border-color: var(--kindy-library-primary); }
.kindy-button--primary { border-color: var(--kindy-library-primary); background: var(--kindy-library-primary); color: #fff; }
.kindy-button--primary:hover:not(:disabled) { background: var(--kindy-library-primary-hover); }
.kindy-button:disabled, .kindy-button.is-disabled { cursor: not-allowed; opacity: .52; }
.kindy-button input { display: none; }
.kindy-button:focus-visible, .kindy-icon-button:focus-visible, .kindy-explorer__documents li > button:focus-visible { outline: 2px solid var(--kindy-library-primary); outline-offset: 2px; }
.kindy-icon-button { display: grid; width: 32px; height: 32px; place-items: center; cursor: pointer; border: 0; border-radius: 7px; background: transparent; color: var(--kindy-library-muted); font-size: 20px; }
.kindy-icon-button:hover { background: var(--kindy-library-bg); color: var(--kindy-library-text); }
.kindy-explorer__template { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.kindy-field select, .kindy-explorer__search input { box-sizing: border-box; width: 100%; min-height: 40px; border: 1px solid var(--kindy-library-border); border-radius: 8px; outline: none; background: var(--kindy-library-surface); color: var(--kindy-library-text); font: inherit; font-size: 13px; }
.kindy-field select { padding: 7px 10px; }
.kindy-field select:focus, .kindy-explorer__search:focus-within { border-color: var(--kindy-library-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--kindy-library-primary) 16%, transparent); }
.kindy-explorer__search { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; border: 1px solid var(--kindy-library-border); border-radius: 8px; padding-inline: 10px; color: var(--kindy-library-muted); }
.kindy-explorer__search input { min-height: 38px; border: 0; padding: 7px 8px; box-shadow: none; }
.kindy-explorer__search button { cursor: pointer; border: 0; background: transparent; color: var(--kindy-library-muted); font-size: 18px; }
.kindy-explorer__documents { overflow: auto; margin: 0; padding: 10px; list-style: none; }
.kindy-explorer__documents li { position: relative; }
.kindy-explorer__documents li > button { display: grid; width: 100%; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; border: 1px solid transparent; border-radius: var(--kindy-library-radius); background: transparent; padding: 11px; color: inherit; text-align: left; cursor: pointer; }
.kindy-explorer__documents li > button:hover { background: color-mix(in srgb, var(--kindy-library-selection) 55%, transparent); }
.kindy-explorer__documents li > button.active { border-color: color-mix(in srgb, var(--kindy-library-primary) 22%, transparent); background: var(--kindy-library-selection); color: var(--kindy-library-selection-text); box-shadow: inset 3px 0 0 var(--kindy-library-primary); }
.kindy-explorer__document-icon { display: grid; width: 32px; height: 36px; place-items: center; border-radius: 5px; background: #1677ff; color: #fff; font-size: 12px; font-weight: 800; }
.kindy-explorer__document-copy { display: grid; min-width: 0; gap: 3px; }
.kindy-explorer__document-copy strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.kindy-explorer__document-copy small { color: var(--kindy-library-muted); font-size: 11px; }
.kindy-explorer__tags { display: flex; overflow: hidden; gap: 4px; margin-top: 2px; }
.kindy-explorer__tags span { overflow: hidden; border-radius: 999px; padding: 2px 6px; background: color-mix(in srgb, var(--kindy-library-primary) 10%, transparent); color: var(--kindy-library-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.kindy-explorer__feedback, .kindy-explorer__empty { display: grid; place-items: center; gap: 8px; padding: 28px 18px; color: var(--kindy-library-muted); text-align: center; }
.kindy-explorer__feedback--error { color: var(--kindy-library-danger); }
.kindy-explorer__feedback button { cursor: pointer; border: 0; background: transparent; color: var(--kindy-library-primary); font-weight: 700; }
.kindy-explorer__empty small { max-width: 220px; line-height: 1.45; }
.kindy-explorer__empty-icon { display: grid; width: 56px; height: 66px; place-items: center; border: 1px dashed var(--kindy-library-border); border-radius: 10px; color: var(--kindy-library-primary); font-size: 11px; font-weight: 800; }
.kindy-spinner { width: 18px; height: 18px; animation: kindy-spin .8s linear infinite; border: 2px solid var(--kindy-library-border); border-top-color: var(--kindy-library-primary); border-radius: 50%; }
.kindy-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@keyframes kindy-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .kindy-spinner { animation: none; } }
</style>
