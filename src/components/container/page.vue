<template>
  <div class="kindy-main-container">
    <!-- WORKSPACE -->
    <div class="kindy-editor-workspace">
      <container-toc
        v-if="pageOptions.showToc"
        @close="pageOptions.showToc = false"
      />
      <container-tabs />

      <!-- SCROLL CONTAINER (grey canvas like Google Docs) -->
      <div
        ref="scrollContainer"
        class="kindy-zoomable-container kindy-scrollbar"
        :class="`kindy-${pageOptions.layout}-container`"
        @scroll="onScroll"
      >
        <!-- SINGLE CONTINUOUS EDITOR (like Google Docs / Word Online) -->
        <div class="kindy-page-canvas">
          <container-ruler v-if="pageOptions.showRuler === true" />

          <!-- EDITOR — single continuous ProseMirror instance -->
          <!-- Page breaks are inserted as ProseMirror decorations by pagination.js -->
          <div
            class="kindy-page-editor-wrap"
            :style="{
              '--page-width': (pageSize?.width || 21) + 'cm',
              '--page-height': (pageSize?.height || 29.7) + 'cm',
              '--page-zoom': (pageOptions?.zoomLevel || 100) / 100,
              '--margin-top': (pageOptions?.margin?.top ?? 2.54) + 'cm',
              '--margin-bottom': (pageOptions?.margin?.bottom ?? 2.54) + 'cm',
              '--margin-left': (pageOptions?.margin?.left ?? 2.54) + 'cm',
              '--margin-right': (pageOptions?.margin?.right ?? 2.54) + 'cm',
              '--kindy-page-margin-top': (pageOptions?.margin?.top ?? 2.54) + 'cm',
              '--kindy-page-margin-bottom': (pageOptions?.margin?.bottom ?? 2.54) + 'cm',
              '--kindy-page-margin-left': (pageOptions?.margin?.left ?? 2.54) + 'cm',
              '--kindy-page-margin-right': (pageOptions?.margin?.right ?? 2.54) + 'cm',
              '--kindy-page-width': (pageSize?.width || 21) + 'cm',
              '--kindy-page-height': (pageSize?.height || 29.7) + 'cm',
            }"
          >
            <!-- GOOGLE DOCS STYLE HEADER OVERLAY -->
            <div
              v-if="pageOptions.header?.enable !== false"
              class="kindy-gdocs-header-zone"
              @dblclick="openHeaderDialog"
              title="Double click to edit Header"
            >
              <div class="kindy-gdocs-hf-badge">
                <span class="badge-title">{{ t('page.header.badgeLabel', { margin: pageOptions.header?.marginTop || 1.25 }) }}</span>
                <t-dropdown
                  :options="[
                    { content: t('page.header.formatOption'), value: 'dialog' },
                    { content: t('page.header.hideOption'), value: 'hide' }
                  ]"
                  @click="onHeaderOptionSelect"
                >
                  <t-button size="small" variant="text" class="kindy-gdocs-options-btn">
                    <span>{{ t('common.options') }}</span>
                    <icon name="caret-down" />
                  </t-button>
                </t-dropdown>
              </div>

              <div v-if="pageOptions.header?.layout === 'split'" class="kindy-gdocs-hf-split">
                <div class="kindy-gdocs-hf-left">
                  <img
                    v-if="pageOptions.header?.logo"
                    :src="pageOptions.header.logo"
                    :style="{ width: (pageOptions.header.logoWidth || 110) + 'px' }"
                    alt="Logo"
                  />
                  <span v-if="pageOptions.header?.leftText">{{ pageOptions.header.leftText }}</span>
                </div>
                <div
                  class="kindy-gdocs-hf-right"
                  :style="{
                    color: pageOptions.header?.fontColor || '#0072bc',
                    fontSize: (pageOptions.header?.fontSize || 14) + 'px',
                    fontWeight: pageOptions.header?.fontWeight || 'bold',
                    fontFamily: pageOptions.header?.fontFamily || 'inherit'
                  }"
                >
                  {{ pageOptions.header?.rightText || pageOptions.header?.text }}
                </div>
              </div>
              <div
                v-else
                class="kindy-gdocs-hf-single"
                :style="{
                  textAlign: pageOptions.header?.align || 'center',
                  color: pageOptions.header?.fontColor || '#0072bc',
                  fontSize: (pageOptions.header?.fontSize || 14) + 'px',
                  fontWeight: pageOptions.header?.fontWeight || 'bold'
                }"
              >
                <img
                  v-if="pageOptions.header?.logo"
                  :src="pageOptions.header.logo"
                  :style="{ width: (pageOptions.header.logoWidth || 110) + 'px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }"
                  alt="Logo"
                />
                <span>{{ pageOptions.header?.text || pageOptions.header?.leftText || pageOptions.header?.rightText }}</span>
              </div>
            </div>

            <!-- RIGHT-MARGIN GOOGLE DOCS (+) ADD COMMENT ACTION BUTTON -->
            <div
              v-if="hasSelection"
              class="kindy-gdocs-selection-add-comment-btn"
              :style="{ top: selectionBtnTop + 'px' }"
              title="Thêm bình luận (Cmd+Option+M)"
              @mousedown.prevent
              @click="addCommentFromSelection"
            >
              <icon name="comment" />
            </div>

            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>

            <!-- GOOGLE DOCS STYLE FOOTER OVERLAY -->
            <div
              v-if="pageOptions.footer?.enable"
              class="kindy-gdocs-footer-zone"
              @dblclick="openFooterDialog"
              title="Double click to edit Footer"
            >
              <div class="kindy-gdocs-hf-badge footer-badge">
                <span class="badge-title">{{ t('page.footer.badgeLabel', { margin: pageOptions.footer?.marginBottom || 1.25 }) }}</span>
                <t-dropdown
                  :options="[
                    { content: t('page.footer.formatOption'), value: 'dialog' },
                    { content: t('page.footer.hideOption'), value: 'hide' }
                  ]"
                  @click="onFooterOptionSelect"
                >
                  <t-button size="small" variant="text" class="kindy-gdocs-options-btn">
                    <span>{{ t('common.options') }}</span>
                    <icon name="caret-down" />
                  </t-button>
                </t-dropdown>
              </div>

              <div
                class="kindy-gdocs-hf-single"
                :style="{
                  textAlign: pageOptions.footer?.align || 'center',
                  color: pageOptions.footer?.fontColor || '#64748b',
                  fontSize: (pageOptions.footer?.fontSize || 12) + 'px'
                }"
              >
                <span>{{ pageOptions.footer?.text || pageOptions.footer?.leftText || pageOptions.footer?.rightText || 'Trang 1' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDEBAR (Comments / Suggestions panel on the right like Google Docs) -->
      <container-suggestions />
    </div>

    <!-- FLOATING PAGE STATUS -->
    <div class="kindy-main-floating-actions">
      <t-back-top
        style="position: relative"
        :container="`${container} .kindy-zoomable-container`"
        :visible-height="800"
        size="small"
      />
    </div>

    <t-image-viewer
      :attach="container"
      v-model:visible="imageViewer.visible"
      v-model:index="currentImageIndex"
      :images="previewImages"
      :trigger="() => {}"
      @close="imageViewer.visible = false"
    />
    <container-search-replace />
    <container-print />
    <container-comment v-if="commentStore.visible" />
    <dialog-header-footer v-model:visible="hfDialogVisible" :target-type="hfDialogType" />
    <dialog-preferences v-model:visible="prefDialogVisible" />
    <dialog-version-history v-model:visible="historyDialogVisible" />
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import Editor from '@/components/editor/index.vue'
import DialogHeaderFooter from '@/components/dialog/header-footer.vue'
import DialogPreferences from '@/components/dialog/preferences.vue'
import DialogVersionHistory from '@/components/dialog/version-history.vue'
import ContainerTabs from '@/components/container/tabs.vue'
import ContainerSuggestions from '@/components/container/suggestions.vue'
import ContainerRuler from '@/components/container/ruler.vue'

const container = inject('container')
const imageViewer = inject('imageViewer')
const pageOptions = inject('page')
const editor = inject('editor')
const commentStore = inject('commentStore')

const scrollContainer = ref(null)

let hfDialogVisible = ref(false)
let prefDialogVisible = ref(false)
let historyDialogVisible = ref(false)
let hfDialogType = ref('header')
let isHeaderFocused = ref(false)
let isFooterFocused = ref(false)
let currentPageFromScroll = ref(1)

const openHeaderDialog = () => {
  hfDialogType.value = 'header'
  hfDialogVisible.value = true
}

const openFooterDialog = () => {
  hfDialogType.value = 'footer'
  hfDialogVisible.value = true
}

const onHeaderOptionSelect = (data) => {
  if (data.value === 'dialog') {
    openHeaderDialog()
  } else if (data.value === 'hide') {
    pageOptions.value.header.enable = false
  }
}

const onFooterOptionSelect = (data) => {
  if (data.value === 'dialog') {
    openFooterDialog()
  } else if (data.value === 'hide') {
    pageOptions.value.footer.enable = false
  }
}

let hasSelection = ref(false)
let selectionBtnTop = ref(100)

const updateSelectionState = () => {
  if (!editor?.value) return
  const { selection } = editor.value.state
  if (!selection || selection.empty) {
    hasSelection.value = false
    return
  }
  hasSelection.value = true
  try {
    const coords = editor.value.view.coordsAtPos(selection.from)
    const canvasEl = document.querySelector('.kindy-page-editor-wrap')
    if (canvasEl) {
      const canvasRect = canvasEl.getBoundingClientRect()
      selectionBtnTop.value = Math.max(16, coords.top - canvasRect.top - 6)
    }
  } catch (e) {
    // fallback position
  }
}

const addCommentFromSelection = () => {
  commentStore.addComment()
  commentStore.toggle(true)
}

watch(
  () => editor.value,
  (instance) => {
    if (instance) {
      instance.on('open-header-footer', (type) => {
        hfDialogType.value = type || 'header'
        hfDialogVisible.value = true
      })
      instance.on('selectionUpdate', updateSelectionState)
      instance.on('transaction', updateSelectionState)
    }
  },
  { immediate: true },
)

const activeConfig = $computed(() => {
  if (isHeaderFocused) return pageOptions.value.header
  if (isFooterFocused) return pageOptions.value.footer
  return pageOptions.value.header
})

const totalPageNum = $computed(() => {
  if (editor.value?.storage?.pagination?.totalPages) {
    return editor.value.storage.pagination.totalPages
  }
  return 1
})

const currentPageNum = $computed(() => {
  return currentPageFromScroll || 1
})

const layoutTree = $computed(() => {
  return editor.value?.storage?.pagination?.layoutTree || null
})

const pageSize = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 21, height: 29.7 }
  return {
    width: pageOptions.value.orientation === 'landscape' ? height : width,
    height: pageOptions.value.orientation === 'landscape' ? width : height,
  }
})

