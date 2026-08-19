<template>
  <t-tooltip
    :content="tooltipContent"
    :visible="tooltipVisible && !tooltipForceHide"
    theme="light"
    placement="top"
    :attach="container"
    :show-arrow="false"
    destroy-on-close
  >
    <div
      class="kindy-menu-button-wrap"
      @click="tooltipVisible = false"
      @mouseover="tooltipVisible = true"
      @mouseleave="tooltipVisible = false"
    >
      <template v-if="menuType === 'button'">
        <t-button
          class="kindy-menu-button"
          :class="{
            huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
            'show-text': !hideText,
            active: menuActive && editor?.isEditable !== false,
          }"
          shape="square"
          variant="text"
          size="small"
          :disabled="
            !forceEnabled && (disabled || editor?.isEditable === false)
          "
          :aria-label="text || tooltip || undefined"
          :aria-pressed="menuActive || undefined"
          v-bind="attrs"
          @click="menuClick"
        >
          <div class="kindy-button-content">
            <slot />
            <template v-if="ico">
              <span
                v-if="ico?.startsWith('<')"
                class="kindy-button-icon-svg"
                v-html="ico"
              >
              </span>
              <icon v-else class="kindy-button-icon" :name="ico" />
            </template>
            <p class="kindy-button-text">{{ text }}</p>
            <kbd v-if="shortcutText" class="kindy-button-kbd">
              {{ getShortcut(shortcutText) }}
            </kbd>
          </div>
        </t-button>
      </template>
      <template v-else-if="menuType === 'dropdown'">
        <template v-if="popupHandle === 'arrow'">
          <t-button
            class="kindy-menu-button has-arrow"
            :class="{
              huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
              'show-text': !hideText,
              active: tooltipForceHide,
            }"
            variant="text"
            size="small"
            v-bind="attrs"
            :disabled="
              !forceEnabled && (disabled || editor?.isEditable === false)
            "
            :aria-label="text || tooltip || undefined"
            :aria-haspopup="'menu'"
          >
            <div class="kindy-button-content" @click="menuClick">
              <slot />
              <template v-if="ico">
                <span
                  v-if="ico?.startsWith('<')"
                  class="kindy-button-icon-svg"
                  v-html="ico"
                >
                </span>
                <icon v-else class="kindy-button-icon" :name="ico" />
              </template>
              <p class="kindy-button-text">{{ text }}</p>
              <kbd v-if="shortcutText" class="kindy-button-kbd">
                {{ getShortcut(shortcutText) }}
              </kbd>
            </div>
            <t-dropdown
              v-bind="attrs"
              trigger="click"
              size="small"
              :options="selectOptions"
              :popup-props="{
                overlayClassName: attrs['overlay-class-name'],
                popperOptions: {
                  modifiers: [
                    { name: 'offset', options: { offset: [-22, 0] } },
                  ],
                },
                onVisibleChange: popupVisileChange,
                destroyOnClose: true,
                attach: container,
              }"
              @click="attrs.onChange"
            >
              <span class="kindy-button-icon-arrow kindy-button-handle">
                <icon name="arrow-down" />
              </span>
              <slot v-if="!selectOptions" name="dropmenu" />
            </t-dropdown>
          </t-button>
        </template>
        <template v-else>
          <t-dropdown
            v-bind="attrs"
            trigger="click"
            size="small"
            :options="selectOptions"
            :popup-props="{
              overlayClassName: attrs['overlay-class-name'],
              onVisibleChange: popupVisileChange,
              destroyOnClose: true,
              attach: container,
            }"
            @click="attrs.onChange"
          >
            <t-button
              class="kindy-menu-button has-arrow"
              :class="{
                huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
                'show-text': !hideText,
                active: tooltipForceHide,
              }"
              variant="text"
              size="small"
              v-bind="attrs"
              :disabled="
                !forceEnabled && (disabled || editor?.isEditable === false)
              "
              :aria-label="text || tooltip || undefined"
              :aria-haspopup="'menu'"
            >
              <div class="kindy-button-content" @click="menuClick">
                <slot />
                <template v-if="ico">
                  <span
                    v-if="ico?.startsWith('<')"
                    class="kindy-button-icon-svg"
                    v-html="ico"
                  >
                  </span>
                  <icon v-else class="kindy-button-icon" :name="ico" />
                </template>
                <p class="kindy-button-text">{{ text }}</p>
                <kbd v-if="shortcutText" class="kindy-button-kbd">{{
                  getShortcut(shortcutText)
                }}</kbd>
                <span
                  v-if="$toolbar.mode === 'ribbon'"
                  class="kindy-button-icon-arrow"
                >
                  <icon name="arrow-down" />
                </span>
              </div>
              <span
                v-if="$toolbar.mode === 'classic'"
                class="kindy-button-icon-arrow"
              >
                <icon name="arrow-down" />
              </span>
            </t-button>
            <slot v-if="!selectOptions" name="dropmenu" />
          </t-dropdown>
        </template>
      </template>
      <template v-else-if="menuType === 'select'">
        <t-select
          v-if="selectVisible"
          size="small"
          placement="bottom-left"
          :on-popup-visible-change="popupVisileChange"
          :value="selectValue"
          :popup-props="{
            destroyOnClose: true,
            attach: container,
          }"
          v-bind="attrs"
          :options="selectOptions"
          :disabled="
            !forceEnabled && (disabled || editor?.isEditable === false)
          "
          @change="menuClick"
        >
          <slot />
        </t-select>
      </template>
      <template v-else-if="menuType === 'popup'">
        <template v-if="popupHandle === 'arrow'">
          <t-button
            class="kindy-menu-button has-arrow"
            :class="{
              'show-text': !hideText,
              active: popupVisible,
            }"
            variant="text"
            size="small"
            v-bind="attrs"
            :disabled="
              !forceEnabled && (disabled || editor?.isEditable === false)
            "
            :aria-label="text || tooltip || undefined"
            :aria-haspopup="'popup'"
            :aria-expanded="popupVisible || undefined"
          >
            <div class="kindy-button-content" @click="menuClick">
              <slot />
              <template v-if="ico">
                <span
                  v-if="ico?.startsWith('<')"
                  class="kindy-button-icon-svg"
                  v-html="ico"
                >
                </span>
                <icon v-else class="kindy-button-icon" :name="ico" />
              </template>
              <p class="kindy-button-text">{{ text }}</p>
              <kbd v-if="shortcutText" class="kindy-button-kbd">
                {{ getShortcut(shortcutText) }}
              </kbd>
            </div>
            <t-popup
              :attach="container"
              trigger="click"
              placement="bottom-left"
              v-bind="attrs"
              :visible="popupVisible"
              :popper-options="{
                modifiers: [{ name: 'offset', options: { offset: [-22, 0] } }],
              }"
            >
              <span
                v-if="$toolbar.mode === 'ribbon'"
                ref="popupHandleRef"
                class="kindy-button-icon-arrow kindy-button-handle"
                @click="togglePopup(!popupVisible)"
              >
                <icon name="arrow-down" />
              </span>
              <template #content>
                <div ref="popupContentRef" class="kindy-popup-content">
                  <slot name="content" />
                </div>
              </template>
              <span
                v-if="$toolbar.mode === 'classic'"
                ref="popupHandleRef"
                class="kindy-button-icon-arrow kindy-button-handle"
                @click="togglePopup(!popupVisible)"
              >
                <icon name="arrow-down" />
              </span>
            </t-popup>
          </t-button>
        </template>
        <template v-else>
          <t-popup
            :attach="container"
            trigger="click"
            placement="bottom-left"
            :visible="popupVisible"
          >
            <t-button
              ref="popupHandleRef"
              class="kindy-menu-button has-arrow"
              :class="{
                huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
                'show-text': !hideText,
                active: popupVisible,
              }"
              variant="text"
              size="small"
              v-bind="attrs"
              :disabled="
                !forceEnabled && (disabled || editor?.isEditable === false)
              "
              :aria-label="text || tooltip || undefined"
              :aria-haspopup="'popup'"
              :aria-expanded="popupVisible || undefined"
              @click="togglePopup(!popupVisible)"
            >
              <div class="kindy-button-content">
                <slot />
                <template v-if="ico">
                  <span
                    v-if="ico?.startsWith('<')"
                    class="kindy-button-icon-svg"
                    v-html="ico"
                  >
                  </span>
                  <icon v-else class="kindy-button-icon" :name="ico" />
                </template>
                <p class="kindy-button-text">{{ text }}</p>
                <kbd v-if="shortcutText" class="kindy-button-kbd">{{
                  getShortcut(shortcutText)
                }}</kbd>
                <span
                  v-if="$toolbar.mode === 'ribbon'"
                  class="kindy-button-icon-arrow"
                >
                  <icon name="arrow-down" />
                </span>
              </div>
              <span
                v-if="$toolbar.mode === 'classic'"
                class="kindy-button-icon-arrow"
              >
                <icon name="arrow-down" />
              </span>
            </t-button>
            <template #content>
              <div ref="popupContentRef" class="kindy-popup-content">
                <slot name="content" />
              </div>
            </template>
          </t-popup>
        </template>
      </template>
      <template v-else>
        <slot />
      </template>
    </div>
  </t-tooltip>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
