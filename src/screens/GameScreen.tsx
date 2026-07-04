import { useEffect, useState } from 'react'
import { Hand, X } from 'lucide-react'
import Coaster from '@/components/Coaster'
import PlayerChip from '@/components/PlayerChip'
import { rankLabel, scoreLabel, scoreRank } from '@/engine/score'
import type { Command, DieId } from '@/engine/types'
import { validateCommand } from '@/engine/validate'
import DiceScene from '@/game3d/DiceScene'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useWakeLock } from '@/hooks/useWakeLock'
import { strings } from '@/i18n/strings'

export default function GameScreen() {
  const {
    state,
    myPlayerId,
    isHost,
    animating,
    rollAnim,
    flipAnim,
    afslaanToast,
    lastError,
    dispatch,
    onRollSettled,
    leave,
  } = useGameAdapter()

  // Afslaan-meldingen kort tonen: zichtbaar tot de timer het huidige id wegtikt.
  const [dismissedToastId, setDismissedToastId] = useState(0)
  const toastId = afslaanToast?.id ?? 0
  useEffect(() => {
    if (toastId === 0) return
    const timer = setTimeout(() => setDismissedToastId(toastId), 3500)
    return () => clearTimeout(timer)
  }, [toastId])
  const toastVisible = afslaanToast !== null && toastId !== dismissedToastId

  // Scherm aan: vergrendeling doodt de P2P-verbinding midden in het potje.
  useWakeLock()

  if (!state) return null
  const { turn, phase } = state
  const activePlayer = state.players.find((p) => p.id === turn?.playerId)

  /** In hotseat (myPlayerId null) mag alles; online alleen je eigen acties. */
  const canAct = (playerId: string) => myPlayerId === null || myPlayerId === playerId

  const held: [boolean, boolean] =
    phase === 'playing' && turn?.dice
      ? [turn.dice[0].onTable, turn.dice[1].onTable]
      : phase === 'tiebreak'
        ? [false, true] // kamp gaat met één steen; de tweede parkeert aan de zijkant
        : [false, false]

  const disabled = (cmd: Command & { playerId: string }) =>
    animating || !canAct(cmd.playerId) || validateCommand(state, cmd) !== null

  function onDieClick(id: DieId) {
    if (!turn?.dice || animating || phase !== 'playing' || !canAct(turn.playerId)) return
    const die = turn.dice[id]
    dispatch(
      die.onTable
        ? { t: 'PICKUP_DIE', playerId: turn.playerId, dieId: id }
        : { t: 'HOLD_DIE', playerId: turn.playerId, dieId: id },
    )
  }

  const lastLoss = [...state.sipsLog]
    .reverse()
    .find((e) => e.reason === 'verliezer' && e.round === state.round.number)
  const loser = lastLoss && state.players.find((p) => p.id === lastLoss.playerId)
  const showResults = phase === 'roundEnd' && !animating
  const showTiebreak = phase === 'tiebreak' && !animating
  const show31 = phase === 'playing' && turn?.pending31 && !animating
  const nextTiebreakPlayerId = state.tiebreak?.playerIds.find(
    (id) => state.tiebreak?.rolls[id] === null,
  )
  const nextTiebreakPlayer = state.players.find((p) => p.id === nextTiebreakPlayerId)
  // Actieve speler offline: de host mag de beurt overslaan zodat de tafel niet vastloopt.
  const showSkip =
    phase === 'playing' && turn && activePlayer && !activePlayer.connected && isHost && !animating
  // Omgekeerde mex: 65 mag omgedraaid worden zolang de beurt loopt.
  const showFlip =
    state.rules.omgekeerdeMex &&
    phase === 'playing' &&
    turn?.dice &&
    !turn.locked &&
    !turn.pending31 &&
    !animating &&
    canAct(turn.playerId) &&
    scoreRank(turn.dice[0].value, turn.dice[1].value) === 65
  // Afslaan is een reactiesnelheids-race: alleen zinnig met eigen toestellen.
  const showAfslaan =
    state.rules.afslaan && phase === 'playing' && myPlayerId !== null && !animating
  const toastPlayer =
    afslaanToast && state.players.find((p) => p.id === afslaanToast.byPlayerId)

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
        <span>
          {strings.round(state.round.number)}
          {state.round.mexCount > 0 && ` · ${strings.mexCount(state.round.mexCount)}`}
        </span>
        <button type="button" onClick={leave} aria-label={strings.stopGame}>
          <X className="size-5" />
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {state.players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            active={player.id === turn?.playerId}
            hideScore={animating && player.id === turn?.playerId}
            ridder={
              state.ridderId === player.id ? (state.ridderDubbel ? 'dubbel' : 'ridder') : null
            }
          />
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        <DiceScene
          roll={rollAnim}
          flip={flipAnim}
          held={held}
          onDieClick={onDieClick}
          onSettled={onRollSettled}
        />

        {toastVisible && afslaanToast && toastPlayer && (
          <p className="absolute inset-x-4 top-2 z-20 rounded-lg bg-wood-950/90 px-3 py-2 text-center text-sm text-amber-soft">
            {strings.afslaanVerdict(toastPlayer.name, afslaanToast.verdict)}
          </p>
        )}

        {showAfslaan && (
          <button
            type="button"
            onClick={() => dispatch({ t: 'AFSLAAN', playerId: myPlayerId as string })}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-destructive px-4 py-3 font-bold text-ivory shadow-lg active:scale-90"
          >
            <Hand className="size-5" />
            {strings.slaAf}
          </button>
        )}

        {show31 && activePlayer && turn && (
          <Overlay>
            <Coaster className="flex w-72 flex-col gap-2">
              {canAct(turn.playerId) ? (
                <>
                  <h2 className="text-center text-lg font-bold text-amber-soft">
                    {strings.give31Title}
                  </h2>
                  {state.players
                    .filter((p) => p.id !== activePlayer.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          dispatch({
                            t: 'GIVE_SIPS_31',
                            playerId: turn.playerId,
                            targetPlayerId: p.id,
                          })
                        }
                        className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground active:scale-95"
                      >
                        {p.emoji} {p.name}
                      </button>
                    ))}
                </>
              ) : (
                <p className="text-center text-lg text-amber-soft">
                  {strings.waitingFor31(activePlayer.name)}
                </p>
              )}
            </Coaster>
          </Overlay>
        )}

        {showTiebreak && state.tiebreak && (
          <Overlay>
            <Coaster className="flex w-72 flex-col gap-2 text-center">
              <h2 className="text-lg font-bold text-amber-soft">{strings.tiebreakTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {strings.tiebreakExplain(state.rules.tiebreakHoogsteVerliest)}
                {state.tiebreak.multiplier > 1 &&
                  ` · ${strings.tiebreakMultiplier(state.tiebreak.multiplier)}`}
              </p>
              <ul className="text-sm">
                {state.tiebreak.playerIds.map((id) => {
                  const p = state.players.find((pl) => pl.id === id)
                  const roll = state.tiebreak?.rolls[id]
                  return (
                    <li key={id}>
                      {p?.emoji} {p?.name}: {roll ?? '–'}
                    </li>
                  )
                })}
              </ul>
              {nextTiebreakPlayerId &&
                (canAct(nextTiebreakPlayerId) ? (
                  <button
                    type="button"
                    onClick={() => dispatch({ t: 'TIEBREAK_ROLL', playerId: nextTiebreakPlayerId })}
                    className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95"
                  >
                    {strings.tiebreakRollFor(nextTiebreakPlayer?.name ?? '')}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {strings.waitingForTiebreak(nextTiebreakPlayer?.name ?? '')}
                  </p>
                ))}
            </Coaster>
          </Overlay>
        )}

        {showResults && (
          <Overlay>
            <Coaster className="flex w-72 flex-col gap-3 text-center">
              {loser && lastLoss ? (
                <>
                  <h2 className="text-lg font-bold text-amber-soft">
                    {strings.loserIs(loser.name)}
                  </h2>
                  <p className="text-3xl">
                    {loser.emoji} {strings.drinks(lastLoss.amount)}
                  </p>
                </>
              ) : (
                <h2 className="text-lg font-bold text-amber-soft">{strings.noLoser}</h2>
              )}
              <ul className="text-sm text-muted-foreground">
                {state.players.map((p) => (
                  <li key={p.id}>
                    {p.emoji} {p.name}: {p.roundScore !== null ? rankLabel(p.roundScore) : '–'} ·{' '}
                    {p.sipsTotal} {strings.sips}
                  </li>
                ))}
              </ul>
              {isHost ? (
                <button
                  type="button"
                  onClick={() => dispatch({ t: 'NEXT_ROUND' })}
                  className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95"
                >
                  {strings.nextRound}
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">{strings.waitForHost}</p>
              )}
              <button type="button" onClick={leave} className="text-sm text-muted-foreground">
                {strings.stopGame}
              </button>
            </Coaster>
          </Overlay>
        )}
      </div>

      {phase === 'playing' && turn && activePlayer && (
        <section className="flex flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-ivory">
              {activePlayer.emoji} {activePlayer.name}{' '}
              <span className="font-normal text-muted-foreground">
                {strings.turnOf}
                {!activePlayer.connected && ` · ${strings.offline}`}
              </span>
            </span>
            <span className="text-muted-foreground">
              {strings.throwCount(turn.throwsUsed, turn.maxThrows)}
            </span>
          </div>

          <div className="flex h-6 items-center justify-between text-sm">
            <span className="text-amber-soft">
              {animating
                ? strings.rolling
                : turn.dice
                  ? `${scoreLabel(turn.dice[0].value, turn.dice[1].value)}${
                      turn.dice.some((d) => d.vers)
                        ? ` · ${turn.dice
                            .filter((d) => d.vers)
                            .map((d) => `${d.value} ${strings.versLocked}`)
                            .join(', ')}`
                        : ''
                    }`
                  : myPlayerId === null
                    ? strings.passPhone(activePlayer.name)
                    : ''}
            </span>
            {lastError && <span className="text-destructive">{strings.errors[lastError]}</span>}
          </div>

          {showSkip && (
            <button
              type="button"
              onClick={() => dispatch({ t: 'FORFEIT_TURN', playerId: turn.playerId })}
              className="rounded-lg bg-destructive/80 px-4 py-2 font-semibold text-ivory active:scale-95"
            >
              {strings.skipTurn}
            </button>
          )}

          {showFlip && (
            <button
              type="button"
              onClick={() => dispatch({ t: 'FLIP_65', playerId: turn.playerId })}
              className="rounded-lg bg-amber-soft px-4 py-2 font-bold text-wood-950 active:scale-95"
            >
              {strings.flipToMex}
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch({ t: 'ROLL', playerId: turn.playerId })}
              disabled={disabled({ t: 'ROLL', playerId: turn.playerId })}
              className="flex-1 rounded-lg bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
            >
              {strings.roll}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ t: 'END_TURN', playerId: turn.playerId })}
              disabled={disabled({ t: 'END_TURN', playerId: turn.playerId })}
              className="flex-1 rounded-lg bg-secondary px-4 py-3 text-lg font-semibold text-secondary-foreground active:scale-95 disabled:opacity-50"
            >
              {strings.stay}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-wood-950/70 p-4">
      {children}
    </div>
  )
}
