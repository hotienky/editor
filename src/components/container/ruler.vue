<template>
  <div
    class="kindy-ruler-container"
    :style="{
      width: rulerWidth + 'px',
    }"
  >
    <!-- Vertical Guidelines displayed when dragging any handle -->
    <div
      v-if="activeDragType"
      class="kindy-ruler-guide-line"
      :style="{ left: activeGuideX + 'px' }"
    >
      <div class="guide-tooltip">{{ guideTooltipText }}</div>
    </div>

    <div class="kindy-ruler-top">
      <!-- Left Page Margin Zone (Grey border drag area) -->
      <div
        class="kindy-ruler-margin left-margin"
        :style="{ width: leftMarginWidth + 'px' }"
        title="Kéo viền lề trái trang A4"
        @mousedown.prevent="onMarginLeftMouseDown"
      >
        <div class="margin-resize-handle"></div>
      </div>

      <!-- Active Content Zone with Centimeter Ticks -->
      <div
        class="kindy-ruler-ticks"
        :style="{ width: contentWidth + 'px' }"
      >
        <div
          v-for="cm in totalCms"
          :key="cm"
          class="kindy-ruler-tick-group"
          :style="{ left: (cm - 1) * pxPerCm + 'px' }"
        >
          <span class="tick-number">{{ cm }}</span>
          <div class="tick-line tick-main"></div>
          <div class="tick-line tick-sub" :style="{ left: pxPerCm * 0.25 + 'px' }"></div>
          <div class="tick-line tick-mid" :style="{ left: pxPerCm * 0.5 + 'px' }"></div>
          <div class="tick-line tick-sub" :style="{ left: pxPerCm * 0.75 + 'px' }"></div>
        </div>
      </div>

      <!-- Right Page Margin Zone (Grey border drag area) -->
      <div
        class="kindy-ruler-margin right-margin"
        :style="{ width: rightMarginWidth + 'px' }"
        title="Kéo viền lề phải trang A4"
        @mousedown.prevent="onMarginRightMouseDown"
      >
        <div class="margin-resize-handle"></div>
      </div>

      <!-- First Line Indent Marker (Blue Rectangle Handle) -->
      <div
        class="kindy-ruler-handle handle-first-line"
        :style="{ left: leftMarginWidth + firstLineIndentPx + 'px' }"
        title="Thụt lề dòng đầu tiên (First Line Indent)"
        @mousedown.prevent="onFirstLineMouseDown"
      >
        <div class="handle-rectangle"></div>
      </div>

      <!-- Left Paragraph Indent Marker (Blue Triangle Down Handle) -->
      <div
        class="kindy-ruler-handle handle-left-indent"
        :style="{ left: leftMarginWidth + leftIndentPx + 'px' }"
        title="Thụt lề trái đoạn văn (Left Indent)"
        @mousedown.prevent="onLeftIndentMouseDown"
      >
        <div class="handle-triangle-up"></div>
      </div>

      <!-- Right Paragraph Indent Marker (Blue Triangle Right Handle) -->
      <div
        class="kindy-ruler-handle handle-right-indent"
        :style="{ right: rightMarginWidth + rightIndentPx + 'px' }"
        title="Thụt lề phải đoạn văn (Right Indent)"
        @mousedown.prevent="onRightIndentMouseDown"
      >
        <div class="handle-triangle-up"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, onUnmounted } from 'vue'

const pageOptions = inject('page')
const editor = inject('editor')

const pageSize = computed(() => pageOptions?.value?.pageSize || pageOptions?.pageSize || { width: 21, height: 29.7 })
const pageMargin = computed(() => pageOptions?.value?.margin || pageOptions?.margin || { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 })
const zoomLevel = computed(() => (pageOptions?.value?.zoomLevel || pageOptions?.zoomLevel || 100) / 100)

// 1cm ≈ 37.795px at 96 DPI
const basePxPerCm = 37.795
const pxPerCm = computed(() => basePxPerCm * zoomLevel.value)

const totalCms = computed(() => Math.floor(pageSize.value.width - pageMargin.value.left - pageMargin.value.right))

