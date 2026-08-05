<template>
  <bubble-menu v-if="editor" class="kindy-editor-bubble-menu" :editor="editor">
    <menus-bubble-menus v-if="options?.document?.enableBubbleMenu">
      <template #bubble_menu="props">
        <slot name="bubble_menu" v-bind="props" />
      </template>
    </menus-bubble-menus>
  </bubble-menu>
</template>

<script setup>
import { BubbleMenu } from '@tiptap/vue-3/menus'

const editor = inject('editor')
const options = inject('options')
</script>

<style lang="less">
.kindy-editor-bubble-menu {
  max-width: 620px;
  z-index: 110;
  border-radius: var(--kindy-radius);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 10px !important;
  box-shadow: var(--kindy-shadow);
  border: 1px solid var(--kindy-border-color);
  background-color: var(--kindy-color-white);

  &:empty {
    display: none;
  }

  .kindy-menu-button.show-text .kindy-button-content .kindy-button-text {
    display: none !important;
  }

  .kindy-menu-button.huge {
    height: var(--td-comp-size-xs);
    min-width: unset;

    .kindy-button-content {
      min-width: unset !important;

      .kindy-icon {
        font-size: 16px;
        margin-top: 0;
      }
    }
  }
}
</style>
