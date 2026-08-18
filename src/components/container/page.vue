<template>
  <div class="kindy-main-container">
    <container-toc
      v-if="pageOptions.showToc"
      @close="pageOptions.showToc = false"
    />
    <div
      :class="`kindy-zoomable-container kindy-${pageOptions.layout}-container kindy-scrollbar`"
    >
      <div
        class="kindy-zoomable-content"
        :style="{
          width: pageZoomWidth,
          height: pageZoomHeight,
        }"
      >
        <!-- Multi-page sheets layer (visual page backgrounds) -->
        <div
          v-if="pageOptions.layout === 'page'"
          class="kindy-page-sheets-layer"
          :style="{
            transform: `scale(${zoomScale})`,
            transformOrigin: '0 0',
            width: pageSize.width + 'cm',
          }"
        >
          <div
            v-for="pageIndex in paginationPageCount"
            :key="pageIndex"
            class="kindy-page-sheet"
            :style="{
              width: pageSize.width + 'cm',
              height: pageSize.height + 'cm',
              background: pageOptions.background || '#fff',
              marginBottom: pageIndex < paginationPageCount ? pageGapPx + 'px' : '0',
            }"
          >
            <!-- Header area with corner marks -->
            <div class="kindy-page-sheet-header" :style="{ height: pageOptions.margin?.top + 'cm' }">
              <div class="kindy-page-corner corner-tl" :style="{ width: pageOptions.margin?.left + 'cm' }"></div>
              <div class="kindy-page-sheet-header-content"></div>
              <div class="kindy-page-corner corner-tr" :style="{ width: pageOptions.margin?.right + 'cm' }"></div>
            </div>
            <!-- Middle area (content flows through this zone) -->
            <div class="kindy-page-sheet-body"></div>
            <!-- Footer area with corner marks and page number -->
            <div class="kindy-page-sheet-footer" :style="{ height: pageOptions.margin?.bottom + 'cm' }">
              <div class="kindy-page-corner corner-bl" :style="{ width: pageOptions.margin?.left + 'cm' }"></div>
              <div class="kindy-page-sheet-footer-content">
                <span class="kindy-page-number">{{ pageIndex }} / {{ paginationPageCount }}</span>
              </div>
              <div class="kindy-page-corner corner-br" :style="{ width: pageOptions.margin?.right + 'cm' }"></div>
            </div>
          </div>
        </div>

        <!-- Editor content layer (paginated mode - sits on top of sheets) -->
        <t-watermark
          v-if="pageOptions.watermark?.text && pageOptions.layout === 'page'"
          class="kindy-page-content kindy-page-content--paginated"
          :style="pageContentStyle"
          :alpha="pageOptions.watermark?.alpha"
          v-bind="watermarkOptions"
          :watermark-content="pageOptions.watermark?.text"
        >
          <div class="kindy-page-node-content" @click="onPageClick">
            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>
          </div>
        </t-watermark>
        <div
          v-else-if="pageOptions.layout === 'page'"
          class="kindy-page-content kindy-page-content--paginated"
          :style="pageContentStyle"
        >
          <div class="kindy-page-node-content" @click="onPageClick">
            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>
          </div>
        </div>

        <!-- Editor content layer (web mode - original layout) -->
        <t-watermark
          v-else-if="pageOptions.watermark?.text"
          class="kindy-page-content"
          :style="pageContentStyle"
          :alpha="pageOptions.watermark?.alpha"
          v-bind="watermarkOptions"
          :watermark-content="pageOptions.watermark?.text"
        >
          <div class="kindy-page-node-header" contenteditable="false">
            <div
              class="kindy-page-corner corner-tl"
              style="width: var(--kindy-page-margin-left)"
            ></div>
            <div class="kindy-page-node-header-content"></div>
            <div
              class="kindy-page-corner corner-tr"
              style="width: var(--kindy-page-margin-right)"
            ></div>
          </div>
          <div class="kindy-page-node-content" @click="onPageClick">
            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>
          </div>
          <div class="kindy-page-node-footer" contenteditable="false">
            <div
              class="kindy-page-corner corner-bl"
              style="width: var(--kindy-page-margin-left)"
            ></div>
            <div class="kindy-page-node-footer-content"></div>
            <div
              class="kindy-page-corner corner-br"
              style="width: var(--kindy-page-margin-right)"
            ></div>
          </div>
        </t-watermark>
        <div
          v-else
          class="kindy-page-content"
          :style="pageContentStyle"
        >
          <div class="kindy-page-node-header" contenteditable="false">
            <div
              class="kindy-page-corner corner-tl"
              style="width: var(--kindy-page-margin-left)"
            ></div>
            <div class="kindy-page-node-header-content"></div>
            <div
              class="kindy-page-corner corner-tr"
              style="width: var(--kindy-page-margin-right)"
            ></div>
          </div>
          <div class="kindy-page-node-content" @click="onPageClick">
            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>
          </div>
          <div class="kindy-page-node-footer" contenteditable="false">
            <div
              class="kindy-page-corner corner-bl"
              style="width: var(--kindy-page-margin-left)"
            ></div>
            <div class="kindy-page-node-footer-content"></div>
            <div
              class="kindy-page-corner corner-br"
              style="width: var(--kindy-page-margin-right)"
            ></div>
          </div>
        </div>
      </div>
    </div>
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
  </div>
