/**
 * usePlugin Hook
 *
 * Hook for plugin operations.
 *
 * Architecture: Framework Adapter — React
 */

import { useCallback } from 'react'
import { useEditor } from '../components/EditorProvider'

export function usePlugin() {
  const { registerPlugin, executeHook, pluginManager } = useEditor()

  const getPlugin = useCallback((pluginId) => {
    return pluginManager.get(pluginId)
  }, [pluginManager])

  const getAllPlugins = useCallback(() => {
    return pluginManager.getAll()
  }, [pluginManager])

  const enablePlugin = useCallback((pluginId) => {
    return pluginManager.enable(pluginId)
  }, [pluginManager])

  const disablePlugin = useCallback((pluginId) => {
    return pluginManager.disable(pluginId)
  }, [pluginManager])

  return {
    registerPlugin,
    getPlugin,
    getAllPlugins,
    enablePlugin,
    disablePlugin,
    executeHook,
  }
}

export default usePlugin
