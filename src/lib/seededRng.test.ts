// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { mulberry32 } from './seededRng'

describe('mulberry32', () => {
  it('levert dezelfde reeks bij dezelfde seed', () => {
    const a = mulberry32(1234)
    const b = mulberry32(1234)
    const reeksA = Array.from({ length: 10 }, () => a())
    const reeksB = Array.from({ length: 10 }, () => b())
    expect(reeksA).toEqual(reeksB)
  })

  it('levert verschillende reeksen bij verschillende seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const reeksA = Array.from({ length: 10 }, () => a())
    const reeksB = Array.from({ length: 10 }, () => b())
    expect(reeksA).not.toEqual(reeksB)
  })

  it('blijft binnen [0, 1)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