import { isString } from '@tool-belt/type-predicates'

import { getShortcut } from '@/utils/shortcut'

const { selectVisible } = useSelect()

const props = defineProps({
  // 菜单类型
  menuType: {
    type: String,
    default: 'button',
  },
  // 是否为大按钮
  huge: {
    type: Boolean,
    default: false,
  },
  // 是否强制为大按钮，用于测试，不建议使用
  forceHuge: {
    type: Boolean,
    default: false,
  },
  // 按钮图标
  ico: {
    type: String,
    default: undefined,
  },
  // 按钮文字
  text: {
    type: String,
    default: '',
  },
  hideText: {
    type: Boolean,
    default: false,
  },
  // 文字提示
  tooltip: {
    type: [String, Boolean],
    default: undefined,
  },
  // 快捷键
  shortcut: {
    type: String,
    default: undefined,
  },
  shortcutText: {
    type: String,
    default: undefined,
  },
  // Dropdown,Select 相关
  selectOptions: {
    type: Array,
    default: undefined,
  },
  selectValue: {
    type: [String, Number],
    default: '',
  },
  // Popup 相关
  popupVisible: {
    type: Boolean,
    default: false,
  },
  popupHandle: {
    type: String,
    default: undefined,
  },
  // 菜单激活状态
  menuActive: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  forceEnabled: {
    type: Boolean,
    default: false,
  },
})
const emits = defineEmits(['toggle-popup', 'menu-click'])

