// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card, Rank, Suit } from './types'

/** Harten en ruiten zijn rood, klaveren en schoppen zwart. */
export function color(card: Card): 'red' | 'black' {
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
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
