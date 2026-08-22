<template>
  <DocumentLibraryShell
    :density="uiConfig.density"
    :explorer-width="uiConfig.explorerWidth"
    :versions-width="uiConfig.versionsWidth"
    :show-topbar="uiConfig.showTopbar"
    :show-explorer="uiConfig.showExplorer"
    :show-versions="uiConfig.showVersions && showVersions"
    :explorer-open="explorerOpen"
    :versions-open="versionsOpen"
    :theme="themeConfig"
    @close-panels="closePanels"
  >
    <template #explorer>
      <KindyDocumentExplorer
        ref="explorer"
        :client="libraryClient"
        :selected-id="current?.document.id"
        :locale="locale"
        :messages="messages"
        :confirm-compatibility="confirmCompatibility"
        :docx-profile="docxProfile"
        :closable="!wideViewport"
        @close="explorerOpen = false"
        @open="openDocument"
        @created="onCreated"
        @imported="onImported"
        @compatibility-warning="payload => emit('compatibility-warning', payload)"
        @error="onError"
      >
        <template #actions="slotProps"><slot name="explorer-actions" v-bind="slotProps" /></template>
        <template #document="slotProps"><slot name="document" v-bind="slotProps" /></template>
      </KindyDocumentExplorer>
    </template>

    <template #topbar>
      <slot name="topbar" :document="current?.document" :status="workspaceStatus" :save="saveFromEditor">
        <div class="kindy-workspace-bar">
          <div class="kindy-workspace-bar__identity">
            <button v-if="uiConfig.showExplorer" class="kindy-workspace-bar__icon" type="button" :aria-label="copy.openDocuments" :title="copy.openDocuments" @click="explorerOpen = !explorerOpen">☰</button>
            <div v-if="current" class="kindy-workspace-bar__document">
              <strong>{{ current.document.title }}</strong>
              <span>{{ current.document.fileName }}</span>
            </div>
            <div v-else class="kindy-workspace-bar__document">
              <strong>Kindy Document Library</strong>
              <span>DOCX workspace</span>
            </div>
          </div>

          <div v-if="current" class="kindy-workspace-bar__status" :class="`is-${workspaceStatus}`" role="status">
            <span aria-hidden="true" />{{ statusLabel }}
          </div>

          <div class="kindy-workspace-bar__actions">
            <button v-if="previewVersionId" class="kindy-workspace-bar__button" type="button" @click="exitVersionPreview">{{ copy.backToCurrent }}</button>
            <button v-if="current && !previewVersionId" class="kindy-workspace-bar__button kindy-workspace-bar__button--primary" type="button" :disabled="!canEdit || workspaceStatus === 'saving'" @click="saveFromEditor">{{ copy.save }}</button>
            <button v-if="current && canDownload" class="kindy-workspace-bar__button" type="button" :disabled="exporting" @click="downloadCurrentDocx">{{ copy.downloadDocx }}</button>
            <button v-if="current" class="kindy-workspace-bar__button" type="button" @click="print">{{ copy.print }}</button>
            <button v-if="showVersions && uiConfig.showVersions" class="kindy-workspace-bar__icon" type="button" :aria-label="copy.openVersions" :title="copy.openVersions" @click="versionsOpen = !versionsOpen">◷</button>
          </div>
        </div>
      </slot>
    </template>

    <main class="kindy-document-workspace" :aria-busy="opening">
      <div v-if="opening" class="kindy-document-workspace__state" role="status">
        <span class="kindy-document-workspace__spinner" aria-hidden="true" />
        <strong>{{ copy.loading }}</strong>
      </div>
      <div v-else-if="workspaceError && !current" class="kindy-document-workspace__state kindy-document-workspace__state--error" role="alert">
        <strong>{{ copy.loadFailed }}</strong>
        <span>{{ workspaceError }}</span>
      </div>
      <div v-else-if="!current" class="kindy-document-workspace__state">
        <slot name="empty">
          <span class="kindy-document-workspace__empty-icon" aria-hidden="true">DOCX</span>
          <strong>{{ copy.selectDocument }}</strong>
          <span>{{ copy.selectDocumentDescription }}</span>
          <button v-if="uiConfig.showExplorer && !explorerOpen" type="button" @click="explorerOpen = true">{{ copy.openDocuments }}</button>
        </slot>
      </div>
      <template v-else>
        <div v-if="previewVersionId" class="kindy-document-workspace__preview" role="status">
          <span>{{ copy.previewingVersion }} v{{ previewVersionNumber }}</span>
          <button type="button" @click="exitVersionPreview">{{ copy.backToCurrent }}</button>
        </div>
        <KindyEditor
          :key="editorKey"
          ref="editor"
          v-bind="resolvedEditorOptions"
          :locale="locale"
          :dicts="editorDicts"
          :document="editorDocument"
          :page="editorPage"
          :on-save="saveFromEditor"
          @created="onEditorReady"
          @changed="onEditorChanged"
          @print="emit('printed', current?.document)"
        >
          <template v-for="name in editorSlotNames" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps || {}" />
          </template>
        </KindyEditor>
      </template>
    </main>

    <template #versions>
      <KindyVersionPanel
        ref="versions"
        :client="libraryClient"
        :document-id="activeDocumentId"
        :current-version-id="liveSnapshot?.document.currentVersionId"
        :preview-version-id="previewVersionId"
        :can-restore="canRestore"
        :locale="locale"
        :messages="messages"
        :closable="!wideViewport"
        @close="versionsOpen = false"
        @preview="previewVersion"
        @restore="restoreVersion"
        @error="onError"
      />
    </template>
  </DocumentLibraryShell>
