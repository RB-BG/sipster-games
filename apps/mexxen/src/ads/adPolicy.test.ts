// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { createAdPolicy } from '@sipster/core/adPolicy'

const config = {
  everyNRounds: 2,
  minSecondsBetween: 45,
  maxPerSession: 6,
  firstEligibleRound: 2,
}

/** Verse store per test, zodat de tellers niet lekken. */
function policy() {
  return createAdPolicy(config).getState
}

describe('adPolicy', () => {
  it('toont niets in de eerste rondes', () => {
    const p = policy()
    expect(p().mayShow(1, 1000)).toBe(false)
    expect(p().mayShow(2, 1000)).toBe(true)
  })

  it('toont niet twee keer voor dezelfde ronde', () => {
    const p = policy()
    expect(p().mayShow(2, 1000)).toBe(true)
    p().markShown(2, 1000)
    expect(p().mayShow(2, 2000)).toBe(false)
  })

  it('respecteert everyNRounds', () => {
    const p = policy()
    p().markShown(2, 1000)
    // Ronde 3 valt tussen twee ad-momenten in.
    expect(p().mayShow(3, 999_000)).toBe(false)
    // Ronde 4 zit weer op het ritme (en ruim na de rustperiode).
    expect(p().mayShow(4, 999_000)).toBe(true)
  })

  it('respecteert de minimale rust tussen ads', () => {
    const p = policy()
    p().markShown(2, 1000)
    // 1s later: te snel.
    expect(p().mayShow(4, 2000)).toBe(false)
    // 45s later: mag.
    expect(p().mayShow(4, 46_000)).toBe(true)
  })

  it('respecteert de bovengrens per potje', () => {
    const p = policy()
    for (let i = 0; i < config.maxPerSession; i++) {
      // Even rondes, telkens ruim uit elkaar in de tijd.
      p().markShown(2 + i * 2, (i + 1) * 100_000)
    }
    expect(p().mayShow(100, 10_000_000)).toBe(false)
  })

  it('reset geeft een nieuw potje weer ruimte', () => {
    const p = policy()
    p().markShown(2, 1000)
    p().reset()
    expect(p().mayShow(2, 2000)).toBe(true)
  })
})
