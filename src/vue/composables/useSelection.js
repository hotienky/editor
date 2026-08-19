/**
 * useSelection Composable
 *
 * Vue composable for selection operations.
 *
 * Architecture: Framework Adapter — Vue
 */

import { computed } from 'vue'
import { useEditor } from './useEditor'

export function useSelection() {
  const { selection, updateSelection } = useEditor()

  // ─── Computed ────────────────────────────────────────────────────────

  const isSelected = computed(() => selection.value !== null)

  const selectedText = computed(() => {
    // This would get the actual selected text from the editor
    return ''
  })

  return {
    selection,
    isSelected,
    selectedText,
    updateSelection,
  }
}

export default useSelection
