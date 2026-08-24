<template>
  <section
    class="kindy-library-shell"
    :class="[
      `kindy-library-shell--${density}`,
      { 'has-explorer': showExplorer && explorerOpen, 'has-versions': showVersions && versionsOpen },
    ]"
    :style="shellStyle"
    aria-label="Document library workspace"
  >
    <aside v-if="showExplorer" class="kindy-library-shell__explorer" :class="{ 'is-open': explorerOpen }">
      <slot name="explorer" />
    </aside>

    <section class="kindy-library-shell__workspace">
      <header v-if="showTopbar && $slots.topbar" class="kindy-library-shell__topbar">
        <slot name="topbar" />
      </header>
      <div class="kindy-library-shell__content">
        <slot />
      </div>
    </section>

    <aside v-if="showVersions" class="kindy-library-shell__versions" :class="{ 'is-open': versionsOpen }">
      <slot name="versions" />
    </aside>

    <button
      v-if="explorerOpen || versionsOpen"
      class="kindy-library-shell__scrim"
      type="button"
      aria-label="Close side panel"
      @click="$emit('close-panels')"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { KindyLibraryDensity } from '../../ui'

const props = withDefaults(defineProps<{
  density?: KindyLibraryDensity
  explorerWidth?: string
  versionsWidth?: string
  explorerOpen?: boolean
  versionsOpen?: boolean
  showExplorer?: boolean
  showVersions?: boolean
  showTopbar?: boolean
  theme?: Record<string, string>
}>(), {
  density: 'comfortable',
  explorerWidth: '300px',
  versionsWidth: '288px',
  explorerOpen: true,
  versionsOpen: true,
  showExplorer: true,
  showVersions: true,
  showTopbar: true,
  theme: () => ({}),
})

defineEmits<{ 'close-panels': [] }>()

const shellStyle = computed(() => ({
  ...props.theme,
  '--kindy-library-explorer-width': props.explorerWidth,
  '--kindy-library-versions-width': props.versionsWidth,
}))
</script>

<style scoped>
/* Shell owns layout only; child components own their visual details. */
.kindy-library-shell {
  position: relative;
  display: grid;
  grid-template-columns: 0 minmax(0, 1fr) 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 520px;
  overflow: hidden;
  background: var(--kindy-library-bg);
  color: var(--kindy-library-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.kindy-library-shell.has-explorer { grid-template-columns: var(--kindy-library-explorer-width) minmax(0, 1fr) 0; }
.kindy-library-shell.has-versions { grid-template-columns: 0 minmax(0, 1fr) var(--kindy-library-versions-width); }
.kindy-library-shell.has-explorer.has-versions { grid-template-columns: var(--kindy-library-explorer-width) minmax(0, 1fr) var(--kindy-library-versions-width); }
.kindy-library-shell__explorer,
.kindy-library-shell__versions,
.kindy-library-shell__workspace,
.kindy-library-shell__content { min-width: 0; min-height: 0; }
.kindy-library-shell__explorer,
.kindy-library-shell__versions { position: relative; z-index: 30; overflow: hidden; background: var(--kindy-library-sidebar-bg); }
.kindy-library-shell__workspace { container-type: inline-size; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
.kindy-library-shell__topbar { position: relative; z-index: 10; min-height: 58px; border-bottom: 1px solid var(--kindy-library-border); background: var(--kindy-library-surface); }
.kindy-library-shell__content { position: relative; z-index: 1; overflow: hidden; }
.kindy-library-shell__scrim { display: none; }

.kindy-library-shell--compact .kindy-library-shell__topbar { min-height: 48px; }

@media (max-width: 1024px) {
  .kindy-library-shell,
  .kindy-library-shell.has-explorer,
  .kindy-library-shell.has-versions,
  .kindy-library-shell.has-explorer.has-versions { grid-template-columns: minmax(0, 1fr); }

  .kindy-library-shell__explorer,
  .kindy-library-shell__versions {
    position: absolute;
    inset-block: 0;
    width: min(88vw, var(--kindy-library-explorer-width));
    box-shadow: var(--kindy-library-shadow);
    transition: transform 160ms ease;
  }
  .kindy-library-shell__explorer { inset-inline-start: 0; transform: translateX(-105%); }
  .kindy-library-shell__versions { inset-inline-end: 0; width: min(88vw, var(--kindy-library-versions-width)); transform: translateX(105%); }
  .kindy-library-shell__explorer.is-open,
  .kindy-library-shell__versions.is-open { transform: translateX(0); }
  .kindy-library-shell__scrim {
    position: absolute;
    z-index: 20;
    inset: 0;
    display: block;
    border: 0;
    background: rgb(15 23 42 / 32%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kindy-library-shell__explorer,
  .kindy-library-shell__versions { transition: none; }
}
</style>