const attrs = useAttrs()
const container = inject('container')
const editor = inject('editor')
const options = inject('options')
const $toolbar = useState('toolbar', options)
const menuClick = (...args) => {
  emits('menu-click', ...args)
  if (attrs.onMenuClickThrough) {
    attrs.onMenuClickThrough(...args)
  } else if (attrs.onMenuClick) {
    attrs.onMenuClick(...args)
  }
}

const tooltipVisible = ref(false)
let tooltipForceHide = ref(false)
const popupVisileChange = (visible) => {
  // 隐藏 Tooltip，适用于 select、dropdown、popup 等子组件展开时，隐藏 Tooltip
  tooltipForceHide = visible
}
const getTooltipContent = () => {
  if (props.tooltip === false) {
    return ''
  }
  if (props.huge && props.tooltip) {
    return `${props.tooltip}${props.shortcut ? ` (${getShortcut(props.shortcut)})` : ''}`
  }
  if (props.text) {
    return `${isString(props.tooltip) && props.tooltip ? props.tooltip : props.text}${props.shortcut ? ` (${getShortcut(props.shortcut)})` : ''}`
  }
  return ''
}

const tooltipContent = computed(() => getTooltipContent())
watch(
  () => props.popupVisible,
  (val) => {
    tooltipForceHide = val
  },
)