</template>

<script setup lang="ts">
import saveAs from 'file-saver'
import { useMediaQuery } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onErrorCaptured, ref, shallowRef, useSlots } from 'vue'
import { exportDocx } from '../../codecs'
import { DocumentLibraryClient, createDocumentLibrary } from '../../core/client'
import { DocumentLibraryError } from '../../core/errors'
import { createEmptyDocumentState } from '../../core/state'
import type { CollaborationAdapter, CollaborationSession, CompatibilityReport, DocumentApiAdapter, DocumentSnapshot, DocumentSummary, DocumentVersion, KindyDocumentState } from '../../core/types'
import { defaultOptions } from '../../options'
import { createLibraryTheme, resolveLibraryMessages, resolveLibraryUi, type KindyLibraryMessages, type KindyLibraryUiOptions } from '../../ui'
import KindyEditor from '../index.vue'
import KindyDocumentExplorer from './DocumentExplorer.vue'
import DocumentLibraryShell from './DocumentLibraryShell.vue'
import KindyVersionPanel from './VersionPanel.vue'

defineOptions({ name: 'KindyDocumentLibrary' })

type WorkspaceStatus = 'idle' | 'ready' | 'dirty' | 'saving' | 'saved' | 'readonly' | 'preview' | 'conflict' | 'error'

const props = withDefaults(defineProps<{
  adapter?: DocumentApiAdapter
  client?: DocumentLibraryClient
  autosave?: { enabled?: boolean; delay?: number }
  stateSyncDelay?: number
  docxProfile?: CompatibilityReport['profile']
  locale?: string
  theme?: Record<string, string>
  messages?: Partial<KindyLibraryMessages>
  ui?: Partial<KindyLibraryUiOptions>
  editorOptions?: Record<string, unknown>
  collaboration?: CollaborationAdapter
  user?: { id?: string; name?: string; color?: string }
  showVersions?: boolean
  confirmCompatibility?: (report: CompatibilityReport) => boolean | Promise<boolean>
}>(), { locale: 'vi-VN', theme: () => ({}), messages: () => ({}), ui: () => ({}), editorOptions: () => ({}), autosave: () => ({}), stateSyncDelay: 300, docxProfile: 'kindy-docx-v2.0', showVersions: true })

