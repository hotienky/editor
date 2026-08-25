<template>
  <DocumentLibraryShell
    :density="uiConfig.density"
    :show-topbar="uiConfig.showTopbar"
    :theme="themeConfig"
  >
    <template #topbar>
      <slot name="topbar" :document="current?.document" :status="workspaceStatus" :save="saveFromEditor">
        <div class="kindy-docs-header">
          <div class="kindy-docs-header-left">
            <div
              class="kindy-docs-logo"
              title="Kindy Docs"
            >
              <span class="kindy-docs-logo-letter">W</span>
            </div>

            <div class="kindy-docs-info-and-menu">
              <!-- Document Name & Auto-save Status -->
              <div class="kindy-docs-title-row">
                <input
                  v-if="current"
                  v-model="current.document.title"
                  type="text"
                  class="kindy-docs-title-input"
                  placeholder="Tài liệu không có tiêu đề"
                  @change="onTitleChange"
                />
                <span v-else class="kindy-docs-title-static">Kindy Document Library</span>
                <span class="kindy-docs-cloud-status" :title="statusLabel">
                  <span class="status-dot" :class="`is-${workspaceStatus}`"></span>
                  {{ workspaceStatus === 'saving' ? 'Đang lưu...' : (workspaceStatus === 'dirty' ? 'Có thay đổi chưa lưu' : 'Đã lưu vào bộ nhớ') }}
                </span>
              </div>

              <!-- Text Menubar (Tệp, Chỉnh sửa, Xem, Chèn, Định dạng, Bố cục, Công cụ, Trợ giúp) -->
              <div class="kindy-docs-menubar">
                <!-- Tệp Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'file' }" @click.stop="toggleMenuDropdown('file')">
                    Tệp
                  </button>
                  <div v-if="openMenuName === 'file'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="createBlankDocument(); closeMenu()">
                      <span>Tạo mới (Ctrl+N)</span>
                    </div>
                    <div class="menu-item" @click="openImportDialog(); closeMenu()">
                      <span>Mở tệp (.docx, .json)</span>
                    </div>
                    <div class="menu-item" @click="saveFromEditor(); closeMenu()">
                      <span>Lưu tài liệu (Ctrl+S)</span>
                    </div>
                    <div class="menu-divider"></div>
                    <div class="menu-item" @click="downloadCurrentDocx(); closeMenu()">
                      <span>Tải xuống (.docx)</span>
                    </div>
                    <div class="menu-item" @click="downloadCurrentPdf(); closeMenu()">
                      <span>Tải xuống (.pdf)</span>
                    </div>
                    <div class="menu-item" @click="print(); closeMenu()">
                      <span>In ấn (Ctrl+P)</span>
                    </div>
                  </div>
                </div>

                <!-- Chỉnh sửa Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'edit' }" @click.stop="toggleMenuDropdown('edit')">
                    Chỉnh sửa
                  </button>
                  <div v-if="openMenuName === 'edit'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="triggerUndo(); closeMenu()"><span>Hoàn tác (Ctrl+Z)</span></div>
                    <div class="menu-item" @click="triggerRedo(); closeMenu()"><span>Làm lại (Ctrl+Y)</span></div>
                    <div class="menu-divider"></div>
                    <div class="menu-item" @click="triggerCut(); closeMenu()"><span>Cắt (Ctrl+X)</span></div>
                    <div class="menu-item" @click="triggerCopy(); closeMenu()"><span>Sao chép (Ctrl+C)</span></div>
                    <div class="menu-item" @click="triggerPaste(); closeMenu()"><span>Dán (Ctrl+V)</span></div>
                  </div>
                </div>

                <!-- Xem Menu -->
                <div class="menu-dropdown-wrapper">
                    <button class="menu-tab-btn" :class="{ active: openMenuName === 'view' }" @click.stop="toggleMenuDropdown('view')">
                    Xem
                  </button>
                  <div v-if="openMenuName === 'view'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="triggerToggleRuler(); closeMenu()"><span>Bật/tắt thước kẻ</span></div>
                    <div class="menu-item" @click="triggerToggleFullscreen(); closeMenu()"><span>Toàn màn hình</span></div>
                  </div>
                </div>

                <!-- Chèn Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'insert' }" @click.stop="toggleMenuDropdown('insert')">
                    Chèn
                  </button>
                  <div v-if="openMenuName === 'insert'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="triggerInsertImage(); closeMenu()"><span>Hình ảnh</span></div>
                    <div class="menu-item" @click="triggerInsertTable(); closeMenu()"><span>Bảng biểu</span></div>
                    <div class="menu-item" @click="triggerInsertPageBreak(); closeMenu()"><span>Ngắt trang</span></div>
                    <div class="menu-item" @click="triggerInsertHr(); closeMenu()"><span>Đường phân cách</span></div>
                    <div class="menu-item" @click="triggerInsertLink(); closeMenu()"><span>Đường liên kết</span></div>
                  </div>
                </div>

                <!-- Định dạng Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'format' }" @click.stop="toggleMenuDropdown('format')">
                    Định dạng
                  </button>
                  <div v-if="openMenuName === 'format'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="triggerBold(); closeMenu()"><span>Đậm (Ctrl+B)</span></div>
                    <div class="menu-item" @click="triggerItalic(); closeMenu()"><span>Nghiêng (Ctrl+I)</span></div>
                    <div class="menu-item" @click="triggerUnderline(); closeMenu()"><span>Gạch chân (Ctrl+U)</span></div>
                    <div class="menu-item" @click="triggerStrike(); closeMenu()"><span>Gạch ngang</span></div>
                    <div class="menu-divider"></div>
                    <div class="menu-item" @click="triggerClearFormat(); closeMenu()"><span>Xóa định dạng</span></div>
                  </div>
                </div>

                <!-- Bố cục Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'layout' }" @click.stop="toggleMenuDropdown('layout')">
                    Bố cục
                  </button>
                  <div v-if="openMenuName === 'layout'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="setOrientation('portrait'); closeMenu()"><span>Khổ dọc (Portrait)</span></div>
                    <div class="menu-item" @click="setOrientation('landscape'); closeMenu()"><span>Khổ ngang (Landscape)</span></div>
                    <div class="menu-divider"></div>
                    <div class="menu-item" @click="setStandardMargins(); closeMenu()"><span>Lề tiêu chuẩn (2cm)</span></div>
                    <div class="menu-item" @click="setNarrowMargins(); closeMenu()"><span>Lề hẹp (1.27cm)</span></div>
                  </div>
                </div>

                <!-- Công cụ Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'tools' }" @click.stop="toggleMenuDropdown('tools')">
                    Công cụ
                  </button>
                  <div v-if="openMenuName === 'tools'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="showWordCountAlert(); closeMenu()"><span>Đếm số từ</span></div>
                  </div>
                </div>

                <!-- Trợ giúp Menu -->
                <div class="menu-dropdown-wrapper">
                  <button class="menu-tab-btn" :class="{ active: openMenuName === 'help' }" @click.stop="toggleMenuDropdown('help')">
                    Trợ giúp
                  </button>
                  <div v-if="openMenuName === 'help'" class="docs-dropdown-panel" @click.stop>
                    <div class="menu-item" @click="showShortcutsInfo(); closeMenu()"><span>Phím tắt</span></div>
                    <div class="menu-item" @click="showAboutInfo(); closeMenu()"><span>Về phần mềm</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Comments, Share, Avatar -->
          <div class="kindy-docs-header-right">
            <button
              class="kindy-docs-btn-comments"
              title="Thêm bình luận"
              @click="editor?.useEditor?.()?.commands?.setComment?.()"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Bình luận</span>
            </button>

            <button class="kindy-docs-btn-export-pdf" title="Tải xuống tài liệu dạng PDF" @click="downloadCurrentPdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <span>Xuất PDF</span>
            </button>
            <button class="kindy-docs-btn-share" title="Tải xuống hoặc chia sẻ tài liệu" @click="downloadCurrentDocx">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Chia sẻ</span>
            </button>

            <div class="kindy-docs-avatar-badge" title="Tài khoản Kindy">
              <span>K</span>
            </div>
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
          :locale="workspaceLocale"
          :dicts="editorDicts"
          :document="editorDocument"
          :page="editorPage"
          :on-save="saveFromEditor"
          @created="onEditorReady"
          @changed="onEditorChanged"
          @changed:locale="onEditorLocaleChanged"
          @print="emit('printed', current?.document)"
        >
          <template #toolbar_export="slotProps">
            <slot name="toolbar_export" v-bind="slotProps || {}" />
          </template>
          <template v-for="name in editorSlotNames" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps || {}" />
          </template>
        </KindyEditor>
      </template>
      <div class="kindy-docs-watermark-badge">Kindy Docs</div>
    </main>
  </DocumentLibraryShell>
