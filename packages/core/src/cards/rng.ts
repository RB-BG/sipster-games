// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

/**
 * Laag-niveau crypto-primitieven, alleen op de host gebruikt. De deck-bron
 * (deck.ts) bouwt hierop een uniforme Fisher-Yates-shuffle; de reducer blijft
 * deterministisch testbaar via een scripted deck.
 */

/**
 * Uniform geheel getal in [0, maxExclusive) zonder modulo-bias, via
 * rejection sampling op een 32-bit trekking.
 */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('randomInt vereist maxExclusive > 0')
  if (maxExclusive === 1) return 0
  const buf = new Uint32Array(1)
  // Grootste veelvoud van maxExclusive dat binnen 2^32 past: alles daarboven weggooien.
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  let v: number
  do {
    crypto.getRandomValues(buf)
    v = buf[0]
  } while (v >= limit)
  return v % maxExclusive
}

/** 32-bit seed voor de gedeelde kaart-animatie op alle clients. */
export function randomSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]
}
