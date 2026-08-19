<template>
  <t-dialog
    v-model:visible="visible"
    :header="t('preferences.title')"
    width="min(520px, 92vw)"
    :footer="false"
  >
    <div class="kindy-preferences-dialog">
      <div class="pref-section">
        <h4>{{ t('preferences.smartQuotes.sectionTitle') }}</h4>
        <t-checkbox v-model="smartQuotes">
          {{ t('preferences.smartQuotes.enableLabel') }}
        </t-checkbox>
        <p class="pref-tip">
          {{ t('preferences.smartQuotes.tip') }}
        </p>
      </div>

      <t-divider />

      <div class="pref-section">
        <h4>{{ t('preferences.autoSubstitutions.sectionTitle') }}</h4>
        <t-table
          row-key="shortcut"
          :data="substitutionsData"
          :columns="columns"
          size="small"
          bordered
        />
      </div>
    </div>
  </t-dialog>
</template>

<script setup>
import { ref } from 'vue'

const visible = defineModel('visible', { type: Boolean, default: false })
const smartQuotes = ref(true)

const columns = [
  { colKey: 'shortcut', title: t('preferences.autoSubstitutions.shortcutLabel'), width: '120px' },
  { colKey: 'replacement', title: t('preferences.autoSubstitutions.replacementLabel'), width: '120px' },
  { colKey: 'description', title: t('preferences.autoSubstitutions.descriptionLabel') },
]

const substitutionsData = [
  { shortcut: '-->', replacement: '→', description: t('preferences.autoSubstitutions.arrowRight') },
  { shortcut: '<--', replacement: '←', description: t('preferences.autoSubstitutions.arrowLeft') },
  { shortcut: '(c)', replacement: '©', description: t('preferences.autoSubstitutions.copyright') },
  { shortcut: '(r)', replacement: '®', description: t('preferences.autoSubstitutions.registered') },
  { shortcut: '(tm)', replacement: '™', description: t('preferences.autoSubstitutions.trademark') },
  { shortcut: '1/2', replacement: '½', description: t('preferences.autoSubstitutions.half') },
  { shortcut: '1/4', replacement: '¼', description: t('preferences.autoSubstitutions.quarter') },
  { shortcut: '3/4', replacement: '¾', description: t('preferences.autoSubstitutions.threeQuarters') },
]
</script>

<style lang="less" scoped>
.kindy-preferences-dialog {
  padding: 8px 0;

  .pref-section {
    display: flex;
    flex-direction: column;
    gap: 8px;

    h4 {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--kindy-text-color-light);
      margin: 0;
    }

    .pref-tip {
      font-size: 12px;
      color: var(--kindy-text-color-light);
      margin: 4px 0 0;

      code {
        background: var(--kindy-content-code-background);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
    }
  }
}
</style>
