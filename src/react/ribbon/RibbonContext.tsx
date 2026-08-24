import React, { createContext, useContext } from 'react'
import type { RibbonContextValue } from './types'

const RibbonContext = createContext<RibbonContextValue | null>(null)

export const RibbonProvider: React.FC<{
  value: RibbonContextValue
  children: React.ReactNode
}> = ({ value, children }) => {
  return (
    <RibbonContext.Provider value={value}>{children}</RibbonContext.Provider>
  )
}

export function useRibbon(): RibbonContextValue {
  const context = useContext(RibbonContext)
  if (!context) {
    throw new Error('useRibbon must be used within a RibbonProvider')
  }
  return context
}
