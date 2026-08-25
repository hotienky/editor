<template>
  <toolbar-scrollable ref="scrollableRef" class="kindy-scrollable-container">
    <div class="kindy-classic-menu">
      <div v-if="menus.length > 1 && !hideMenuSelect" class="kindy-virtual-group">
        <t-select
          v-if="selectVisible"
          v-model="localCurrentMenu"
          :popup-props="{
            destroyOnClose: true,
            attach: container,
          }"
          size="small"
          auto-width
          borderless
          @change="toggoleMenu"
        >
          <template #prefixIcon>
            <icon name="menu" />
          </template>
          <t-option
            v-for="item in menus"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </t-select>
      </div>
      <template v-if="localCurrentMenu === 'base'">
        <div class="kindy-virtual-group">
          <menus-toolbar-base-undo />
          <menus-toolbar-base-redo />
          <menus-toolbar-base-print v-if="!disableMenu('print')" />
          <menus-toolbar-base-format-painter />
          <menus-toolbar-view-zoom v-if="!disableMenu('zoom')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-base-heading />
          <menus-toolbar-base-font-family borderless />
          <menus-toolbar-base-font-size borderless />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-base-bold />
          <menus-toolbar-base-italic />
          <menus-toolbar-base-underline />
          <menus-toolbar-base-strike />
          <menus-toolbar-base-color />
          <menus-toolbar-base-highlight v-if="!disableMenu('highlight')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-insert-link v-if="!disableMenu('link')" />
          <menus-toolbar-insert-comment v-if="!disableMenu('comment')" />
          <menus-toolbar-insert-image v-if="!disableMenu('image')" />
          <menus-toolbar-table-insert v-if="!disableMenu('table')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-base-align-left />
          <menus-toolbar-base-align-center />
          <menus-toolbar-base-align-right />
          <menus-toolbar-base-align-justify />
          <menus-toolbar-base-line-height v-if="!disableMenu('line-height')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-base-ordered-list />
          <menus-toolbar-base-bullet-list />
          <menus-toolbar-base-outdent />
          <menus-toolbar-base-indent />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-base-task-list v-if="!disableMenu('task-list')" />
          <menus-toolbar-base-clear-format />
          <menus-toolbar-base-search-replace />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_base" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="localCurrentMenu === 'insert'">
        <div class="kindy-virtual-group">
          <menus-toolbar-insert-link v-if="!disableMenu('link')" />
          <menus-toolbar-insert-image v-if="!disableMenu('image')" />
          <menus-toolbar-insert-video v-if="!disableMenu('video')" />
          <menus-toolbar-insert-audio v-if="!disableMenu('audio')" />
          <menus-toolbar-insert-file v-if="!disableMenu('file')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-insert-text-box v-if="!disableMenu('text-box')" />
          <menus-toolbar-insert-details v-if="!disableMenu('details')" />
          <menus-toolbar-insert-code-block v-if="!disableMenu('code-block')" />
          <menus-toolbar-insert-building-blocks
            v-if="!disableMenu('building-blocks')"
          />
          <menus-toolbar-insert-symbol v-if="!disableMenu('symbol')" />
          <menus-toolbar-insert-chinese-date
            v-if="!disableMenu('chinese-date')"
          />
          <menus-toolbar-insert-emoji v-if="!disableMenu('emoji')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-insert-tag v-if="!disableMenu('tag')" />
          <menus-toolbar-insert-columns v-if="!disableMenu('columns')" />
          <menus-toolbar-insert-callout v-if="!disableMenu('callout')" />
          <menus-toolbar-insert-mention v-if="!disableMenu('mention')" />
          <menus-toolbar-insert-option-box v-if="!disableMenu('option-box')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-insert-hard-break v-if="!disableMenu('hard-break')" />
          <menus-toolbar-insert-hr v-if="!disableMenu('hr')" />
          <menus-toolbar-insert-bookmark v-if="!disableMenu('bookmark')" />
          <menus-toolbar-insert-footnote v-if="!disableMenu('footnote')" />
          <menus-toolbar-insert-toc v-if="!disableMenu('toc')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-insert-template v-if="!disableMenu('template')" />
          <menus-toolbar-insert-web-page v-if="!disableMenu('web-page')" />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_insert" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="localCurrentMenu === 'table'">
        <div class="kindy-virtual-group">
          <menus-toolbar-table-insert />
          <menus-toolbar-table-fix />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-cells-align />
          <menus-toolbar-table-cells-background />
          <!-- <menus-toolbar-table-border-color /> -->
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-add-row-before :huge="false" />
          <menus-toolbar-table-add-row-after :huge="false" />
          <menus-toolbar-table-add-column-before :huge="false" />
          <menus-toolbar-table-add-column-after :huge="false" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-delete-row :huge="false" />
          <menus-toolbar-table-delete-column :huge="false" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-merge-cells :huge="false" />
          <menus-toolbar-table-split-cell :huge="false" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-toggle-header-row :huge="false" />
          <menus-toolbar-table-toggle-header-column :huge="false" />
          <menus-toolbar-table-toggle-header-cell :huge="false" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-next-cell :huge="false" />
          <menus-toolbar-table-previous-cell :huge="false" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-table-delete />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_table" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="localCurrentMenu === 'tools'">
        <div class="kindy-virtual-group">
          <menus-toolbar-tools-signature v-if="!disableMenu('signature')" />
          <menus-toolbar-tools-stamp v-if="!disableMenu('stamp')" />
          <menus-toolbar-tools-qrcode v-if="!disableMenu('qrcode')" />
          <menus-toolbar-tools-barcode v-if="!disableMenu('barcode')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-tools-math v-if="!disableMenu('math')" />
          <menus-toolbar-tools-diagrams v-if="!disableMenu('diagrams')" />
          <menus-toolbar-tools-echarts v-if="!disableMenu('echarts')" />
          <!-- <menus-toolbar-tools-mind-map v-if="!disableMenu('mind-map')" /> -->
          <menus-toolbar-tools-mermaid v-if="!disableMenu('mermaid')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-tools-chinese-case
            v-if="!disableMenu('chinese-case')"
          />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_tools" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="localCurrentMenu === 'page'">
        <div class="kindy-virtual-group">
          <menus-toolbar-page-margin />
          <menus-toolbar-page-size v-if="page.layout === 'page'" />
          <menus-toolbar-page-orientation v-if="page.layout === 'page'" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-page-header />
          <menus-toolbar-page-footer />
          <menus-toolbar-page-break />
          <menus-toolbar-page-break-marks />
          <menus-toolbar-page-line-number />
          <menus-toolbar-page-watermark v-if="!disableMenu('watermark')" />
          <menus-toolbar-page-background v-if="!disableMenu('background')" />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_page" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="localCurrentMenu === 'view'">
        <div class="kindy-virtual-group">
          <menus-toolbar-view-toc v-if="!disableMenu('toc')" />
          <menus-toolbar-view-fullscreen v-if="!disableMenu('fullscreen')" />
          <menus-toolbar-view-preview v-if="!disableMenu('preview')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-view-page v-if="!disableMenu('layout-page')" />
          <menus-toolbar-view-web v-if="!disableMenu('layout-web')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-view-zoom v-if="!disableMenu('zoom')" />
          <menus-toolbar-view-zoom-original
            v-if="!disableMenu('zoom-original')"
          />
          <menus-toolbar-view-zoom-auto v-if="!disableMenu('zoom-auto')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-view-skin v-if="!disableMenu('skin')" />
          <menus-toolbar-view-theme v-if="!disableMenu('theme')" />
          <menus-toolbar-view-locale v-if="!disableMenu('locale')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-view-reset v-if="!disableMenu('reset')" />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_view" toolbar-mode="classic" />
        </div>
      </template>
      <template v-if="localCurrentMenu === 'export'">
        <div class="kindy-virtual-group">
          <menus-toolbar-export-word v-if="!disableMenu('export-word')" />
          <menus-toolbar-export-import-word v-if="!disableMenu('import-word')" />
          <menus-toolbar-export-image v-if="!disableMenu('export-image')" />
          <menus-toolbar-export-pdf v-if="!disableMenu('export-pdf')" />
          <menus-toolbar-export-text v-if="!disableMenu('export-text')" />
        </div>
        <div class="kindy-virtual-group">
          <menus-toolbar-export-share v-if="!disableMenu('share')" />
          <menus-toolbar-export-embed v-if="!disableMenu('embed')" />
        </div>
        <div class="kindy-virtual-group is-slot">
          <slot name="toolbar_export" toolbar-mode="classic" />
        </div>
      </template>
    </div>
  </toolbar-scrollable>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
