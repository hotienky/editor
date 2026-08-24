<template>
  <div
    class="kindy-ruler-container"
    :style="{ width: rulerWidth + 'px' }"
    role="toolbar"
    :aria-label="t('ruler.title')"
  >
    <div
      v-if="activeDragType"
      class="kindy-ruler-guide-line"
      :style="{ left: activeGuideX + 'px' }"
    >
      <div class="guide-tooltip">{{ guideTooltipText }}</div>
    </div>

    <div class="kindy-ruler-top">
      <div
        class="kindy-ruler-margin left-margin"
        :style="{ width: leftMarginWidth + 'px' }"
        :title="t('ruler.marginLeftTooltip')"
        @mousedown.prevent="startDrag('margin-left', $event)"
      >
        <div class="margin-resize-handle"></div>
      </div>

      <div
        class="kindy-ruler-ticks"
        :style="{ width: contentWidth + 'px' }"
        :title="t('ruler.addTabStopTooltip')"
        @click="addTabStop"
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

      <button
        v-for="(stop, index) in tabStops"
        :key="`${stop.positionTwip}-${index}`"
        type="button"
        class="kindy-ruler-tab-stop"
        :style="{ left: leftMarginWidth + stop.position * pxPerCm + 'px' }"
        :title="t('ruler.tabStopTooltip', { value: stop.position.toFixed(1) })"
        @mousedown.stop.prevent="startTabStopDrag(index, $event)"
        @dblclick.stop.prevent="removeTabStop(index)"
      >
        <span aria-hidden="true"></span>
      </button>

      <div
        class="kindy-ruler-margin right-margin"
        :style="{ width: rightMarginWidth + 'px' }"
        :title="t('ruler.marginRightTooltip')"
        @mousedown.prevent="startDrag('margin-right', $event)"
      >
        <div class="margin-resize-handle"></div>
      </div>

      <div
        class="kindy-ruler-handle handle-first-line"
        :style="{ left: leftMarginWidth + firstLinePositionPx + 'px' }"
        :title="t('ruler.firstLineIndentTooltip')"
        @mousedown.prevent="startDrag('first-line', $event)"
      >
        <div class="handle-rectangle"></div>
      </div>

      <div
        class="kindy-ruler-handle handle-left-indent"
        :style="{ left: leftMarginWidth + leftIndentPx + 'px' }"
        :title="t('ruler.leftIndentTooltip')"
        @mousedown.prevent="startDrag('left-indent', $event)"
      >
        <div class="handle-triangle-up"></div>
      </div>

      <div
        class="kindy-ruler-handle handle-right-indent"
        :style="{ right: rightMarginWidth + rightIndentPx + 'px' }"
        :title="t('ruler.rightIndentTooltip')"
        @mousedown.prevent="startDrag('right-indent', $event)"
      >
        <div class="handle-triangle-up"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getOrientedPageSize } from '@umo/layout'
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import {
  centimetersToTwips,
  getDocxLayoutCentimeters,
  twipsToCentimeters,
} from '@/utils/ooxml-units'

const pageOptions = inject('page')
const editor = inject('editor')

const rawPage = computed(() => pageOptions?.value || pageOptions || {})
const pageSize = computed(() => getOrientedPageSize(
  rawPage.value.size || { width: 21, height: 29.7 },
  rawPage.value.orientation,
))
const pageMargin = computed(() => rawPage.value.margin || {
  top: 2.54,
  bottom: 2.54,
  left: 2.54,
  right: 2.54,
})
const zoomLevel = computed(() => Math.max(0.1, Number(rawPage.value.zoomLevel || 100) / 100))
const pxPerCm = computed(() => (96 / 2.54) * zoomLevel.value)
const draftLeftMarginCm = ref(null)
const draftRightMarginCm = ref(null)
const leftMarginCm = computed(() => draftLeftMarginCm.value ?? Number(pageMargin.value.left || 0))
const rightMarginCm = computed(() => draftRightMarginCm.value ?? Number(pageMargin.value.right || 0))
const availableContentCm = computed(() => Math.max(1, pageSize.value.width - leftMarginCm.value - rightMarginCm.value))
const totalCms = computed(() => Math.max(1, Math.floor(availableContentCm.value)))
const rulerWidth = computed(() => pageSize.value.width * pxPerCm.value)
const leftMarginWidth = computed(() => leftMarginCm.value * pxPerCm.value)
const rightMarginWidth = computed(() => rightMarginCm.value * pxPerCm.value)
const contentWidth = computed(() => availableContentCm.value * pxPerCm.value)

