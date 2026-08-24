/**
 * useFileOperations Composable
 *
 * File operations: save, export, import.
 *
 * Architecture: Product Layer — Editor Client
 */

import { ref } from 'vue'

export function useFileOperations() {
  // ─── State ──────────────────────────────────────────────────────────

  const isSaving = ref(false)
  const lastSavedAt = ref(null)

  // ─── Operations ──────────────────────────────────────────────────────

  const save = async (document) => {
    isSaving.value = true
    try {
      // Save to localStorage
      const data = JSON.stringify(document)
      localStorage.setItem('kindy-document', data)
      lastSavedAt.value = new Date().toISOString()

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      return { success: true }
    } catch (error) {
      console.error('Save failed:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  const load = () => {
    try {
      const data = localStorage.getItem('kindy-document')
      if (data) {
        return JSON.parse(data)
      }
      return null
    } catch (error) {
      console.error('Load failed:', error)
      return null
    }
  }

  const exportDocument = async (document, format = 'json') => {
    try {
      let content
      let filename
      let mimeType

      switch (format) {
        case 'json':
          content = JSON.stringify(document, null, 2)
          filename = 'document.json'
          mimeType = 'application/json'
          break

        case 'html':
          content = generateHTML(document)
          filename = 'document.html'
          mimeType = 'text/html'
          break

        case 'markdown':
          content = generateMarkdown(document)
          filename = 'document.md'
          mimeType = 'text/markdown'
          break

        case 'txt':
          content = generatePlainText(document)
          filename = 'document.txt'
          mimeType = 'text/plain'
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      // Create download
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      return { success: true, filename }
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  }

  const importDocument = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target.result
          let document

          if (file.name.endsWith('.json')) {
            document = JSON.parse(content)
          } else if (file.name.endsWith('.html')) {
            document = { content, type: 'html' }
          } else if (file.name.endsWith('.md')) {
            document = { content, type: 'markdown' }
          } else {
            document = { content, type: 'text' }
          }

          resolve(document)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  const generateHTML = (document) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${document.title || 'Document'}</title>
</head>
<body>
  ${document.content || ''}
</body>
</html>`
  }

  const generateMarkdown = (document) => {
    return `# ${document.title || 'Document'}

${document.content || ''}`
  }

  const generatePlainText = (document) => {
    return `${document.title || 'Document'}

${document.content || ''}`
  }

  // ─── Return ──────────────────────────────────────────────────────────

  return {
    isSaving,
    lastSavedAt,
    save,
    load,
    exportDocument,
    importDocument,
  }
}

export default useFileOperations
