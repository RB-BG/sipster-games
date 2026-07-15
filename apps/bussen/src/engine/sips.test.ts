// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { bluffPenalty, busSips, pyramidSips, questionSips } from './sips'
import { DEFAULT_RULES } from './types'

describe('questionSips', () => {
  it('vraag N is N+1 slokken waard', () => {
    expect(questionSips(DEFAULT_RULES, 0)).toBe(1)
    expect(questionSips(DEFAULT_RULES, 1)).toBe(2)
    expect(questionSips(DEFAULT_RULES, 2)).toBe(3)
    expect(questionSips(DEFAULT_RULES, 3)).toBe(4)
  })
  it('schaalt met de basiseenheid', () => {
    expect(questionSips({ ...DEFAULT_RULES, standaardSlokken: 2 }, 3)).toBe(8)
  })
})

describe('pyramidSips', () => {
  it('is de rij-waarde maal de basiseenheid', () => {
    expect(pyramidSips(DEFAULT_RULES, 1)).toBe(1)
    expect(pyramidSips(DEFAULT_RULES, 5)).toBe(5)
    expect(pyramidSips({ ...DEFAULT_RULES, standaardSlokken: 3 }, 4)).toBe(12)
  })
})

describe('bluffPenalty', () => {
  it('verdubbelt de inzet', () => {
    expect(bluffPenalty(3)).toBe(6)
  })
})

describe('busSips', () => {
  it('is gelijk aan de kaartpositie waar je fout gokt', () => {
    expect(busSips(DEFAULT_RULES, 1)).toBe(1)
    expect(busSips(DEFAULT_RULES, 2)).toBe(2)
    expect(busSips({ ...DEFAULT_RULES, standaardSlokken: 2 }, 3)).toBe(6)
  })
})
