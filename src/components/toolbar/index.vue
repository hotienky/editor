<template>
  <div
    v-if="$toolbar.show"
    class="kindy-toolbar-container"
    :class="{ 'kindy-toolbar-container-contract': isContractEditor }"
  >
    <nav
      v-if="isContractEditor && toolbarMenus.length > 1"
      class="kindy-contract-menu-bar"
      :aria-label="t('toolbar.toggle')"
    >
      <button
        v-for="item in toolbarMenus"
        :key="item.value"
        type="button"
        :class="{ active: toolbarActive === item.value }"
        :aria-pressed="toolbarActive === item.value"
        @click="menuChange(item.value)"
      >
        {{ item.label }}
      </button>
    </nav>
    <toolbar-ribbon
      v-if="$toolbar.mode === 'ribbon'"
      :menus="toolbarMenus"
      :current-menu="toolbarActive"
      @menu-change="menuChange"
    >
      <template
        v-for="item in options.toolbar?.menus"
        :key="item"
        #[`toolbar_${item}`]="props"
      >
        <slot :name="`toolbar_${item}`" v-bind="props" />
      </template>
    </toolbar-ribbon>
    <toolbar-classic
      v-if="$toolbar.mode === 'classic'"
      :menus="toolbarMenus"
      :current-menu="toolbarActive"
      :hide-menu-select="isContractEditor"
      @menu-change="menuChange"
    >
            <template
              v-for="item in options.toolbar?.menus"
              :key="item"
              #[`toolbar_${item}`]="slotProps"
            >
              <slot :name="`toolbar_${item}`" v-bind="slotProps" />
            </template>
    </toolbar-classic>
    <div
      v-if="showToolbarActions"
      class="kindy-toolbar-actions"
      :class="`kindy-toolbar-actions-${$toolbar.mode}`"
    >
      <t-popup
        v-if="showSaveStatus"
        v-model="statusPopup"
        :attach="container"
        trigger="click"
        placement="bottom-right"
        @visible-change="(visible) => (statusPopup = visible)"
      >
        <t-button
          class="kindy-toolbar-actions-button"
          variant="text"
          size="small"
          :class="{ active: statusPopup }"
        >
          <span class="kindy-status">
            <span
              class="kindy-status-online"
              :class="{ offline: !online }"
            ></span>
            <span class="kindy-status-saved button-text">
              <span
                v-if="savedAt"
                v-text="t('save.savedAtText', { time: timeAgo(savedAt) })"
              ></span>
              <span v-else class="unsaved" v-text="t('save.unsaved')"></span>
            </span>
          </span>
        </t-button>
        <template #content>
          <div class="kindy-document-status-container kindy-status">
            <div>
              {{ t('save.network') }}
              {{ online ? t('save.online') : t('save.offline') }}
            </div>
            <div>
              {{ t('save.savedAt') }}
              <span
                v-if="savedAt"
                v-text="t('save.savedAtText', { time: timeAgo(savedAt) })"
              ></span>
              <span v-else v-text="t('save.unsaved')"></span>
            </div>
            <div class="kindy-document-button-container">
              <t-button
                size="small"
                @click="saveContent"
                v-text="t('save.text')"
              ></t-button>
              <t-button
                size="small"
                variant="outline"
                @click="setContentFromCache"
                v-text="t('save.cache.text')"
              >
              </t-button>
            </div>
          </div>
        </template>
      </t-popup>
      <t-dropdown
        v-if="options.toolbar.allowModeSwitch !== false"
        trigger="click"
        size="small"
        placement="bottom-right"
        :popup-props="{
          destroyOnClose: true,
          attach: container,
        }"
        @click="toggleToolbarMode"
      >
        <t-button
          class="kindy-toolbar-actions-button"
          variant="text"
          size="small"
        >
          <icon name="expand-down" />
          <span class="kindy-button-text">{{ t('toolbar.toggle') }}</span>
        </t-button>
        <template #dropdown>
          <t-dropdown-menu
            v-for="item in editorModeOptions"
            :key="item.value"
            :content="item.label"
            :value="item.value"
            :divider="item.divider"
            :active="item.value === $toolbar.mode"
          >
            <template #prefixIcon>
              <icon :name="item.prefixIcon" />
            </template>
          </t-dropdown-menu>
        </template>
      </t-dropdown>
    </div>
  </div>
  <tooltip v-else :content="t('toolbar.show')" placement="bottom-right">
    <div class="kindy-show-toolbar" @click="$toolbar.show = true">
      <icon name="arrow-down" />
    </div>
  </tooltip>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import { timeAgo } from '@/utils/time-ago'