</template>

<script setup lang="ts">
import saveAs from 'file-saver'
import { onClickOutside } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onErrorCaptured, onMounted, ref, shallowRef, useSlots, watch } from 'vue'
import { exportDocx, importDocxInWorker } from '../../codecs'
import { exportDocumentToPdf } from '../../codecs/pdf'
import { DocumentLibraryClient, createDocumentLibrary } from '../../core/client'
import { DocumentLibraryError } from '../../core/errors'
import { createEmptyDocumentState } from '../../core/state'
import type { CollaborationAdapter, CollaborationSession, CompatibilityReport, DocumentApiAdapter, DocumentSnapshot, DocumentSummary, DocumentVersion, KindyDocumentState } from '../../core/types'
import { defaultOptions } from '../../options'
import { createLibraryTheme, resolveLibraryMessages, resolveLibraryUi, type KindyLibraryMessages, type KindyLibraryUiOptions } from '../../ui'
import { CONTRACT_EDITOR_OPTIONS, createContractEditorOptions } from '../../ui/contract'
import KindyEditor from '../index.vue'
import DocumentLibraryShell from './DocumentLibraryShell.vue'

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
  confirmCompatibility?: (report: CompatibilityReport) => boolean | Promise<boolean>
}>(), { locale: 'vi-VN', theme: () => ({}), messages: () => ({}), ui: () => ({}), editorOptions: () => ({}), autosave: () => ({}), stateSyncDelay: 300, docxProfile: 'kindy-docx-v2.0' })

