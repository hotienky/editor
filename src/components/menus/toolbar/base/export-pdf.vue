<template>
  <menus-button
    :text="buttonText"
    ico="file-pdf"
    shortcut="Ctrl+Shift+P"
    :disabled="editor?.isEmpty"
    huge
    @menu-click="onExportPdf"
  >
  </menus-button>
</template>

<script setup>
import { computed, inject } from "vue"
import { exportDocumentToPdf } from "@/codecs/pdf"

const editor = inject("editor")
const container = inject("container")
const { t } = useI18n()

const buttonText = computed(() => t("export.pdf") || "Xuất PDF")

const onExportPdf = async () => {
  const containerEl = document.querySelector(container || ".kindy-editor-container, .kindy-main")
  try {
    await exportDocumentToPdf(containerEl, { filename: "document.pdf" })
  } catch (err) {
    console.error("PDF export error:", err)
  }
}
</script>
