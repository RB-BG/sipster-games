// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { flipTarget, forwardTo, restingRotation } from './dealAnim'

describe('forwardTo', () => {
  it('draait altijd vooruit (>= huidige hoek)', () => {
    expect(forwardTo(0, 0, 1)).toBeGreaterThanOrEqual(0)
    expect(forwardTo(200, 0, 1)).toBeGreaterThan(200)
  })
  it('landt op de rusthoek modulo 360', () => {
    expect(forwardTo(200, 0, 1) % 360).toBe(0)
    expect(forwardTo(90, 180, 2) % 360).toBe(180)
  })
})

describe('flipTarget', () => {
  it('landt op de juiste kant en is deterministisch per seed', () => {
    const a = flipTarget(0, true, 1234)
    const b = flipTarget(0, true, 1234)
    expect(a).toBe(b)
    expect(a % 360).toBe(restingRotation(true))
    expect(flipTarget(0, false, 9).valueOf() % 360).toBe(180)
  })
  it('draait altijd vooruit', () => {
    expect(flipTarget(720, true, 5)).toBeGreaterThan(720)
  })
})
