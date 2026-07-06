import { describe, expect, it } from 'vitest'
import { flipTarget, restingRotation, rollTarget } from './rollAnim'
import type { Die } from '@/engine/types'

const ALL: Die[] = [1, 2, 3, 4, 5, 6]

function landsOn(target: { x: number; y: number }, value: Die): boolean {
  const rest = restingRotation(value)
  const dx = (((target.x - rest.x) % 360) + 360) % 360
  const dy = (((target.y - rest.y) % 360) + 360) % 360
  return dx === 0 && dy === 0
}

describe('rollTarget', () => {
  it('landt altijd exact op de rusthoek van de waarde', () => {
    for (const value of ALL) {
      const t = rollTarget({ x: 0, y: 0 }, value, 12345, 0)
      expect(landsOn(t, value)).toBe(true)
    }
  })

  it('draait vooruit met minstens twee volle slagen', () => {
    for (const value of ALL) {
      const current = { x: 0, y: 0 }
      const t = rollTarget(current, value, 999, 1)
      expect(t.x - current.x).toBeGreaterThanOrEqual(720)
      expect(t.y - current.y).toBeGreaterThanOrEqual(720)
    }
  })

  it('is deterministisch: zelfde seed en index geven dezelfde worp', () => {
    expect(rollTarget({ x: 0, y: 0 }, 4, 42, 0)).toEqual(rollTarget({ x: 0, y: 0 }, 4, 42, 0))
  })

  it('de twee stenen tuimelen verschillend bij dezelfde seed', () => {
    const a = rollTarget({ x: 0, y: 0 }, 4, 42, 0)
    const b = rollTarget({ x: 0, y: 0 }, 4, 42, 1)
    expect(a).not.toEqual(b)
  })

  it('draait altijd vooruit, ook vanaf een al opgebouwde hoek', () => {
    const current = { x: 1080, y: 720 }
    const t = rollTarget(current, 5, 7, 0)
    expect(t.x).toBeGreaterThan(current.x)
    expect(t.y).toBeGreaterThan(current.y)
    expect(landsOn(t, 5)).toBe(true)
  })
})

describe('flipTarget', () => {
  it('landt op de nieuwe waarde met een nette voorwaartse draai', () => {
    const current = restingRotation(6)
    const t = flipTarget(current, 1)
    expect(landsOn(t, 1)).toBe(true)
    expect(t.x).toBeGreaterThanOrEqual(current.x)
  })
})
