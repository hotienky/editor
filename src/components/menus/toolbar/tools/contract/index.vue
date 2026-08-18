<template>
  <div class="kindy-contract-tools">
    <!-- Insert Variable -->
    <menus-button
      ico="edit"
      :text="t('tools.contract.insertVariable')"
      @menu-click="showVariableDialog = true"
    />

    <!-- Insert Clause -->
    <menus-button
      ico="file-text"
      :text="t('tools.contract.insertClause')"
      @menu-click="showClauseDialog = true"
    />

    <!-- Insert Signature Block -->
    <menus-button
      ico="signature"
      :text="t('tools.contract.insertSignature')"
      @menu-click="insertSignature"
    />

    <!-- Contract Templates -->
    <menus-button
      ico="template"
      :text="t('tools.contract.templates')"
      @menu-click="showTemplateDialog = true"
    />

    <!-- Fill Variables Dialog -->
    <modal
      :visible="showVariableDialog"
      :title="t('tools.contract.insertVariable')"
      @close="showVariableDialog = false"
      @confirm="insertVariable"
    >
      <t-form label-width="100px">
        <t-form-item :label="t('tools.contract.variableLabel')">
          <t-input v-model="variableForm.label" :placeholder="t('tools.contract.variableLabelPlaceholder')" />
        </t-form-item>
        <t-form-item :label="t('tools.contract.variableType')">
          <t-select v-model="variableForm.type">
            <t-option value="text" :label="t('tools.contract.typeText')" />
            <t-option value="date" :label="t('tools.contract.typeDate')" />
            <t-option value="number" :label="t('tools.contract.typeNumber')" />
            <t-option value="money" :label="t('tools.contract.typeMoney')" />
            <t-option value="party" :label="t('tools.contract.typeParty')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('tools.contract.required')">
          <t-checkbox v-model="variableForm.required" />
        </t-form-item>
      </t-form>
    </modal>

    <!-- Clause Library Dialog -->
    <modal
      :visible="showClauseDialog"
      :title="t('tools.contract.insertClause')"
      @close="showClauseDialog = false"
    >
      <div class="clause-library">
        <div
          v-for="clause in clauseLibrary"
          :key="clause.id"
          class="clause-item"
          @click="insertClause(clause)"
        >
          <span class="clause-category-badge" :class="`cat-${clause.category}`">
            {{ clause.category }}
          </span>
          <span class="clause-name">{{ clause.name }}</span>
        </div>
      </div>
    </modal>

    <!-- Templates Dialog -->
    <modal
      :visible="showTemplateDialog"
      :title="t('tools.contract.templates')"
      @close="showTemplateDialog = false"
    >
      <div class="template-grid">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-card"
          @click="applyTemplate(template)"
        >
          <div class="template-icon">
            <icon :name="template.icon" />
          </div>
          <div class="template-info">
            <div class="template-name">{{ template.name }}</div>
            <div class="template-name-vi">{{ template.nameVi }}</div>
            <div class="template-category">{{ template.category }}</div>
          </div>
        </div>
      </div>
    </modal>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { contractTemplates, clauseLibrary } from '@/extensions/contract/templates'

const editor = inject('editor')

const showVariableDialog = ref(false)
const showClauseDialog = ref(false)
const showTemplateDialog = ref(false)

const variableForm = ref({
  label: '',
  type: 'text',
  required: false,
})

const templates = contractTemplates

const insertVariable = () => {
  if (!variableForm.value.label) return

  editor.value?.chain().focus().insertContractVariable({
    label: variableForm.value.label,
    type: variableForm.value.type,
    required: variableForm.value.required,
  }).run()

  variableForm.value = { label: '', type: 'text', required: false }
  showVariableDialog.value = false
}

const insertClause = (clause) => {
  editor.value?.chain().focus().insertClause({
    id: clause.id,
    name: clause.name,
    category: clause.category,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: clause.content }],
      },
    ],
  }).run()

  showClauseDialog.value = false
}

const insertSignature = () => {
  editor.value?.chain().focus().insertSignatureBlock({
    partyName: '',
    partyTitle: '',
    signatureType: 'signature',
  }).run()
}

const applyTemplate = (template) => {
  // Clear current content and insert template
  editor.value?.commands.clearContent()
  editor.value?.commands.setContent({
    type: 'doc',
    content: template.content,
  })

  showTemplateDialog.value = false
}
</script>

<style lang="less">
.clause-library {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.clause-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--kindy-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--kindy-button-hover-background);
    border-color: var(--kindy-primary-color);
  }

  .clause-category-badge {
    display: inline-flex;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    min-width: 80px;
    justify-content: center;

    &.cat-general { background: #e2e8f0; color: #475569; }
    &.cat-payment { background: #d1fae5; color: #065f46; }
    &.cat-liability { background: #fee2e2; color: #991b1b; }
    &.cat-termination { background: #fef3c7; color: #92400e; }
    &.cat-ip { background: #ede9fe; color: #5b21b6; }
    &.cat-confidentiality { background: #dbeafe; color: #1e40af; }
    &.cat-dispute { background: #fce7f3; color: #9d174d; }
    &.cat-compliance { background: #ccfbf1; color: #134e4a; }
  }

  .clause-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--kindy-text-color);
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.template-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--kindy-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--kindy-button-hover-background);
    border-color: var(--kindy-primary-color);
    box-shadow: 0 2px 8px rgba(52, 128, 249, 0.1);
  }

  .template-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #e8f4fd;
    color: #1a73e8;
    flex-shrink: 0;
  }

  .template-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .template-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--kindy-text-color);
  }

  .template-name-vi {
    font-size: 11px;
    color: var(--kindy-text-color-light);
  }

  .template-category {
    font-size: 10px;
    color: var(--kindy-text-color-light);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}
</style>