const pagesList = $computed(() => {
  if (layoutTree?.pages && layoutTree.pages.length > 0) {
    return layoutTree.pages.map((page) => ({
      index: page.pageNumber - 1,
      pageNumber: page.pageNumber,
      isFirst: page.pageNumber === 1,
      isLast: page.pageNumber === layoutTree.totalPages,
      isOdd: page.pageNumber % 2 !== 0,
      contentHeight: page.contentHeight,
    }))
  }

  const list = []
  const totalPages = totalPageNum
  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1
    list.push({
      index: i,
      pageNumber: pageNum,
      isFirst: i === 0,
      isLast: i === totalPages - 1,
      isOdd: pageNum % 2 !== 0,
    })
  }
  return list
})

const shouldShowHeader = (pageInfo) => {
  const config = pageOptions.value.header
  if (!config?.enable) return false
  if (config.scope === 'first_last' && !pageInfo.isFirst) return false
  return true
}

const shouldShowFooter = (pageInfo) => {
  const config = pageOptions.value.footer
  if (!config?.enable) return false
  if (config.scope === 'first_last' && !pageInfo.isLast) return false
  return true
}

const onScroll = () => {
  if (!scrollContainer) return
  const { scrollTop } = scrollContainer
  const zoomLevel = pageOptions.value.zoomLevel || 100

  if (layoutTree?.pages && layoutTree.pages.length > 0) {
    const zoom = zoomLevel / 100
    for (let i = layoutTree.pages.length - 1; i >= 0; i--) {
      const page = layoutTree.pages[i]
      if (scrollTop >= (page.contentStartY || 0) * zoom - 100) {
        currentPageFromScroll = page.pageNumber
        return
      }
    }
    currentPageFromScroll = 1
  } else {
    const pageHeightPx = (pageSize.height * 96 / 2.54) * (zoomLevel / 100)
    const page = Math.floor(scrollTop / pageHeightPx) + 1
    currentPageFromScroll = Math.max(1, Math.min(page, totalPageNum))
  }
}

