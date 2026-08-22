/**
 * useDocument Composable
 *
 * Vue composable for document operations.
 *
 * Architecture: Framework Adapter — Vue
 */

import { computed } from 'vue'
import { useEditor } from './useEditor'

export function useDocument() {
  const { document, updateDocument, insertText, deleteText } = useEditor()

  // ─── Computed ────────────────────────────────────────────────────────

  const text = computed(() => document.value?.toPlainText() || '')
  const wordCount = computed(() => document.value?.wordCount || 0)
  const charCount = computed(() => document.value?.charCount || 0)
  const blockCount = computed(() => document.value?.blockCount || 0)

  return {
    document,
    text,
    wordCount,
    charCount,
    blockCount,
    updateDocument,
    insertText,
    deleteText,
  }
}

export default useDocument
