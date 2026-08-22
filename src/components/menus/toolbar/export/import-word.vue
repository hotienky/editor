<template>
  <menus-button ico="word" text="Import Word (.docx)" huge @menu-click="fileInputRef?.click()" />
  <input ref="fileInputRef" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden @change="handleFileChange">
</template>

<script setup>
import { importDocxInWorker } from '@/codecs'

const editor = inject('editor')
const pageOptions = inject('page')
const fileInputRef = ref(null)

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file || !editor.value) return
  try {
    const converted = await importDocxInWorker(file, { mode: 'best-effort' })
    if (converted.report.issues.length) {
      const details = converted.report.issues.map((issue) => `• ${issue.message}`).join('\n')
      if (!window.confirm(`DOCX có tính năng ngoài Kindy compatibility profile:\n\n${details}\n\nTiếp tục import best-effort?`)) return
    }
    editor.value.commands.setContent(converted.state.content)
    if (pageOptions?.value) {
      pageOptions.value.margin = converted.state.page.margin
      pageOptions.value.orientation = converted.state.page.orientation
      pageOptions.value.background = converted.state.page.background
    }
  } catch (error) {
    console.error('[kindy-editor] DOCX import failed:', error)
  } finally { event.target.value = '' }
}
</script>