const activateHeaderMode = (e) => {
  if (e) e.stopPropagation()
  isHeaderFocused = true
  isFooterFocused = false
}

const activateFooterMode = (e) => {
  if (e) e.stopPropagation()
  isFooterFocused = true
  isHeaderFocused = false
}

const closeHeaderFooterMode = () => {
  isHeaderFocused = false
  isFooterFocused = false
}

const openDialogFromBar = () => {
  hfDialogType = isHeaderFocused ? 'header' : 'footer'
  hfDialogVisible = true
}

const onBarLogoChange = (files) => {
  const file = files[0]?.raw || files[0]
  if (file && activeConfig) {
    const reader = new FileReader()
    reader.onload = (e) => {
      activeConfig.logo = e.target.result
      activeConfig.enable = true
    }
    reader.readAsDataURL(file)
  }
}

const setHeader = () => {
  hfDialogType = 'header'
  hfDialogVisible = true
}

const setFooter = () => {
  hfDialogType = 'footer'
  hfDialogVisible = true
}

const onPageClick = (event) => {
  const { target } = event
  const isInsideHF = target?.closest?.('.kindy-page-header, .kindy-page-footer, .kindy-hf-context-bar')
  if (!isInsideHF) {
    isHeaderFocused = false
    isFooterFocused = false
  }

  const commentEl = target?.closest?.('[data-comment]')
  if (commentEl && editor?.value) {
    const id = commentEl.getAttribute('data-comment')
    if (id) {
      commentStore?.toggle(true)
      commentStore?.focus(id)
      return
    }
  }
  if (editor?.value && !isInsideHF) {
    const isInteractive = target?.closest?.(
      'button, input, select, textarea, a, .t-popup, .t-dropdown, .kindy-comment-sidebar, .t-dialog',
    )
    if (!isInteractive && !editor.value.isFocused) {
      editor.value.commands.focus()
    }
  }
}

