import { describe, expect, it } from 'vitest'

import {
  getRulerLabelInterval,
  shouldShowRulerLabel,
} from '../ruler'

describe('responsive ruler labels', () => {
  it('shows every centimetre at normal zoom', () => {
    expect(getRulerLabelInterval(96 / 2.54)).toBe(1)
  })

  it('reduces label density without changing the physical tick grid', () => {
    const interval = getRulerLabelInterval((96 / 2.54) * 0.2)
    expect(interval).toBe(3)
    expect(shouldShowRulerLabel(3, interval)).toBe(true)
    expect(shouldShowRulerLabel(4, interval)).toBe(false)
  })
})
