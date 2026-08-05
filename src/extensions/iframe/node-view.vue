<template>
  <node-view-wrapper
    :id="attrs.id"
    ref="containerRef"
    class="kindy-node-view"
    :style="nodeStyle"
    @click.capture="clickCapture"
  >
    <div
      class="kindy-node-container kindy-select-outline kindy-node-iframe"
      :class="{
        'kindy-hover-shadow': !options.document?.readOnly,
      }"
    >
      <drager
        :selected="selected"
        :rotatable="false"
        :width="attrs.width"
        :height="attrs.height"
        :min-width="400"
        :min-height="200"
        :max-width="maxWidth"
        :disabled="options.document?.readOnly || isLockedNode"
        @resize="onResize"
        @focus="selected = true"
      >
        <iframe
          :src="attrs.src"
          :style="{ pointerEvents: attrs.clickable ? 'auto' : 'none' }"
        ></iframe>
      </drager>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import Drager from 'es-drager'
import { selectNodePos } from '@/utils/position'
const options = inject('options')
const editor = inject('editor')

const props = defineProps(nodeViewProps)
const attrs = $computed(() => props.node.attrs)
const isLockedNode = $computed(() => !!attrs.lockedNode)
const { updateAttributes, getPos } = props
const containerRef = ref(null)
let selected = $ref(false)
let maxWidth = $ref(0)

const clickCapture = () => {
  selectNodePos(editor.value, getPos)
}

const nodeStyle = $computed(() => {
  const { nodeAlign, margin } = attrs
  const marginTop =
    margin?.top && margin?.top !== '' ? `${margin.top}px` : undefined
  const marginBottom =
    margin?.bottom && margin?.bottom !== '' ? `${margin.bottom}px` : undefined
  return {
    'justify-content': nodeAlign,
    marginTop,
    marginBottom,
  }
})

onMounted(async () => {
  await nextTick()
  if (containerRef.value) {
    const { offsetWidth } = containerRef.value.$el

    maxWidth = offsetWidth
    if (attrs.width === null) {
      updateAttributes({ width: offsetWidth })
    }
  }
})
const onResize = ({ width, height }) => {
  if (isLockedNode) return
  updateAttributes({ width, height })
}
onClickOutside(containerRef, () => {
  selected = false
  // updateAttributes({ clickable: false })
})
</script>

<style lang="less">
.kindy-node-view {
  .kindy-node-iframe {
    max-width: 100%;
    .es-drager {
      &:not(.selected) {
        outline: solid 1px var(--kindy-content-node-border);
      }
    }
    iframe {
      display: block;
      min-width: 200px;
      min-height: 200px;
      width: 100%;
      height: 100%;
      border: none;
      background-color: #fff;
    }
  }
}
</style>
