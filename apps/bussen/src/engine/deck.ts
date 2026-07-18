// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { RANKS, SUITS } from '@sipster/core/cards/deck'
import { PYRAMID_ROW_SIZES } from './pyramid'
import type { RuleConfig } from './types'

export {
  card,
  cryptoDeckSource,
  orderedDeck,
  RANKS,
  scriptedDeck,
  SUITS,
  type DeckSource,
} from '@sipster/core/cards/deck'

/**
 * Hoeveel spelers er maximaal passen zonder dat het deck tijdens het potje
 * uitgeput raakt: 4 vraagkaarten per speler naast de piramide en de bus.
 * Boven die grens zou drawCard herschudden en komen kaarten dubbel in het spel.
 */
export function maxPlayers(rules: RuleConfig): number {
  const reserved = PYRAMID_ROW_SIZES.reduce((sum, n) => sum + n, 0) + rules.busLengte
  return Math.floor((SUITS.length * RANKS.length - reserved) / 4)
}