</template>

<script setup>
import Editor from '@/components/editor/index.vue'

const container = inject('container')
const imageViewer = inject('imageViewer')
const pageOptions = inject('page')
const editor = inject('editor')
const commentStore = inject('commentStore')

// Page gap between sheets (px)
const pageGapPx = 24

// Zoom scale
const zoomScale = $computed(() =>
  pageOptions.value.zoomLevel ? pageOptions.value.zoomLevel / 100 : 1,
)

// Click vào trang giấy: nếu click comment thì mở sidebar, nếu click vùng trắng thì focus trình soạn thảo
const onPageClick = (event) => {
  const { target } = event
  const commentEl = target?.closest?.('[data-comment]')
  if (commentEl && editor?.value) {
    const id = commentEl.getAttribute('data-comment')
    if (id) {
      commentStore?.toggle(true)
      commentStore?.focus(id)
      return
    }
  }
  if (editor?.value) {
    const isInteractive = target?.closest?.(
      'button, input, select, textarea, a, .t-popup, .t-dropdown, .kindy-comment-sidebar, .t-dialog',
    )
    if (!isInteractive && !editor.value.isFocused) {
      editor.value.commands.focus()
    }
  }
}

// 页面大小
const pageSize = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 0, height: 0 }
  return {
    width: pageOptions.value.orientation === 'portrait' ? width : height,
    height: pageOptions.value.orientation === 'portrait' ? height : width,
  }
})

// Page content style
const pageContentStyle = $computed(() => ({
  '--kindy-page-orientation': pageOptions.value.orientation,
  '--kindy-page-background':
    pageOptions.value.layout === 'page' ? 'transparent' : pageOptions.value.background,
  '--kindy-page-margin-top': pageOptions.value.margin?.top + 'cm',
  '--kindy-page-margin-bottom': pageOptions.value.margin?.bottom + 'cm',
  '--kindy-page-margin-left': pageOptions.value.margin?.left + 'cm',
  '--kindy-page-margin-right': pageOptions.value.margin?.right + 'cm',
  '--kindy-page-width':
    pageOptions.value.layout === 'page' ? pageSize.width + 'cm' : 'auto',
  '--kindy-page-height':
    pageOptions.value.layout === 'page' ? pageSize.height + 'cm' : '100%',
  '--kindy-page-gap': pageGapPx + 'px',
  width: pageOptions.value.layout === 'page' ? pageSize.width + 'cm' : '100%',
  transform: `scale(${zoomScale})`,
}))

// Pagination: read page count from editor storage
let paginationPageCount = $ref(1)

const updatePaginationPageCount = () => {
  if (editor?.value?.storage?.pagination) {
    const newCount = editor.value.storage.pagination.pageCount || 1
    if (newCount !== paginationPageCount) {
      paginationPageCount = newCount
    }
  }
}

// Update pagination options when page settings change
const updatePaginationOptions = () => {
  if (!editor?.value?.extensionManager) return
  const ext = editor.value.extensionManager.extensions.find(
    (e) => e.name === 'pagination',
  )
  if (ext) {
    ext.options.pageWidth = pageSize.width
    ext.options.pageHeight = pageSize.height
    ext.options.marginTop = pageOptions.value.margin?.top ?? 2.54
    ext.options.marginBottom = pageOptions.value.margin?.bottom ?? 2.54
    ext.options.marginLeft = pageOptions.value.margin?.left ?? 3.18
    ext.options.marginRight = pageOptions.value.margin?.right ?? 3.18
    ext.options.enabled = pageOptions.value.layout === 'page'
    ext.options.pageGap = pageGapPx

    // Trigger a recalculation
    if (editor.value.storage.pagination?._updateFn) {
      editor.value.storage.pagination._updateFn()
    }
  }
}

// Poll for pagination page count changes
let paginationPollTimer = null
onMounted(() => {
  paginationPollTimer = setInterval(() => {
    updatePaginationPageCount()
  }, 200)
})
onUnmounted(() => {
  if (paginationPollTimer) {
    clearInterval(paginationPollTimer)
  }
})

// Watch for page option changes and propagate to the pagination extension
watch(
  () => [
    pageOptions.value.layout,
    pageOptions.value.size,
    pageOptions.value.orientation,
    pageOptions.value.margin,
  ],
  () => {
    nextTick(() => {
      updatePaginationOptions()
    })
  },
  { deep: true },
)