const emit = defineEmits([
  'ready', 'opened', 'changed', 'save-started', 'saved', 'save-failed', 'created', 'imported',
  'compatibility-warning', 'version-restored', 'printed', 'error',
])

if (!props.client && !props.adapter) throw new Error('[kindy-editor] KindyDocumentLibrary requires a client or adapter.')
const ownsClient = !props.client
const libraryClient = props.client || createDocumentLibrary({ adapter: props.adapter!, autosave: props.autosave })
const slots = useSlots()
const reservedSlots = new Set(['explorer-actions', 'document', 'empty', 'topbar'])
const editorSlotNames = computed(() => Object.keys(slots).filter((name) => !reservedSlots.has(name)))
const copy = computed(() => resolveLibraryMessages(props.locale, props.messages))
const uiConfig = computed(() => resolveLibraryUi({ ...props.ui, showVersions: props.ui.showVersions ?? props.showVersions }))
const themeConfig = computed(() => createLibraryTheme(props.theme))
const wideViewport = useMediaQuery('(min-width: 1025px)')
const explorerOpen = ref(wideViewport.value && uiConfig.value.showExplorer)
const versionsOpen = ref(wideViewport.value && uiConfig.value.showVersions && props.showVersions)
const current = shallowRef<DocumentSnapshot | null>(null)
const liveSnapshot = shallowRef<DocumentSnapshot | null>(null)
const editor = ref<InstanceType<typeof KindyEditor> | null>(null)
const explorer = ref<InstanceType<typeof KindyDocumentExplorer> | null>(null)
const versions = ref<InstanceType<typeof KindyVersionPanel> | null>(null)
const editorKey = ref(0)
const opening = ref(false)
const exporting = ref(false)
const workspaceError = ref('')
const workspaceStatus = ref<WorkspaceStatus>('idle')
const previewVersionId = ref('')
const previewVersionNumber = ref<number | null>(null)
let applyingSnapshot = false
let snapshotGuardTimer: ReturnType<typeof setTimeout> | undefined
let openController: AbortController | undefined
let stateSyncTimer: ReturnType<typeof setTimeout> | undefined
let stateSyncPending = false
let collaborationSession: CollaborationSession | null = null
let collaborationDocumentId = ''

const activeDocumentId = computed(() => liveSnapshot.value?.document.id || current.value?.document.id || '')
const canEdit = computed(() => Boolean(current.value) && !previewVersionId.value && current.value?.document.capabilities?.edit !== false)
const canDownload = computed(() => current.value?.document.capabilities?.download !== false)
const canRestore = computed(() => liveSnapshot.value?.document.capabilities?.restore !== false)
const statusLabel = computed(() => ({
  idle: '', ready: copy.value.saved, dirty: copy.value.unsaved, saving: copy.value.saving,
  saved: copy.value.saved, readonly: copy.value.readOnly, preview: copy.value.previewingVersion,
  conflict: 'Version conflict', error: workspaceError.value || copy.value.loadFailed,
}[workspaceStatus.value]))
const resolvedEditorOptions = computed(() => ({
  ...props.editorOptions,
  user: props.user
    ? { ...props.user, label: props.user.name || props.user.id || 'Anonymous' }
    : props.editorOptions.user,
}))

const clientOffs = [
  libraryClient.on('changed', (payload) => { workspaceStatus.value = 'dirty'; emit('changed', payload) }),
  libraryClient.on('save-started', (payload) => { workspaceStatus.value = 'saving'; emit('save-started', payload) }),
  libraryClient.on('saved', async (payload) => {
    workspaceStatus.value = 'saved'
    editor.value?.markContentSaved?.()
    liveSnapshot.value = libraryClient.current
    if (!previewVersionId.value) current.value = liveSnapshot.value
    await versions.value?.refresh()
    emit('saved', payload)
  }),
  libraryClient.on('save-failed', (error) => {
    workspaceStatus.value = error instanceof DocumentLibraryError && error.code === 'VERSION_CONFLICT' ? 'conflict' : 'error'
    emit('save-failed', error)
  }),
  libraryClient.on('version-restored', (payload) => emit('version-restored', payload)),
  libraryClient.on('error', (error) => emit('error', error)),
]

