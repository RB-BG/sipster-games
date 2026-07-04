import type { Die } from './types'

/**
 * Bron van worp-uitkomsten en animatie-seeds.
 * Injecteerbaar zodat de reducer deterministisch testbaar is.
 */
export interface RollSource {
  roll(): Die
  /** 32-bit seed voor de gedeelde worp-animatie op alle clients. */
  seed(): number
}

/** Productie-bron: cryptografisch uniform, alleen op de host gebruiken. */
export function cryptoRollSource(): RollSource {
  return {
    roll() {
      // Rejection sampling: 252 is het grootste zesvoud <= 256, dus geen modulo-bias.
      const buf = new Uint8Array(1)
      let v: number
      do {
        crypto.getRandomValues(buf)
        v = buf[0]
      } while (v >= 252)
      return ((v % 6) + 1) as Die
    },
    seed() {
      const buf = new Uint32Array(1)
      crypto.getRandomValues(buf)
      return buf[0]
    },
  }
}

/** Testbron: levert een vooraf bepaald script van waarden af. */
export function scriptedRollSource(values: Die[]): RollSource {
  let i = 0
  let seedCounter = 0
  return {
    roll() {
      if (i >= values.length) {
        throw new Error(`scriptedRollSource is leeg na ${values.length} worpen`)
      }
      return values[i++]
    },
    seed() {
      return ++seedCounter
    },
  }
}
