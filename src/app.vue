<template>
  <div class="kindy-app-container">
    <KindyDocumentLibrary
      ref="library"
      :adapter="adapter"
      :autosave="autosaveOptions"
      :state-sync-delay="300"
      :theme="theme"
      locale="vi-VN"
      @ready="handleReady"
      @opened="payload => setStatus(`Đã mở: ${payload.document.title}`, 'success')"
      @changed="setStatus('Có thay đổi chưa lưu…', 'pending')"
      @save-started="setStatus('Đang autosave…', 'pending')"
      @saved="setStatus('Đã lưu revision mới', 'success')"
      @version-restored="setStatus('Đã khôi phục phiên bản', 'success')"
      @compatibility-warning="setStatus('DOCX có compatibility warning', 'warning')"
      @error="handleError"
    />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import KindyDocumentLibrary from './components/library/DocumentLibrary.vue'
import { createMemoryDocumentAdapter } from './core/adapters/memory'
import { createEmptyDocumentState } from './core/state'

const now = new Date().toISOString()
const sampleLogoPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const contractState = createEmptyDocumentState({
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign: 'center' },
        content: [
          {
            type: 'text',
            text: '- Căn cứ Bộ Luật Dân Sự số 91/2015/QH13;\n- Căn cứ Luật Thương Mại số 36/2005/QH11;\n- Căn cứ vào nhu cầu và khả năng của hai bên.',
            marks: [{ type: 'italic' }],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hôm nay, ngày 14 tháng 04 năm 2026, chúng tôi gồm có:\n\n' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'BÊN A (BÊN MUA):\n', marks: [{ type: 'bold' }] },
          { type: 'text', text: '- Đại diện: Ông {Nguyễn Văn A}    Chức vụ: {Giám Đốc}\n- Địa chỉ: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh\n\n' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'BÊN B (BÊN BÁN): CÔNG TY CỔ PHẦN TẬP ĐOÀN DAT\n',
            marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { backgroundColor: '#fef08a' } }],
          },
          { type: 'text', text: '- Đại diện: Ông LÊ QUỐC ANH    Chức vụ: Phó Tổng Giám Đốc\n- Địa chỉ: 12 Đồng Hưng Thuận 10, P. Đông Hưng Thuận, TP. Hồ Chí Minh' },
        ],
      },
    ],
  },
})

function snapshot(id, title, state, options = {}) {
  const revisionId = `rev-${id}-1`
  const version = { id: `version-${id}-1`, documentId: id, number: 1, revisionId, reason: options.isTemplate ? 'template' : 'create', createdAt: now }
  const document = {
    id, title, fileName: `${title}.docx`, folderId: options.folderId || null, tags: options.tags || [],
    currentVersionId: version.id, currentRevisionId: revisionId, isTemplate: Boolean(options.isTemplate),
    createdAt: now, updatedAt: now,
    capabilities: { view: true, edit: !options.isTemplate, comment: true, review: true, download: true, restore: true, manage: true },
  }
  return { document, state, revisionId, version }
}

const contractDoc = snapshot('demo-contract', 'Tài liệu hợp đồng kinh tế', contractState, { folderId: 'contracts', tags: ['hợp đồng', 'demo'] })

const autosaveOptions = { enabled: true, delay: 5_000 }

const adapter = createMemoryDocumentAdapter({
  folders: [{ id: 'contracts', name: 'Hợp đồng', parentId: null }],
  documents: [contractDoc],
})

const library = ref(null)
const status = ref({ text: 'Sẵn sàng', type: 'success' })
const theme = {
  '--kindy-library-sidebar-bg': '#ffffff',
  '--kindy-library-bg': '#f8f9fa',
  '--kindy-library-selection': '#e0f2fe',
}

function setStatus(text, type = 'neutral') { status.value = { text, type } }
function handleError(error) {
  console.error(error)
  setStatus(error?.message || String(error), 'error')
}
function handleReady() {
  setStatus('Editor sẵn sàng', 'success')
}

onMounted(async () => {
  await nextTick()
  // Automatically open the sample contract document on load
  await library.value?.openDocument?.(contractDoc.document)
})
</script>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #f8f9fa;
  color: #1f2937;
}
.kindy-app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
