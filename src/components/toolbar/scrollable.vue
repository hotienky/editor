<template>
  <div ref="wraperRef" class="kindy-scrollable-container">
    <div
      v-if="!hidePrev"
      class="kindy-scrollable-control scrollable-left"
      @click="scrollLeft"
    >
      <icon name="arrow-down" />
    </div>
    <div
      ref="contentRef"
      class="kindy-scrollable-content"
      @scroll.passive="checkScrollPosition"
      @wheel.passive="wheelScroll"
    >
      <slot />
    </div>
    <div
      v-if="!hideNext"
      class="kindy-scrollable-control scrollable-right"
      @click="scrollRight"
    >
      <icon name="arrow-down" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue'
const wraperRef = ref(null)
const contentRef = ref(null)
let hidePrev = ref(true)
let hideNext = ref(true)

const checkScrollPosition = () => {
  const { scrollLeft = 0, scrollWidth = 0, clientWidth = 0 } = contentRef || {}
  hidePrev = scrollLeft === 0
  hideNext = scrollLeft + clientWidth + 20 >= scrollWidth
}

const scrollLeft = () => {
  contentRef.scrollLeft -= contentRef.offsetWidth - 10 || 100
}

const scrollRight = () => {
  contentRef.scrollLeft += contentRef.offsetWidth - 10 || 100
}

// 监听父元素大小变化
useResizeObserver(wraperRef, () => {
  checkScrollPosition()
})

// 支持鼠标滚轮滚动
const wheelScroll = (e) => {
  e.deltaY < 0 ? scrollLeft() : scrollRight()
}

// 更新
const update = () => {
  if (contentRef) {
    contentRef.scrollLeft = 0
  }
  hideNext = true
  checkScrollPosition()
}

defineExpose({
  update,
})
</script>

<style lang="less" scoped>
.kindy-scrollable-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  .kindy-scrollable-control {
    display: flex;
    align-items: center;
    justify-content: center;
    border: solid 1px var(--kindy-border-color);
    border-radius: var(--kindy-radius);
    cursor: pointer;
    color: var(--kindy-text-color-light);
    overflow: visible;
    background-color: var(--kindy-button-hover-background);
    z-index: 10;
    font-size: 20px;
    box-sizing: border-box;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: calc(100% - 20px);
    &:hover {
      border-color: var(--kindy-primary-color);
      background-color: var(--kindy-primary-color);
      color: var(--kindy-color-white);
    }
    &.scrollable-left {
      left: 10px;
      :deep(.kindy-icon) {
        transform: rotate(90deg);
      }
      &::before {
        display: block;
        content: '';
        background: linear-gradient(
          to left,
          transparent,
          var(--kindy-color-white)
        );
        position: absolute;
        left: 21px;
        top: 0;
        bottom: 0;
        width: 30px;
        pointer-events: none;
      }
    }
    &.scrollable-right {
      right: 10px;
      :deep(.kindy-icon) {
        transform: rotate(-90deg);
      }
      &::before {
        display: block;
        content: '';
        background: linear-gradient(
          to right,
          transparent,
          var(--kindy-color-white)
        );
        position: absolute;
        right: 21px;
        top: 0;
        bottom: 0;
        width: 30px;
        pointer-events: none;
      }
    }
  }
  .kindy-scrollable-content {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    flex: 1;
    &::-webkit-scrollbar {
      display: none;
    }
  }
}
</style>

<style lang="less">
.kindy-skin-modern {
  &.toolbar-ribbon {
    .kindy-scrollable-container {
      padding: 10px 15px 2px 15px !important;
    }
    .kindy-scrollable-control {
      height: calc(100% - 32px) !important;
      margin-top: 4px;
    }
  }
  &.toolbar-classic {
    .kindy-scrollable-container {
      padding: 15px 15px 2px 15px !important;
    }
    .kindy-scrollable-control {
      height: calc(100% - 38px) !important;
      margin-top: 6px;
    }
  }
  .kindy-scrollable-content {
    border-radius: 6px;
    background-color: var(--kindy-color-white);
    padding: 10px 0 10px 10px;
    box-shadow:
      0 0 0 1px hsla(0, 0%, 5%, 0.04),
      0 2px 5px hsla(0, 0%, 5%, 0.06);
    &:hover {
      box-shadow:
        0 0 0 1px hsla(0, 0%, 5%, 0.06),
        0 2px 5px hsla(0, 0%, 5%, 0.1);
    }
  }
  .kindy-scrollable-control {
    border-radius: 5px !important;
    &.scrollable-left {
      left: 25px !important;
    }
    &.scrollable-right {
      right: 25px !important;
    }
  }
}
[theme-mode='dark'] .kindy-skin-modern .kindy-scrollable-content {
  outline: solid 1px var(--kindy-border-color-light);
}
</style>
