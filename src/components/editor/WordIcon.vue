<template>
  <svg
    class="word-svg-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Save / Disk -->
    <template v-if="name === 'save'">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </template>

    <!-- Undo -->
    <template v-else-if="name === 'undo'">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </template>

    <!-- Redo -->
    <template v-else-if="name === 'redo'">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </template>

    <!-- Print -->
    <template v-else-if="name === 'print'">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </template>

    <!-- Search -->
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </template>

    <!-- Paste -->
    <template v-else-if="name === 'paste'">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14h6" />
      <path d="M9 18h6" />
      <path d="M9 10h2" />
    </template>

    <!-- Cut -->
    <template v-else-if="name === 'cut'">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </template>

    <!-- Copy -->
    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </template>

    <!-- Format Painter -->
    <template v-else-if="name === 'painter'">
      <path d="M19 11V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7" />
      <path d="M3 11h16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3z" />
      <path d="M11 16v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-6" />
    </template>

    <!-- Bold -->
    <template v-else-if="name === 'bold'">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </template>

    <!-- Italic -->
    <template v-else-if="name === 'italic'">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </template>

    <!-- Underline -->
    <template v-else-if="name === 'underline'">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </template>

    <!-- Strikeout -->
    <template v-else-if="name === 'strikeout'">
      <path d="M17.3 4.9c-.8-.6-2-1-3.3-1-3.3 0-5 2-5 4.5 0 2.2 1.5 3.5 3.8 4.1" />
      <path d="M16 16.5c-.7.6-1.7.9-2.8.9-3.2 0-5.2-1.9-5.2-4.5" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </template>

    <!-- Align Left -->
    <template v-else-if="name === 'align-left'">
      <line x1="17" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="17" y1="18" x2="3" y2="18" />
    </template>

    <!-- Align Center -->
    <template v-else-if="name === 'align-center'">
      <line x1="18" y1="10" x2="6" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="18" y1="18" x2="6" y2="18" />
    </template>

    <!-- Align Right -->
    <template v-else-if="name === 'align-right'">
      <line x1="21" y1="10" x2="7" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="7" y2="18" />
    </template>

    <!-- Align Justify -->
    <template v-else-if="name === 'align-justify'">
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="10" x2="3" y2="10" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="3" y2="18" />
    </template>

    <!-- Bullet List -->
    <template v-else-if="name === 'list-bullet'">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </template>

    <!-- Ordered List -->
    <template v-else-if="name === 'list-ordered'">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h2v-4" />
      <path d="M4 10h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4h3" />
      <path d="M4 16h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4" />
    </template>

    <!-- Indent -->
    <template v-else-if="name === 'indent'">
      <line x1="21" y1="6" x2="11" y2="6" />
      <line x1="21" y1="12" x2="11" y2="12" />
      <line x1="21" y1="18" x2="11" y2="18" />
      <polyline points="3 8 7 12 3 16" />
    </template>

    <!-- Outdent -->
    <template v-else-if="name === 'outdent'">
      <line x1="21" y1="6" x2="11" y2="6" />
      <line x1="21" y1="12" x2="11" y2="12" />
      <line x1="21" y1="18" x2="11" y2="18" />
      <polyline points="7 8 3 12 7 16" />
    </template>

    <!-- Table -->
    <template v-else-if="name === 'table'">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </template>

    <!-- Image -->
    <template v-else-if="name === 'image'">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </template>

    <!-- Page Break -->
    <template v-else-if="name === 'page-break'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="2" y1="13" x2="22" y2="13" stroke-dasharray="3 3" />
    </template>

    <!-- Divider -->
    <template v-else-if="name === 'divider'">
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
    </template>

    <!-- Hyperlink -->
    <template v-else-if="name === 'link'">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </template>

    <!-- Control Text -->
    <template v-else-if="name === 'control-text'">
      <path d="M4 7V4h16v3" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </template>

    <!-- Control Date -->
    <template v-else-if="name === 'control-date'">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </template>

    <!-- Control Select -->
    <template v-else-if="name === 'control-select'">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="15 10 17 12 19 10" />
      <line x1="7" y1="12" x2="12" y2="12" />
    </template>

    <!-- Checkbox -->
    <template v-else-if="name === 'checkbox'">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </template>

    <!-- Watermark -->
    <template v-else-if="name === 'watermark'">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </template>

    <!-- Comment -->
    <template v-else-if="name === 'comment'">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
    </template>

    <!-- Ruler -->
    <template v-else-if="name === 'ruler'">
      <path d="M2 12h20" />
      <path d="M6 12v-3" />
      <path d="M10 12v-2" />
      <path d="M14 12v-3" />
      <path d="M18 12v-2" />
      <rect x="2" y="8" width="20" height="8" rx="1" />
    </template>

    <!-- Fullscreen -->
    <template v-else-if="name === 'fullscreen'">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </template>

    <!-- TOC / Catalog -->
    <template v-else-if="name === 'catalog'">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </template>

    <!-- Typesetting Magic Wand -->
    <template v-else-if="name === 'typesetting'">
      <path d="M15 4V2m0 16v-2m8-6h-2M4 12H2m15.07-7.07l-1.41 1.41M5.34 16.66l-1.41 1.41m0-14.14l1.41 1.41m11.32 11.32l1.41 1.41" />
      <path d="m9 9 5 5" />
    </template>

    <!-- Default File -->
    <template v-else>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </template>
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    size?: number | string
    strokeWidth?: number | string
  }>(),
  {
    size: 16,
    strokeWidth: 2
  }
)
</script>

<style scoped>
.word-svg-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
