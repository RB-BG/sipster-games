// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import type { Card } from '@sipster/core/cards/types'
import { cardLabel, color, rankLabel } from './cards'

// De display-helpers werken op een core-kaart (suit + rank); jokers hebben een
// eigen weergave in de UI-laag.
function cc(rank: Card['rank'], suit: Card['suit']): Card {
  return { suit, rank }
}

describe('color', () => {
  it('harten en ruiten zijn rood', () => {
    expect(color(cc(7, 'hearts'))).toBe('red')
    expect(color(cc(2, 'diamonds'))).toBe('red')
  })
  it('klaveren en schoppen zijn zwart', () => {
    expect(color(cc(10, 'clubs'))).toBe('black')
    expect(color(cc(14, 'spades'))).toBe('black')
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
    expect(cardLabel(cc(14, 'spades'))).toBe('A♠')
    expect(cardLabel(cc(10, 'hearts'))).toBe('10♥')
  })
})
