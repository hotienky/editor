/**
 * UMOEditor Component
 *
 * Main editor component for React.
 * Renders the document with pagination and editing capabilities.
 *
 * Architecture: Framework Adapter — React
 */

import { useRef, useEffect, useCallback } from 'react'
import { useEditor } from './EditorProvider'
import { ViewportContainer } from './ViewportContainer'
import { PageView } from './PageView'

// ─── UMOEditor Component ───────────────────────────────────────────────────

export function UMOEditor({ className = '', style = {} }) {
  const {
    document,
    layout,
    pageOptions,
    updateDocument,
    updateSelection,
  } = useEditor()

  const containerRef = useRef(null)

  // ─── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Initialize editor
    if (containerRef.current) {
      // Setup event listeners
      const container = containerRef.current

      const handleSelectionChange = () => {
        const selection = window.getSelection()
        if (selection.rangeCount > 0) {
          updateSelection({
            anchor: selection.anchorOffset,
            focus: selection.focusOffset,
          })
        }
      }

      container.addEventListener('selectionchange', handleSelectionChange)

      return () => {
        container.removeEventListener('selectionchange', handleSelectionChange)
      }
    }
  }, [updateSelection])

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`umo-editor ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <ViewportContainer>
        {layout?.pages?.map((page) => (
          <PageView
            key={page.pageNumber}
            page={page}
            pageOptions={pageOptions}
          />
        ))}
      </ViewportContainer>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

export const editorStyles = `
.umo-editor {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
}

.umo-editor:focus {
  outline: none;
}
`

export default {
  UMOEditor,
  editorStyles,
}