const firstLineOffsetCm = ref(0)
const leftIndentCm = ref(0)
const rightIndentCm = ref(0)
const tabStops = ref([])
const firstLinePositionCm = computed(() => leftIndentCm.value + firstLineOffsetCm.value)
const firstLinePositionPx = computed(() => firstLinePositionCm.value * pxPerCm.value)
const leftIndentPx = computed(() => leftIndentCm.value * pxPerCm.value)
const rightIndentPx = computed(() => rightIndentCm.value * pxPerCm.value)

const activeDragType = ref(null)
const activeGuideX = ref(0)
const guideTooltipText = ref('')
let startX = 0
let startVal = 0
let activeTabStopIndex = -1

const roundCm = (value) => Math.round(value * 10) / 10
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const currentLayout = () => {
  const currentEditor = editor?.value
  if (!currentEditor) return {}
  const nodeType = currentEditor.isActive('heading') ? 'heading' : 'paragraph'
  const layout = currentEditor.getAttributes(nodeType)?.docxLayout
  return layout && typeof layout === 'object' ? layout : {}
}
const syncParagraphLayout = () => {
  if (activeDragType.value) return
  const layout = currentLayout()
  leftIndentCm.value = getDocxLayoutCentimeters(layout, 'left')
  rightIndentCm.value = getDocxLayoutCentimeters(layout, 'right')
  firstLineOffsetCm.value = getDocxLayoutCentimeters(layout, 'firstLine')
    - getDocxLayoutCentimeters(layout, 'hanging')
  tabStops.value = Array.isArray(layout.tabStops)
    ? layout.tabStops.map((stop) => {
        const positionTwip = Number.isFinite(Number(stop.positionTwip))
          ? Math.round(Number(stop.positionTwip))
          : centimetersToTwips(Number(stop.position) || 0)
        return {
          ...stop,
          positionTwip,
          position: twipsToCentimeters(positionTwip),
        }
      }).sort((a, b) => a.positionTwip - b.positionTwip)
    : []
}

let connectedEditor = null
const disconnectEditor = () => {
  connectedEditor?.off('selectionUpdate', syncParagraphLayout)
  connectedEditor?.off('transaction', syncParagraphLayout)
  connectedEditor = null
}
watch(
  () => editor?.value,
  (value) => {
    disconnectEditor()
    connectedEditor = value || null
    connectedEditor?.on('selectionUpdate', syncParagraphLayout)
    connectedEditor?.on('transaction', syncParagraphLayout)
    syncParagraphLayout()
  },
  { immediate: true },
)

