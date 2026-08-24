<template>
  <aside class="kindy-versions" aria-label="Document versions" :aria-busy="loading">
    <header class="kindy-versions__header">
      <div>
        <h2>{{ copy.versions }}</h2>
        <small v-if="versions.length">{{ versions.length }} {{ copy.versions.toLocaleLowerCase(locale) }}</small>
      </div>
      <div class="kindy-versions__header-actions">
        <button type="button" :aria-label="copy.refresh" :title="copy.refresh" :disabled="loading" @click="refresh">↻</button>
        <button v-if="closable" type="button" :aria-label="copy.close" :title="copy.close" @click="$emit('close')">×</button>
      </div>
    </header>

    <div v-if="errorMessage" class="kindy-versions__feedback kindy-versions__feedback--error" role="alert">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="refresh">{{ copy.retry }}</button>
    </div>
    <div v-else-if="loading && !versions.length" class="kindy-versions__feedback" role="status">
      <span class="kindy-versions__spinner" aria-hidden="true" />{{ copy.loading }}
    </div>

    <ol v-else class="kindy-versions__list">
      <li v-for="version in versions" :key="version.id" :class="{ 'is-current': version.id === currentVersionId, 'is-preview': version.id === previewVersionId }">
        <span class="kindy-versions__timeline" aria-hidden="true" />
        <div class="kindy-versions__card">
          <div class="kindy-versions__meta">
            <strong>v{{ version.number }}</strong>
            <span v-if="version.id === currentVersionId" class="kindy-versions__badge">{{ copy.currentVersion }}</span>
          </div>
          <span class="kindy-versions__reason">{{ reasonLabel(version.reason) }}</span>
          <time :datetime="version.createdAt">{{ formatDate(version.createdAt) }}</time>
          <small v-if="version.createdBy?.name">{{ version.createdBy.name }}</small>
          <div class="kindy-versions__actions">
            <button type="button" :disabled="version.id === previewVersionId || restoringId !== null" @click="emit('preview', version)">{{ copy.preview }}</button>
            <button type="button" :disabled="!canRestore || version.id === currentVersionId || restoringId !== null" @click="restore(version)">
              {{ restoringId === version.id ? copy.restoring : copy.restore }}
            </button>
          </div>
        </div>
      </li>
      <li v-if="!versions.length" class="kindy-versions__feedback">{{ copy.noVersions }}</li>
    </ol>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { DocumentLibraryClient } from '../../core/client'
import type { DocumentVersion } from '../../core/types'
import { resolveLibraryMessages, type KindyLibraryMessages } from '../../ui'

defineOptions({ name: 'KindyVersionPanel' })

const props = withDefaults(defineProps<{
  client: DocumentLibraryClient
  documentId?: string
  currentVersionId?: string
  previewVersionId?: string
  canRestore?: boolean
  locale?: string
  messages?: Partial<KindyLibraryMessages>
  closable?: boolean
}>(), { documentId: '', currentVersionId: '', previewVersionId: '', canRestore: true, locale: 'vi-VN', messages: () => ({}), closable: false })

const emit = defineEmits<{
  preview: [version: DocumentVersion]
  restore: [version: DocumentVersion]
  error: [error: unknown]
  close: []
}>()

const copy = computed(() => resolveLibraryMessages(props.locale, props.messages))
const versions = ref<DocumentVersion[]>([])
const loading = ref(false)
const restoringId = ref<string | null>(null)
const errorMessage = ref('')
let refreshController: AbortController | undefined

