// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { X } from 'lucide-react'
import PlayerChip from '@/components/PlayerChip'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStrings } from '@/store/localeStore'

/**
 * TIJDELIJKE PLACEHOLDER (chunk 2.5). De echte hand-UI (kaarten, afleggen/trekken,
 * Yousef-knop, bak-meter, afscherm-scherm bij hotseat) komt in chunk 3. Voor nu
 * toont dit scherm de kale spelstand zodat de app-schil groen bouwt en draait; de
 * engine is bespeelbaar via /?debug.
 */
export default function GameScreen() {
  const strings = useStrings()
  const { state, leave } = useGameAdapter()
  useWakeLock()

  if (!state) return null

  const actorId = state.turn?.playerId

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-ivory">
          {strings.appName} · {strings.round(state.round)}
        </h1>
        <button
          type="button"
          onClick={leave}
          aria-label={strings.leaveTable}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground active:scale-95"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {state.players.map((p) => (
          <PlayerChip key={p.id} player={p} active={p.id === actorId} />
        ))}
      </div>

      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
        Hand-UI volgt in chunk 3. Bespeel de engine nu via <code>/?debug</code>. Fase:{' '}
        <span className="font-semibold text-ivory">{state.phase}</span>
        {actorId && (
          <>
            {' · '}
            {state.players.find((p) => p.id === actorId)?.name} is aan de beurt
          </>
        )}
      </p>
    </main>
  )
}