const emits = defineEmits(['menu-change'])

const container = inject('container')
const toolbarActive = inject('toolbarActive')
const editor = inject('editor')
const savedAt = inject('savedAt')
const options = inject('options')
const $toolbar = useState('toolbar', options)
let statusPopup = ref(false)
const online = useOnline()
const showSaveStatus = computed(
  () => options.value.toolbar.showSaveLabel && options.value.document.readOnly !== true,
)
const showToolbarActions = computed(
  () => showSaveStatus.value || options.value.toolbar.allowModeSwitch !== false,
)
const isContractEditor = computed(
  () => options.value.editorKey === 'kindy-document-library-contract',
)

// 工具栏菜单
const toolbarMenus = computed(() => {
  const defaultToolbarMenus = [
    { label: t('toolbar.base'), value: 'base' },
    { label: t('toolbar.insert'), value: 'insert' },
    { label: t('toolbar.table'), value: 'table' },
    { label: t('toolbar.tools'), value: 'tools' },
    { label: t('toolbar.page'), value: 'page' },
    { label: t('toolbar.view'), value: 'view' },
    { label: t('toolbar.export'), value: 'export' },
  ]
  return (options.value.toolbar?.menus || ['base'])
    .map((item) => defaultToolbarMenus.find((menu) => menu.value === item))
    .filter(Boolean)
})
if (!toolbarActive.value) {
  toolbarActive.value = toolbarMenus.value[0]?.value || 'base'
}
const menuChange = (menu) => {
  toolbarActive.value = menu
  emits('menu-change', menu)
}
// 监听如果当前编辑元素为table则切换到table菜单
watch(
  () => editor.value?.isActive('table'),
  (val, oldVal) => {
    if (val) {
      toolbarActive.value = 'table'
    } else if (!val && oldVal) {
      toolbarActive.value = 'base'
    }
  },
)

// 切换编辑器模式
const editorModeOptions = [
  {
    label: t('toolbar.ribbon'),
    value: 'ribbon',
    prefixIcon: 'toolbar-ribbon',
  },
  {
    label: t('toolbar.classic'),
    value: 'classic',
    prefixIcon: 'toolbar-classic',
  },
  {
    label: t('toolbar.hide'),
    value: 'hideToolbar',
    prefixIcon: 'hide-toolbar',
  },
]

const toggleToolbarMode = ({ value }) => {
  if (value === 'hideToolbar') {
    $toolbar.value.show = false
  } else {
    $toolbar.value.show = true
    $toolbar.value.mode = value
  }
}

// 保存文档
const saveContentMethod = inject('saveContent')
const saveContent = () => {
  saveContentMethod()
  statusPopup = false
}

// 从缓存中恢复文档
const setContentFromCache = () => {
  const document = useState('document', options)
  const { content } = document.value
  if (!content || content === '' || content === '<p></p>') {
    const dialog = useAlert({
      attach: container,
      theme: 'info',
      header: t('save.cache.error.title'),
      body: t('save.cache.error.message'),
      onConfirm() {
        dialog.destroy()
      },
    })
    return
  }
  statusPopup = false
  editor.value?.chain().setContent(content, true).focus().run()
}
</script>