const emit = defineEmits([
  'ready', 'opened', 'changed', 'save-started', 'saved', 'save-failed', 'created', 'imported',
  'compatibility-warning', 'version-restored', 'printed', 'locale-changed', 'error',
])

if (!props.client && !props.adapter) throw new Error('[kindy-editor] KindyDocumentLibrary requires a client or adapter.')
const ownsClient = !props.client
const libraryClient = props.client || createDocumentLibrary({ adapter: props.adapter!, autosave: props.autosave })
const slots = useSlots()
const reservedSlots = new Set(['explorer-actions', 'document', 'empty', 'topbar', 'toolbar_export'])
const editorSlotNames = computed(() => Object.keys(slots).filter((name) => !reservedSlots.has(name)))
const workspaceLocale = ref(props.locale)
watch(() => props.locale, (value) => { workspaceLocale.value = value })
const copy = computed(() => resolveLibraryMessages(workspaceLocale.value, props.messages))
const uiConfig = computed(() => resolveLibraryUi(props.ui))
const themeConfig = computed(() => createLibraryTheme(props.theme))
const wideViewport = ref(typeof window === 'undefined' ? true : window.innerWidth >= 1025)
const defaultInitialSnapshot: DocumentSnapshot = {
  document: {
    id: 'default-doc',
    title: 'Tài liệu hợp đồng kinh tế',
    fileName: 'Tài liệu hợp đồng kinh tế.docx',
    folderId: null,
    tags: [],
    currentVersionId: 'v-1',
    currentRevisionId: 'r-1',
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    capabilities: { view: true, edit: true, comment: true, review: true, download: true, restore: true, manage: true },
  },
  state: createEmptyDocumentState(),
  revisionId: 'r-1',
}

