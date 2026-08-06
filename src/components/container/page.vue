<template>
  <div class="kindy-main-container">
    <container-toc
      v-if="pageOptions.showToc"
      @close="pageOptions.showToc = false"
    />

    <!-- MS WORD HEADER & FOOTER FLOATING RIBBON BAR -->
    <div
      v-if="isHeaderFocused || isFooterFocused"
      class="kindy-hf-context-bar"
    >
      <div class="kindy-hf-bar-title">
        <icon :name="isHeaderFocused ? 'page-header' : 'page-footer'" />
        <span>{{ isHeaderFocused ? 'HEADER' : 'FOOTER' }}</span>
      </div>

      <div class="kindy-hf-bar-divider"></div>

      <!-- Layout Switcher -->
      <div class="kindy-hf-bar-group">
        <label>Layout:</label>
        <t-radio-group v-model="activeConfig.layout" variant="default-filled" size="small">
          <t-radio-button value="split">Split</t-radio-button>
          <t-radio-button value="single">Single</t-radio-button>
        </t-radio-group>
      </div>

      <!-- Scope Switcher -->
      <div class="kindy-hf-bar-group">
        <label>Scope:</label>
        <t-radio-group v-model="activeConfig.scope" variant="default-filled" size="small">
          <t-radio-button value="all">All Pages</t-radio-button>
          <t-radio-button value="first_last">First & Last</t-radio-button>
        </t-radio-group>
      </div>

      <!-- Text Inputs in Bar -->
      <template v-if="activeConfig.layout === 'split' || activeConfig.leftText !== undefined || activeConfig.rightText !== undefined">
        <div class="kindy-hf-bar-group">
          <label>Left:</label>
          <t-input v-model="activeConfig.leftText" placeholder="Left content..." size="small" style="width: 140px;" />
        </div>
        <div class="kindy-hf-bar-group">
          <label>Right:</label>
          <t-input v-model="activeConfig.rightText" placeholder="Right content..." size="small" style="width: 140px;" />
        </div>
      </template>
      <template v-else>
        <div class="kindy-hf-bar-group">
          <label>Content:</label>
          <t-input v-model="activeConfig.text" placeholder="Content..." size="small" style="width: 220px;" />
        </div>
      </template>

      <!-- Upload Logo Button -->
      <div class="kindy-hf-bar-group">
        <t-upload
          action=""
          :auto-upload="false"
          :show-file-list="false"
          accept="image/*"
          @change="onBarLogoChange"
        >
          <t-button variant="outline" size="small">
            <template #icon><icon name="upload" /></template>
            {{ activeConfig.logo ? 'Change Logo' : 'Add Logo' }}
          </t-button>
        </t-upload>
      </div>

      <!-- Logo Width Stepper -->
      <div v-if="activeConfig.logo" class="kindy-hf-bar-group">
        <label>Logo size:</label>
        <t-input-number
          v-model="activeConfig.logoWidth"
          size="small"
          :min="16"
          :max="250"
          :step="4"
          style="width: 80px;"
        />
        <span class="unit">px</span>
      </div>

      <!-- Font Color Picker -->
      <div class="kindy-hf-bar-group">
        <label>Color:</label>
        <input
          v-model="activeConfig.fontColor"
          type="color"
          class="kindy-color-box"
        />
      </div>

      <!-- Font Size Stepper -->
      <div class="kindy-hf-bar-group">
        <label>Size:</label>
        <t-input-number
          v-model="activeConfig.fontSize"
          size="small"
          :min="10"
          :max="36"
          :step="1"
          style="width: 70px;"
        />
        <span class="unit">px</span>
      </div>

      <!-- Show Border Checkbox -->
      <div class="kindy-hf-bar-group">
        <t-checkbox v-model="activeConfig.showBorder">
          Border
        </t-checkbox>
      </div>

      <!-- Advanced Settings Dialog -->
      <div class="kindy-hf-bar-group">
        <t-button variant="dashed" size="small" @click="openDialogFromBar">
          <template #icon><icon name="setting" /></template>
          Advanced
        </t-button>
      </div>

      <div class="kindy-hf-bar-divider"></div>

      <!-- Close Header & Footer Button -->
      <t-button
        theme="danger"
        size="small"
        @click="closeHeaderFooterMode"
      >
        <template #icon><icon name="close" /></template>
        Close Header & Footer
      </t-button>
    </div>

    <!-- WORKSPACE BODY WITH TABS SIDEBAR & CANVAS -->
    <div class="kindy-editor-workspace">
      <container-tabs />

      <!-- MULTI-PAGE EDITOR -->
      <div
        ref="scrollContainer"
        class="kindy-zoomable-container kindy-scrollbar"
        :class="`kindy-${pageOptions.layout}-container`"
        @scroll="onScroll"
      >
      <div
        class="kindy-zoomable-content"
        :style="{
          width: pageZoomWidth,
          height: pageZoomHeight,
        }"
      >
        <component
          :is="pageOptions.watermark?.text ? 't-watermark' : 'div'"
          class="kindy-page-content"
          :style="{
            '--kindy-page-orientation': pageOptions.orientation,
            '--kindy-page-background': pageOptions.background,
            '--kindy-page-margin-top': pageOptions.margin?.top + 'cm',
            '--kindy-page-margin-bottom': pageOptions.margin?.bottom + 'cm',
            '--kindy-page-margin-left': pageOptions.margin?.left + 'cm',
            '--kindy-page-margin-right': pageOptions.margin?.right + 'cm',
            '--kindy-page-width': pageOptions.layout === 'page' ? pageSize.width + 'cm' : 'auto',
            '--kindy-page-height': pageOptions.layout === 'page' ? pageSize.height + 'cm' : '100%',
            width: pageOptions.layout === 'page' ? pageSize.width + 'cm' : '100%',
            transform: `scale(${pageOptions.zoomLevel ? pageOptions.zoomLevel / 100 : 1})`,
          }"
          v-bind="pageOptions.watermark?.text ? watermarkProps : {}"
        >
          <!-- HEADER -->
          <div
            v-if="pageOptions.header?.enable"
            class="kindy-page-node-header"
            :class="{ 'is-focused': isHeaderFocused }"
            data-label="ĐẦU TRANG - HEADER"
            :style="{
              '--header-font-size': pageOptions.header.fontSize + 'px',
              '--header-font-color': pageOptions.header.fontColor,
              '--header-font-family': pageOptions.header.fontFamily,
              '--header-font-weight': pageOptions.header.fontWeight,
              '--header-align': pageOptions.header.align,
              'height': pageOptions.header.marginTop ? pageOptions.header.marginTop + 'cm' : '2cm',
            }"
            @click="activateHeaderMode"
            @dblclick.stop="setHeader"
          >
            <div
              class="kindy-page-node-header-content"
              :class="{ 'has-border': pageOptions.header?.showBorder !== false, 'is-split': pageOptions.header?.layout === 'split' || pageOptions.header?.leftText || pageOptions.header?.rightText }"
            >
              <template v-if="pageOptions.header?.layout === 'split' || pageOptions.header?.leftText || pageOptions.header?.rightText">
                <div class="kindy-hf-left">
                  <img v-if="pageOptions.header?.logo" :src="pageOptions.header.logo" class="kindy-hf-logo" :style="{ width: (pageOptions.header.logoWidth || 48) + 'px' }" />
                  <textarea v-if="isHeaderFocused" v-model="pageOptions.header.leftText" class="kindy-hf-textarea" placeholder="Nhập nội dung trái..."></textarea>
                  <div v-else class="kindy-hf-text-display">{{ pageOptions.header?.leftText || 'Nội dung trái...' }}</div>
                </div>
                <div class="kindy-hf-right">
                  <textarea v-if="isHeaderFocused" v-model="pageOptions.header.rightText" class="kindy-hf-textarea text-right" placeholder="Nhập nội dung phải..."></textarea>
                  <div v-else class="kindy-hf-text-display text-right">{{ pageOptions.header?.rightText || 'Nội dung phải...' }}</div>
                </div>
              </template>
              <template v-else>
                <div class="kindy-hf-single">
                  <img v-if="pageOptions.header?.logo" :src="pageOptions.header.logo" class="kindy-hf-logo" :style="{ width: (pageOptions.header.logoWidth || 48) + 'px' }" />
                  <textarea v-if="isHeaderFocused" v-model="pageOptions.header.text" class="kindy-hf-textarea" placeholder="Nhập nội dung đầu trang..."></textarea>
                  <div v-else class="kindy-hf-text-display">{{ pageOptions.header?.text || t('page.header.placeholder') }}</div>
                </div>
              </template>
            </div>
          </div>

          <!-- BODY CONTENT -->
          <div
            class="kindy-page-node-content"
            :class="{ 'is-dimmed': isHeaderFocused || isFooterFocused }"
          >
            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>
          </div>

          <!-- FOOTER -->
          <div
            v-if="pageOptions.footer?.enable"
            class="kindy-page-node-footer"
            :class="{ 'is-focused': isFooterFocused }"
            data-label="CHÂN TRANG - FOOTER"
            :style="{
              '--footer-font-size': pageOptions.footer.fontSize + 'px',
              '--footer-font-color': pageOptions.footer.fontColor,
              '--footer-font-family': pageOptions.footer.fontFamily,
              '--footer-font-weight': pageOptions.footer.fontWeight,
              '--footer-align': pageOptions.footer.align,
              'height': pageOptions.footer.marginBottom ? pageOptions.footer.marginBottom + 'cm' : '2cm',
            }"
            @click="activateFooterMode"
            @dblclick.stop="setFooter"
          >
            <div
              class="kindy-page-node-footer-content"
              :class="{ 'has-border': pageOptions.footer?.showBorder !== false, 'is-split': pageOptions.footer?.layout === 'split' || pageOptions.footer?.leftText || pageOptions.footer?.rightText }"
            >
              <template v-if="pageOptions.footer?.layout === 'split' || pageOptions.footer?.leftText || pageOptions.footer?.rightText">
                <div class="kindy-hf-left">
                  <img v-if="pageOptions.footer?.logo" :src="pageOptions.footer.logo" class="kindy-hf-logo" :style="{ width: (pageOptions.footer.logoWidth || 48) + 'px' }" />
                  <textarea v-if="isFooterFocused" v-model="pageOptions.footer.leftText" class="kindy-hf-textarea" placeholder="Nhập nội dung trái..."></textarea>
                  <div v-else class="kindy-hf-text-display">{{ pageOptions.footer?.leftText || 'Nội dung trái...' }}</div>
                </div>
                <div class="kindy-hf-right">
                  <textarea v-if="isFooterFocused" v-model="pageOptions.footer.rightText" class="kindy-hf-textarea text-right" placeholder="Nhập nội dung phải..."></textarea>
                  <div v-else class="kindy-hf-text-display text-right">{{ pageOptions.footer?.rightText || 'Nội dung phải...' }}</div>
                </div>
              </template>
              <template v-else>
                <div class="kindy-hf-single">
                  <img v-if="pageOptions.footer?.logo" :src="pageOptions.footer.logo" class="kindy-hf-logo" :style="{ width: (pageOptions.footer.logoWidth || 48) + 'px' }" />
                  <textarea v-if="isFooterFocused" v-model="pageOptions.footer.text" class="kindy-hf-textarea" placeholder="Nhập nội dung chân trang..."></textarea>
                  <div v-else class="kindy-hf-text-display">{{ pageOptions.footer?.text || t('page.footer.placeholder') }}</div>
                </div>
              </template>
            </div>
          </div>
        </component>
      </div>
    </div>
  </div>

    <!-- FLOATING PAGE STATUS & BACK-TOP BUTTON -->
    <div class="kindy-main-floating-actions">
      <div class="kindy-page-status-badge">
        <icon name="file" />
        <span>Page {{ currentPageNum }} / {{ totalPageNum }}</span>
      </div>
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
    <dialog-header-footer
      v-model:visible="hfDialogVisible"
      :target-type="hfDialogType"
    />
  </div>
