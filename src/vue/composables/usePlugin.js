/**
 * usePlugin Composable
 *
 * Vue composable for plugin operations.
 *
 * Architecture: Framework Adapter — Vue
 */

import { computed } from 'vue'
import { useEditor } from './useEditor'

export function usePlugin() {
  const { registerPlugin, executeHook, pluginManager } = useEditor()

  // ─── Operations ──────────────────────────────────────────────────────

  const getPlugin = (pluginId) => {
    return pluginManager.get(pluginId)
  }

  const getAllPlugins = () => {
    return pluginManager.getAll()
  }

  const enablePlugin = (pluginId) => {
    return pluginManager.enable(pluginId)
  }

  const disablePlugin = (pluginId) => {
    return pluginManager.disable(pluginId)
  }

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
