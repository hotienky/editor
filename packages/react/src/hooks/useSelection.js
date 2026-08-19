/**
 * useSelection Hook
 *
 * Hook for selection operations.
 *
 * Architecture: Framework Adapter — React
 */

import { useCallback } from 'react'
import { useEditor } from '../components/EditorProvider'

export function useSelection() {
  const { selection, updateSelection } = useEditor()

  const getSelection = useCallback(() => {
    return selection
  }, [selection])

  const isSelected = useCallback(() => {
    return selection !== null
  }, [selection])

  const getSelectedText = useCallback(() => {
    // This would get the actual selected text from the editor
    return ''
  }, [])

  return {
    selection,
    getSelection,
    isSelected,
    getSelectedText,
    updateSelection,
  }
}

export default useSelection