</template>

<script setup>
import Editor from '@/components/editor/index.vue'
import DialogHeaderFooter from '@/components/dialog/header-footer.vue'
import ContainerTabs from '@/components/container/tabs.vue'

const container = inject('container')
const imageViewer = inject('imageViewer')
const pageOptions = inject('page')
const editor = inject('editor')
const commentStore = inject('commentStore')

const scrollContainer = $ref(null)

let hfDialogVisible = $ref(false)
let hfDialogType = $ref('header')
let isHeaderFocused = $ref(false)
let isFooterFocused = $ref(false)
let currentPageFromScroll = $ref(1)

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

const pageSizeCm = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 21, height: 29.7 }
  return pageOptions.value.orientation === 'landscape' ? width : height
})

const pageSizeWidthCm = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 21, height: 29.7 }
  return pageOptions.value.orientation === 'landscape' ? height : width
})

const pageSize = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 0, height: 0 }
  return {
    width: pageOptions.value.orientation === 'landscape' ? height : width,
    height: pageOptions.value.orientation === 'landscape' ? width : height,
  }
})

const pageZoomWidth = $computed(() => {
  const zoomLevel = pageOptions.value.zoomLevel || 100
  if (pageOptions.value.layout === 'web') {
    return '100%'
  }
  return `calc(${pageSize.width}cm * ${zoomLevel / 100})`
})

