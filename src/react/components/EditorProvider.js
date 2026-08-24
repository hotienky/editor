/**
 * EditorProvider
 *
 * React context provider for the editor.
 * Manages editor state and provides it to child components.
 *
 * Architecture: Framework Adapter — React
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { createDocument, createEmptyDocument } from '@kindy/document'
import { LayoutEngine } from '@kindy/layout'
import { getPluginManager } from '@kindy/plugin'

// ─── Editor Context ────────────────────────────────────────────────────────

const EditorContext = createContext(null)

// ─── Editor Provider ───────────────────────────────────────────────────────

export function EditorProvider({ children, config = {} }) {
  // ─── State ──────────────────────────────────────────────────────────

  const [document, setDocument] = useState(() => {
    return config.document ? createDocument(config.document) : createEmptyDocument()
  })

  const [selection, setSelection] = useState(null)
  const [layout, setLayout] = useState(null)
  const [pageOptions, setPageOptions] = useState(config.pageOptions || {})

  // ─── Engine Instances ────────────────────────────────────────────────

  const layoutEngine = useMemo(() => new LayoutEngine(), [])
  const pluginManager = useMemo(() => getPluginManager(), [])

  // ─── Document Operations ─────────────────────────────────────────────

  const updateDocument = useCallback((newDoc) => {
    setDocument(newDoc)

    // Re-compute layout
    const layoutResult = layoutEngine.compute(newDoc.children, pageOptions)
    setLayout(layoutResult)
  }, [layoutEngine, pageOptions])

  const insertText = useCallback((text) => {
    // This would use the editor commands
    console.log('Insert text:', text)
  }, [])

  const deleteText = useCallback((from, to) => {
    // This would use the editor commands
    console.log('Delete text:', from, to)
  }, [])

  // ─── Selection Operations ────────────────────────────────────────────

  const updateSelection = useCallback((newSelection) => {
    setSelection(newSelection)
  }, [])

  // ─── Page Operations ─────────────────────────────────────────────────

  const updatePageOptions = useCallback((newOptions) => {
    setPageOptions(prev => {
      const updated = { ...prev, ...newOptions }

      // Re-compute layout with new options
      const layoutResult = layoutEngine.compute(document.children, updated)
      setLayout(layoutResult)

      return updated
    })
  }, [layoutEngine, document])

  // ─── Plugin Operations ───────────────────────────────────────────────

  const registerPlugin = useCallback((plugin) => {
    pluginManager.register(plugin)
  }, [pluginManager])

  const executeHook = useCallback(async (hookName, context) => {
    return pluginManager.executeHook(hookName, context)
  }, [pluginManager])

  // ─── Context Value ───────────────────────────────────────────────────

  const value = useMemo(() => ({
    // State
    document,
    selection,
    layout,
    pageOptions,

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
  }), [
    document,
    selection,
    layout,
    pageOptions,
    updateDocument,
    insertText,
    deleteText,
    updateSelection,
    updatePageOptions,
    registerPlugin,
    executeHook,
    layoutEngine,
    pluginManager,
  ])

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

// ─── useEditor Hook ────────────────────────────────────────────────────────

/**
 * Hook to access editor context
 * @returns {Object} Editor context
 */
export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}

export default {
  EditorProvider,
  useEditor,
}
