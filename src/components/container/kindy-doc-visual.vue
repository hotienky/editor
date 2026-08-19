<template>
  <div class="kindy-doc-visual-container">
    <!-- TOP TOOLBAR -->
    <div class="kindy-doc-visual-toolbar">
      <div class="toolbar-brand">
        <icon name="file" />
        <span>KindyDoc Engine 2.0 (Visual UI)</span>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-actions">
        <t-button size="small" theme="primary" @click="addParagraph">
          <template #icon><icon name="text" /></template>
          + Paragraph
        </t-button>
        <t-button size="small" theme="primary" variant="outline" @click="addHeading">
          <template #icon><icon name="heading" /></template>
          + Heading (H1)
        </t-button>
        <t-button size="small" theme="default" variant="outline" @click="addTable">
          <template #icon><icon name="table" /></template>
          + Table
        </t-button>
        <t-button size="small" theme="default" variant="outline" @click="addPageBreak">
          <template #icon><icon name="page-break" /></template>
          + Page Break
        </t-button>
        <t-button size="small" theme="default" variant="outline" @click="triggerUndo">
          <template #icon><icon name="undo" /></template>
          Undo (Ctrl+Z)
        </t-button>
        <t-button size="small" theme="danger" variant="outline" @click="clearDoc">
          <template #icon><icon name="delete" /></template>
          Reset
        </t-button>
      </div>
      <div class="toolbar-stats">
        <t-tag theme="success" variant="light">Pages: {{ layoutResult.totalPages }}</t-tag>
        <t-tag theme="warning" variant="light">Nodes: {{ totalNodesCount }}</t-tag>
      </div>
    </div>

    <!-- MAIN BODY -->
    <div class="kindy-doc-visual-body">
      <!-- CENTER A4 PAPER CANVAS -->
      <div class="kindy-doc-canvas-area">
        <div
          v-for="page in layoutResult.pages"
          :key="page.pageNumber"
          class="kindy-doc-a4-page"
        >
          <div class="page-header-mark">HEADER: KindyDoc Operating System (A4 Page {{ page.pageNumber }})</div>
          
          <div class="page-content-area">
            <div
              v-for="(block, idx) in page.blocks"
              :key="block.id || idx"
              class="kindy-doc-block-node"
              :class="`type-${block.type}`"
            >
              <template v-if="block.type === 'heading'">
                <h2 contenteditable="true" class="editable-node" @input="onInlineEdit($event, block)">{{ getBlockText(block) }}</h2>
              </template>

              <template v-else-if="block.type === 'table'">
                <table class="kindy-visual-table">
                  <thead>
                    <tr>
                      <th contenteditable="true">Col 1</th>
                      <th contenteditable="true">Col 2</th>
                      <th contenteditable="true">Col 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td contenteditable="true">Data 1.1</td>
                      <td contenteditable="true">Data 1.2</td>
                      <td contenteditable="true">Data 1.3</td>
                    </tr>
                  </tbody>
                </table>
              </template>

              <template v-else-if="block.type === 'pageBreak'">
                <div class="kindy-page-break-line">--- PAGE BREAK ---</div>
              </template>

              <template v-else>
                <p contenteditable="true" class="editable-node" @input="onInlineEdit($event, block)">{{ getBlockText(block) }}</p>
              </template>
            </div>
          </div>

          <div class="page-footer-mark">FOOTER — Page {{ page.pageNumber }} / {{ layoutResult.totalPages }}</div>
        </div>
      </div>

      <!-- RIGHT SIDEBAR INSPECTOR -->
      <div class="kindy-doc-inspector-sidebar">
        <t-tabs v-model="activeTab">
          <t-tab-panel value="ast" label="AST JSON Tree">
            <pre class="kindy-ast-json">{{ JSON.stringify(astJson, null, 2) }}</pre>
          </t-tab-panel>
          <t-tab-panel value="tree" label="Document Tree">
            <div class="kindy-tree-list">
              <div v-for="node in flattenedNodes" :key="node.id" class="kindy-tree-item" :style="{ paddingLeft: (node.depth * 16) + 'px' }">
                <span class="node-type">{{ node.type }}</span>
                <span class="node-id">#{{ node.id }}</span>
                <span v-if="node.text" class="node-preview">"{{ node.text }}"</span>
              </div>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DocumentModel, CommandEngine, InsertTextCommand } from '../../../packages/document-core/index.js'
import { LayoutEngine } from '../../../packages/layout-engine/index.js'

const activeTab = ref('ast')
const docModel = ref(new DocumentModel({ title: 'Visual KindyDoc' }))
const cmdEngine = ref(new CommandEngine(docModel.value))
const layoutEngine = new LayoutEngine()