// 页面缩放后的大小
const pageZoomWidth = $computed(() => {
  if (pageOptions.value.layout === 'web') {
    return '100%'
  }
  return `calc(${pageSize.width}cm * ${zoomScale})`
})

const pageZoomHeight = $computed(() => {
  if (pageOptions.value.layout === 'web') {
    return 'auto'
  }
  const count = paginationPageCount || 1
  return `calc((${count} * ${pageSize.height}cm + ${Math.max(0, count - 1)} * ${pageGapPx}px) * ${zoomScale})`
})


// 水印
const watermarkOptions = $ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
})
watch(
  () => pageOptions.value.watermark,
  (watermarkObj = { type: '' }) => {
    const { type } = watermarkObj
    if (type === 'compact') {
      watermarkOptions.width = 320
      watermarkOptions.y = 240
    } else {
      watermarkOptions.width = 480
      watermarkOptions.y = 360
    }
  },
  { deep: true, immediate: true },
)

// 图片预览
let previewImages = $ref([])
let currentImageIndex = $ref(0)

watch(
  () => imageViewer.value.visible,
  async (visible) => {
    if (!visible) {
      previewImages = []
      currentImageIndex = 0
      return
    }
    await nextTick()
    const images = document.querySelectorAll(
      `${container} .kindy-page-node-content img[src][data-preview]`,
    )
    Array.from(images).forEach((image, index) => {
      const src = image.getAttribute('src')
      const nodeId = image.getAttribute('data-id')
      previewImages.push(src)
      if (nodeId === imageViewer.value.current) {
        currentImageIndex = index
      }
    })
  },
)
</script>

<style lang="less">
.kindy-main-container {
  height: 100%;
  display: flex;
  position: relative;
}

.kindy-zoomable-container {
  flex: 1;
  scroll-behavior: smooth;
  &.kindy-page-container {
    padding: 20px 50px;
    box-sizing: border-box;
    background-color: var(--kindy-container-background);
    .kindy-zoomable-content {
      margin: 0 auto;
      position: relative;
    }
  }
  &.kindy-web-container {
    display: flex;
    .kindy-zoomable-content {
      flex: 1;
      .kindy-page-corner {
        display: none;
      }
      .kindy-page-content {
        min-height: 100%;
        .kindy-page-node-content {
          min-height: 100px;
        }
      }
    }
  }
  .kindy-page-content {
    transform-origin: 0 0;
    box-sizing: border-box;
    display: flex;
    position: relative;
    background-color: var(--kindy-page-background);
    width: var(--kindy-page-width);
    min-height: var(--kindy-page-height);
    overflow: visible !important;
    flex-direction: column;
    [contenteditable] {
      outline: none;
    }

    // When paginated, the content layer floats above the sheets
    &.kindy-page-content--paginated {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1;
      background: transparent;
      min-height: unset;
      pointer-events: auto;
    }
  }
}

// Page sheets layer: visual backgrounds for each A4 page
.kindy-page-sheets-layer {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
}

.kindy-page-sheet {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  box-shadow:
    rgba(0, 0, 0, 0.06) 0px 0px 10px 0px,
    rgba(0, 0, 0, 0.04) 0px 0px 0px 1px;
  flex-shrink: 0;
  overflow: hidden;
}

.kindy-page-sheet-header,
.kindy-page-sheet-footer {
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
  pointer-events: none;
}

.kindy-page-sheet-header-content,
.kindy-page-sheet-footer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kindy-page-sheet-body {
  flex: 1;
}

.kindy-page-number {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
  font-family: var(--kindy-font-family);
  user-select: none;
  pointer-events: none;
}

.kindy-page-node-header {
  height: var(--kindy-page-margin-top);
  overflow: hidden;
}

.kindy-page-node-footer {
  height: var(--kindy-page-margin-bottom);
  overflow: hidden;
}

.kindy-page-node-header,
.kindy-page-node-footer {
  display: flex;
  justify-content: space-between;
}

.kindy-page-corner {
  box-sizing: border-box;
  position: relative;
  z-index: 10;
}

.kindy-page-corner {
  @media print {
    opacity: 0;
  }

  &::after {
    position: absolute;
    content: '';
    display: block;
    height: 1cm;
    width: 1cm;
    border: solid 1px rgba(0, 0, 0, 0.08);
  }

  &.corner-tl::after {
    border-top: none;
    border-left: none;
    bottom: 0;
    right: 0;
  }

  &.corner-tr::after {
    border-top: none;
    border-right: none;
    bottom: 0;
    left: 0;
  }

  &.corner-bl::after {
    border-bottom: none;
    border-left: none;
    top: 0;
    right: 0;
  }

  &.corner-br::after {
    border-bottom: none;
    border-right: none;
    top: 0;
    left: 0;
  }
}

.kindy-page-node-header-content,
.kindy-page-node-footer-content {
  flex: 1;
}

.kindy-page-node-content {
  position: relative;
  box-sizing: border-box;
  flex-shrink: 1;
}

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
