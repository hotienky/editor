/**
 * useDocument Hook
 *
 * Hook for document operations.
 *
 * Architecture: Framework Adapter — React
 */

import { useCallback } from 'react'
import { useEditor } from '../components/EditorProvider'

export function useDocument() {
  const { document, updateDocument, insertText, deleteText } = useEditor()

  const getText = useCallback(() => {
    return document?.toPlainText() || ''
  }, [document])

  const getWordCount = useCallback(() => {
    return document?.wordCount || 0
  }, [document])

  const getCharCount = useCallback(() => {
    return document?.charCount || 0
  }, [document])

  const getBlockCount = useCallback(() => {
    return document?.blockCount || 0
  }, [document])

  return {
    document,
    getText,
    getWordCount,
    getCharCount,
    getBlockCount,
    updateDocument,
    insertText,
    deleteText,
  }
}

export default useDocument