const editorDocument = computed(() => ({
  ...defaultOptions.document,
  ...((props.editorOptions.document as Record<string, unknown> | undefined) || {}),
  title: current.value?.document.title || '',
  content: current.value?.state.content || createEmptyDocumentState().content,
  readOnly: !canEdit.value,
  autoSave: { enabled: false, interval: 0 },
}))

const editorPage = computed(() => ({
  ...defaultOptions.page,
  ...((props.editorOptions.page as Record<string, unknown> | undefined) || {}),
  ...(current.value ? {
    defaultMargin: current.value.state.page.margin,
    defaultOrientation: current.value.state.page.orientation,
    defaultBackground: current.value.state.page.background || '#fff',
    header: toLegacyHeaderFooter(current.value.state.page.header),
    footer: toLegacyHeaderFooter(current.value.state.page.footer),
    sections: (current.value.state.page.sections || []).map(toLegacySection),
  } : {}),
}))

const editorDicts = computed(() => {
  const configured = (props.editorOptions.dicts as Record<string, unknown> | undefined) || {}
  const currentSize = current.value?.state.page.size
  if (!currentSize) return { ...defaultOptions.dicts, ...configured }
  const configuredSizes = Array.isArray(configured.pageSizes)
    ? configured.pageSizes as Array<Record<string, unknown>>
    : defaultOptions.dicts.pageSizes as Array<Record<string, unknown>>
  const hasCurrentSize = configuredSizes.some((item) => Number(item.width) === currentSize.width && Number(item.height) === currentSize.height)
  const pageSizes = [
    ...(hasCurrentSize ? [] : [{ label: 'DOCX', width: currentSize.width, height: currentSize.height }]),
    ...configuredSizes,
  ].map((item) => ({
    ...item,
    default: Number(item.width) === currentSize.width && Number(item.height) === currentSize.height,
  }))
  return { ...defaultOptions.dicts, ...configured, pageSizes }
})

function toLegacyHeaderFooter(value: KindyDocumentState['page']['header']) {
  const image = findImageSource(value?.content)
  return {
    enable: value?.enabled || false,
    text: value?.text || textFromContent(value?.content),
    layout: image ? 'split' : 'single',
    align: 'center',
    logo: image,
    variants: {
      first: { text: value?.firstText || textFromContent(value?.firstContent), content: value?.firstContent },
      even: { text: value?.evenText || textFromContent(value?.evenContent), content: value?.evenContent },
    },
    differentFirstPage: Boolean(value?.differentFirstPage),
    differentOddEven: Boolean(value?.differentOddEven),
  }
}

function toLegacySection(section: NonNullable<KindyDocumentState['page']['sections']>[number]) {
  return {
    ...section,
    header: toLegacyHeaderFooter(section.header),
    footer: toLegacyHeaderFooter(section.footer),
  }
}

function textFromContent(content?: { text?: string; content?: unknown[] }): string {
  if (!content) return ''
  if (typeof content.text === 'string') return content.text
  return Array.isArray(content.content)
    ? content.content.map((child) => textFromContent(child as { text?: string; content?: unknown[] })).join('')
    : ''
}

function findImageSource(content?: { attrs?: Record<string, unknown>; content?: unknown[] }): string {
  if (!content) return ''
  const source = content.attrs?.src
  if (typeof source === 'string') return source
  if (!Array.isArray(content.content)) return ''
  for (const child of content.content) {
    const nested = findImageSource(child as { attrs?: Record<string, unknown>; content?: unknown[] })
    if (nested) return nested
  }
  return ''
}

