<template>
  <menus-button
    :text="t('base.highlight.text')"
    shortcut="Ctrl+Shift+H"
    menu-type="dropdown"
    popup-handle="arrow"
    hide-text
    overlay-class-name="kindy-highlight-dropdown"
    :disabled="!editor?.can().chain().focus().setBackgroundColor().run()"
    @menu-click="highlightChange(highlight)"
  >
    <icon
      name="highlight"
      class="kindy-icon-highlight"
      :style="{ backgroundColor: highlight?.bgcolor, color: highlight?.color }"
    />
    <template #dropmenu>
      <t-dropdown-menu>
        <t-dropdown-item
          v-for="item in options"
          :key="item.value"
          class="kindy-text-highlight-menu"
          :value="item.value"
          :style="{ backgroundColor: item.bgcolor, color: item.color }"
          :divider="item.divider"
          @click="highlightChange(item)"
        >
          <icon name="highlight" />
          <span>{{ item.label }}</span>
        </t-dropdown-item>
        <t-dropdown-item
          class="kindy-text-highlight-menu kindy-clear-format-menu"
          @click="clearFormat()"
        >
          <icon name="clear-format" />
          <span v-text="t('base.highlight.clear')"></span>
        </t-dropdown-item>
      </t-dropdown-menu>
    </template>
  </menus-button>
</template>

<script setup>
const editor = inject('editor')

const options = [
  { label: t('base.highlight.yellowBg'), value: 1, bgcolor: '#ffff8a' },
  { label: t('base.highlight.greenBg'), value: 2, bgcolor: '#a7ffa7' },
  { label: t('base.highlight.purpleBg'), value: 3, bgcolor: '#e6afff' },
  {
    label: t('base.highlight.blueBg'),
    value: 4,
    bgcolor: '#83d3ff',
    divider: true,
  },
  { label: t('base.highlight.red'), value: 5, color: '#e71313' },
  {
    label: t('base.highlight.green'),
    value: 6,
    color: '#128a00',
    divider: true,
  },
]

let highlight = $ref()
const highlightChange = (item) => {
  if (!item) {
    highlightChange(options[0])
    return
  }
  if (item.bgcolor) {
    editor.value?.chain().focus().setBackgroundColor(item.bgcolor).run()
  }
  if (item.color) {
    editor.value?.chain().focus().setColor(item.color).run()
  }
  highlight = item
}
const clearFormat = () => {
  editor.value?.chain().focus().unsetBackgroundColor().run()
  editor.value?.chain().focus().unsetColor().run()
  highlight = undefined
}
</script>

<style lang="less" scoped>
.kindy-icon-highlight {
  border-radius: 2px;
}
</style>

<style lang="less">
.kindy-text-highlight-dropdown {
  .kindy-popup__content {
    .kindy-divider {
      margin-top: 8px;
      margin-bottom: 8px;
    }
  }
}
.kindy-text-highlight-menu {
  width: 140px;
  margin-bottom: 6px;
  border: solid 1px transparent;
  &.kindy-clear-format-menu {
    margin-bottom: 0;
  }
  &:hover {
    border-color: var(--kindy-primary-color);
    background-color: inherit;
  }
  .kindy-dropdown__item-text {
    display: flex;
    align-items: center;
    padding: 2px;
    .kindy-icon {
      font-size: 16px;
      margin-right: 5px;
    }
  }
}
</style>
