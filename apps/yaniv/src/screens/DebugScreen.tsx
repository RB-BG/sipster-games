// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useRef, useState } from 'react'
import { cardLabel } from '@/engine/cards'
import { cryptoDeckSource } from '@/engine/deck'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, EngineEvent, ErrorCode, GameState, HandCard } from '@/engine/types'
import { handValue } from '@/engine/values'

const EMOJI = ['👑', '🍺', '😎', '🦊', '🐙', '🍀', '🌶️', '🫠']

/** Label van een hand-kaart, joker-bewust. */
function label(c: HandCard): string {
  return c.kind === 'joker' ? '🃏' : cardLabel({ suit: c.suit, rank: c.rank })
}

/**
 * Dev-only speeltuin (/?debug) om de engine zonder game-UI te bespelen.
 * Bewust kaal: knoppen + JSON, geen productie-styling. Handen zijn hier voor
 * iedereen zichtbaar (geen afscherming); dat is de hand-UI van chunk 3.
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
    setLog((prev) => [...prev.slice(-14), ...result.events.map(beschrijfEvent)])
  }

  const actorId = state.turn?.playerId
  const actor = state.players.find((p) => p.id === actorId)
  // Simpele dev-zet: leg de eerste kaart uit de hand af.
  const firstCard = actor?.hand[0]

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4 font-mono text-sm">
      <h1 className="text-xl font-bold text-cyan">Yaniv engine-debug</h1>

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

        {state.phase === 'playing' && actorId && firstCard && (
          <>
            <DebugButton
              label={`${actorId}: leg ${label(firstCard)} af, trek stapel`}
              onClick={() =>
                dispatch({ t: 'PLAY_TURN', playerId: actorId, discard: [firstCard], drawFrom: 'deck' })
              }
            />
            <DebugButton
              label="idem, pak aflegstapel"
              onClick={() =>
                dispatch({
                  t: 'PLAY_TURN',
                  playerId: actorId,
                  discard: [firstCard],
                  drawFrom: 'discard',
                })
              }
            />
            <DebugButton
              label={`Yaniv (${actor ? handValue(actor.hand) : '?'})`}
              onClick={() => dispatch({ t: 'CALL_YOUSEF', playerId: actorId })}
            />
            <DebugButton label="forfeit" onClick={() => dispatch({ t: 'FORFEIT_TURN' })} />
          </>
        )}

        {state.phase === 'roundEnd' && (
          <>
            {state.players.map((p) => (
              <DebugButton
                key={p.id}
                label={p.score >= 30 ? `${p.id}: bak (${p.score})` : `${p.id}: afkopen (${p.score})`}
                onClick={() =>
                  dispatch(p.score >= 30 ? { t: 'DRAW_BAK', playerId: p.id } : { t: 'BUY_OFF', playerId: p.id })
                }
              />
            ))}
            <DebugButton label="volgende ronde" onClick={() => dispatch({ t: 'NEXT_ROUND' })} />
          </>
        )}

        {state.phase !== 'lobby' && (
          <DebugButton label="einde" onClick={() => dispatch({ t: 'END_GAME' })} />
        )}
      </section>

      {state.phase !== 'lobby' && (
        <section className="flex flex-col gap-1 text-cyan-soft">
          {state.players.map((p) => (
            <div key={p.id}>
              {p.id === actorId ? '▶ ' : '  '}
              {p.name} [{p.score}pt] : {p.hand.map(label).join(' ')} (= {handValue(p.hand)})
            </div>
          ))}
          <div className="text-muted-foreground">aflegstapel top: {state.discardTop.map(label).join(' ')}</div>
        </section>
      )}

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
    case 'PLAYED':
      return `${e.playerId} legt ${e.discard.map(label).join(' ')} af, trekt ${label(e.drawn)}`
    case 'YOUSEF_CALLED':
      return `${e.callerId} roept Yaniv`
    case 'ROUND_SCORED':
      return `ronde gescoord${e.result.assaf ? ' (Assaf!)' : ''}`
    case 'BAK_DRAWN':
      return `${e.playerId} trekt een bak`
    case 'PHASE_CHANGED':
      return `fase → ${e.phase}`
  }
}
