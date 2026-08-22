/**
 * useLayout Hook
 *
 * Hook for layout operations.
 *
 * Architecture: Framework Adapter — React
 */

import { useCallback } from 'react'
import { useEditor } from '../components/EditorProvider'

export function useLayout() {
  const { layout, pageOptions, updatePageOptions } = useEditor()

  const getTotalPages = useCallback(() => {
    return layout?.totalPages || 0
  }, [layout])

  const getPages = useCallback(() => {
    return layout?.pages || []
  }, [layout])

  const getPageDimensions = useCallback(() => {
    const size = pageOptions.size || { width: 21, height: 29.7 }
    const orientation = pageOptions.orientation || 'portrait'

    return {
      width: orientation === 'landscape' ? size.height : size.width,
      height: orientation === 'landscape' ? size.width : size.height,
    }
  }, [pageOptions])

  return {
    layout,
    pageOptions,
    getTotalPages,
    getPages,
    getPageDimensions,
    updatePageOptions,
  }
}

export default useLayout