async function refresh() {
  refreshController?.abort()
  if (!props.documentId) { versions.value = []; return }
  const controller = new AbortController()
  refreshController = controller
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await props.client.adapter.listVersions(props.documentId, { pageSize: 100 }, controller.signal)
    if (!controller.signal.aborted) versions.value = page.items
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

async function restore(version: DocumentVersion) {
  restoringId.value = version.id
  try { emit('restore', version) }
  finally { restoringId.value = null }
}

function reasonLabel(reason: DocumentVersion['reason']) {
  const labels: Record<DocumentVersion['reason'], string> = props.locale.toLowerCase().startsWith('vi')
    ? { autosave: 'Tự động lưu', manual: 'Lưu thủ công', create: 'Tạo tài liệu', import: 'Import DOCX', restore: 'Khôi phục', template: 'Tạo từ mẫu' }
    : { autosave: 'Autosave', manual: 'Manual save', create: 'Created', import: 'DOCX import', restore: 'Restored', template: 'From template' }
  return labels[reason] || reason
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
  catch { return value }
}

watch(() => props.documentId, refresh, { immediate: true })
onBeforeUnmount(() => refreshController?.abort())
defineExpose({ refresh })
</script>

<style scoped>
/* Version timeline styles are part of the public library stylesheet. */
.kindy-versions { width: 100%; height: 100%; overflow: auto; border-left: 1px solid var(--kindy-library-border); background: var(--kindy-library-sidebar-bg); color: var(--kindy-library-text); }
.kindy-versions__header { position: sticky; z-index: 1; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 16px; border-bottom: 1px solid var(--kindy-library-border); background: var(--kindy-library-sidebar-bg); }
.kindy-versions__header h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
.kindy-versions__header small { color: var(--kindy-library-muted); font-size: 11px; }
.kindy-versions__header-actions { display: flex; gap: 4px; }
.kindy-versions__header-actions button { display: grid; width: 32px; height: 32px; place-items: center; cursor: pointer; border: 0; border-radius: 7px; background: transparent; color: var(--kindy-library-muted); font-size: 18px; }
.kindy-versions__header-actions button:hover:not(:disabled) { background: var(--kindy-library-bg); color: var(--kindy-library-text); }
.kindy-versions__list { margin: 0; padding: 14px 12px 22px 20px; list-style: none; }
.kindy-versions__list > li { position: relative; display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 8px; padding-bottom: 10px; }
.kindy-versions__list > li::before { position: absolute; top: 14px; bottom: -8px; left: 6px; width: 1px; background: var(--kindy-library-border); content: ''; }
.kindy-versions__list > li:last-child::before { display: none; }
.kindy-versions__list > li.kindy-versions__feedback { display: flex; grid-template-columns: none; padding: 28px 16px; }
.kindy-versions__list > li.kindy-versions__feedback::before { display: none; }
.kindy-versions__timeline { z-index: 1; width: 9px; height: 9px; margin-top: 11px; border: 2px solid var(--kindy-library-sidebar-bg); border-radius: 50%; background: var(--kindy-library-border); box-shadow: 0 0 0 1px var(--kindy-library-border); }
.is-current .kindy-versions__timeline, .is-preview .kindy-versions__timeline { background: var(--kindy-library-primary); box-shadow: 0 0 0 1px var(--kindy-library-primary); }
.kindy-versions__card { display: grid; gap: 6px; border: 1px solid transparent; border-radius: var(--kindy-library-radius); padding: 10px; transition: border-color 120ms ease, background 120ms ease; }
.kindy-versions__card:hover { border-color: var(--kindy-library-border); background: color-mix(in srgb, var(--kindy-library-bg) 58%, transparent); }
.is-preview .kindy-versions__card { border-color: color-mix(in srgb, var(--kindy-library-primary) 24%, transparent); background: var(--kindy-library-selection); }
.kindy-versions__meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.kindy-versions__badge { border-radius: 999px; padding: 2px 6px; background: color-mix(in srgb, var(--kindy-library-primary) 12%, transparent); color: var(--kindy-library-primary); font-size: 9px; font-weight: 750; }
.kindy-versions__reason { font-size: 12px; font-weight: 600; }
.kindy-versions time, .kindy-versions__card small { color: var(--kindy-library-muted); font-size: 11px; }
.kindy-versions__actions { display: flex; gap: 6px; margin-top: 4px; }
.kindy-versions__actions button { cursor: pointer; border: 1px solid var(--kindy-library-border); border-radius: 6px; background: var(--kindy-library-surface); padding: 5px 8px; color: var(--kindy-library-text); font: inherit; font-size: 11px; }
.kindy-versions__actions button:hover:not(:disabled) { border-color: var(--kindy-library-primary); color: var(--kindy-library-primary); }
.kindy-versions__actions button:disabled { cursor: not-allowed; opacity: .48; }
.kindy-versions__header-actions button:focus-visible, .kindy-versions__actions button:focus-visible { outline: 2px solid var(--kindy-library-primary); outline-offset: 2px; }
.kindy-versions__feedback { display: grid; place-items: center; gap: 8px; padding: 28px 16px; color: var(--kindy-library-muted); text-align: center; }
.kindy-versions__feedback--error { color: var(--kindy-library-danger); }
.kindy-versions__feedback button { cursor: pointer; border: 0; background: transparent; color: var(--kindy-library-primary); font-weight: 700; }
.kindy-versions__spinner { width: 18px; height: 18px; animation: kindy-versions-spin .8s linear infinite; border: 2px solid var(--kindy-library-border); border-top-color: var(--kindy-library-primary); border-radius: 50%; }
@keyframes kindy-versions-spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .kindy-versions__header { padding: 12px; }
  .kindy-versions__header h2 { font-size: 17px; }
  .kindy-versions__header-actions button { width: 40px; height: 40px; }
  .kindy-versions__list { padding: 12px 10px 20px 16px; }
  .kindy-versions__card { padding: 11px; }
  .kindy-versions__actions button { min-height: 38px; flex: 1 1 0; }
}
</style>