const props = defineProps({
  menus: {
    type: Array,
    default: () => [],
  },
  currentMenu: {
    type: String,
    default: '',
  },
  hideMenuSelect: {
    type: Boolean,
    default: false,
  },
})

const { selectVisible } = useSelect()

const emits = defineEmits(['menu-change'])

const container = inject('container')
const options = inject('options')
const page = inject('page')
const disableMenu = (name) => {
  return options.value.disableExtensions.includes(name)
}

const localCurrentMenu = ref('')
watch(
  () => props.currentMenu,
  async (val) => {
    localCurrentMenu.value = val
    await nextTick()
    scrollableRef.value?.update?.()
  },
  { immediate: true },
)
const scrollableRef = ref(null)
const toggoleMenu = async (menu) => {
  emits('menu-change', menu)
  await nextTick()
  scrollableRef.value?.update?.()
}
</script>

<style lang="less" scoped>
.kindy-scrollable-container {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 3px 8px;
}
.kindy-classic-menu {
  display: inline-flex;
  width: max-content;
  min-width: max-content;
  align-items: center;
  gap: 2px;
  &:last-child {
    margin-right: 8px;
  }
  .kindy-virtual-group {
    display: flex;
    align-items: center;
    gap: 1px;
    &:empty {
      display: none;
    }
    &:not(:last-child),
    &.is-slot {
      &::before {
        content: '';
        display: block;
        height: 18px;
        width: 1px;
        background-color: #cbd5e1;
        margin: 0 6px;
      }
    }
    &:first-child::before {
      display: none;
    }
    :deep(.kindy-menu-button) {
      border-radius: 4px;
      transition: background-color 0.15s ease;
      &:hover {
        background-color: #e2e8f0;
      }
      &.active, &.is-active {
        background-color: #d3e3fd !important;
        color: #041e49 !important;
      }
      .kindy-button--shape-square .kindy-icon {
        font-size: 15px;
      }
    }
    &-row {
      display: flex;
    }
  }
}

@media screen and (max-width: 900px) {
  .kindy-scrollable-container {
    padding-inline: 6px;
  }

  .kindy-classic-menu {
    .kindy-virtual-group {
      &:not(:last-child),
      &.is-slot {
        &::before { margin-inline: 6px; }
      }
    }
  }
}

@media screen and (max-width: 480px) {
  .kindy-scrollable-container {
    padding: 4px;
  }

  .kindy-classic-menu {
    &:last-child { margin-right: 4px; }
  }
}
</style>
