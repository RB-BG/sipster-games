// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useRef, useState } from 'react'
import { cardLabel } from '@/engine/cards'
import { cryptoDeckSource } from '@/engine/deck'
import { flatFlipOrder } from '@/engine/pyramid'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, EngineEvent, ErrorCode, GameState } from '@/engine/types'

const EMOJI = ['🃏', '🍺', '😎', '🦊', '🐙', '🍀', '🌶️', '🫠']

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

  const { turn, pyramid, bus, pendingGive } = state
  const others = state.players.filter((p) => p.id !== (pendingGive?.playerId ?? turn?.playerId))

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4 font-mono text-sm">
      <h1 className="text-xl font-bold text-cyan">Bussen engine-debug</h1>

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

        {pendingGive &&
          others.map((p) => (
            <DebugButton
              key={p.id}
              label={`geef → ${p.name}`}
              onClick={() => dispatch({ t: 'GIVE_SIPS', playerId: pendingGive.playerId, targetPlayerId: p.id })}
            />
          ))}

        {state.phase === 'questions' && turn && !pendingGive && (
          <>
            {(
              [
                ['rood', 'zwart'],
                ['hoger', 'lager'],
                ['binnen', 'buiten'],
                ['heb', 'niet'],
              ] as const
            )[turn.questionIndex].map((choice) => (
              <DebugButton
                key={choice}
                label={choice}
                onClick={() => dispatch({ t: 'ANSWER', playerId: turn.playerId, choice })}
              />
            ))}
            <DebugButton label="forfeit" onClick={() => dispatch({ t: 'FORFEIT_TURN' })} />
          </>
        )}

        {state.phase === 'pyramid' && pyramid && !pendingGive && (
          <>
            <DebugButton label="flip" onClick={() => dispatch({ t: 'FLIP_PYRAMID', playerId: state.hostId })} />
            {pyramid.currentRank !== null &&
              pyramid.openClaim === null &&
              state.players.map((p) => (
                <DebugButton
                  key={p.id}
                  label={`${p.name} claimt ${pyramid.currentRank}`}
                  onClick={() =>
                    dispatch({
                      t: 'PLAY_CARD',
                      playerId: p.id,
                      card: { rank: pyramid.currentRank!, suit: 'spades' },
                    })
                  }
                />
              ))}
            {pyramid.openClaim &&
              state.players
                .filter((p) => p.id !== pyramid.openClaim!.claimantId)
                .map((p) => (
                  <DebugButton
                    key={p.id}
                    label={`${p.name} call bluff`}
                    onClick={() =>
                      dispatch({ t: 'CALL_BLUFF', playerId: p.id, targetPlayerId: pyramid.openClaim!.claimantId })
                    }
                  />
                ))}
            {pyramid.flipIndex >= flatFlipOrder(pyramid.rows).length && pyramid.openClaim === null && (
              <DebugButton label="start bus" onClick={() => dispatch({ t: 'NEXT_PHASE' })} />
            )}
          </>
        )}

        {state.phase === 'bus' && bus && (
          <>
            <DebugButton label="hoger" onClick={() => dispatch({ t: 'BUS_GUESS', playerId: bus.driverIds[0], choice: 'hoger' })} />
            <DebugButton label="lager" onClick={() => dispatch({ t: 'BUS_GUESS', playerId: bus.driverIds[0], choice: 'lager' })} />
          </>
        )}
      </section>

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
    case 'CARD_DEALT':
      return `${e.playerId} krijgt ${cardLabel(e.card)}`
    case 'CARD_FLIPPED':
      return `flip: ${cardLabel(e.card)} (rij ${e.rowValue})`
    case 'SIPS_GIVEN':
      return `${e.fromPlayerId} geeft ${e.amount} aan ${e.toPlayerId}`
    case 'BLUFF_CALLED':
      return `${e.byPlayerId} call bluft ${e.targetPlayerId}: ${e.verdict}`
    case 'BUS_CARD':
      return `bus: ${cardLabel(e.card)} (${e.correct ? 'goed' : 'fout'})`
    case 'BUS_RESET':
      return 'bus opnieuw'
    case 'PHASE_CHANGED':
      return `fase → ${e.phase}`
  }
}