async function openDocument(document: DocumentSummary) {
  cancelStateSync()
  disconnectCollaboration()
  openController?.abort()
  const controller = new AbortController()
  openController = controller
  opening.value = true
  workspaceError.value = ''
  previewVersionId.value = ''
  previewVersionNumber.value = null
  try {
    const snapshot = await libraryClient.open(document.id, undefined, controller.signal)
    if (controller.signal.aborted) return
    liveSnapshot.value = snapshot
    await applySnapshot(snapshot)
    workspaceStatus.value = snapshot.document.capabilities?.edit === false ? 'readonly' : 'ready'
    emit('opened', snapshot)
    if (!wideViewport.value) explorerOpen.value = false
  } catch (error) {
    if (controller.signal.aborted) return
    onError(error)
  } finally {
    if (openController === controller) {
      openController = undefined
      opening.value = false
    }
  }
}

async function applySnapshot(snapshot: DocumentSnapshot) {
  cancelStateSync()
  current.value = snapshot
  applyingSnapshot = true
  clearTimeout(snapshotGuardTimer)
  editorKey.value += 1
  await nextTick()
  // Some schema extensions normalize the initial document (for example by
  // adding the trailing paragraph required after a table). Those transactions
  // are part of mounting, not user edits, and must not trigger autosave.
  snapshotGuardTimer = setTimeout(() => { applyingSnapshot = false }, 1_000)
}

function onEditorReady() {
  editor.value?.setReadOnly(!canEdit.value)
  const editorInstance = editor.value?.useEditor()
  editorInstance?.setEditable(canEdit.value)
  const scroller = editorInstance?.view?.dom?.closest?.('.kindy-zoomable-container')
  if (scroller instanceof HTMLElement) scroller.scrollTop = 0
  emit('ready', { document: current.value?.document, editor: editor.value })
  void connectCollaboration()
  clearTimeout(snapshotGuardTimer)
  snapshotGuardTimer = setTimeout(() => { applyingSnapshot = false }, 50)
}

async function connectCollaboration() {
  const documentId = current.value?.document.id
  const editorInstance = editor.value?.useEditor()
  if (!props.collaboration || !documentId || !editorInstance || previewVersionId.value) return
  if (collaborationSession && collaborationDocumentId === documentId) return
  disconnectCollaboration()
  try {
    collaborationSession = await props.collaboration.connect({
      documentId,
      revisionId: current.value?.revisionId || '',
      user: props.user,
      editor: editorInstance,
    })
    collaborationDocumentId = documentId
  } catch (error) {
    onError(error)
  }
}

function disconnectCollaboration() {
  collaborationSession?.disconnect()
  collaborationSession = null
  collaborationDocumentId = ''
}

function stateFromEditor(): KindyDocumentState {
  if (!current.value || !editor.value) return createEmptyDocumentState()
  const editorPageValue = editor.value.getPage()
  return createEmptyDocumentState({
    content: editor.value.getJSON(),
    assets: current.value.state.assets,
    page: {
      ...current.value.state.page,
      size: editorPageValue.size ? { width: editorPageValue.size.width, height: editorPageValue.size.height } : current.value.state.page.size,
      orientation: editorPageValue.orientation || current.value.state.page.orientation,
      margin: editorPageValue.margin || current.value.state.page.margin,
      background: editorPageValue.background || current.value.state.page.background,
    },
  })
}

function onEditorChanged() {
  if (!current.value || applyingSnapshot || !canEdit.value) return
  workspaceStatus.value = 'dirty'
  stateSyncPending = true
  if (stateSyncTimer) clearTimeout(stateSyncTimer)
  stateSyncTimer = setTimeout(() => {
    stateSyncTimer = undefined
    flushEditorState()
  }, Math.max(32, props.stateSyncDelay))
}

