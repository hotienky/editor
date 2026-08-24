<template>
  <div class="demo-shell">
    <header class="demo-header">
      <div>
        <strong>Kindy Document Library SDK v2</strong>
        <span>Memory adapter · autosave 5s · không có backend</span>
      </div>
      <div class="demo-actions">
        <span
          v-if="benchmarkResult"
          id="benchmark-result"
          :data-typing-samples="benchmarkResult.typingSamples?.join(',') || ''"
        >
          {{ benchmarkResult.editorReadyMs }}ms · {{ benchmarkResult.measuredPages }} trang
          <template v-if="benchmarkResult.typingP95Ms"> · typing p95 {{ benchmarkResult.typingP95Ms }}ms</template>
          <template v-if="benchmarkResult.paginationMs"> · paginate {{ benchmarkResult.paginationMs }}ms</template>
        </span>
        <span id="demo-status" :class="`status-${status.type}`">{{ status.text }}</span>
        <button id="download-sample-docx" type="button" @click="downloadSampleDocx">Tải DOCX mẫu để test import</button>
      </div>
    </header>

    <KindyDocumentLibrary
      ref="library"
      :adapter="adapter"
      :autosave="autosaveOptions"
      :state-sync-delay="benchmarkPages ? 500 : 300"
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
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import saveAs from 'file-saver'
import KindyDocumentLibrary from './components/library/DocumentLibrary.vue'
import { exportDocx } from './codecs'
import { createMemoryDocumentAdapter } from './core/adapters/memory'
import { createEmptyDocumentState } from './core/state'
import { createLongDocumentFixture } from './performance/long-document'

const now = new Date().toISOString()
const sampleLogoPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const contractState = createEmptyDocumentState({
  content: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [{ type: 'text', text: 'HỢP ĐỒNG NGUYÊN TẮC', marks: [{ type: 'bold' }] }] },
      { type: 'paragraph', attrs: { textAlign: 'justify', lineHeight: 1.5 }, content: [
        { type: 'text', text: 'Hôm nay, các bên thống nhất ký kết hợp đồng với các nội dung sau.', marks: [{ type: 'textStyle', attrs: { fontFamily: 'Times New Roman', fontSize: '13pt' } }] },
      ] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Điều 1. Phạm vi hợp tác' }] },
      { type: 'orderedList', attrs: { start: 1 }, content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cung cấp dịch vụ theo phụ lục.' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bảo đảm chất lượng và tiến độ.' }] }] },
      ] },
      { type: 'paragraph', attrs: { textAlign: 'center' }, content: [
        { type: 'inlineImage', attrs: { id: 'sample-contract-logo', src: sampleLogoPng, width: 96, height: 48, alt: 'Logo hợp đồng mẫu', title: 'Logo hợp đồng mẫu', inline: true, uploaded: true } },
      ] },
      { type: 'table', content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BÊN A' }] }] },
          { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BÊN B' }] }] },
        ] },
        { type: 'tableRow', content: [
          { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nguyễn Văn A' }] }] },
          { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trần Văn B' }] }] },
        ] },
      ] },
    ],
  },
})

