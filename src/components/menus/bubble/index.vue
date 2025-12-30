<template>
  <bubble-menu
    v-if="editor"
    class="umo-editor-bubble-menu"
    :class="{ assistant }"
    :editor="editor"
    :append-to="appendTo"
    :options="floatingUiOptions"
  >
    <menus-bubble-menus
      v-if="options?.document?.enableBubbleMenu && !assistant"
    >
      <template #bubble_menu="props">
        <slot name="bubble_menu" v-bind="props" />
      </template>
    </menus-bubble-menus>
    <ai-assistant-input v-if="options?.ai?.assistant?.enabled && assistant" />
  </bubble-menu>
</template>

<script setup>
import { BubbleMenu } from '@tiptap/vue-3/menus'

const container = inject('container')
const editor = inject('editor')
const assistant = inject('assistant')
const options = inject('options')

const appendTo = computed(() =>
  document.querySelector(`${container} .umo-zoomable-container`),
)

const floatingUiOptions = computed(() => ({
  placement: assistant.value ? 'bottom' : 'top',
  onHide: () => {
    assistant.value = false
  },
}))
</script>

<style lang="less">
.umo-editor-bubble-menu {
  max-width: 580px;
  z-index: 110;
  border-radius: var(--umo-radius);
  display: flex;
  align-items: center;
  flex-wrap: wrap;

  &:not(.assistant) {
    padding: 8px 10px;
    box-shadow: var(--umo-shadow);
    border: 1px solid var(--umo-border-color);
    background-color: var(--umo-color-white);
  }

  &:empty {
    display: none;
  }

  .umo-menu-button.show-text .umo-button-content .umo-button-text {
    display: none !important;
  }

  .umo-menu-button.huge {
    height: var(--td-comp-size-xs);
    min-width: unset;

    .umo-button-content {
      min-width: unset !important;

      .umo-icon {
        font-size: 16px;
        margin-top: 0;
      }
    }
  }
}
</style>
