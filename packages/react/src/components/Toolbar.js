/**
 * Toolbar Component
 *
 * React toolbar component for editor actions.
 *
 * Architecture: Framework Adapter — React
 */

import { useEditor } from './EditorProvider'

export function Toolbar({ children, className = '', style = {} }) {
  return (
    <div
      className={`umo-toolbar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function ToolbarButton({ icon, label, onClick, disabled = false, active = false }) {
  return (
    <button
      className={`umo-toolbar-button ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: active ? '#e2e8f0' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon || label}
    </button>
  )
}

export function ToolbarGroup({ children, label }) {
  return (
    <div
      className="umo-toolbar-group"
      role="group"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '0 4px',
        borderRight: '1px solid #e2e8f0',
      }}
    >
      {children}
    </div>
  )
}

export default {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
}
