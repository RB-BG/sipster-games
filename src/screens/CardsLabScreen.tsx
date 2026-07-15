// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useState } from 'react'
import Card, { type FlipRequest } from '@/cards/Card'
import { RANKS, SUITS } from '@/engine/deck'
import { cardLabel } from '@/engine/cards'
import type { Rank, Suit } from '@/engine/types'

/**
 * Dev-only speeltuin (/?cards): kies een kaart en seed, en die komt
 * gegarandeerd via een flip-animatie boven te liggen.
 */
export default function CardsLabScreen() {
  const [rank, setRank] = useState<Rank>(14)
  const [suit, setSuit] = useState<Suit>('spades')
  const [flip, setFlip] = useState<FlipRequest | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [lastSeed, setLastSeed] = useState<number | null>(null)

  function draai(seed?: number) {
    if (flipping) return
    const animSeed = seed ?? Math.floor(Math.random() * 2 ** 32)
    setLastSeed(animSeed)
    setFlipping(true)
    setFlip({ id: (flip?.id ?? 0) + 1, card: { rank, suit }, animSeed })
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex h-[55dvh] items-center justify-center">
        <Card flip={flip} faceDown={flip === null} size={180} onSettled={() => setFlipping(false)} />
      </div>

      <section className="flex flex-col gap-4 p-4">
        <h1 className="text-lg font-bold text-cyan">Kaart-lab</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            rank:
            <select
              value={rank}
              onChange={(e) => setRank(Number(e.target.value) as Rank)}
              className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground"
            >
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            suit:
            <select
              value={suit}
              onChange={(e) => setSuit(e.target.value as Suit)}
              className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground"
            >
              {SUITS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <span className="text-cyan-soft">{cardLabel({ rank, suit })}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={flipping}
            onClick={() => draai()}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
          >
            Draai om
          </button>
          <button
            type="button"
            disabled={flipping || lastSeed === null}
            onClick={() => draai(lastSeed ?? undefined)}
            className="rounded-lg bg-secondary px-6 py-2 text-secondary-foreground active:scale-95 disabled:opacity-60"
          >
            Zelfde seed nog eens
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {flipping ? 'aan het draaien…' : 'kies een kaart en druk op draai om'}
          {lastSeed !== null && ` · seed ${lastSeed}`}
        </p>
      </section>
    </main>
  )
}
