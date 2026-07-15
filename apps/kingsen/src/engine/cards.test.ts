// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { card } from './deck'
import {
  cardLabel,
  color,
  compareRank,
  isHigher,
  isInside,
  isLower,
  rankLabel,
  sameSuit,
} from './cards'

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

describe('hoger / lager', () => {
  it('vergelijkt ranks', () => {
    expect(compareRank(card(9, 'hearts'), card(5, 'clubs'))).toBeGreaterThan(0)
    expect(isHigher(card(9, 'hearts'), card(5, 'clubs'))).toBe(true)
    expect(isLower(card(5, 'hearts'), card(9, 'clubs'))).toBe(true)
    expect(isHigher(card(5, 'hearts'), card(5, 'clubs'))).toBe(false)
    expect(isLower(card(5, 'hearts'), card(5, 'clubs'))).toBe(false)
  })
})

describe('binnen / buiten', () => {
  it('is strikt tussen de grenzen (rand telt als buiten)', () => {
    expect(isInside(card(6, 'hearts'), card(4, 'clubs'), card(9, 'spades'))).toBe(true)
    expect(isInside(card(6, 'hearts'), card(9, 'clubs'), card(4, 'spades'))).toBe(true)
    expect(isInside(card(4, 'hearts'), card(4, 'clubs'), card(9, 'spades'))).toBe(false)
    expect(isInside(card(9, 'hearts'), card(4, 'clubs'), card(9, 'spades'))).toBe(false)
    expect(isInside(card(11, 'hearts'), card(4, 'clubs'), card(9, 'spades'))).toBe(false)
  })
})

describe('sameSuit', () => {
  it('herkent of de suit al voorkomt', () => {
    const hand = [card(4, 'hearts'), card(9, 'clubs'), card(2, 'spades')]
    expect(sameSuit(card(13, 'clubs'), hand)).toBe(true)
    expect(sameSuit(card(13, 'diamonds'), hand)).toBe(false)
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