function cancelStateSync() {
  if (stateSyncTimer) clearTimeout(stateSyncTimer)
  stateSyncTimer = undefined
  stateSyncPending = false
}

function flushEditorState() {
  if (!stateSyncPending || !current.value || !editor.value || !canEdit.value) return null
  if (stateSyncTimer) clearTimeout(stateSyncTimer)
  stateSyncTimer = undefined
  stateSyncPending = false
  const snapshot = libraryClient.updateState(stateFromEditor())
  liveSnapshot.value = snapshot
  return snapshot
}

async function saveFromEditor() {
  if (!canEdit.value) return { status: 'error', message: copy.value.readOnly, showMessage: true }
  try {
    if (!flushEditorState()) libraryClient.updateState(stateFromEditor())
    const result = await libraryClient.save('manual')
    current.value = libraryClient.current
    liveSnapshot.value = current.value
    await versions.value?.refresh()
    return { status: 'success', message: copy.value.saved, showMessage: true, result }
  } catch (error) {
    onError(error)
    return { status: 'error', message: error instanceof Error ? error.message : copy.value.loadFailed, showMessage: true }
  }
}

function onCreated(document: DocumentSummary) { emit('created', document) }
function onImported(document: DocumentSummary) { emit('imported', document) }

async function previewVersion(version: DocumentVersion) {
  if (!activeDocumentId.value) return
  opening.value = true
  disconnectCollaboration()
  try {
    const snapshot = await libraryClient.adapter.loadState(activeDocumentId.value, version.id)
    snapshot.document.capabilities = { ...snapshot.document.capabilities, edit: false }
    previewVersionId.value = version.id
    previewVersionNumber.value = version.number
    workspaceStatus.value = 'preview'
    await applySnapshot(snapshot)
    if (!wideViewport.value) versionsOpen.value = false
  } catch (error) { onError(error) }
  finally { opening.value = false }
}

async function exitVersionPreview() {
  if (!activeDocumentId.value) return
  previewVersionId.value = ''
  previewVersionNumber.value = null
  if (liveSnapshot.value) await applySnapshot(liveSnapshot.value)
  else {
    const snapshot = await libraryClient.open(activeDocumentId.value)
    liveSnapshot.value = snapshot
    await applySnapshot(snapshot)
  }
  workspaceStatus.value = canEdit.value ? 'ready' : 'readonly'
}

async function restoreVersion(version: DocumentVersion) {
  try {
    disconnectCollaboration()
    const snapshot = await libraryClient.restore(version.id)
    liveSnapshot.value = snapshot
    previewVersionId.value = ''
    previewVersionNumber.value = null
    await applySnapshot(snapshot)
    workspaceStatus.value = snapshot.document.capabilities?.edit === false ? 'readonly' : 'saved'
    await versions.value?.refresh()
  } catch (error) { onError(error) }
}

async function exportCurrentDocx(options: { mode?: 'strict' | 'best-effort'; store?: boolean; fileName?: string } = {}) {
  if (!current.value) throw new Error('No document is open.')
  const state = stateFromEditor()
  const exported = await exportDocx(state, { mode: options.mode, profile: props.docxProfile })
  if (options.store) await libraryClient.storeArtifact({ format: 'docx', blob: exported.blob, fileName: options.fileName || current.value.document.fileName, versionId: current.value.document.currentVersionId, compatibilityReport: exported.report })
  return exported
}

async function downloadCurrentDocx() {
  exporting.value = true
  try {
    let result
    try { result = await exportCurrentDocx({ mode: 'strict' }) }
    catch (error) {
      const report = error instanceof DocumentLibraryError ? error.details as CompatibilityReport | undefined : undefined
      if (!(error instanceof DocumentLibraryError) || error.code !== 'DOCX_UNSUPPORTED' || !report) throw error
      emit('compatibility-warning', report)
      const confirmed = props.confirmCompatibility
        ? await props.confirmCompatibility(report)
        : typeof window === 'undefined' || window.confirm(copy.value.compatibilityConfirm)
      if (!confirmed) return
      result = await exportCurrentDocx({ mode: 'best-effort' })
    }
    saveAs(result.blob, current.value?.document.fileName || 'document.docx')
  } catch (error) { onError(error) }
  finally { exporting.value = false }
}