const templateState = createEmptyDocumentState({
  content: { type: 'doc', content: [
    { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [{ type: 'text', text: 'BIÊN BẢN THỎA THUẬN' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Mã tài liệu: [MÃ_TÀI_LIỆU]' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Nội dung thỏa thuận: [NHẬP_NỘI_DUNG]' }] },
  ] },
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

const benchmarkQuery = new URLSearchParams(location.search)
const benchmarkPages = Math.max(0, Number(benchmarkQuery.get('benchmarkPages')) || 0)
const benchmarkVariant = benchmarkQuery.get('benchmarkVariant') || 'text'
const benchmarkSnapshot = benchmarkPages
  ? snapshot('benchmark-long-document', `Benchmark ${benchmarkPages} trang · ${benchmarkVariant}`, createLongDocumentFixture({ pages: benchmarkPages, variant: benchmarkVariant }), { folderId: 'contracts', tags: ['benchmark', benchmarkVariant] })
  : null
const autosaveOptions = benchmarkPages
  ? { enabled: false, delay: 30_000 }
  : { enabled: true, delay: 5_000 }

const adapter = createMemoryDocumentAdapter({
  folders: [{ id: 'contracts', name: 'Hợp đồng', parentId: null }, { id: 'templates', name: 'Biểu mẫu', parentId: null }],
  documents: [
    snapshot('demo-contract', 'Hợp đồng nguyên tắc', contractState, { folderId: 'contracts', tags: ['hợp đồng', 'demo'] }),
    snapshot('demo-template', 'Mẫu biên bản thỏa thuận', templateState, { folderId: 'templates', isTemplate: true }),
    ...(benchmarkSnapshot ? [benchmarkSnapshot] : []),
  ],
})

const library = ref(null)
const status = ref({ text: 'Chọn tài liệu bên trái để bắt đầu', type: 'neutral' })
const benchmarkResult = ref(null)
const benchmarkInputLatencies = []
let benchmarkEditorDom = null
let benchmarkInputHandler = null
const theme = {
  '--kindy-library-sidebar-bg': '#ffffff',
  '--kindy-library-bg': '#eef2f7',
  '--kindy-library-selection': '#e0f2fe',
}
function setStatus(text, type = 'neutral') { status.value = { text, type } }
function handleError(error) {
  console.error(error)
  setStatus(error?.message || String(error), 'error')
}
function handleReady() {
  setStatus(benchmarkPages ? 'Đang hoàn tất pagination benchmark…' : 'Editor sẵn sàng', benchmarkPages ? 'pending' : 'success')
}
onMounted(async () => {
  if (!benchmarkSnapshot) return
  await nextTick()
  const startedAt = performance.now()
  await library.value?.openDocument?.(benchmarkSnapshot.document)
  const editorReadyMs = performance.now() - startedAt
  const editorInstance = library.value?.getEditor?.()?.useEditor?.()
  benchmarkEditorDom = editorInstance?.view?.dom || null
  if (benchmarkEditorDom) {
    benchmarkInputHandler = () => {
      const inputStartedAt = performance.now()
      requestAnimationFrame(() => requestAnimationFrame(() => {
        benchmarkInputLatencies.push(performance.now() - inputStartedAt)
        const ordered = [...benchmarkInputLatencies].sort((a, b) => a - b)
        const p95Index = Math.max(0, Math.ceil(ordered.length * 0.95) - 1)
        const p95 = ordered[p95Index]
        const pagination = editorInstance?.storage?.pagination
        benchmarkResult.value = {
          ...benchmarkResult.value,
          typingP95Ms: Number(p95.toFixed(1)),
          typingMedianMs: Number(ordered[Math.floor(ordered.length * 0.5)].toFixed(1)),
          typingMaxMs: Number(ordered[ordered.length - 1].toFixed(1)),
          typingSamples: benchmarkInputLatencies.map((value) => Number(value.toFixed(1))),
          paginationMs: Number((pagination?.lastDurationMs || 0).toFixed(1)),
          measurementCache: pagination?.measurementCache?.stats?.(),
        }
      }))
    }
    benchmarkEditorDom.addEventListener('beforeinput', benchmarkInputHandler)
  }
  const waitForPagination = async () => {
    const timeoutAt = performance.now() + 8_000
    let measuredPages = 1
    while (performance.now() < timeoutAt) {
      measuredPages = library.value?.getEditor?.()?.useEditor?.()?.storage?.pagination?.totalPages || 1
      if (measuredPages >= benchmarkPages) break
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const result = {
      requestedPages: benchmarkPages,
      variant: benchmarkVariant,
      measuredPages,
      editorReadyMs: Number(editorReadyMs.toFixed(1)),
      paginationReadyMs: Number((performance.now() - startedAt).toFixed(1)),
      paginationMs: Number((library.value?.getEditor?.()?.useEditor?.()?.storage?.pagination?.lastDurationMs || 0).toFixed(1)),
    }
    benchmarkResult.value = result
    window.__KINDY_BENCHMARK__ = result
    console.table(result)
    setStatus(`Benchmark hoàn tất ${result.paginationReadyMs}ms`, 'success')
  }
  void waitForPagination()
})
onBeforeUnmount(() => {
  if (benchmarkEditorDom && benchmarkInputHandler) benchmarkEditorDom.removeEventListener('beforeinput', benchmarkInputHandler)
})
async function downloadSampleDocx() {
  try {
    const output = await exportDocx(contractState)
    saveAs(output.blob, 'kindy-docx-profile-sample.docx')
    setStatus('Đã tạo DOCX OOXML mẫu', 'success')
  } catch (error) { handleError(error) }
}
</script>

<style>
html, body, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; }
body { min-width: 280px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.demo-shell { display: grid; grid-template-rows: auto minmax(0, 1fr); width: 100%; height: 100%; min-width: 0; }
.demo-header { display: flex; min-width: 0; min-height: 54px; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 16px; border-bottom: 1px solid #dbe3ec; background: #0f172a; color: #fff; }
.demo-header > div:first-child { display: grid; gap: 2px; }
.demo-header strong, .demo-header span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.demo-header span { font-size: 12px; color: #a5b4c7; }
.demo-actions { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 12px; }
.demo-actions button { cursor: pointer; border: 1px solid #38bdf8; border-radius: 6px; background: #0284c7; padding: 7px 11px; color: #fff; font-weight: 600; }
#demo-status.status-success { color: #86efac; }
#demo-status.status-pending { color: #fde68a; }
#demo-status.status-warning { color: #fdba74; }
#demo-status.status-error { color: #fca5a5; }
@media (max-width: 820px) {
  .demo-header { min-height: 48px; padding: 6px 10px; }
  .demo-header > div:first-child span,
  #benchmark-result,
  #download-sample-docx { display: none; }
  .demo-actions { flex: 0 1 auto; }
  #demo-status { max-width: 32vw; }
}
@media (max-width: 480px) {
  .demo-header { gap: 8px; padding-inline: 8px; }
  .demo-header > div:first-child { min-width: 0; }
  .demo-header strong { font-size: 13px; }
  #demo-status { max-width: 34vw; font-size: 10px; }
}
</style>
