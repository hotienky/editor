<template>
  <node-view-wrapper
    :id="node.attrs.id"
    ref="containerRef"
    class="umo-node-view"
    :style="nodeStyle"
  >
    <div
      class="umo-node-container umo-hover-shadow umo-select-outline umo-node-audio"
    >
      <audio
        ref="audiorRef"
        :src="node.attrs.src"
        controls
        crossorigin="anonymous"
        preload="metadata"
      ></audio>
      <div
        v-if="!node.attrs.uploaded && node.attrs.id !== null"
        class="uploading"
      ></div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

import { mediaPlayer } from '@/utils/player'

import { updateAttributesWithoutHistory } from '../file'

const props = defineProps(nodeViewProps)
const { node, getPos } = props
const options = inject('options')
const editor = inject('editor')
const uploadFileMap = inject('uploadFileMap')

const containerRef = ref(null)
const audioRef = $ref(null)
let player = $ref(null)
let selected = $ref(false)

const nodeStyle = $computed(() => {
  const { nodeAlign, margin } = node.attrs
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
  player = mediaPlayer(audioRef)
  if (node.attrs.uploaded || !node.attrs.id) {
    return
  }
  try {
    if (uploadFileMap.value.has(node.attrs.id)) {
      const file = uploadFileMap.value.get(node.attrs.id)
      const result = await options.value?.onFileUpload?.(file)
      const { id, url } = result ?? {}
      if (containerRef.value) {
        updateAttributesWithoutHistory(
          editor.value,
          { id, src: url, uploaded: true },
          getPos(),
        )
      }
      uploadFileMap.value.delete(node.attrs.id)
    }
  } catch (error) {
    useMessage('error', error.message)
  }
})

onBeforeUnmount(() => {
  if (player) {
    player.destroy()
  }
})

onClickOutside(containerRef, () => {
  selected = false
})
</script>

<style lang="less">
.umo-node-view {
  .umo-node-audio {
    max-width: 100%;
    width: 360px;
    position: relative;
    display: flex;
    border-radius: var(--umo-radius);
    outline: solid 1px var(--umo-border-color);
    audio {
      width: 100%;
      outline: none;
    }
    .uploading {
      position: absolute;
      z-index: 10;
      right: 0;
      top: 0;
      background: rgba(0, 0, 0, 0.2);
      height: 2px;
      left: 0;
      border-top-left-radius: var(--umo-radius);
      border-top-right-radius: var(--umo-radius);
      &:after {
        content: '';
        display: block;
        height: 100%;
        background-color: var(--umo-primary-color);
        animation: progress 1s linear infinite;
      }
    }
  }
}
@keyframes progress {
  0% {
    width: 0;
  }
  100% {
    width: 100%;
  }
}
</style>
