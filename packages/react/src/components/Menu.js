/**
 * Menu Components
 *
 * React menu components for editor.
 *
 * Architecture: Framework Adapter — React
 */

import { useState, useRef, useEffect } from 'react'

export function Menu({ children, trigger, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className={`kindy-menu ${className}`} style={{ position: 'relative' }}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className="kindy-menu-content"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            minWidth: '200px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, label, onClick, disabled = false, shortcut }) {
  return (
    <button
      className="kindy-menu-item"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      {icon && <span className="kindy-menu-item-icon">{icon}</span>}
      <span className="kindy-menu-item-label" style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span className="kindy-menu-item-shortcut" style={{ color: '#999', fontSize: '12px' }}>
          {shortcut}
        </span>
      )}
    </button>
  )
}

export function MenuSeparator() {
  return (
    <div
      className="kindy-menu-separator"
      style={{
        height: '1px',
        margin: '4px 0',
        backgroundColor: '#e2e8f0',
      }}
    />
  )
}

export default {
  Menu,
  MenuItem,
  MenuSeparator,
}
