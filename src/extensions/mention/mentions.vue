<template>
  <div ref="popupRef" class="kindy-popup kindy-mention-popup">
    <div class="kindy-popup__content kindy-dropdown">
      <div class="kindy-dropdown__menu" style="padding: 5px; max-height: 320px">
        <div v-if="isLoading" class="kindy-mention-popup-empty">
          <icon name="loading" class="kindy-mention-popup-loading-icon" />
          <span>{{ t('mention.loading') }}</span>
        </div>
        <div v-else-if="items.length === 0" class="kindy-mention-popup-empty">
          <span>{{ t('mention.noResult') }}</span>
        </div>
        <div v-else>
          <li
            v-for="(item, index) in items"
            :key="`${item.id || item.label || 'mention'}-${index}`"
            class="kindy-dropdown__item kindy-dropdown__item--theme-default kindy-dropdown__item kindy-mention-popup-item"
            :class="{ 'kindy-dropdown__item--active': index === selectedIndex }"
            @click="selectItem(index)"
          >
            <div class="kindy-mention-popup-item-content">
              <t-avatar
                class="kindy-mention-popup-item-avatar"
                shape="circle"
                size="20px"
                :style="{ borderColor: item.color || 'transparent' }"
                :image="item.avatar"
              >
                {{ item.label?.slice(0, 1) }}
              </t-avatar>
              <span class="kindy-mention-popup-item-name">{{
                item.label
              }}</span>
            </div>
            <span v-if="item.bio" class="kindy-mention-popup-item-bio">
              ({{ item.bio }})
            </span>
          </li>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  command: {
    type: Function,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

let selectedIndex = $ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex = 0
  },
)

const onKeyDown = ({ event }) => {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }

  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }

  if (event.key === 'Enter') {
    if (props.items.length === 0) {
      return false
    }
    enterHandler()
    return true
  }

  return false
}

const upHandler = () => {
  if (props.items.length === 0) {
    return
  }
  selectedIndex = (selectedIndex + props.items.length - 1) % props.items.length
}

const downHandler = () => {
  if (props.items.length === 0) {
    return
  }
  selectedIndex = (selectedIndex + 1) % props.items.length
}

const enterHandler = () => {
  selectItem(selectedIndex)
}

const selectItem = (index) => {
  const item = props.items[index]

  if (item) {
    props.command(item)
  }
}

defineExpose({
  onKeyDown,
})
</script>

<style lang="less">
.kindy-node-mention {
  box-decoration-break: clone;
  color: var(--kindy-primary-color);
  padding: 0.1em 0.3em;
  margin: 0;
  border-radius: 0.2em;
  white-space: nowrap;
  cursor: default;
  display: inline-block;
}
.kindy-mention-popup {
  width: max-content;
  max-width: 720px;

  .kindy-popup__content {
    width: 100%;
    max-width: inherit;
  }

  .kindy-dropdown {
    &__menu {
      width: 100%;
      max-width: inherit;
      box-sizing: border-box;
      padding: 8px !important;
      border-radius: var(--kindy-radius);
    }
    &__item {
      max-width: unset !important;
    }
    &__item--active {
      font-weight: 600;
    }
  }
  &-item {
    width: 100%;
    display: flex;
    gap: 5px;
    padding: 3px 6px !important;
    &:not(:last-child) {
      margin-bottom: 2px;
    }
    &-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    &-avatar {
      border-width: 1px;
      border-style: solid;
      border-radius: 50%;
      flex-shrink: 0;
      color: var(--kindy-text-color);
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
      background-color: rgba(0, 0, 0, 0.05);
    }
    &-name {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &-bio {
      flex: 0 1 220px;
      min-width: 0;
      max-width: 220px;
      font-size: 12px;
      color: var(--kindy-text-color-light);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  &-empty {
    padding: 3px 5px;
    min-width: 100px;
    color: var(--kindy-text-color-light);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  &-loading-icon {
    animation: rotating 1s linear infinite;
    font-size: 14px;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