// Popup
const popupHandleRef = ref(null)
const popupContentRef = ref(null)
const togglePopup = (visible) => {
  emits('toggle-popup', visible)
}
onClickOutside(
  popupContentRef,
  () => {
    emits('toggle-popup', false)
  },
  {
    ignore: [popupHandleRef, '.kindy-popup'],
  },
)
</script>

<style lang="less" scoped>
.kindy-menu-button {
  --td-comp-paddingLR-s: 5px;
  --td-radius-default: var(--kindy-radius);
  border: none;
  &.show-text {
    width: auto;
    padding-left: var(--td-comp-paddingLR-s);
    padding-right: var(--td-comp-paddingLR-s);
    .kindy-button-content .kindy-button-text {
      display: block !important;
      margin-left: 3px;
    }
  }
  &[disabled] {
    .kindy-button-icon {
      --kindy-primary-color: var(--kindy-text-color-disabled);
      color: var(--kindy-text-color-disabled) !important;
    }
    .kindy-button-text {
      color: var(--kindy-text-color-disabled) !important;
    }
  }
  &-wrap {
    display: inline-flex;
    &:not(:last-child) {
      margin-right: 5px;
    }
  }
  &.active {
    background-color: var(--kindy-button-hover-background);
    .kindy-button-icon-arrow.kindy-button-handle {
      background-color: var(--kindy-color-hover-background);
    }
  }
  &:focus-visible {
    outline: 2px solid var(--kindy-primary-color);
    outline-offset: 1px;
    border-radius: var(--kindy-radius);
  }
  .kindy-button-content {
    display: flex;
    align-items: center;
    justify-content: center;
    .kindy-button-icon,
    :deep(.kindy-icon) {
      font-size: 16px;
    }
    .kindy-button-icon-svg {
      display: flex;
      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }
    .kindy-button-text {
      display: none;
    }
  }
  .kindy-button-icon-arrow {
    display: flex;
    border-top-right-radius: var(--td-radius-default);
    border-bottom-right-radius: var(--td-radius-default);
    width: 12px;
    height: 26px;
    align-items: center;
    justify-content: center;
    margin-right: -3px;
    .kindy-button-icon {
      font-size: 10px;
      color: var(--kindy-text-color-light);
    }
    &.kindy-button-handle {
      margin: 0 -4px 0 2px;
      &:hover {
        background-color: var(--td-bg-color-container-active);
      }
      &:focus-visible {
        outline: 2px solid var(--kindy-primary-color);
        outline-offset: -2px;
        border-radius: var(--kindy-radius);
      }
    }
  }
  &.huge {
    width: auto;
    padding: 0 var(--td-comp-paddingLR-s);
    height: 56px;
    margin-bottom: 0;
    flex-direction: column;
    .kindy-button-content {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      min-width: 32px;
      .kindy-button-icon {
        display: block;
        font-size: 24px;
        margin-top: 3px;
      }
      .kindy-button-icon-svg {
        display: flex;
        margin-top: 3px;
        :deep(svg) {
          width: 24px;
          height: 24px;
        }
      }
      .kindy-button-text {
        display: block;
        font-size: 12px;
        color: var(--kindy-text-color);
      }
      .kindy-button-icon-arrow {
        position: absolute;
        left: calc(50% + 12px);
        top: 2px;
      }
    }
    &:not(.show-text) {
      .kindy-button-content .kindy-button-text {
        display: none !important;
      }
    }
    &.has-arrow {
      .kindy-button-content {
        min-width: 40px;
      }
    }
  }
}
:global(.kindy-popup-content) {
  padding: var(--kindy-popup-content-padding);
}
</style>