async function preparePrint() { return editor.value?.getVanillaHTML() }
function print() { editor.value?.print() }
function closePanels() { if (!wideViewport.value) { explorerOpen.value = false; versionsOpen.value = false } }
function onError(error: unknown) {
  workspaceError.value = error instanceof Error ? error.message : String(error)
  workspaceStatus.value = error instanceof DocumentLibraryError && error.code === 'VERSION_CONFLICT' ? 'conflict' : 'error'
  emit('error', error)
}

onErrorCaptured((error, _instance, info) => {
  console.error(`[KindyDocumentLibrary] Child component error during ${info}.`, error)
  const previousError = workspaceError.value
  onError(error)
  if (import.meta.env.DEV && error instanceof Error && error.stack) {
    workspaceError.value = previousError
      ? `${previousError}\n---\n${error.stack}`
      : error.stack
  }
  return false
})
onBeforeUnmount(() => {
  openController?.abort()
  clearTimeout(snapshotGuardTimer)
  cancelStateSync()
  disconnectCollaboration()
  clientOffs.forEach((off) => off())
  if (ownsClient) libraryClient.destroy()
})
defineExpose({
  client: libraryClient,
  openDocument,
  closeDocument: () => { disconnectCollaboration(); current.value = null; liveSnapshot.value = null; previewVersionId.value = ''; workspaceStatus.value = 'idle' },
  save: saveFromEditor,
  exportDocx: exportCurrentDocx,
  downloadDocx: downloadCurrentDocx,
  preparePrint,
  print,
  getState: stateFromEditor,
  flushState: flushEditorState,
  getEditor: () => editor.value,
  getCollaborationUsers: () => collaborationSession?.getUsers?.() || [],
  refresh: () => explorer.value?.refresh(),
  toggleExplorer: (open?: boolean) => { explorerOpen.value = open ?? !explorerOpen.value },
  toggleVersions: (open?: boolean) => { versionsOpen.value = open ?? !versionsOpen.value },
})
</script>

