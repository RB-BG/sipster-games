// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { card } from './deck'
import { cardLabel, color, rankLabel } from './cards'

describe('color', () => {
  it('harten en ruiten zijn rood', () => {
    expect(color(card(7, 'hearts'))).toBe('red')
    expect(color(card(2, 'diamonds'))).toBe('red')
  })
  it('klaveren en schoppen zijn zwart', () => {
    expect(color(card(10, 'clubs'))).toBe('black')
    expect(color(card(14, 'spades'))).toBe('black')
  })
})

describe('labels', () => {
  it('rankLabel gebruikt J/Q/K/A', () => {
    expect(rankLabel(10)).toBe('10')
    expect(rankLabel(11)).toBe('J')
    expect(rankLabel(12)).toBe('Q')
    expect(rankLabel(13)).toBe('K')
    expect(rankLabel(14)).toBe('A')
  })
  it('cardLabel combineert rank en suit-symbool', () => {
    expect(cardLabel(card(14, 'spades'))).toBe('A♠')
    expect(cardLabel(card(10, 'hearts'))).toBe('10♥')
  })
})