const rulerWidth = computed(() => pageSize.value.width * pxPerCm.value)
const leftMarginWidth = computed(() => pageMargin.value.left * pxPerCm.value)
const rightMarginWidth = computed(() => pageMargin.value.right * pxPerCm.value)
const contentWidth = computed(() => rulerWidth.value - leftMarginWidth.value - rightMarginWidth.value)

// Indent offsets (in cm)
const firstLineIndentCm = ref(0)
const leftIndentCm = ref(0)
const rightIndentCm = ref(0)

const firstLineIndentPx = computed(() => firstLineIndentCm.value * pxPerCm.value)
const leftIndentPx = computed(() => leftIndentCm.value * pxPerCm.value)
const rightIndentPx = computed(() => rightIndentCm.value * pxPerCm.value)

// Dragging State & Guidelines
const activeDragType = ref(null) // 'margin-left' | 'margin-right' | 'first-line' | 'left-indent' | 'right-indent'
const activeGuideX = ref(0)
const guideTooltipText = ref('')

let startX = 0
let startVal = 0

// Margin Left Drag
const onMarginLeftMouseDown = (e) => {
  activeDragType.value = 'margin-left'
  startX = e.clientX
  const targetMargin = pageOptions.value?.margin || pageOptions.margin
  startVal = targetMargin.left
  activeGuideX.value = leftMarginWidth.value
  guideTooltipText.value = `Lề trái: ${startVal.toFixed(1)} cm`
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// Margin Right Drag
const onMarginRightMouseDown = (e) => {
  activeDragType.value = 'margin-right'
  startX = e.clientX
  const targetMargin = pageOptions.value?.margin || pageOptions.margin
  startVal = targetMargin.right
  activeGuideX.value = rulerWidth.value - rightMarginWidth.value
  guideTooltipText.value = `Lề phải: ${startVal.toFixed(1)} cm`
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// First Line Indent Drag
const onFirstLineMouseDown = (e) => {
  activeDragType.value = 'first-line'
  startX = e.clientX
  startVal = firstLineIndentCm.value
  activeGuideX.value = leftMarginWidth.value + firstLineIndentPx.value
  guideTooltipText.value = `Thụt lề dòng đầu: ${startVal.toFixed(1)} cm`
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// Left Indent Drag
const onLeftIndentMouseDown = (e) => {
  activeDragType.value = 'left-indent'
  startX = e.clientX
  startVal = leftIndentCm.value
  activeGuideX.value = leftMarginWidth.value + leftIndentPx.value
  guideTooltipText.value = `Thụt lề trái đoạn: ${startVal.toFixed(1)} cm`
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// Right Indent Drag
const onRightIndentMouseDown = (e) => {
  activeDragType.value = 'right-indent'
  startX = e.clientX
  startVal = rightIndentCm.value
  activeGuideX.value = rulerWidth.value - rightMarginWidth.value - rightIndentPx.value
  guideTooltipText.value = `Thụt lề phải đoạn: ${startVal.toFixed(1)} cm`
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (!activeDragType.value) return
  const deltaPx = e.clientX - startX
  const deltaCm = deltaPx / pxPerCm.value
  const targetMargin = pageOptions.value?.margin || pageOptions.margin

  if (activeDragType.value === 'margin-left') {
    let newMargin = Math.max(0.5, Math.min(10, startVal + deltaCm))
    newMargin = Math.round(newMargin * 10) / 10
    targetMargin.left = newMargin
    activeGuideX.value = newMargin * pxPerCm.value
    guideTooltipText.value = `Lề trái: ${newMargin.toFixed(1)} cm`
  } else if (activeDragType.value === 'margin-right') {
    let newMargin = Math.max(0.5, Math.min(10, startVal - deltaCm))
    newMargin = Math.round(newMargin * 10) / 10
    targetMargin.right = newMargin
    activeGuideX.value = rulerWidth.value - newMargin * pxPerCm.value
    guideTooltipText.value = `Lề phải: ${newMargin.toFixed(1)} cm`
  } else if (activeDragType.value === 'first-line') {
    let newIndent = Math.max(-3, Math.min(10, startVal + deltaCm))
    newIndent = Math.round(newIndent * 10) / 10
    firstLineIndentCm.value = newIndent
    activeGuideX.value = leftMarginWidth.value + newIndent * pxPerCm.value
    guideTooltipText.value = `Thụt lề dòng đầu: ${newIndent.toFixed(1)} cm`
    if (editor?.value) {
      editor.value.chain().focus().setNode('paragraph', { textIndent: `${newIndent}cm` }).run()
    }
  } else if (activeDragType.value === 'left-indent') {
    let newIndent = Math.max(0, Math.min(10, startVal + deltaCm))
    newIndent = Math.round(newIndent * 10) / 10
    leftIndentCm.value = newIndent
    activeGuideX.value = leftMarginWidth.value + newIndent * pxPerCm.value
    guideTooltipText.value = `Thụt lề trái đoạn: ${newIndent.toFixed(1)} cm`
  } else if (activeDragType.value === 'right-indent') {
    let newIndent = Math.max(0, Math.min(10, startVal - deltaCm))
    newIndent = Math.round(newIndent * 10) / 10
    rightIndentCm.value = newIndent
    activeGuideX.value = rulerWidth.value - rightMarginWidth.value - newIndent * pxPerCm.value
    guideTooltipText.value = `Thụt lề phải đoạn: ${newIndent.toFixed(1)} cm`
  }
}

const onMouseUp = () => {
  activeDragType.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<style lang="less" scoped>
.kindy-ruler-container {
  height: 26px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
  width: calc(var(--page-width, 21cm) * var(--page-zoom, 1));
  box-sizing: border-box;
  z-index: 30;
  margin: 0 auto 16px auto;
  user-select: none;
  overflow: visible;
}

.kindy-ruler-guide-line {
  position: absolute;
  top: 26px;
  width: 1px;
  height: 2000px;
  border-left: 1px dashed #2563eb;
  z-index: 100;
  pointer-events: none;

  .guide-tooltip {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.kindy-ruler-top {
  position: relative;
  height: 100%;
  display: flex;
  background: #ffffff;
}

.kindy-ruler-margin {
  height: 100%;
  background: #e2e8f0;
  position: absolute;
  top: 0;
  z-index: 1;
  cursor: ew-resize;

  .margin-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background: transparent;

    &:hover {
      background: #3b82f6;
    }
  }

  &.left-margin {
    left: 0;
    border-right: 1px solid #cbd5e1;
    .margin-resize-handle { right: -2px; }
  }

  &.right-margin {
    right: 0;
    border-left: 1px solid #cbd5e1;
    .margin-resize-handle { left: -2px; }
  }
}

.kindy-ruler-ticks {
  position: absolute;
  top: 0;
  left: v-bind('leftMarginWidth + "px"');
  height: 100%;
  z-index: 2;
}

.kindy-ruler-tick-group {
  position: absolute;
  top: 0;
  height: 100%;

  .tick-number {
    position: absolute;
    top: 2px;
    left: -4px;
    font-size: 9px;
    font-weight: 600;
    color: #475569;
    font-family: var(--kindy-font-family, sans-serif);
  }

  .tick-line {
    position: absolute;
    bottom: 0;
    width: 1px;
    background: #94a3b8;

    &.tick-main {
      height: 10px;
    }
    &.tick-mid {
      height: 7px;
    }
    &.tick-sub {
      height: 4px;
    }
  }
}

.kindy-ruler-handle {
  position: absolute;
  z-index: 10;
  cursor: ew-resize;

  &.handle-first-line {
    top: 1px;
    .handle-rectangle {
      width: 10px;
      height: 7px;
      background: #2563eb;
      margin-left: -5px;
      border-radius: 1px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
  }

  &.handle-left-indent {
    bottom: 1px;
    .handle-triangle-up {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 7px solid #2563eb;
      margin-left: -5px;
    }
  }

  &.handle-right-indent {
    bottom: 1px;
    .handle-triangle-up {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 7px solid #2563eb;
      margin-right: -5px;
    }
  }
}
</style>