const current = shallowRef<DocumentSnapshot | null>(null)
const liveSnapshot = shallowRef<DocumentSnapshot | null>(null)
const editor = ref<InstanceType<typeof KindyEditor> | null>(null)
const actionMenu = ref<HTMLDetailsElement | null>(null)
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

onClickOutside(actionMenu, () => {
  if (actionMenu.value) actionMenu.value.open = false
})

const openMenuName = ref<string | null>(null)
const toggleMenuDropdown = (name: string) => {
  openMenuName.value = openMenuName.value === name ? null : name
}
const closeMenu = () => {
  openMenuName.value = null
}

const onTitleChange = () => {
  if (current.value) {
    current.value.document.fileName = `${current.value.document.title}.docx`
    emit('changed', { document: current.value.document })
  }
}
const triggerUndo = () => {
  const pm = editor.value?.useEditor?.()
  pm?.commands?.undo?.() || (pm?.view?.dom as any)?.focus?.()
}
const triggerRedo = () => {
  const pm = editor.value?.useEditor?.()
  pm?.commands?.redo?.()
}
const triggerCut = () => document.execCommand('cut')
const triggerCopy = () => document.execCommand('copy')
const triggerPaste = () => document.execCommand('paste')
const triggerBold = () => editor.value?.useEditor?.()?.commands?.toggleBold?.()
const triggerItalic = () => editor.value?.useEditor?.()?.commands?.toggleItalic?.()
const triggerUnderline = () => editor.value?.useEditor?.()?.commands?.toggleUnderline?.()
const triggerStrike = () => editor.value?.useEditor?.()?.commands?.toggleStrike?.()
const triggerClearFormat = () => editor.value?.useEditor?.()?.commands?.unsetAllMarks?.()
const triggerToggleRuler = () => {
  if (editor.value?.page) editor.value.page.showRuler = !editor.value.page.showRuler
}
const triggerToggleFullscreen = () => {
  if (editor.value?.fullscreen !== undefined) editor.value.fullscreen = !editor.value.fullscreen
}
const triggerInsertImage = () => {
  const url = prompt('Nhập đường dẫn URL ảnh:')
  if (url) editor.value?.useEditor?.()?.commands?.setImage?.({ src: url })
}
const triggerInsertTable = () => {
  editor.value?.useEditor?.()?.commands?.insertTable?.({ rows: 3, cols: 3, withHeaderRow: true })
}
const triggerInsertPageBreak = () => {
  editor.value?.useEditor?.()?.commands?.setPageBreak?.()
}
const triggerInsertHr = () => {
  editor.value?.useEditor?.()?.commands?.setHorizontalRule?.()
}
const triggerInsertLink = () => {
  const url = prompt('Nhập URL liên kết:')
  if (url) editor.value?.useEditor?.()?.commands?.setLink?.({ href: url })
}
const setOrientation = (orientation: 'portrait' | 'landscape') => {
  if (editor.value?.page) editor.value.page.orientation = orientation
}
const setStandardMargins = () => {
  if (editor.value?.page) editor.value.page.margin = { top: 2, right: 2, bottom: 2, left: 2 }
}
const setNarrowMargins = () => {
  if (editor.value?.page) editor.value.page.margin = { top: 1.27, right: 1.27, bottom: 1.27, left: 1.27 }
}
const showWordCountAlert = () => {
  const words = editor.value?.useEditor?.()?.storage?.characterCount?.words?.() ?? 'N/A'
  alert(`Tổng số từ: ${words}`)
}
const showShortcutsInfo = () => {
  alert('Phím tắt thường dùng:\n- Ctrl + S: Lưu\n- Ctrl + P: In\n- Ctrl + Z: Hoàn tác\n- Ctrl + Y: Làm lại\n- Ctrl + B: In đậm\n- Ctrl + I: In nghiêng\n- Ctrl + U: Gạch chân')
}
const showAboutInfo = () => {
  alert('Kindy Editor v2.0 - Trình soạn thảo văn bản chuẩn DOCX')
}

function onViewportChange(isWide: boolean) {
  wideViewport.value = isWide
}

