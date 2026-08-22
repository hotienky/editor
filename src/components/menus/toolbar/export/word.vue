<template>
  <menus-button ico="word" text="Word (.docx)" huge @menu-click="saveWordFile" />
</template>

<script setup>
import saveAs from 'file-saver'
import { exportDocx } from '@/codecs'
import { createEmptyDocumentState } from '@/core/state'

const editor = inject('editor')
const options = inject('options')
const pageOptions = inject('page')

function currentState() {
  const {value} = pageOptions
  return createEmptyDocumentState({
    content: editor.value.getJSON(),
    page: {
      size: value.size ? { width: value.size.width, height: value.size.height } : undefined,
      orientation: value.orientation,
      margin: value.margin,
      background: value.background,
      watermark: value.watermark,
      header: { enabled: Boolean(value.header?.enable), text: value.header?.text || value.header?.leftText || '' },
      footer: { enabled: Boolean(value.footer?.enable), text: value.footer?.text || value.footer?.leftText || '' },
    },
  })
}

async function saveWordFile() {
  if (!editor.value) return
  let output
  try {
    output = await exportDocx(currentState(), { mode: 'strict' })
  } catch (error) {
    if (error?.code !== 'DOCX_UNSUPPORTED') throw error
    const details = error.details?.issues?.map((issue) => `• ${issue.message}`).join('\n') || error.message
    if (!window.confirm(`Tài liệu có nội dung ngoài Kindy DOCX profile:\n\n${details}\n\nTiếp tục export best-effort?`)) return
    output = await exportDocx(currentState(), { mode: 'best-effort' })
  }
  const title = options.value.document?.title || t('document.untitled')
  saveAs(output.blob, `${title.replace(/\.docx$/i, '')}.docx`)
}
</script>
