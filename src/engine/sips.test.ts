import { describe, expect, it } from 'vitest'
import { loserSips, sips31 } from './sips'
import { DEFAULT_RULES } from './types'

describe('loserSips', () => {
  it('zonder mex drinkt de verliezer het standaard aantal', () => {
    expect(loserSips(DEFAULT_RULES, 0)).toBe(2)
  })

  it('verdubbelt de inzet per mex', () => {
    expect(loserSips(DEFAULT_RULES, 1)).toBe(4)
    expect(loserSips(DEFAULT_RULES, 3)).toBe(16)
  })

  it('tiebreak-verdubbeling stapelt op de mex-multiplier', () => {
    expect(loserSips(DEFAULT_RULES, 2, 2)).toBe(16)
    expect(loserSips(DEFAULT_RULES, 0, 4)).toBe(8)
  })

  it('respecteert een ander standaard aantal slokken', () => {
    expect(loserSips({ ...DEFAULT_RULES, standaardSlokken: 4 }, 0)).toBe(4)
  })
})

describe('sips31', () => {
  it('deelt het standaard aantal slokken uit', () => {
    expect(sips31(DEFAULT_RULES)).toBe(2)
    expect(sips31({ ...DEFAULT_RULES, standaardSlokken: 4 })).toBe(4)
  })
})
