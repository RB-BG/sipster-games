// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card, Rank, Suit } from './types'

/** Harten en ruiten zijn rood, klaveren en schoppen zwart. */
export function color(card: Card): 'red' | 'black' {
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
}

/** Positief als a hoger is dan b, negatief als lager, 0 bij gelijke rank. */
export function compareRank(a: Card, b: Card): number {
  return a.rank - b.rank
}

export function isHigher(card: Card, than: Card): boolean {
  return card.rank > than.rank
}

export function isLower(card: Card, than: Card): boolean {
  return card.rank < than.rank
}

/**
 * Ligt de rank van `card` strikt tussen a en b in? De grenzen tellen niet mee
 * (rand = buiten), en de volgorde van a en b maakt niet uit.
 */
export function isInside(card: Card, a: Card, b: Card): boolean {
  const low = Math.min(a.rank, b.rank)
  const high = Math.max(a.rank, b.rank)
  return card.rank > low && card.rank < high
}

/** Komt de suit van `card` voor tussen de opgegeven kaarten? */
export function sameSuit(card: Card, among: Card[]): boolean {
  return among.some((c) => c.suit === card.suit)
}

const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank]
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit]
}

/** Weergavenaam van een kaart, bv. 'A♠' of '10♥'. */
export function cardLabel(card: Card): string {
  return `${rankLabel(card.rank)}${suitSymbol(card.suit)}`
}