const layoutResult = computed(() => {
  return layoutEngine.computeLayout(docModel.value)
})

const astJson = computed(() => {
  return docModel.value.toJSON()
})

const getBlockText = (block) => {
  if (block.inlines) {
    return block.inlines.map((i) => i.value || '').join('')
  }
  return block.text || ''
}

const onInlineEdit = (event, block) => {
  const text = event.target.innerText
  if (block.inlines && block.inlines.length > 0) {
    block.inlines[0].value = text
  } else {
    block.inlines = [{ type: 'text', value: text }]
  }
}

const totalNodesCount = computed(() => {
  let count = 0
  for (const s of docModel.value.sections) {
    count += s.blocks.length
  }
  return count
})

const flattenedNodes = computed(() => {
  const list = []
  list.push({ id: 'doc-root', type: 'document', depth: 0 })
  for (const s of docModel.value.sections) {
    list.push({ id: s.id, type: 'section', depth: 1 })
    for (const b of s.blocks) {
      list.push({ id: b.id, type: b.type, depth: 2, text: getBlockText(b) })
    }
  }
  return list
})

const addParagraph = () => {
  const [section] = docModel.value.sections
  section.blocks.push({
    id: `block-${Date.now()}`,
    type: 'paragraph',
    inlines: [
      {
        type: 'text',
        value: `Đoạn văn mới được thêm trực quan vào KindyDoc Engine vào lúc ${new Date().toLocaleTimeString()}!`,
      },
    ],
  })
}

const addHeading = () => {
  const [section] = docModel.value.sections
  section.blocks.push({
    id: `block-${Date.now()}`,
    type: 'heading',
    inlines: [
      {
        type: 'text',
        value: `Tiêu đề H1 - ${new Date().toLocaleTimeString()}`,
      },
    ],
  })
}

const addTable = () => {
  const [section] = docModel.value.sections
  section.blocks.push({
    id: `block-${Date.now()}`,
    type: 'table',
    inlines: [],
  })
}

const addPageBreak = () => {
  const [section] = docModel.value.sections
  section.blocks.push({
    id: `block-${Date.now()}`,
    type: 'pageBreak',
    inlines: [],
  })
}

const triggerUndo = () => {
  cmdEngine.value.undo()
}

const clearDoc = () => {
  docModel.value = new DocumentModel({ title: 'Visual KindyDoc' })
  cmdEngine.value = new CommandEngine(docModel.value)
}
</script>

<style scoped>
.kindy-doc-visual-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #f1f5f9;
}

.kindy-doc-visual-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #0f172a;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #cbd5e1;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-stats {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.kindy-doc-visual-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.kindy-doc-canvas-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  background: #e2e8f0;
}

.kindy-doc-a4-page {
  width: 21cm;
  min-height: 29.7cm;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 2.5cm;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.page-header-mark {
  font-size: 11px;
  color: #94a3b8;
  border-bottom: 1px dashed #cbd5e1;
  padding-bottom: 6px;
  margin-bottom: 16px;
}

.page-content-area {
  flex: 1;
}

.page-footer-mark {
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px dashed #cbd5e1;
  padding-top: 6px;
  margin-top: 16px;
  text-align: center;
}

.kindy-doc-block-node {
  margin-bottom: 12px;
}

.type-heading h2 {
  font-size: 20px;
  color: #0284c7;
  margin: 0;
}

.type-paragraph p {
  font-size: 14px;
  color: #334155;
  margin: 0;
  line-height: 1.6;
}

.kindy-visual-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}

.kindy-visual-table th, .kindy-visual-table td {
  border: 1px solid #cbd5e1;
  padding: 6px 10px;
  font-size: 13px;
}

.kindy-visual-table th {
  background: #f8fafc;
}

.kindy-page-break-line {
  border-top: 2px dashed #ef4444;
  color: #ef4444;
  font-size: 11px;
  text-align: center;
  margin: 16px 0;
}

.kindy-doc-inspector-sidebar {
  width: min(380px, 85vw);
  background: var(--kindy-color-white);
  border-left: 1px solid #e2e8f0;
  padding: 12px;
  overflow-y: auto;
}

.kindy-ast-json {
  font-family: monospace;
  font-size: 11px;
  background: #0f172a;
  color: #38bdf8;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}

.kindy-tree-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}

.kindy-tree-item {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-type {
  font-weight: 700;
  color: #0284c7;
}

.node-id {
  color: #64748b;
}

.node-preview {
  color: #334155;
  font-style: italic;
}
</style>