const activeDocumentId = computed(() => liveSnapshot.value?.document.id || current.value?.document.id || '')
const canEdit = computed(() => Boolean(current.value) && !previewVersionId.value && current.value?.document.capabilities?.edit !== false)
const canDownload = computed(() => current.value?.document.capabilities?.download !== false)
const canRestore = computed(() => liveSnapshot.value?.document.capabilities?.restore !== false)
const statusLabel = computed(() => ({
  idle: '', ready: copy.value.saved, dirty: copy.value.unsaved, saving: copy.value.saving,
  saved: copy.value.saved, readonly: copy.value.readOnly, preview: copy.value.previewingVersion,
  conflict: 'Version conflict', error: workspaceError.value || copy.value.loadFailed,
}[workspaceStatus.value]))
const resolvedEditorOptions = computed(() => {
  const configured = createContractEditorOptions(props.editorOptions)
  return {
    ...configured,
    // Workspace IO must pass through DocumentLibraryClient/adapter. File
    // actions live in the workspace bar; the editor keeps only editing tools.
    disableExtensions: Array.from(new Set([
      ...configured.disableExtensions,
      'import-word',
      'export-word',
      'export-pdf',
    ])),
    user: props.user
      ? { ...props.user, label: props.user.name || props.user.id || 'Anonymous' }
      : props.editorOptions.user,
  }
})

const onEditorLocaleChanged = ({ locale }: { locale: string }) => {
  if (!locale || locale === workspaceLocale.value) return
  workspaceLocale.value = locale
  emit('locale-changed', locale)
}

