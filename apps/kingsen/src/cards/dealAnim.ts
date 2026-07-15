// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { mulberry32 } from '@/lib/seededRng'

/**
 * De rusthoek (graden, rond de Y-as) waarop de kaart z'n voor- of achterkant
 * naar de kijker draait. 0 (mod 360) = voorkant, 180 = achterkant.
 */
export function restingRotation(faceUp: boolean): number {
  return faceUp ? 0 : 180
}

/**
 * Kleinste hoek >= huidige + minTurns halve slagen die op dezelfde oriëntatie
 * uitkomt als `resting`. Zo draait de kaart altijd vooruit naar de nieuwe kant,
 * nooit terug: geen zichtbare "snap".
 */
export function forwardTo(current: number, resting: number, minTurns: number): number {
  const base = current + minTurns * 360
  const delta = (((resting - base) % 360) + 360) % 360
  return base + delta
}

/**
 * Doelrotatie voor een kaart-flip: minstens één hele slag, met een
 * seed-afhankelijk extra rondje zodat elk toestel dezelfde flip toont.
 * De landing is exact `restingRotation(faceUp)` (mod 360), dus altijd juist.
 */
export function flipTarget(current: number, faceUp: boolean, seed: number): number {
  const rnd = mulberry32(seed >>> 0)
  const turns = 1 + Math.floor(rnd() * 2)
  return forwardTo(current, restingRotation(faceUp), turns)
}
