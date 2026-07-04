import { describe, expect, it } from 'vitest'
import { is31, is32, isDouble, isMex, scoreLabel, scoreRank } from './score'
import type { Die } from './types'

describe('scoreRank', () => {
  it('mex (21) is de hoogste worp', () => {
    expect(scoreRank(2, 1)).toBe(1000)
    expect(scoreRank(1, 2)).toBe(1000)
    expect(scoreRank(2, 1)).toBeGreaterThan(scoreRank(6, 6))
  })

  it('dobbelsteenvolgorde maakt niet uit', () => {
    expect(scoreRank(6, 4)).toBe(scoreRank(4, 6))
  })

  it('hoogste steen is het tiental: 6 en 4 is 64', () => {
    expect(scoreRank(6, 4)).toBe(64)
  })

  it('dubbel is een honderdtal: 3 en 3 is 300', () => {
    expect(scoreRank(3, 3)).toBe(300)
    expect(scoreRank(1, 1)).toBe(100)
    expect(scoreRank(6, 6)).toBe(600)
  })

  it('elk honderdtal slaat elke gewone worp', () => {
    expect(scoreRank(1, 1)).toBeGreaterThan(scoreRank(6, 5))
  })

  it('32 is de laagste eindworp', () => {
    const alleWorpen: [Die, Die][] = []
    for (let a = 1 as Die; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        alleWorpen.push([a as Die, b as Die])
      }
    }
    const eindworpen = alleWorpen.filter(([a, b]) => !is31(a, b))
    const laagste = Math.min(...eindworpen.map(([a, b]) => scoreRank(a, b)))
    expect(laagste).toBe(scoreRank(3, 2))
  })

  it('volledige rangorde klopt: 21 > 600 > ... > 100 > 65 > ... > 41 > 32', () => {
    const volgorde: [Die, Die][] = [
      [2, 1],
      [6, 6], [5, 5], [4, 4], [3, 3], [2, 2], [1, 1],
      [6, 5], [6, 4], [6, 3], [6, 2], [6, 1],
      [5, 4], [5, 3], [5, 2], [5, 1],
      [4, 3], [4, 2], [4, 1],
      [3, 2],
    ]
    const ranks = volgorde.map(([a, b]) => scoreRank(a, b))
    const gesorteerd = [...ranks].sort((x, y) => y - x)
    expect(ranks).toEqual(gesorteerd)
  })
})

describe('bijzondere combinaties', () => {
  it('herkent mex, 31 en 32', () => {
    expect(isMex(1, 2)).toBe(true)
    expect(isMex(3, 1)).toBe(false)
    expect(is31(1, 3)).toBe(true)
    expect(is31(3, 2)).toBe(false)
    expect(is32(2, 3)).toBe(true)
    expect(is32(3, 1)).toBe(false)
  })

  it('herkent dubbels', () => {
    expect(isDouble(4, 4)).toBe(true)
    expect(isDouble(4, 5)).toBe(false)
  })
})

describe('scoreLabel', () => {
  it('geeft leesbare labels', () => {
    expect(scoreLabel(2, 1)).toBe('mex')
    expect(scoreLabel(3, 3)).toBe('300')
    expect(scoreLabel(4, 6)).toBe('64')
    expect(scoreLabel(1, 3)).toBe('31')
    expect(scoreLabel(2, 3)).toBe('32')
  })
})
