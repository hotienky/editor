<template>
  <div ref="wraperRef" class="kindy-scrollable-container">
    <button
      v-if="!hidePrev"
      class="kindy-scrollable-control scrollable-left"
      type="button"
      aria-label="Previous toolbar controls"
      @click="scrollLeft"
    >
      <icon name="arrow-down" />
    </button>
    <div
      ref="contentRef"
      class="kindy-scrollable-content"
      @scroll.passive="checkScrollPosition"
      @wheel.passive="wheelScroll"
    >
      <slot />
    </div>
    <button
      v-if="!hideNext"
      class="kindy-scrollable-control scrollable-right"
      type="button"
      aria-label="Next toolbar controls"
      @click="scrollRight"
    >
      <icon name="arrow-down" />
    </button>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
const wraperRef = ref(null)
const contentRef = ref(null)
const hidePrev = ref(true)
const hideNext = ref(true)

const checkScrollPosition = () => {
  const content = contentRef.value
  if (!content) return
  const { scrollLeft = 0, scrollWidth = 0, clientWidth = 0 } = content
  hidePrev.value = scrollLeft <= 1
  hideNext.value = scrollLeft + clientWidth >= scrollWidth - 1
}

const scrollLeft = () => {
  const content = contentRef.value
  if (!content) return
  content.scrollBy({ left: -(content.clientWidth - 48 || 100), behavior: 'smooth' })
}

const scrollRight = () => {
  const content = contentRef.value
  if (!content) return
  content.scrollBy({ left: content.clientWidth - 48 || 100, behavior: 'smooth' })
}

// 监听父元素大小变化
useResizeObserver(wraperRef, async () => {
  await nextTick()
  checkScrollPosition()
})

// 支持鼠标滚轮滚动
const wheelScroll = (e) => {
  const content = contentRef.value
  if (!content || content.scrollWidth <= content.clientWidth) return
  content.scrollLeft += e.deltaX || e.deltaY
}

// 更新
const update = () => {
  if (contentRef.value) {
    contentRef.value.scrollLeft = 0
  }
  void nextTick(checkScrollPosition)
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
    width: 28px;
    height: 28px;
    padding: 0;
    box-shadow: 0 1px 5px rgb(15 23 42 / 16%);
    &:hover {
      border-color: var(--kindy-primary-color);
      background-color: var(--kindy-primary-color);
      color: var(--kindy-color-white);
    }
    &.scrollable-left {
      left: 6px;
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
        left: 27px;
        top: 0;
        bottom: 0;
        width: 30px;
        pointer-events: none;
      }
    }
    &.scrollable-right {
      right: 6px;
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
        right: 27px;
        top: 0;
        bottom: 0;
        width: 30px;
        pointer-events: none;
      }
    }
  }
  .kindy-scrollable-content {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
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
