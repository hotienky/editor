<template>
  <menus-button
    ico="file-code"
    text="Google Docs AST"
    @menu-click="exportDocsAST"
  />
</template>

<script setup>
import { inject } from 'vue'
import { exportGoogleDocsAST } from '@/utils/docs-ast'
import { useDocumentTabs } from '@/composables/document-tabs'

const editor = inject('editor')
const { tabs } = useDocumentTabs(editor)

const exportDocsAST = () => {
  if (!editor.value) return
  const astData = exportGoogleDocsAST(editor.value, tabs.value)
  const jsonStr = JSON.stringify(astData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `google-docs-ast-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
