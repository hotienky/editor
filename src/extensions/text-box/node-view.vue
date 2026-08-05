<template>
  <node-view-wrapper
    :id="attrs.id"
    ref="containerRef"
    class="kindy-node-view kindy-floating-node"
    :style="{
      zIndex: 90,
      '--kindy-textbox-border-color': attrs.borderColor,
      '--kindy-textbox-border-width': attrs.borderWidth + 'px',
      '--kindy-textbox-border-style': attrs.borderStyle,
      '--kindy-textbox-background-color': attrs.backgroundColor,
    }"
  >
    <div class="kindy-node-container kindy-node-text-box">
      <drager
        class="is-draggable"
        :style="{
          cursor: !options.document?.readOnly
            ? 'inherit'
            : 'default !important',
        }"
        :selected="selected"
        :disabled="disabled || !editor?.isEditable"
        :rotatable="true"
        :boundary="false"
        :angle="attrs.angle"
        :width="attrs.width"
        :height="attrs.height"
        :left="attrs.left"
        :top="attrs.top"
        :min-width="14"
        :min-height="14"
        :title="t('node.textBox.tip')"
        @rotate="onRotate"
        @resize="onResize"
        @drag="onDrag"
        @blur="disabled = false"
        @click="selected = true"
        @dblclick="editTextBox"
      >
        <node-view-content
          ref="contentRef"
          class="kindy-node-text-box-content"
          :style="{ writingMode: attrs.writingMode }"
        />
      </drager>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import Drager from 'es-drager'

const props = defineProps(nodeViewProps)
const attrs = $computed(() => props.node.attrs)
const { updateAttributes } = props

const options = inject('options')
const editor = inject('editor')

const containerRef = ref(null)
const contentRef = $ref(null)
let selected = $ref(false)
let disabled = $ref(false)

const onRotate = ({ angle }) => {
  updateAttributes({ angle })
}
const onResize = ({ width, height }) => {
  updateAttributes({ width, height })
}
const onDrag = ({ left, top }) => {
  updateAttributes({ left, top })
}

onClickOutside(containerRef, () => {
  selected = false
  disabled = false
})

const editTextBox = () => {
  disabled = true
  const range = document.createRange()
  range.selectNodeContents(contentRef.$el)
  const election = window.getSelection()
  if (election) {
    election.removeAllRanges()
    election.addRange(range)
  }
  contentRef.$el.focus()
}
</script>

<style lang="less">
.kindy-node-view {
  .kindy-node-text-box {
    position: absolute;
    .es-drager {
      user-select: text !important;
      cursor: default !important;
      z-index: 90 !important;
      background-color: var(--kindy-textbox-background-color);
      &.dragging {
        caret-color: transparent;
      }
      &.disabled {
        outline: none;
        &:after {
          display: none !important;
        }
      }
      &.selected {
        .kindy-node-text-box-content {
          outline: none;
        }
      }
      &.disabled.selected {
        .kindy-node-text-box-content {
          outline: var(--kindy-textbox-border-style)
            var(--kindy-textbox-border-width) var(--kindy-textbox-border-color);
        }
      }
    }
    .kindy-node-text-box-content {
      outline: var(--kindy-textbox-border-style)
        var(--kindy-textbox-border-width) var(--kindy-textbox-border-color);
      width: 100%;
      height: 100%;
      padding: 5px;
      box-sizing: border-box;
      overflow: hidden;
    }
  }
}
</style>