const startDrag = (type, event) => {
  if (editor?.value && !editor.value.isEditable) return
  activeDragType.value = type
  startX = event.clientX
  if (type === 'margin-left') startVal = leftMarginCm.value
  if (type === 'margin-right') startVal = rightMarginCm.value
  if (type === 'first-line') startVal = firstLinePositionCm.value
  if (type === 'left-indent') startVal = leftIndentCm.value
  if (type === 'right-indent') startVal = rightIndentCm.value
  updateGuide()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const startTabStopDrag = (index, event) => {
  activeTabStopIndex = index
  startVal = tabStops.value[index]?.position || 0
  startX = event.clientX
  activeDragType.value = 'tab-stop'
  updateGuide()
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const updateGuide = () => {
  const labelKeys = {
    'margin-left': 'ruler.marginLeftValue',
    'margin-right': 'ruler.marginRightValue',
    'first-line': 'ruler.firstLineIndentValue',
    'left-indent': 'ruler.leftIndentValue',
    'right-indent': 'ruler.rightIndentValue',
    'tab-stop': 'ruler.tabStopValue',
  }
  const values = {
    'margin-left': leftMarginCm.value,
    'margin-right': rightMarginCm.value,
    'first-line': firstLinePositionCm.value,
    'left-indent': leftIndentCm.value,
    'right-indent': rightIndentCm.value,
    'tab-stop': tabStops.value[activeTabStopIndex]?.position || 0,
  }
  activeGuideX.value = activeDragType.value === 'margin-left'
    ? leftMarginWidth.value
    : activeDragType.value === 'margin-right'
      ? rulerWidth.value - rightMarginWidth.value
      : activeDragType.value === 'right-indent'
        ? rulerWidth.value - rightMarginWidth.value - rightIndentPx.value
        : activeDragType.value === 'tab-stop'
          ? leftMarginWidth.value + (tabStops.value[activeTabStopIndex]?.position || 0) * pxPerCm.value
        : leftMarginWidth.value + (activeDragType.value === 'first-line' ? firstLinePositionPx.value : leftIndentPx.value)
  guideTooltipText.value = t(labelKeys[activeDragType.value], {
    value: Number(values[activeDragType.value]).toFixed(1),
  })
}

const onMouseMove = (event) => {
  if (!activeDragType.value) return
  const deltaCm = (event.clientX - startX) / pxPerCm.value
  const minContent = 2
  if (activeDragType.value === 'margin-left') {
    draftLeftMarginCm.value = roundCm(clamp(startVal + deltaCm, 0, pageSize.value.width - rightMarginCm.value - minContent))
  } else if (activeDragType.value === 'margin-right') {
    draftRightMarginCm.value = roundCm(clamp(startVal - deltaCm, 0, pageSize.value.width - leftMarginCm.value - minContent))
  } else if (activeDragType.value === 'first-line') {
    const position = roundCm(clamp(startVal + deltaCm, 0, availableContentCm.value - rightIndentCm.value))
    firstLineOffsetCm.value = roundCm(position - leftIndentCm.value)
  } else if (activeDragType.value === 'left-indent') {
    leftIndentCm.value = roundCm(clamp(startVal + deltaCm, 0, availableContentCm.value - rightIndentCm.value))
  } else if (activeDragType.value === 'right-indent') {
    rightIndentCm.value = roundCm(clamp(startVal - deltaCm, 0, availableContentCm.value - leftIndentCm.value))
  } else if (activeDragType.value === 'tab-stop' && activeTabStopIndex >= 0) {
    const position = roundCm(clamp(startVal + deltaCm, 0, availableContentCm.value))
    tabStops.value[activeTabStopIndex] = {
      ...tabStops.value[activeTabStopIndex],
      position,
      positionTwip: centimetersToTwips(position),
    }
  }
  updateGuide()
}

const commitPageMargin = () => {
  if (!pageOptions?.value) return
  pageOptions.value = {
    ...pageOptions.value,
    margin: {
      ...pageMargin.value,
      left: leftMarginCm.value,
      right: rightMarginCm.value,
      layout: 'custom',
    },
  }
}
const commitParagraphLayout = () => {
  const offset = firstLineOffsetCm.value
  editor?.value?.chain().focus().setDocxParagraphLayout({
    left: null,
    right: null,
    firstLine: null,
    hanging: null,
    leftTwip: leftIndentCm.value ? centimetersToTwips(leftIndentCm.value) : null,
    rightTwip: rightIndentCm.value ? centimetersToTwips(rightIndentCm.value) : null,
    firstLineTwip: offset > 0 ? centimetersToTwips(offset) : null,
    hangingTwip: offset < 0 ? centimetersToTwips(Math.abs(offset)) : null,
    tabStops: tabStops.value.length ? tabStops.value : null,
  }).run()
}
const addTabStop = (event) => {
  if (editor?.value && !editor.value.isEditable) return
  const bounds = event.currentTarget.getBoundingClientRect()
  const position = roundCm(clamp((event.clientX - bounds.left) / pxPerCm.value, 0, availableContentCm.value))
  const positionTwip = centimetersToTwips(position)
  if (tabStops.value.some((stop) => Math.abs(stop.positionTwip - positionTwip) < 30)) return
  tabStops.value = [
    ...tabStops.value,
    { alignment: 'left', leader: 'none', position, positionTwip },
  ].sort((a, b) => a.positionTwip - b.positionTwip)
  commitParagraphLayout()
}
const removeTabStop = (index) => {
  if (editor?.value && !editor.value.isEditable) return
  tabStops.value = tabStops.value.filter((_, stopIndex) => stopIndex !== index)
  commitParagraphLayout()
}
const onMouseUp = () => {
  const type = activeDragType.value
  if (type === 'margin-left' || type === 'margin-right') commitPageMargin()
  else if (type) commitParagraphLayout()
  activeDragType.value = null
  activeTabStopIndex = -1
  draftLeftMarginCm.value = null
  draftRightMarginCm.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  syncParagraphLayout()
}

onUnmounted(() => {
  disconnectEditor()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<style lang="less" scoped>
.kindy-ruler-container {
  height: 26px;
  flex: 0 0 26px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  position: relative;
  box-sizing: border-box;
  z-index: 30;
  margin: 0 auto 16px;
  user-select: none;
  overflow: visible;
}
.kindy-ruler-guide-line {
  position: absolute;
  top: 26px;
  width: 1px;
  height: 2000px;
  border-left: 1px dashed #1a73e8;
  z-index: 100;
  pointer-events: none;
  .guide-tooltip { position: absolute; top: -24px; left: 50%; transform: translateX(-50%); background: #1f2937; color: #fff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
}
.kindy-ruler-top { position: relative; height: 100%; display: flex; background: #fff; }
.kindy-ruler-margin {
  height: 100%; background: #e2e8f0; position: absolute; top: 0; z-index: 1; cursor: ew-resize;
  .margin-resize-handle { position: absolute; top: 0; bottom: 0; width: 4px; background: transparent; }
  &:hover .margin-resize-handle { background: #1a73e8; }
  &.left-margin { left: 0; border-right: 1px solid #cbd5e1; .margin-resize-handle { right: -2px; } }
  &.right-margin { right: 0; border-left: 1px solid #cbd5e1; .margin-resize-handle { left: -2px; } }
}
.kindy-ruler-ticks { position: absolute; top: 0; left: v-bind('leftMarginWidth + "px"'); height: 100%; z-index: 2; overflow: hidden; }
.kindy-ruler-tick-group {
  position: absolute; top: 0; height: 100%;
  .tick-number { position: absolute; top: 2px; left: -4px; font-size: 9px; font-weight: 600; color: #475569; font-family: var(--kindy-font-family, sans-serif); }
  .tick-line { position: absolute; bottom: 0; width: 1px; background: #94a3b8; &.tick-main { height: 10px; } &.tick-mid { height: 7px; } &.tick-sub { height: 4px; } }
}
.kindy-ruler-handle {
  position: absolute; z-index: 10; cursor: ew-resize; color: #1a73e8;
  &.handle-first-line { top: 1px; .handle-rectangle { width: 10px; height: 7px; background: currentColor; margin-left: -5px; border-radius: 1px; } }
  &.handle-left-indent, &.handle-right-indent { bottom: 1px; .handle-triangle-up { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid currentColor; margin-left: -5px; } }
}
.kindy-ruler-tab-stop {
  position: absolute;
  z-index: 11;
  bottom: 1px;
  width: 12px;
  height: 12px;
  cursor: ew-resize;
  border: 0;
  padding: 0;
  background: transparent;
  transform: translateX(-6px);
  span { display: block; width: 7px; height: 7px; border-bottom: 2px solid #1a73e8; border-left: 2px solid #1a73e8; }
  &:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
}
</style>