const previewImages = $computed(() => {
  if (!imageViewer.value?.visible) return []
  const images = editor.value?.dom?.querySelectorAll('img') || []
  return Array.from(images).map((img) => img.src)
})

const currentImageIndex = $computed({
  get() {
    return previewImages.indexOf(imageViewer.value?.currentImage)
  },
  set(index) {
    imageViewer.value.currentImage = previewImages[index]
  },
})
</script>

<style lang="less">
/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN CONTAINER                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-main-container {
  display: flex;
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
  flex-direction: column;

  .kindy-editor-workspace {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    position: relative;
    overflow: hidden;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SCROLL CONTAINER (grey canvas like Google Docs)                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-zoomable-container {
  flex: 1;
  overflow: auto;
  position: relative;
  box-sizing: border-box;
  background-color: var(--kindy-container-background, #e8eaed);
  padding: 32px 0;

  &.kindy-page-container {
    display: flex;
    justify-content: center;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGES WRAPPER                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGE CANVAS — single continuous editor, no per-page DOM splitting          */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-page-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGE HEADER                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-page-header {
  position: relative;
  box-sizing: border-box;
  width: calc(var(--page-width, 21cm) * var(--page-zoom, 1));
  padding-left: var(--margin-left, 2.54cm);
  padding-right: var(--margin-right, 2.54cm);
  padding-top: 0.3cm;
  padding-bottom: 0.2cm;
  min-height: 1.5cm;
  background: var(--kindy-page-background, #ffffff);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 2px 2px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  color: #64748b;
  z-index: 2;

  &:hover {
    background: rgba(2, 132, 199, 0.04);
  }

  &.is-focused {
    outline: 1.5px dashed var(--kindy-primary-color, #0284c7);
    outline-offset: -2px;
    background: rgba(2, 132, 199, 0.04);

    &::before {
      content: attr(data-label);
      position: absolute;
      top: -20px;
      left: 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
      background: var(--kindy-primary-color, #0284c7);
      padding: 2px 10px;
      border-radius: 4px 4px 0 0;
      z-index: 20;
      pointer-events: none;
    }
  }

  .kindy-hf-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    font-size: var(--hf-font-size, 12px);
    color: var(--hf-font-color, #64748b);
    font-family: var(--hf-font-family, inherit);
    font-weight: var(--hf-font-weight, normal);
    text-align: var(--hf-align, left);

    &.has-border {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
  }

  .kindy-hf-left,
  .kindy-hf-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .kindy-hf-single {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .kindy-hf-textarea {
    width: 100%;
    border: 1px solid var(--kindy-primary-color, #0284c7);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: inherit;
    outline: none;
    resize: none;
  }

  .kindy-hf-logo {
    height: auto;
    max-height: 32px;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGE EDITOR WRAP — single continuous block with page-width styling        */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-page-editor-wrap {
  position: relative;
  box-sizing: border-box;
  width: calc(var(--page-width, 21cm) * var(--page-zoom, 1));
  min-height: calc(var(--page-height, 29.7cm) * var(--page-zoom, 1));
  padding-top: calc(var(--margin-top, 2.54cm) * var(--page-zoom, 1));
  padding-bottom: calc(var(--margin-bottom, 2.54cm) * var(--page-zoom, 1));
  padding-left: calc(var(--margin-left, 2.54cm) * var(--page-zoom, 1));
  padding-right: calc(var(--margin-right, 2.54cm) * var(--page-zoom, 1));
  background: var(--kindy-page-background, #ffffff);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08);
  transition: opacity 0.25s ease, filter 0.25s ease;
  z-index: 1;

  [contenteditable] {
    outline: none;
  }
}

.kindy-gdocs-selection-add-comment-btn {
  position: absolute;
  right: -42px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ffffff;
  color: #1a73e8;
  box-shadow: 0 2px 6px rgba(60, 64, 67, 0.15), 0 1px 2px rgba(60, 64, 67, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  z-index: 50;
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease;

  &:hover {
    transform: scale(1.1);
    background: #f8fafc;
    color: #1557b0;
  }
}

.kindy-gdocs-header-zone {
  position: absolute;
  top: 0.4cm;
  left: calc(var(--margin-left, 2.54cm) * var(--page-zoom, 1));
  right: calc(var(--margin-right, 2.54cm) * var(--page-zoom, 1));
  height: calc((var(--margin-top, 2.54cm) - 0.6cm) * var(--page-zoom, 1));
  display: flex;
  flex-direction: column;
  justify-content: center;
  user-select: none;
  cursor: pointer;
  z-index: 10;
  border-bottom: 1px transparent dashed;
  transition: border-color 0.2s ease, background 0.2s ease;
  padding-bottom: 4px;

  &:hover {
    border-bottom-color: #1a73e8;
    background: rgba(26, 115, 232, 0.03);

    .kindy-gdocs-hf-badge {
      opacity: 1;
    }
  }
}

.kindy-gdocs-footer-zone {
  position: absolute;
  bottom: 0.4cm;
  left: calc(var(--margin-left, 2.54cm) * var(--page-zoom, 1));
  right: calc(var(--margin-right, 2.54cm) * var(--page-zoom, 1));
  height: calc((var(--margin-bottom, 2.54cm) - 0.6cm) * var(--page-zoom, 1));
  display: flex;
  flex-direction: column;
  justify-content: center;
  user-select: none;
  cursor: pointer;
  z-index: 10;
  border-top: 1px transparent dashed;
  transition: border-color 0.2s ease, background 0.2s ease;
  padding-top: 4px;

  &:hover {
    border-top-color: #1a73e8;
    background: rgba(26, 115, 232, 0.03);

    .kindy-gdocs-hf-badge {
      opacity: 1;
    }
  }
}

.kindy-gdocs-hf-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 500;
  color: #5f6368;
  margin-bottom: 4px;
  opacity: 0.75;
  transition: opacity 0.2s ease;

  &.footer-badge {
    margin-bottom: 0;
    margin-top: 4px;
  }

  .badge-title {
    letter-spacing: 0.2px;
  }

  .kindy-gdocs-options-btn {
    font-size: 11px;
    height: 22px;
    padding: 0 6px;
    color: #1a73e8;

    &:hover {
      background: rgba(26, 115, 232, 0.08);
    }
  }
}

.kindy-gdocs-hf-split {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.kindy-gdocs-hf-left,
.kindy-gdocs-hf-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kindy-gdocs-hf-single {
  width: 100%;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* PAGE BREAK DECORATION — visual separator between pages (via ProseMirror)   */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-page-break-decoration {
  position: relative;
  display: block;
  width: calc(100% + calc(var(--margin-left, 2.54cm) + var(--margin-right, 2.54cm)) * var(--page-zoom, 1));
  margin-left: calc(-1 * var(--margin-left, 2.54cm) * var(--page-zoom, 1));
  margin-right: calc(-1 * var(--margin-right, 2.54cm) * var(--page-zoom, 1));
  height: 24px;
  background: var(--kindy-container-background, #e8eaed);
  border-top: 1px dashed #cbd5e1;
  border-bottom: 1px dashed #cbd5e1;
  margin-top: 24px;
  margin-bottom: 24px;
  user-select: none;
  pointer-events: none;
  z-index: 5;

  &::after {
    content: attr(data-page);
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    background: #ffffff;
    padding: 2px 8px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    white-space: nowrap;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* HF CONTEXT BAR (floating ribbon when editing header/footer)               */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-hf-context-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid var(--kindy-border-color, #e2e8f0);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  z-index: 100;
  flex-wrap: wrap;

  .kindy-hf-bar-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--kindy-primary-color, #0284c7);
  }

  .kindy-hf-bar-divider {
    width: 1px;
    height: 20px;
    background: #cbd5e1;
  }

  .kindy-hf-bar-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;

    label {
      font-weight: 600;
      color: #475569;
    }

    .unit {
      color: #94a3b8;
      font-size: 12px;
    }

    .kindy-color-box {
      width: 28px;
      height: 28px;
      padding: 1px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* FLOATING ACTIONS                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
.kindy-main-floating-actions {
  position: absolute;
  bottom: 25px;
  right: 25px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  > * {
    position: relative;
    inset-inline-end: unset !important;
    inset-block-end: unset !important;
    opacity: 0.9;
    &:hover {
      opacity: 1;
      background-color: var(--kindy-color-white) !important;
      border: solid 1px var(--kindy-primary-color);
    }
  }
}

.kindy-viewer-container {
  position: absolute;
  inset: 0;
  z-index: 1000;
}
</style>
