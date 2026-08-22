/**
 * Viewport Components
 *
 * React viewport components for document display.
 *
 * Architecture: Framework Adapter — React
 */

import { useRef, useEffect, useState } from 'react'
import { useEditor } from './EditorProvider'

export function ViewportContainer({ children, className = '', style = {} }) {
  const containerRef = useRef(null)
  const { layout } = useEditor()

  return (
    <div
      ref={containerRef}
      className={`umo-viewport ${className}`}
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#f1f5f9',
        ...style,
      }}
    >
      <div
        className="umo-viewport-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '20px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function PageView({ page, pageOptions, className = '', style = {} }) {
  const { pageNumber, contentHeight } = page
  const size = pageOptions.size || { width: 21, height: 29.7 }
  const orientation = pageOptions.orientation || 'portrait'

  const pageWidth = orientation === 'landscape' ? size.height : size.width
  const pageHeight = orientation === 'landscape' ? size.width : size.height

  return (
    <div
      className={`umo-page ${className}`}
      data-page={pageNumber}
      style={{
        width: `${pageWidth}cm`,
        minHeight: `${pageHeight}cm`,
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderRadius: '2px',
        position: 'relative',
        ...style,
      }}
    >
      <div
        className="umo-page-content"
        style={{
          padding: `${pageOptions.margin?.top || 2.54}cm ${pageOptions.margin?.right || 2.54}cm ${pageOptions.margin?.bottom || 2.54}cm ${pageOptions.margin?.left || 2.54}cm`,
          minHeight: `${pageHeight - (pageOptions.margin?.top || 2.54) - (pageOptions.margin?.bottom || 2.54)}cm`,
        }}
      >
        {/* Page content will be rendered here */}
      </div>
    </div>
  )
}

export default {
  ViewportContainer,
  PageView,
}
