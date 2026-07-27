// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useRef, useState } from 'react'
import { cardLabel } from '@/engine/cards'
import { cryptoDeckSource } from '@/engine/deck'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, EngineEvent, ErrorCode, GameState } from '@/engine/types'

const EMOJI = ['👑', '🍺', '😎', '🦊', '🐙', '🍀', '🌶️', '🫠']

/**
 * Dev-only speeltuin (/?debug) om de engine zonder game-UI te bespelen.
 * Bewust kaal: knoppen + JSON, geen productie-styling.
 */
export default function DebugScreen() {
  const rng = useRef(cryptoDeckSource())
  const [state, setState] = useState<GameState>(() =>
    createGame({ id: 'p1', name: 'Speler 1', emoji: EMOJI[0] }),
  )
  const [error, setError] = useState<ErrorCode | null>(null)
  const [log, setLog] = useState<string[]>([])

  function dispatch(cmd: Command) {
    const result = reduce(state, cmd, rng.current)
    setError(result.error ?? null)
    if (result.error) return
    setState(result.state)
    setLog((prev) => [...prev.slice(-14), ...result.events.map((e) => beschrijfEvent(e))])
  }

  const { turn, pending, currentCard } = state
  const actorId = pending?.playerId ?? turn?.playerId ?? state.hostId

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4 font-mono text-sm">
      <h1 className="text-xl font-bold text-cyan">Kaartspel engine-debug</h1>

      <section className="flex flex-wrap gap-2">
        {state.phase === 'lobby' && (
          <>
            <DebugButton
              label="+ speler"
              onClick={() => {
                const n = state.players.length + 1
                dispatch({
                  t: 'ADD_PLAYER',
                  profile: { id: `p${n}`, name: `Speler ${n}`, emoji: EMOJI[(n - 1) % EMOJI.length] },
                })
              }}
            />
            <DebugButton label="start" onClick={() => dispatch({ t: 'START_GAME' })} />
          </>
        )}

        {state.phase === 'playing' && pending === null && (
          <>
            <DebugButton
              label={`flip (${actorId})`}
              onClick={() => dispatch({ t: 'FLIP_CARD', playerId: actorId })}
            />
            <DebugButton label="forfeit" onClick={() => dispatch({ t: 'FORFEIT_TURN' })} />
          </>
        )}

        {pending?.kind === 'cup' && (
          <>
            {[1, 3, 5].map((amount) => (
              <DebugButton
                key={amount}
                label={`schenk ${amount}`}
                onClick={() => dispatch({ t: 'ADD_TO_CUP', playerId: pending.playerId, amount })}
              />
            ))}
          </>
        )}

        {pending?.kind === 'rule' && (
          <DebugButton
            label="regel: geen namen"
            onClick={() => dispatch({ t: 'SET_RULE', playerId: pending.playerId, text: 'geen namen' })}
          />
        )}

        {state.phase !== 'lobby' && (
          <DebugButton label="einde" onClick={() => dispatch({ t: 'END_GAME' })} />
        )}
      </section>

      {currentCard && <p className="text-cyan-soft">laatste kaart: {cardLabel(currentCard)}</p>}
      {error && <p className="text-destructive">⚠ {error}</p>}

      {log.length > 0 && (
        <ul className="text-muted-foreground">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      <pre className="overflow-x-auto rounded-lg bg-night-950 p-3 text-xs">
        {JSON.stringify(state, null, 2)}
      </pre>
    </main>
  )
}

function DebugButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-secondary px-3 py-1.5 text-secondary-foreground active:scale-95"
    >
      {label}
    </button>
  )
}

function beschrijfEvent(e: EngineEvent): string {
  switch (e.t) {
    case 'CARD_FLIPPED':
      return `flip: ${cardLabel(e.card)}`
    case 'CUP_FILLED':
      return `${e.playerId} schenkt ${e.amount} in (totaal ${e.total})`
    case 'PHASE_CHANGED':
      return `fase → ${e.phase}`
  }
}
