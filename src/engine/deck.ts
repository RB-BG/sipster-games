// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { randomInt, randomSeed } from './rng'
import type { Card, Rank, Suit } from './types'

/**
 * Bron van een geschudde deck en animatie-seeds. Injecteerbaar zodat de
 * reducer deterministisch testbaar is: productie schudt cryptografisch,
 * tests leveren een vast kaart-script.
 */
export interface DeckSource {
  /** Een volledig geschudde deck van 52 kaarten. */
  shuffle(): Card[]
  /** 32-bit seed voor de gedeelde kaart-animatie op alle clients. */
  seed(): number
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

/** De 52 kaarten in vaste volgorde (ongeschud). */
export function orderedDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank })
    }
  }
  return cards
}

/** Productie-bron: cryptografische Fisher-Yates, alleen op de host gebruiken. */
export function cryptoDeckSource(): DeckSource {
  return {
    shuffle() {
      const cards = orderedDeck()
      // Fisher-Yates met uniforme, bias-vrije trekkingen.
      for (let i = cards.length - 1; i > 0; i--) {
        const j = randomInt(i + 1)
        ;[cards[i], cards[j]] = [cards[j], cards[i]]
      }
      return cards
    },
    seed: randomSeed,
  }
}

/**
 * Testbron: levert exact het opgegeven kaart-script als "geschudde" deck.
 * Bij een tweede shuffle (bv. bus-herdeal na uitputting) komt hetzelfde
 * script terug; zorg in tests voor voldoende kaarten.
 */
export function scriptedDeck(cards: Card[]): DeckSource {
  let seedCounter = 0
  return {
    shuffle() {
      return cards.map((c) => ({ ...c }))
    },
    seed() {
      return ++seedCounter
    },
  }
}

/** Korte helper voor tests: kaart uit rank + suit-letter (h/d/c/s). */
export function card(rank: Rank, suit: Suit): Card {
  return { rank, suit }
}
