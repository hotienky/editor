<template>
  <section
    ref="shellElement"
    class="kindy-library-shell"
    :class="`kindy-library-shell--${density}`"
    :style="shellStyle"
    aria-label="Document library workspace"
  >
    <section class="kindy-library-shell__workspace">
      <header v-if="showTopbar && $slots.topbar" class="kindy-library-shell__topbar">
        <slot name="topbar" />
      </header>
      <div class="kindy-library-shell__content">
        <slot />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { KindyLibraryDensity } from '../../ui'

const props = withDefaults(defineProps<{
  density?: KindyLibraryDensity
  showTopbar?: boolean
  theme?: Record<string, string>
}>(), {
  density: 'comfortable',
  showTopbar: true,
  theme: () => ({}),
})

const shellElement = ref<HTMLElement | null>(null)

const shellStyle = computed(() => ({
  ...props.theme,
}))
</script>

<style scoped>
.kindy-library-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--kindy-library-bg, #f8f9fa);
  color: var(--kindy-library-text, #1f2937);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.kindy-library-shell__workspace {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.kindy-library-shell__topbar {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--kindy-library-border, #e2e8f0);
  background: var(--kindy-library-surface, #ffffff);
}

.kindy-library-shell__content {
  flex: 1;
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-width: 0;
}
</style>
