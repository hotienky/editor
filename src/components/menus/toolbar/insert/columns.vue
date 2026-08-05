<template>
  <menus-button
    ico="columns"
    :text="t('insert.columns.text')"
    menu-type="popup"
    huge
    :popup-visible="popupVisible"
    @toggle-popup="togglePopup"
  >
    <template #content>
      <div class="kindy-columns-title">{{ t('insert.columns.number') }}</div>
      <div class="kindy-columns-container">
        <div
          v-for="column in columns"
          :key="column"
          class="kindy-columns-item"
          :class="{ 'kindy-columns-item-selected': activeColumn >= column }"
          @mouseenter="setActiveColumn(column)"
          @click="setColumns(column)"
        >
          {{ column }}
        </div>
      </div>
    </template>
  </menus-button>
</template>

<script setup>
const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')

let activeColumn = $ref(0)

const columns = [1, 2, 3, 4, 5, 6]
const setActiveColumn = (column) => {
  activeColumn = column
}
const setColumns = (column) => {
  let content = '<div class="kindy-node-column-container">'
  for (let i = 0; i < column; i++) {
    content += '<div class="prosemirror-column"><p></p></div>'
  }
  content += '</div>'
  editor.value?.chain().focus().insertContent(content).run()
  // editor.value?.chain().focus().setColumns(column, true).run()
  popupVisible.value = false
}

watch(
  () => popupVisible.value,
  (visible) => {
    if (!visible) {
      activeColumn = 0
    }
  },
)
</script>

<style lang="less" scoped>
.kindy-columns {
  &-title {
    font-size: 14px;
    color: var(--kindy-text-color-light);
    line-height: 1;
    margin-bottom: 10px;
  }
  &-container {
    width: 180px;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 6px;
  }

  &-item {
    background-color: var(--kindy-content-table-selected-background);
    border-radius: var(--kindy-radius);
    cursor: pointer;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    color: var(--kindy-text-color-light);
    &-selected {
      background-color: var(--kindy-primary-color);
      color: var(--kindy-color-white);
      opacity: 0.9;
    }
  }
}
</style>
