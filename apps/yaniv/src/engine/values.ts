// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { HandCard } from './types'

/**
 * Puntwaarde van één kaart: joker = -1, aas (rang 14) = 1, boer/vrouw/heer = 10,
 * 2 t/m 10 op nominale waarde. Dit is de scoring-waarde, niet de straat-volgorde.
 */
export function cardValue(c: HandCard): number {
  if (c.kind === 'joker') return -1
  if (c.rank === 14) return 1 // aas telt laag
  if (c.rank >= 11) return 10 // boer, vrouw, heer
  return c.rank
}

/** Som van de kaartwaarden in een hand. */
export function handValue(hand: HandCard[]): number {
  return hand.reduce((sum, c) => sum + cardValue(c), 0)
}

/**
 * Straat-volgorde van een kaart: aas laag (1), 2..10 nominaal, boer/vrouw/heer =
 * 11/12/13. Zo is A-2-3 een straat en Q-K-A niet (aas is laag). Jokers hebben geen
 * vaste volgorde (wildcard) en horen hier niet langs te komen.
 */
function runOrder(c: HandCard): number {
  if (c.kind === 'joker') throw new Error('joker heeft geen straat-volgorde')
  return c.rank === 14 ? 1 : c.rank
}

export function isJoker(c: HandCard): boolean {
  return c.kind === 'joker'
}

/** Identiteit van een kaart, voor het matchen van afgelegde kaarten tegen de hand. */
export function sameCard(a: HandCard, b: HandCard): boolean {
  if (a.kind === 'joker' || b.kind === 'joker') {
    return a.kind === 'joker' && b.kind === 'joker' && a.jid === b.jid
  }
  return a.suit === b.suit && a.rank === b.rank
}

/** Een setje: 2+ kaarten van dezelfde rang; jokers vullen aan (wildcard). */
function isSet(cards: HandCard[]): boolean {
  if (cards.length < 2) return false
  const pips = cards.filter((c) => c.kind === 'card')
  // Alleen jokers is toegestaan (bijv. twee jokers); anders moeten alle
  // niet-jokers dezelfde rang delen.
  const ranks = new Set(pips.map((c) => (c.kind === 'card' ? c.rank : 0)))
  return ranks.size <= 1
}

/**
 * Een straat: 3+ opeenvolgende rangen, suit maakt niet uit. Jokers vullen gaten
 * (en mogen aan de uiteinden verlengen). Geldig zodra de niet-jokers uniek zijn,
 * de interne gaten passen binnen het aantal jokers, en de straat binnen A(1)..K(13) valt.
 */
function isRun(cards: HandCard[]): boolean {
  if (cards.length < 3 || cards.length > 13) return false
  const orders = cards.filter((c) => !isJoker(c)).map(runOrder)
  if (orders.length === 0) return false // puur jokers is geen bepaalbare straat
  const unique = new Set(orders)
  if (unique.size !== orders.length) return false // dubbele rang kan niet in een straat
  const span = Math.max(...orders) - Math.min(...orders) + 1
  // De straat beslaat `cards.length` opeenvolgende posities. De niet-jokers moeten
  // binnen dat venster passen; de gaten ertussen (en de uiteinden) vullen de jokers.
  // Dat lukt precies als de spanwijdte niet groter is dan het aantal kaarten.
  return span <= cards.length
}

/**
 * Mag deze groep in één keer worden afgelegd? Losse kaart altijd; verder een
 * geldig setje of een geldige straat. Staat de huisregel de joker-wildcard niet
 * toe, dan mag een joker niet meespelen in een set of straat (alleen los).
 */
export function isValidGroup(cards: HandCard[], jokerWildcard = true): boolean {
  if (cards.length === 0) return false
  if (cards.length === 1) return true
  if (!jokerWildcard && cards.some(isJoker)) return false
  return isSet(cards) || isRun(cards)
}
