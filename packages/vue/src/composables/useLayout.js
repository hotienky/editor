/**
 * useLayout Composable
 *
 * Vue composable for layout operations.
 *
 * Architecture: Framework Adapter — Vue
 */

import { computed } from 'vue'
import { useEditor } from './useEditor'

export function useLayout() {
  const { layout, pageOptions, updatePageOptions } = useEditor()

  // ─── Computed ────────────────────────────────────────────────────────

  const totalPages = computed(() => layout.value?.totalPages || 0)
  const pages = computed(() => layout.value?.pages || [])

  const pageDimensions = computed(() => {
    const size = pageOptions.size || { width: 21, height: 29.7 }
    const orientation = pageOptions.orientation || 'portrait'

    return {
      width: orientation === 'landscape' ? size.height : size.width,
      height: orientation === 'landscape' ? size.width : size.height,
    }
  })

  return {
    layout,
    pageOptions,
    totalPages,
    pages,
    pageDimensions,
    updatePageOptions,
  }
}

export default useLayout