const pagesList = $computed(() => {
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

const shouldHideHeaderFooter = (pageInfo, type) => {
  const config = type === 'header' ? pageOptions.value.header : pageOptions.value.footer
  if (!config?.enable) return true
  const scope = config.scope || 'all'
  if (scope === 'first_last') {
    if (type === 'header') return !pageInfo.isFirst
    if (type === 'footer') return !pageInfo.isLast
  }
  return false
}

const onScroll = () => {
  if (!scrollContainer) return
  const {scrollTop} = scrollContainer
  const zoomLevel = pageOptions.value.zoomLevel || 100
  const pageHeightPx = (pageSizeCm * 96 / 2.54) * (zoomLevel / 100)
  const page = Math.floor(scrollTop / pageHeightPx) + 1
  currentPageFromScroll = Math.max(1, Math.min(page, totalPageNum))
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
  const isInsideHF = target?.closest?.('.kindy-page-section-header, .kindy-page-section-footer, .kindy-hf-context-bar')
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

const watermarkProps = $computed(() => ({
  alpha: pageOptions.value.watermark?.alpha,
  watermarkContent: pageOptions.value.watermark?.text,
}))

const previewImages = $computed(() => {
  if (!imageViewer.value?.visible) {
    return []
  }
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

  .kindy-zoomable-container {
    flex: 1;
    overflow: auto;
    position: relative;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    background-color: var(--kindy-container-background, #f4f5f7);
    padding: 24px 0;

    .kindy-zoomable-content {
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      margin: 0 auto;

      .kindy-page-content {
        background-color: var(--kindy-page-background, #ffffff);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
        border-radius: 2px;
      }

      &::after {
        content: '';
        display: block;
        height: 40px;
      }
    }
  }
}

/* FLOATING MS WORD HEADER & FOOTER RIBBON BAR */
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

/* MULTI-PAGE BACKGROUND */
.kindy-page-bg {
  position: relative;
  background-color: var(--kindy-page-background, #ffffff);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* PAGE HEADER SECTION */
.kindy-page-section-header {
  position: relative;
  padding: 0.5cm 1cm 0.3cm;
  min-height: 1cm;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;

  &.is-focused {
    outline: 1.5px dashed var(--kindy-primary-color, #0284c7);
    background: rgba(2, 132, 199, 0.03);

    &::before {
      content: 'HEADER (double-click to configure)';
      position: absolute;
      top: -18px;
      left: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
      background: var(--kindy-primary-color, #0284c7);
      padding: 1px 8px;
      border-radius: 3px 3px 0 0;
      z-index: 20;
      pointer-events: none;
    }
  }

  &.is-hidden {
    display: none;
  }

  .kindy-hf-content {
    &.has-border {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
  }

  .kindy-hf-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .kindy-hf-left,
  .kindy-hf-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .kindy-hf-center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .kindy-hf-logo {
    height: auto;
    max-height: 32px;
  }
}

/* PAGE CONTENT AREA */
.kindy-page-section-content {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: visible;
}

.kindy-page-node-content {
  position: relative;
  box-sizing: border-box;
  padding-left: var(--kindy-page-margin-left, 3.18cm);
  padding-right: var(--kindy-page-margin-right, 3.18cm);
  padding-top: 0.5cm;
  padding-bottom: 0.5cm;
  min-height: 100%;
  transition: opacity 0.25s ease, filter 0.25s ease;

  &.is-dimmed {
    opacity: 0.45;
    filter: grayscale(20%);
  }

  [contenteditable] {
    outline: none;
  }
}

/* PAGE FOOTER SECTION */
.kindy-page-section-footer {
  position: relative;
  padding: 0.3cm 1cm 0.5cm;
  min-height: 1cm;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-top: auto;
  flex-shrink: 0;

  &.is-focused {
    outline: 1.5px dashed var(--kindy-primary-color, #0284c7);
    background: rgba(2, 132, 199, 0.03);

    &::before {
      content: 'FOOTER (double-click to configure)';
      position: absolute;
      top: -18px;
      left: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
      background: var(--kindy-primary-color, #0284c7);
      padding: 1px 8px;
      border-radius: 3px 3px 0 0;
      z-index: 20;
      pointer-events: none;
    }
  }

  &.is-hidden {
    display: none;
  }

  .kindy-hf-content {
    &.has-border {
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }
  }

  .kindy-hf-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .kindy-hf-left,
  .kindy-hf-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .kindy-hf-center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .kindy-hf-logo {
    height: auto;
    max-height: 32px;
  }
}

/* PAGE SEPARATOR LINE */
.kindy-page-separator {
  position: absolute;
  bottom: -6px;
  left: 0;
  right: 0;
  height: 1px;
  background: repeating-linear-gradient(
    to right,
    #94a3b8 0px,
    #94a3b8 4px,
    transparent 4px,
    transparent 8px
  );
  z-index: 10;
}

/* FLOATING ACTIONS */
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