<style lang="less" scoped>
.kindy-toolbar-container {
  display: flex;
  justify-content: space-between;
  user-select: none;
  position: relative;
}
.kindy-toolbar-container-contract {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  border-radius: 0;

  .kindy-contract-menu-bar {
    display: flex;
    grid-column: 1 / -1;
    align-items: center;
    gap: 2px;
    min-height: 28px;
    padding: 0 8px;
    background: var(--kindy-color-white);

    button {
      min-height: 26px;
      cursor: pointer;
      border: 0;
      border-radius: 4px;
      padding: 3px 9px;
      background: transparent;
      color: var(--kindy-text-color);
      font: inherit;
      font-size: 12px;

      &:hover,
      &:focus-visible,
      &.active {
        background: #e8f0fe;
        color: #174ea6;
        outline: none;
      }
    }
  }

  :deep(.kindy-scrollable-container) {
    min-width: 0;
  }
}
.kindy-toolbar-actions {
  padding: 6px 10px;
  display: flex;
  align-items: center;
  &-ribbon {
    position: absolute;
    right: 0;
    top: 1px;
  }
  &-button {
    &.active {
      background-color: var(--kindy-button-hover-background);
    }
    &:not(:last-child) {
      margin-right: 3px;
    }
    :deep(.kindy-button__text) {
      display: flex;
      align-items: center;
      .kindy-icon {
        margin-right: 3px;
      }
    }
  }
  @media screen and (max-width: 640px) {
    padding-left: 0;
    .kindy-status-online {
      margin-right: 0;
    }
    .kindy-button-text {
      display: none;
    }
  }
}
.kindy-show-toolbar {
  cursor: pointer;
  position: absolute;
  right: 20px;
  font-size: 18px;
  padding: 3px 6px;
  z-index: 99;
  background-color: var(--kindy-color-white);
  color: var(--kindy-text-color-light);
  border-bottom-left-radius: var(--kindy-radius);
  border-bottom-right-radius: var(--kindy-radius);
  border: solid 1px var(--kindy-border-color);
  border-top: none;
  &:hover {
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.08);
    color: var(--kindy-primary-color);
  }
}
.kindy-status {
  font-size: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  &-online {
    width: 10px;
    height: 10px;
    background: rgb(26, 187, 26);
    border-radius: 50%;
    &.offline {
      background: rgb(187, 26, 26);
    }
  }
  &-saved {
    color: var(--kindy-text-color-light);
    margin-left: 5px;
    .unsaved {
      color: var(--kindy-error-color);
    }
  }
}
.kindy-document-status-container {
  flex-direction: column;
  align-items: unset;
  padding: 12px 16px;
  color: var(--kindy-text-color);
  min-width: 150px;
  cursor: default;
  .kindy-document-button-container {
    margin: 8px 0 4px;
    display: flex;
    gap: 8px;
  }
}
</style>

<style lang="less">
.kindy-skin-modern {
  &.toolbar-classic {
    .kindy-toolbar-actions {
      margin: 15px 15px 2px 0;
      border-radius: 6px;
      background-color: var(--kindy-color-white);
      box-shadow:
        0 0 0 1px hsla(0, 0%, 5%, 0.04),
        0 2px 5px hsla(0, 0%, 5%, 0.06);
      &:hover {
        box-shadow:
          0 0 0 1px hsla(0, 0%, 5%, 0.06),
          0 2px 5px hsla(0, 0%, 5%, 0.1);
      }
    }
  }
  &.toolbar-ribbon {
    .kindy-toolbar-actions {
      right: 5px !important;
      top: 6px !important;
    }
  }
}
[theme-mode='dark'] .kindy-skin-modern {
  &.toolbar-classic {
    .kindy-toolbar-actions {
      outline: solid 1px var(--kindy-border-color-light);
    }
  }
}
</style>
