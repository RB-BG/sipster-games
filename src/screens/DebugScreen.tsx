import { useRef, useState } from 'react'
import { createGame, reduce } from '@/engine/reducer'
import { cryptoRollSource } from '@/engine/rng'
import { scoreLabel } from '@/engine/score'
import type { Command, EngineEvent, ErrorCode, GameState } from '@/engine/types'

const EMOJI = ['🎲', '🍺', '😎', '🦊', '🐙', '🍀', '🌶️', '🫠']

/**
 * Dev-only speeltuin (/?debug) om de engine zonder game-UI te bespelen.
 * Bewust kaal: knoppen + JSON, geen productie-styling.
 */
export default function DebugScreen() {
  const rng = useRef(cryptoRollSource())
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
    setLog((prev) => [
      ...prev.slice(-14),
      ...result.events.map((e) => beschrijfEvent(e)),
    ])
  }

  const turn = state.turn
  const activePlayer = state.players.find((p) => p.id === turn?.playerId)
  const dice = turn?.dice ?? null

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4 font-mono text-sm">
      <h1 className="text-xl font-bold text-amber-warm">Mexxen engine-debug</h1>

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

        {state.phase === 'playing' && turn && (
          <>
            <DebugButton label={`gooi (${activePlayer?.name})`} onClick={() => dispatch({ t: 'ROLL', playerId: turn.playerId })} />
            <DebugButton label="hou 0 vast" onClick={() => dispatch({ t: 'HOLD_DIE', playerId: turn.playerId, dieId: 0 })} />
            <DebugButton label="hou 1 vast" onClick={() => dispatch({ t: 'HOLD_DIE', playerId: turn.playerId, dieId: 1 })} />
            <DebugButton label="pak 0 op" onClick={() => dispatch({ t: 'PICKUP_DIE', playerId: turn.playerId, dieId: 0 })} />
            <DebugButton label="pak 1 op" onClick={() => dispatch({ t: 'PICKUP_DIE', playerId: turn.playerId, dieId: 1 })} />
            <DebugButton label="blijf staan" onClick={() => dispatch({ t: 'END_TURN', playerId: turn.playerId })} />
            {turn.pending31 &&
              state.players
                .filter((p) => p.id !== turn.playerId)
                .map((p) => (
                  <DebugButton
                    key={p.id}
                    label={`31 → ${p.name}`}
                    onClick={() =>
                      dispatch({ t: 'GIVE_SIPS_31', playerId: turn.playerId, targetPlayerId: p.id })
                    }
                  />
                ))}
          </>
        )}

        {state.phase === 'tiebreak' &&
          state.tiebreak?.playerIds
            .filter((id) => state.tiebreak?.rolls[id] === null)
            .map((id) => (
              <DebugButton
                key={id}
                label={`tiebreak: ${id} gooit`}
                onClick={() => dispatch({ t: 'TIEBREAK_ROLL', playerId: id })}
              />
            ))}

        {state.phase === 'roundEnd' && (
          <DebugButton label="volgende ronde" onClick={() => dispatch({ t: 'NEXT_ROUND' })} />
        )}
      </section>

      {dice && (
        <p className="text-lg">
          🎲 {dice[0].value} {dice[0].onTable ? `(ligt${dice[0].vers ? `, ${dice[0].vers}` : ''})` : ''} | 🎲{' '}
          {dice[1].value} {dice[1].onTable ? `(ligt${dice[1].vers ? `, ${dice[1].vers}` : ''})` : ''} ={' '}
          <strong className="text-amber-soft">{scoreLabel(dice[0].value, dice[1].value)}</strong>
        </p>
      )}

      {error && <p className="text-destructive">⚠ {error}</p>}

      {log.length > 0 && (
        <ul className="text-muted-foreground">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      <pre className="overflow-x-auto rounded-lg bg-wood-950 p-3 text-xs">
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
    case 'DICE_ROLLED':
      return `${e.playerId} gooit [${e.values.join(', ')}]`
    case 'MEX_ROLLED':
      return `🎉 MEX voor ${e.playerId}`
    case 'SIPS_GIVEN':
      return `${e.fromPlayerId} geeft ${e.amount} slokken aan ${e.toPlayerId}`
    case 'TURN_ENDED':
      return `beurt van ${e.playerId} voorbij`
    case 'TIEBREAK_STARTED':
      return `tiebreak tussen ${e.playerIds.join(' en ')}`
    case 'TIEBREAK_ROLLED':
      return `tiebreak: ${e.playerId} gooit ${e.value}`
    case 'TIEBREAK_TIED':
      return `weer gelijk! inzet x${e.multiplier}`
    case 'ROUND_ENDED':
      return `💀 ${e.loserId} verliest en drinkt ${e.sips} slokken`
    case 'FLIPPED_65':
      return `${e.playerId} draait 65 om naar mex`
    case 'AFSLAAN':
      return `${e.byPlayerId} slaat af: ${e.verdict}`
    case 'RIDDER_GESLAGEN':
      return `🛡️ ${e.playerId} is nu ${e.dubbel ? 'dubbele ' : ''}ridder`
    case 'RIDDER_DRINKT':
      return `🛡️ ${e.playerId} drinkt ${e.amount}`
  }
}