const clientOffs = [
  libraryClient.on('changed', (payload) => { workspaceStatus.value = 'dirty'; emit('changed', payload) }),
  libraryClient.on('save-started', (payload) => { workspaceStatus.value = 'saving'; emit('save-started', payload) }),
  libraryClient.on('saved', async (payload) => {
    const stillDirty = libraryClient.hasUnsavedChanges
    workspaceStatus.value = stillDirty ? 'dirty' : 'saved'
    if (!stillDirty) editor.value?.markContentSaved?.()
    liveSnapshot.value = libraryClient.current
    if (!previewVersionId.value) current.value = liveSnapshot.value
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
  ...CONTRACT_EDITOR_OPTIONS.page,
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
  const image = findImage(value?.content)
  const imageWidth = Number(image?.width) || 0
  const imageHeight = Number(image?.height) || 0
  const isBanner = Boolean(image?.src) && (
    imageWidth >= 320
    || (imageWidth > 0 && imageHeight > 0 && imageWidth / imageHeight >= 4)
  )
  return {
    enable: value?.enabled || false,
    text: (value?.text || textFromContent(value?.content)).trim(),
    content: value?.content,
    layout: isBanner ? 'banner' : image ? 'split' : 'single',
    align: 'center',
    logo: image?.src || '',
    ...(imageWidth > 0 ? { logoWidth: imageWidth } : {}),
    ...(imageHeight > 0 ? { logoHeight: imageHeight } : {}),
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

function findImage(content?: { attrs?: Record<string, unknown>; content?: unknown[] }): { src: string; width?: number; height?: number } | undefined {
  if (!content) return undefined
  const source = content.attrs?.src
  if (typeof source === 'string') {
    return {
      src: source,
      width: typeof content.attrs?.width === 'number' ? content.attrs.width : Number(content.attrs?.width) || undefined,
      height: typeof content.attrs?.height === 'number' ? content.attrs.height : Number(content.attrs?.height) || undefined,
    }
  }
  if (!Array.isArray(content.content)) return undefined
  for (const child of content.content) {
    const nested = findImage(child as { attrs?: Record<string, unknown>; content?: unknown[] })
    if (nested) return nested
  }
  return undefined
}

async function openDocument(document: DocumentSummary) {
  if (document.id === activeDocumentId.value && current.value && !previewVersionId.value) return
  openController?.abort()
  const controller = new AbortController()
  openController = controller
  opening.value = true
  workspaceError.value = ''
  previewVersionId.value = ''
  previewVersionNumber.value = null
  try {
    // Navigation must never discard a transaction that has not reached the
    // adapter yet. Flush the debounce buffer and finish the current save
    // before loading another document.
    if (current.value && canEdit.value) {
      flushEditorState()
      if (libraryClient.hasUnsavedChanges) await libraryClient.save('autosave')
    }
    if (controller.signal.aborted) return
    cancelStateSync()
    disconnectCollaboration()
    const snapshot = await libraryClient.open(document.id, undefined, controller.signal)
    if (controller.signal.aborted) return
    liveSnapshot.value = snapshot
    await applySnapshot(snapshot)
    workspaceStatus.value = snapshot.document.capabilities?.edit === false ? 'readonly' : 'ready'
    emit('opened', snapshot)
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

function openImportDialog() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.docx,.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    opening.value = true
    try {
      if (file.name.endsWith('.docx')) {
        const converted = await importDocxInWorker(file, { mode: 'best-effort', profile: props.docxProfile })
        const imported = await libraryClient.import({
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          file,
          state: converted.state,
          compatibilityReport: converted.compatibilityReport,
        })
        await openDocument(imported.document)
      }
    } catch (err) {
      onError(err)
    } finally {
      opening.value = false
    }
  }
  input.click()
}

async function createBlankDocument() {
  try {
    const created = await libraryClient.create({ title: 'Tài liệu không có tiêu đề' })
    await openDocument(created.document)
  } catch (err) {
    onError(err)
  }
}

function runWorkspaceAction(action: () => unknown) {
  if (actionMenu.value) actionMenu.value.open = false
  void action()
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
  // `created` fires after the editor has completed its initial schema
  // normalization. Release the guard immediately so a fast first keystroke is
  // never mistaken for another mount transaction.
  applyingSnapshot = false
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
  if (!current.value || applyingSnapshot || !canEdit.value || !libraryClient.current) return
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
  if (!stateSyncPending || !current.value || !editor.value || !canEdit.value || !libraryClient.current) return null
  if (stateSyncTimer) clearTimeout(stateSyncTimer)
  stateSyncTimer = undefined
  stateSyncPending = false
  try {
    const snapshot = libraryClient.updateState(stateFromEditor())
    liveSnapshot.value = snapshot
    return snapshot
  } catch (e) {
    console.warn('[KindyDocumentLibrary] Skipping state sync before document is open:', e)
    return null
  }
}

async function saveFromEditor() {
  if (!canEdit.value) return { status: 'error', message: copy.value.readOnly, showMessage: true }
  try {
    if (!libraryClient.current) {
      if (current.value) {
        await libraryClient.create({ ...current.value.document, state: stateFromEditor() })
      }
    } else {
      if (!flushEditorState()) libraryClient.updateState(stateFromEditor())
    }
    const result = await libraryClient.save('manual')
    current.value = libraryClient.current
    liveSnapshot.value = current.value
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

async function resolveOriginalDocxArtifact() {
  const snapshot = current.value
  const source = snapshot?.document.originalSource
  if (
    !snapshot
    || !source
    || snapshot.revisionId !== source.revisionId
    || stateSyncPending
    || libraryClient.hasUnsavedChanges
    || workspaceStatus.value === 'dirty'
    || workspaceStatus.value === 'saving'
  ) return null
  const artifact = await libraryClient.adapter.getArtifact(snapshot.document.id, source.artifactId)
  return artifact.format === 'original-docx' ? artifact : null
}

async function exportCurrentDocx(options: { mode?: 'strict' | 'best-effort'; store?: boolean; fileName?: string; preferOriginal?: boolean } = {}) {
  if (!current.value) throw new Error('No document is open.')
  if (options.preferOriginal !== false) {
    const artifact = await resolveOriginalDocxArtifact()
    if (artifact?.blob) {
      const original = {
        blob: artifact.blob,
        report: current.value.document.originalSource?.compatibilityReport || {
          profile: props.docxProfile,
          supported: true,
          issues: [],
        },
        source: 'original' as const,
        artifact,
      }
      if (options.store) {
        await libraryClient.storeArtifact({
          format: 'docx',
          blob: original.blob,
          fileName: options.fileName || current.value.document.fileName,
          versionId: current.value.document.currentVersionId,
          compatibilityReport: original.report,
        })
      }
      return original
    }
  }
  const state = stateFromEditor()
  const exported = await exportDocx(state, { mode: options.mode, profile: props.docxProfile })
  if (options.store) await libraryClient.storeArtifact({ format: 'docx', blob: exported.blob, fileName: options.fileName || current.value.document.fileName, versionId: current.value.document.currentVersionId, compatibilityReport: exported.report })
  return { ...exported, source: 'serialized' as const }
}

async function downloadCurrentPdf() {
  exporting.value = true
  try {
    const editorPane = document.querySelector(".kindy-docs-editor-pane, .kindy-editor-container, .kindy-main, .kindy-page-content") as HTMLElement | null
    const title = current.value?.document.title || "tai-lieu"
    await exportDocumentToPdf(editorPane, { filename: title })
  } catch (error) {
    onError(error)
  } finally {
    exporting.value = false
  }
}

async function downloadCurrentDocx() {
  exporting.value = true
  try {
    const original = await resolveOriginalDocxArtifact()
    if (original?.blob || original?.url) {
      saveAs(original.blob || original.url!, current.value?.document.originalSource?.fileName || current.value?.document.fileName || 'document.docx')
      return
    }
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
function closePanels() {}
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
onMounted(async () => {
  if (!libraryClient.current) {
    try {
      const result = await libraryClient.adapter.listDocuments({ limit: 1 })
      if (result.items.length > 0) {
        await openDocument(result.items[0])
      }
    } catch (e) {
      console.warn('[KindyDocumentLibrary] Could not auto-open first document:', e)
    }
  }
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
})
</script>

<style scoped>
/* Google Docs Header */
.kindy-docs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px 16px;
  background-color: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  width: 100%;
  box-sizing: border-box;
  z-index: 20;
}

.kindy-docs-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kindy-docs-logo {
  width: 36px;
  height: 36px;
  background-color: #185abd;
  color: #ffffff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  box-shadow: 0 1px 3px rgba(24, 90, 189, 0.25);
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s ease;
}

.kindy-docs-logo:hover {
  transform: scale(1.04);
}

.kindy-docs-info-and-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kindy-docs-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kindy-docs-title-input {
  border: 1px solid transparent;
  background: transparent;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
  outline: none;
  min-width: 200px;
  max-width: 380px;
  transition: all 0.15s;
  font-family: inherit;
}

.kindy-docs-title-input:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
}

.kindy-docs-title-input:focus {
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.kindy-docs-title-static {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  padding: 2px 6px;
}

.kindy-docs-cloud-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

.kindy-docs-cloud-status .status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #10b981;
}

.kindy-docs-cloud-status .status-dot.is-dirty {
  background-color: #f59e0b;
}

.kindy-docs-cloud-status .status-dot.is-saving {
  background-color: #3b82f6;
  animation: kindy-pulse 1s infinite ease-in-out;
}

.kindy-docs-cloud-status .status-dot.is-error {
  background-color: #ef4444;
}

/* Text Menubar */
.kindy-docs-menubar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.menu-dropdown-wrapper {
  position: relative;
}

.menu-tab-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  color: #334155;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
  font-family: inherit;
}

.menu-tab-btn:hover,
.menu-tab-btn.active {
  background-color: #f1f5f9;
  color: #1e293b;
}

.docs-dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12);
  min-width: 220px;
  z-index: 1000;
  padding: 6px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: all 0.1s;
}

.menu-item:hover {
  background-color: #f1f5f9;
  color: #2563eb;
}

.menu-divider {
  height: 1px;
  background-color: #e2e8f0;
  margin: 5px 0;
}

/* Header Right */
.kindy-docs-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kindy-docs-btn-export-pdf {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 8px;
  transition: all 0.15s ease;
  &:hover {
    background: #e2e8f0;
    color: #0f172a;
    border-color: #94a3b8;
  }
}
.kindy-docs-btn-comments {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.kindy-docs-btn-comments:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.kindy-docs-btn-comments.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
}

.kindy-docs-btn-share {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #185abd;
  color: #ffffff;
  border: none;
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(24, 90, 189, 0.25);
  transition: background-color 0.15s;
  font-family: inherit;
}

.kindy-docs-btn-share:hover {
  background: #10438a;
}

.kindy-docs-avatar-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #0d9488;
  color: #ffffff;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.kindy-docs-watermark-badge {
  position: absolute;
  bottom: 16px;
  right: 20px;
  z-index: 5;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Workspace status/action styles */
.kindy-document-workspace {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: #f8f9fa;
}

.kindy-document-workspace :deep(.kindy-editor-container) {
  background: #f8f9fa;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-toolbar) {
  z-index: 6;
  min-width: 0;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 4px 12px;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-toolbar-container) {
  min-height: 42px;
  overflow: hidden;
  border-radius: 0;
  background: #ffffff;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-toolbar-container .kindy-scrollable-container) {
  min-width: 0;
  margin: 0;
  border-radius: 24px;
  padding: 3px 10px !important;
  background: #edf2fa;
  border: 1px solid #e2e8f0;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-toolbar-container .kindy-scrollable-content) {
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-classic-menu) {
  min-height: 34px;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-classic-menu .kindy-virtual-group::before) {
  margin: 0 6px;
  background: #cbd5e1;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-footer) {
  z-index: 6;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-status-bar) {
  min-height: 34px;
  box-sizing: border-box;
  border-top: 0;
  padding: 4px 12px;
  color: #475569;
}

.kindy-document-workspace :deep(.kindy-editor-container .kindy-page-container) {
  background: #f8f9fa;
}

.kindy-document-workspace__state {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  color: #64748b;
  text-align: center;
}

.kindy-document-workspace__state strong {
  color: #1e293b;
  font-size: 17px;
}

.kindy-document-workspace__state > span:not(.kindy-document-workspace__spinner) {
  max-width: 430px;
  line-height: 1.55;
}

.kindy-document-workspace__state button,
.kindy-document-workspace__preview button {
  cursor: pointer;
  border: 0;
  background: transparent;
  color: #185abd;
  font: inherit;
  font-weight: 700;
}

.kindy-document-workspace__empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}

.kindy-document-workspace__empty-actions button {
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 7px 12px;
  background: #ffffff;
}

.kindy-document-workspace__empty-actions button:hover {
  border-color: #185abd;
  background: #eff6ff;
}

.kindy-document-workspace__empty-actions button.is-primary {
  border-color: #185abd;
  background: #185abd;
  color: #fff;
}

.kindy-document-workspace__empty-actions button.is-primary:hover {
  background: #10438a;
}

.kindy-document-workspace__state--error,
.kindy-document-workspace__state--error strong {
  color: #ef4444;
}

.kindy-document-workspace__empty-icon {
  display: grid;
  width: 68px;
  height: 82px;
  place-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  color: #185abd;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.07);
  font-size: 12px;
  font-weight: 800;
}

.kindy-document-workspace__spinner {
  width: 24px;
  height: 24px;
  animation: kindy-workspace-spin .8s linear infinite;
  border: 3px solid #cbd5e1;
  border-top-color: #185abd;
  border-radius: 50%;
}

.kindy-document-workspace__preview {
  position: absolute;
  z-index: 8;
  top: 10px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateX(-50%);
  border: 1px solid #fedf89;
  border-radius: 999px;
  padding: 7px 12px;
  background: #fffaeb;
  color: #93370d;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
  font-size: 12px;
}

@keyframes kindy-workspace-spin {
  to { transform: rotate(360deg); }
}

@keyframes kindy-pulse {
  50% { opacity: .35; }
}

@media (max-width: 720px) {
  .kindy-docs-header {
    padding: 6px 8px;
  }
  .kindy-docs-menubar {
    display: none;
  }
  .kindy-docs-title-input {
    min-width: 140px;
    max-width: 200px;
    font-size: 14px;
  }
  .kindy-docs-btn-comments span,
  .kindy-docs-btn-share span {
    display: none;
  }
}
</style>