<style scoped>
/* Workspace status/action styles complement the layout shell. */
.kindy-document-workspace { position: relative; width: 100%; height: 100%; min-width: 0; overflow: hidden; background: var(--kindy-library-bg); }
.kindy-document-workspace__state { display: flex; box-sizing: border-box; width: 100%; height: 100%; min-height: 320px; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 32px; color: var(--kindy-library-muted); text-align: center; }
.kindy-document-workspace__state strong { color: var(--kindy-library-text); font-size: 17px; }
.kindy-document-workspace__state > span:not(.kindy-document-workspace__spinner) { max-width: 430px; line-height: 1.55; }
.kindy-document-workspace__state button, .kindy-document-workspace__preview button { cursor: pointer; border: 0; background: transparent; color: var(--kindy-library-primary); font: inherit; font-weight: 700; }
.kindy-document-workspace__state--error, .kindy-document-workspace__state--error strong { color: var(--kindy-library-danger); }
.kindy-document-workspace__empty-icon { display: grid; width: 68px; height: 82px; place-items: center; border: 1px solid var(--kindy-library-border); border-radius: 12px; background: var(--kindy-library-surface); color: var(--kindy-library-primary); box-shadow: 0 8px 30px rgb(15 23 42 / 7%); font-size: 12px; font-weight: 800; }
.kindy-document-workspace__spinner { width: 24px; height: 24px; animation: kindy-workspace-spin .8s linear infinite; border: 3px solid var(--kindy-library-border); border-top-color: var(--kindy-library-primary); border-radius: 50%; }
.kindy-document-workspace__preview { position: absolute; z-index: 8; top: 10px; left: 50%; display: flex; align-items: center; gap: 12px; transform: translateX(-50%); border: 1px solid #fedf89; border-radius: 999px; padding: 7px 12px; background: #fffaeb; color: #93370d; box-shadow: 0 4px 16px rgb(15 23 42 / 10%); font-size: 12px; }
.kindy-workspace-bar { display: grid; min-height: 58px; grid-template-columns: minmax(180px, 1fr) auto minmax(260px, 1fr); align-items: center; gap: 12px; padding: 0 12px; }
.kindy-workspace-bar__identity, .kindy-workspace-bar__actions { display: flex; min-width: 0; align-items: center; gap: 8px; }
.kindy-workspace-bar__actions { justify-content: flex-end; }
.kindy-workspace-bar__identity + .kindy-workspace-bar__actions { grid-column: 3; }
.kindy-workspace-bar__document { display: grid; min-width: 0; }
.kindy-workspace-bar__document strong, .kindy-workspace-bar__document span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kindy-workspace-bar__document strong { font-size: 13px; }
.kindy-workspace-bar__document span { color: var(--kindy-library-muted); font-size: 10px; }
.kindy-workspace-bar__status { display: flex; align-items: center; gap: 6px; color: var(--kindy-library-muted); font-size: 11px; white-space: nowrap; }
.kindy-workspace-bar__status > span { width: 7px; height: 7px; border-radius: 50%; background: #98a2b3; }
.kindy-workspace-bar__status.is-dirty > span { background: #f79009; }
.kindy-workspace-bar__status.is-saving > span { animation: kindy-pulse 1s ease-in-out infinite; background: var(--kindy-library-primary); }
.kindy-workspace-bar__status.is-ready > span, .kindy-workspace-bar__status.is-saved > span { background: #12b76a; }
.kindy-workspace-bar__status.is-error > span, .kindy-workspace-bar__status.is-conflict > span { background: var(--kindy-library-danger); }
.kindy-workspace-bar__status.is-preview > span, .kindy-workspace-bar__status.is-readonly > span { background: #7f56d9; }
.kindy-workspace-bar__button, .kindy-workspace-bar__icon { display: inline-grid; min-height: 34px; place-items: center; cursor: pointer; border: 1px solid var(--kindy-library-border); border-radius: 7px; background: var(--kindy-library-surface); padding: 6px 9px; color: var(--kindy-library-text); font: inherit; font-size: 11px; font-weight: 650; white-space: nowrap; }
.kindy-workspace-bar__icon { width: 34px; padding: 0; font-size: 16px; }
.kindy-workspace-bar__button:hover:not(:disabled), .kindy-workspace-bar__icon:hover { border-color: var(--kindy-library-primary); color: var(--kindy-library-primary); }
.kindy-workspace-bar__button--primary { border-color: var(--kindy-library-primary); background: var(--kindy-library-primary); color: #fff; }
.kindy-workspace-bar__button--primary:hover:not(:disabled) { background: var(--kindy-library-primary-hover); color: #fff; }
.kindy-workspace-bar__button:disabled { cursor: not-allowed; opacity: .5; }
@keyframes kindy-workspace-spin { to { transform: rotate(360deg); } }
@keyframes kindy-pulse { 50% { opacity: .35; } }
@media (max-width: 720px) {
  .kindy-workspace-bar { grid-template-columns: minmax(0, 1fr) auto; }
  .kindy-workspace-bar__status { display: none; }
  .kindy-workspace-bar__button:not(.kindy-workspace-bar__button--primary) { display: none; }
}
@media (prefers-reduced-motion: reduce) { .kindy-document-workspace__spinner, .kindy-workspace-bar__status.is-saving > span { animation: none; } }
</style>
