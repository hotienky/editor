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
        <t-watermark
          v-if="pageOptions.watermark?.text"
          class="kindy-page-content"
          :style="{
            '--kindy-page-orientation': pageOptions.orientation,
            '--kindy-page-background': pageOptions.background,
            '--kindy-page-margin-top': pageOptions.margin?.top + 'cm',
            '--kindy-page-margin-bottom': pageOptions.margin?.bottom + 'cm',
            '--kindy-page-margin-left': pageOptions.margin?.left + 'cm',
            '--kindy-page-margin-right': pageOptions.margin?.right + 'cm',
            '--kindy-page-width':
              pageOptions.layout === 'page' ? pageSize.width + 'cm' : 'auto',
            '--kindy-page-height':
              pageOptions.layout === 'page' ? pageSize.height + 'cm' : '100%',
            width:
              pageOptions.layout === 'page' ? pageSize.width + 'cm' : '100%',
            transform: `scale(${pageOptions.zoomLevel ? pageOptions.zoomLevel / 100 : 1})`,
          }"
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
          :style="{
            '--kindy-page-orientation': pageOptions.orientation,
            '--kindy-page-background': pageOptions.background,
            '--kindy-page-margin-top': pageOptions.margin?.top + 'cm',
            '--kindy-page-margin-bottom': pageOptions.margin?.bottom + 'cm',
            '--kindy-page-margin-left': pageOptions.margin?.left + 'cm',
            '--kindy-page-margin-right': pageOptions.margin?.right + 'cm',
            '--kindy-page-width':
              pageOptions.layout === 'page' ? pageSize.width + 'cm' : 'auto',
            '--kindy-page-height':
              pageOptions.layout === 'page' ? pageSize.height + 'cm' : '100%',
            width:
              pageOptions.layout === 'page' ? pageSize.width + 'cm' : '100%',
            transform: `scale(${pageOptions.zoomLevel ? pageOptions.zoomLevel / 100 : 1})`,
          }"
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
// 页面缩放后的大小
const pageZoomWidth = $computed(() => {
  if (pageOptions.value.layout === 'web') {
    return '100%'
  }
  return `calc(${pageSize.width}cm * ${pageOptions.value.zoomLevel ? pageOptions.value.zoomLevel / 100 : 1})`
})

// 页面内容变化后更新页面高度
let pageZoomHeight = $ref('')
let pageContentEl = $ref(null)
let pageHeightRaf = 0
let pageHeightObserver = $ref(null)
const updatePageZoomHeight = () => {
  if (pageOptions.value.layout === 'web') {
    pageZoomHeight = 'auto'
    return
  }
  if (!pageContentEl) {
    console.warn('The element <.kindy-page-content> does not exist.')
    return
  }
  const height = `${(pageContentEl.clientHeight * (pageOptions.value.zoomLevel || 1)) / 100}px`
  if (pageZoomHeight !== height) {
    pageZoomHeight = height
  }
}
const schedulePageZoomHeight = () => {
  if (pageHeightRaf) {
    cancelAnimationFrame(pageHeightRaf)
  }
  pageHeightRaf = requestAnimationFrame(() => {
    pageHeightRaf = 0
    updatePageZoomHeight()
  })
}
onMounted(async () => {
  await nextTick()
  pageContentEl = document.querySelector(`${container} .kindy-page-content`)
  if (pageContentEl) {
    pageHeightObserver = new ResizeObserver(() => {
      schedulePageZoomHeight()
    })
    pageHeightObserver.observe(pageContentEl)
  } else {
    console.warn('The element <.kindy-page-content> does not exist.')
  }
  schedulePageZoomHeight()
})
onUnmounted(() => {
  if (pageHeightObserver) {
    pageHeightObserver.disconnect()
    pageHeightObserver = null
  }
  if (pageHeightRaf) {
    cancelAnimationFrame(pageHeightRaf)
  }
})

// 页面变化后，更新页面高度
watch(
  () => [
    pageOptions.value.layout,
    pageOptions.value.zoomLevel,
    pageOptions.value.size,
    pageOptions.value.orientation,
  ],
  () => {
    schedulePageZoomHeight()
  },
  { deep: true },
)

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
    .kindy-zoomable-content {
      margin: 0 auto;
      box-shadow:
        rgba(0, 0, 0, 0.06) 0px 0px 10px 0px,
        rgba(0, 0, 0, 0.04) 0px 0px 0px 1px;
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
    box-sizing: border-box;
    background-color: var(--kindy-page-background);
    width: var(--kindy-page-width);
    min-height: var(--kindy-page-height);
    overflow: visible !important;
    display: flex;
    flex-direction: column;
    [contenteditable] {
      outline: none;
    }
  }
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
