// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { RANKS, SUITS } from '@sipster/core/cards/deck'
import { randomInt, randomSeed } from '@sipster/core/cards/rng'
import type { Rank, Suit } from '@sipster/core/cards/types'
import type { HandCard } from './types'

export { RANKS, SUITS } from '@sipster/core/cards/deck'

/** Aantal jokers in het Yousef-deck. */
export const JOKER_COUNT = 2

/**
 * Bron van een geschudde deck en animatie-seeds. Injecteerbaar zodat de reducer
 * deterministisch testbaar is: productie schudt cryptografisch, tests leveren een
 * vast kaart-script. `reshuffle` mengt de afgelegde stapel opnieuw als de trekstapel op is.
 */
export interface DeckSource {
  /** Een volledig geschud Yousef-deck: 52 kaarten + 2 jokers. */
  shuffle(): HandCard[]
  /** Schud een willekeurige set kaarten opnieuw (afgelegde stapel bij een lege trekstapel). */
  reshuffle(cards: HandCard[]): HandCard[]
  /** 32-bit seed voor de gedeelde kaart-animatie op alle clients. */
  seed(): number
}

/** De 54 kaarten in vaste volgorde (ongeschud). */
export function orderedDeck(): HandCard[] {
  const cards: HandCard[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ kind: 'card', suit, rank })
    }
  }
  for (let jid = 0; jid < JOKER_COUNT; jid++) {
    cards.push({ kind: 'joker', jid })
  }
  return cards
}

/** Fisher-Yates met uniforme, bias-vrije trekkingen (in-place op een kopie). */
function fisherYates(input: HandCard[]): HandCard[] {
  const cards = input.map((c) => ({ ...c }))
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

/** Productie-bron: cryptografische Fisher-Yates, alleen op de host gebruiken. */
export function cryptoDeckSource(): DeckSource {
  return {
    shuffle: () => fisherYates(orderedDeck()),
    reshuffle: (cards) => fisherYates(cards),
    seed: randomSeed,
  }
}

/**
 * Testbron: levert exact het opgegeven kaart-script als "geschudde" deck; een
 * reshuffle keert de meegegeven stapel om (deterministisch, geen randomness).
 */
export function scriptedDeck(cards: HandCard[]): DeckSource {
  let seedCounter = 0
  return {
    shuffle: () => cards.map((c) => ({ ...c })),
    reshuffle: (pile) => [...pile].reverse().map((c) => ({ ...c })),
    seed: () => ++seedCounter,
  }
}

/** Korte helper voor tests: normale kaart uit rank + suit. */
export function card(rank: Rank, suit: Suit): HandCard {
  return { kind: 'card', suit, rank }
}

/** Korte helper voor tests: een joker. */
export function joker(jid: number): HandCard {
  return { kind: 'joker', jid }
}
