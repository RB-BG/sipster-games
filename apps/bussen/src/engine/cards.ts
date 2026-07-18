// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card } from './types'

export { cardLabel, color, rankLabel, suitSymbol } from '@sipster/core/cards/display'

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
