/**
 * useUmoEditor Composable
 *
 * Main composable for the UMO Editor.
 *
 * Architecture: Product Layer — Editor Client
 */

import { ref, reactive, computed, watch } from 'vue'
import { createDocument, createEmptyDocument } from '@umo/document'
import { LayoutEngine } from '@umo/layout'
import { getPluginManager } from '@umo/plugin'

export function useUmoEditor(config = {}) {
  // ─── State ──────────────────────────────────────────────────────────

  const document = ref(
    config.document ? createDocument(config.document) : createEmptyDocument(),
  )

  const selection = ref(null)
  const layout = ref(null)

  const pageOptions = reactive({
    size: config.pageOptions?.size || { width: 21, height: 29.7, format: 'a4' },
    orientation: config.pageOptions?.orientation || 'portrait',
    margin: config.pageOptions?.margin || {
      top: 2.54,
      right: 2.54,
      bottom: 2.54,
      left: 2.54,
    },
  })

  // ─── Engine Instances ────────────────────────────────────────────────

  const layoutEngine = new LayoutEngine()
  const pluginManager = getPluginManager()

  // ─── Document Operations ─────────────────────────────────────────────

  const updateDocument = (newDoc) => {
    document.value = newDoc

    // Re-compute layout
    const layoutResult = layoutEngine.compute(newDoc.children, pageOptions)
    layout.value = layoutResult
  }

  const insertText = (text) => {
    console.log('Insert text:', text)
  }

  const deleteText = (from, to) => {
    console.log('Delete text:', from, to)
  }

  // ─── Selection Operations ────────────────────────────────────────────

  const updateSelection = (newSelection) => {
    selection.value = newSelection
  }

  // ─── Page Operations ─────────────────────────────────────────────────

  const updatePageOptions = (newOptions) => {
    Object.assign(pageOptions, newOptions)

    // Re-compute layout with new options
    const layoutResult = layoutEngine.compute(document.value.children, pageOptions)
    layout.value = layoutResult
  }

  // ─── Plugin Operations ───────────────────────────────────────────────

  const registerPlugin = (plugin) => {
    pluginManager.register(plugin)
  }

  const executeHook = async (hookName, context) => {
    return pluginManager.executeHook(hookName, context)
  }

  // ─── Computed ────────────────────────────────────────────────────────

  const totalPages = computed(() => layout.value?.totalPages || 0)
  const pages = computed(() => layout.value?.pages || [])

  // ─── Return ──────────────────────────────────────────────────────────

  return {
    // State
    document,
    selection,
    layout,
    pageOptions,

    // Computed
    totalPages,
    pages,

    // Document operations
    updateDocument,
    insertText,
    deleteText,

    // Selection operations
    updateSelection,

    // Page operations
    updatePageOptions,

    // Plugin operations
    registerPlugin,
    executeHook,

    // Engine instances
    layoutEngine,
    pluginManager,
  }
}

export default useUmoEditor
