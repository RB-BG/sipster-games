// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Hand, Volume2, VolumeX, X } from 'lucide-react'
import Coaster from '@/components/Coaster'
import PlayerChip from '@/components/PlayerChip'
import ScorePop, { type Pop, type PopKind } from '@/components/effects/ScorePop'
import { DrinkShotLayer, SHOT_MS, type Hit, type Shot } from '@/components/effects/DrinkShots'
import { rankLabel, scoreLabel, scoreRank } from '@/engine/score'
import type { Command, DieId } from '@/engine/types'
import { validateCommand } from '@/engine/validate'
import Dice from '@/dice/Dice'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useShakeToRoll } from '@/hooks/useShakeToRoll'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStrings } from '@/store/localeStore'
import { hapticDrink, hapticMex, hapticRidder, hapticRoll, hapticSlap } from '@/lib/haptics'
import { isMuted, playDrink, playMex, playRidder, playRoll, playSlap, setMuted } from '@/lib/sound'

export default function GameScreen() {
  const strings = useStrings()
  const {
    state,
    myPlayerId,
    isHost,
    animating,
    rollAnim,
    flipAnim,
    afslaanToast,
    lastError,
    connection,
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

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  const reduced = useReducedMotion() ?? false

  // Fullscreen score-pops (mex, 32, 31) getriggerd door de landende worp.
  const [pop, setPop] = useState<Pop | null>(null)
  const popTimer = useRef<number | null>(null)
  function handleScore(label: string) {
    if (label !== 'mex' && label !== '32' && label !== '31') return
    setPop({ id: Date.now(), kind: label as PopKind })
    if (label === '32') navigator.vibrate?.(60)
    if (popTimer.current !== null) window.clearTimeout(popTimer.current)
    popTimer.current = window.setTimeout(() => setPop(null), label === 'mex' ? 1400 : 1100)
  }

  // Ridderslag: pop zodra het ridderschap (of de dubbele promotie) wisselt.
  // Via de state-wissel, dus werkt in hotseat én multiplayer; viewState loopt
  // achter op de animatie, dus de pop komt pas als de 1-1 zichtbaar ligt.
  const seenRidder = useRef<string | null>(null)
  const ridderKey = state ? `${state.ridderId ?? ''}:${state.ridderDubbel ? '2' : '1'}` : null
  useEffect(() => {
    if (ridderKey === null) {
      seenRidder.current = null
      return
    }
    // Eerste keer (mount of rejoin): bestaande ridder niet naschieten.
    if (seenRidder.current === null) {
      seenRidder.current = ridderKey
      return
    }
    if (seenRidder.current === ridderKey) return
    seenRidder.current = ridderKey

    const s = stateRef.current
    const knight = s?.players.find((p) => p.id === s.ridderId)
    if (!knight) return
    const dubbel = s?.ridderDubbel ?? false
    window.setTimeout(() => {
      setPop({ id: Date.now(), kind: dubbel ? 'ridderDubbel' : 'ridder', name: knight.name })
      playRidder()
      hapticRidder()
      if (popTimer.current !== null) window.clearTimeout(popTimer.current)
      popTimer.current = window.setTimeout(() => setPop(null), 1700)
    }, 0)
  }, [ridderKey])

  // Drink-shots: elke nieuwe sipsLog-entry schiet een 🍺 in een boog naar de
  // chip van de drinker. viewState loopt achter op de animatie, dus dit vuurt
  // precies op het moment dat de speler de uitslag ziet.
  const mainRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const chipEls = useRef(new Map<string, HTMLDivElement>())
  const [shots, setShots] = useState<Shot[]>([])
  const [hits, setHits] = useState<Hit[]>([])
  const seenSips = useRef<number | null>(null)
  const sipsLogLength = state?.sipsLog.length ?? -1
  useEffect(() => {
    const log = stateRef.current?.sipsLog
    if (!log) {
      seenSips.current = null
      return
    }
    // Eerste keer (of nieuw potje): historie niet naschieten.
    if (seenSips.current === null || seenSips.current > log.length) {
      seenSips.current = log.length
      return
    }
    const fresh = log.slice(seenSips.current)
    seenSips.current = log.length
    if (fresh.length === 0) return

    const mainRect = mainRef.current?.getBoundingClientRect()
    const stageRect = stageRef.current?.getBoundingClientRect()
    if (!mainRect || !stageRect) return

    const arrive = (shot: Shot) => {
      playDrink()
      hapticDrink()
      setHits((prev) => [...prev, { key: shot.key, playerId: shot.playerId, amount: shot.amount, x: shot.x1, y: shot.y1 }])
      window.setTimeout(() => setHits((prev) => prev.filter((h) => h.key !== shot.key)), 900)
    }

    fresh.forEach((entry, i) => {
      const chip = chipEls.current.get(entry.playerId)
      if (!chip) return
      const c = chip.getBoundingClientRect()
      const shot: Shot = {
        key: `${entry.round}-${log.indexOf(entry)}-${entry.playerId}-${i}`,
        playerId: entry.playerId,
        amount: entry.amount,
        x0: stageRect.left + stageRect.width / 2 - mainRect.left - 16,
        y0: stageRect.top + stageRect.height / 2 - mainRect.top - 16,
        x1: c.left + c.width / 2 - mainRect.left - 16,
        y1: c.top + c.height / 2 - mainRect.top - 16,
      }
      window.setTimeout(() => {
        if (reduced) {
          arrive(shot)
          return
        }
        setShots((prev) => [...prev, shot])
        window.setTimeout(() => {
          setShots((prev) => prev.filter((s) => s.key !== shot.key))
          arrive(shot)
        }, SHOT_MS)
      }, i * 280)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sipsLogLength])

  const [muted, setMutedState] = useState(isMuted)
  function toggleMuted() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  // Geluid + haptics op de spelmomenten.
  const rollAnimId = rollAnim?.id ?? 0
  useEffect(() => {
    if (rollAnimId === 0) return
    playRoll()
    hapticRoll()
  }, [rollAnimId])
  useEffect(() => {
    if (toastId === 0) return
    playSlap()
    hapticSlap()
  }, [toastId])
  // Mex-fanfare pas als de worp is uitgerold, anders verklapt het geluid de uitslag.
  const mexPlayedFor = useRef<string | null>(null)
  useEffect(() => {
    if (animating) return
    const last = stateRef.current?.lastTurnSummary
    if (!last?.wasMex) return
    const key = `${stateRef.current?.round.number}-${last.playerId}`
    if (mexPlayedFor.current === key) return
    mexPlayedFor.current = key
    playMex()
    hapticMex()
  }, [animating])

  /** In hotseat (myPlayerId null) mag alles; online alleen je eigen acties. */
  const canAct = (playerId: string) => myPlayerId === null || myPlayerId === playerId
  const rollableNow =
    state !== null &&
    state.phase === 'playing' &&
    state.turn !== null &&
    !animating &&
    canAct(state.turn.playerId) &&
    validateCommand(state, { t: 'ROLL', playerId: state.turn.playerId }) === null
  const shake = useShakeToRoll(rollableNow, () => {
    const turnNow = stateRef.current?.turn
    if (turnNow) dispatch({ t: 'ROLL', playerId: turnNow.playerId })
  })

  if (!state) return null
  const { turn, phase } = state
  const activePlayer = state.players.find((p) => p.id === turn?.playerId)

  // Tijdens de animatie is de state al bijgewerkt (verse 1/2 staat dan al op
  // onTable) maar de stenen vliegen nog: leid held dan af uit de worp zelf,
  // anders schiet een net gegooide 1/2 halverwege de vlucht naar zijn zijslot.
  const held: [boolean, boolean] =
    animating && rollAnim
      ? [!rollAnim.dieIds.includes(0), !rollAnim.dieIds.includes(1)]
      : phase === 'playing' && turn?.dice
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
  // Ook zichtbaar in roundEnd: een mex die de ronde afsloot blijft afklopbaar.
  const showAfslaan =
    state.rules.afslaan &&
    (phase === 'playing' || phase === 'roundEnd') &&
    myPlayerId !== null &&
    !animating
  const toastPlayer =
    afslaanToast && state.players.find((p) => p.id === afslaanToast.byPlayerId)

  return (
    <main ref={mainRef} className="relative flex h-dvh flex-col px-safe pt-safe pb-safe">
      <header className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
        <span>
          {strings.round(state.round.number)}
          {state.round.mexCount > 0 && ` · ${strings.mexCount(state.round.mexCount)}`}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? strings.soundOn : strings.soundOff}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button type="button" onClick={leave} aria-label={strings.stopGame}>
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-2 px-4 pb-2">
        {state.players.map((player) => {
          const hitKey = hits.find((h) => h.playerId === player.id)?.key
          return (
            <motion.div
              key={player.id}
              ref={(el) => {
                if (el) chipEls.current.set(player.id, el)
                else chipEls.current.delete(player.id)
              }}
              animate={hitKey ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <PlayerChip
                player={player}
                active={player.id === turn?.playerId}
                ridder={
                  state.ridderId === player.id ? (state.ridderDubbel ? 'dubbel' : 'ridder') : null
                }
              />
            </motion.div>
          )
        })}
      </div>

      <div ref={stageRef} className="relative min-h-0 flex-1">
        <Dice
          roll={rollAnim}
          flip={flipAnim}
          held={held}
          onDieClick={onDieClick}
          onSettled={onRollSettled}
          onScore={handleScore}
        />

        {connection === 'reconnecting' && (
          <Overlay>
            <Coaster className="w-72 text-center">
              <p className="text-amber-soft">{strings.connectionLost}</p>
            </Coaster>
          </Overlay>
        )}
        {connection === 'closed' && (
          <Overlay>
            <Coaster className="flex w-72 flex-col gap-3 text-center">
              <p className="text-amber-soft">{strings.tableGone}</p>
              <button
                type="button"
                onClick={leave}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
              >
                {strings.backHome}
              </button>
            </Coaster>
          </Overlay>
        )}

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
              {nextTiebreakPlayer && !nextTiebreakPlayer.connected && isHost && (
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ t: 'FORFEIT_TURN', playerId: nextTiebreakPlayer.id })
                  }
                  className="rounded-lg bg-destructive/80 px-4 py-2 font-semibold text-ivory active:scale-95"
                >
                  {strings.skipTurn}
                </button>
              )}
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
              {state.sipsLog.length > 0 && (
                <details className="text-left text-xs text-muted-foreground">
                  <summary className="cursor-pointer text-center">{strings.sipsLogTitle}</summary>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {state.sipsLog.slice(-12).map((entry, i) => (
                      <li key={i}>
                        r{entry.round} ·{' '}
                        {state.players.find((p) => p.id === entry.playerId)?.name ?? entry.playerId}
                        : +{entry.amount} ({strings.sipReasons[entry.reason] ?? entry.reason})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={() => dispatch({ t: 'NEXT_ROUND' })}
                    className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95"
                  >
                    {strings.nextRound}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ t: 'END_GAME' })}
                    className="text-sm text-muted-foreground"
                  >
                    {strings.endGame}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{strings.waitForHost}</p>
              )}
            </Coaster>
          </Overlay>
        )}

        {phase === 'ended' && (
          <Overlay>
            <Coaster className="flex w-72 flex-col gap-3 text-center">
              <h2 className="text-lg font-bold text-amber-soft">{strings.finalTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {strings.roundsPlayed(state.round.number)}
              </p>
              <ol className="flex flex-col gap-1">
                {[...state.players]
                  .sort((a, b) => b.sipsTotal - a.sipsTotal)
                  .map((p, i) => (
                    <li key={p.id} className={i === 0 ? 'text-xl text-amber-soft' : 'text-ivory'}>
                      {i === 0 ? '🍺' : `${i + 1}.`} {p.emoji} {p.name}: {p.sipsTotal}{' '}
                      {strings.sips}
                    </li>
                  ))}
              </ol>
              {state.players.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {strings.wettest(
                    [...state.players].sort((a, b) => b.sipsTotal - a.sipsTotal)[0].name,
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={leave}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95"
              >
                {strings.backHome}
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
              onClick={() => {
                // iOS DeviceMotion-permissie mag alleen vanuit een tap; lift mee op Gooi.
                shake.requestFromGesture()
                dispatch({ t: 'ROLL', playerId: turn.playerId })
              }}
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
          {shake.supported && rollableNow && (
            <p className="text-center text-xs text-muted-foreground">{strings.shakeHint}</p>
          )}
        </section>
      )}

      <DrinkShotLayer shots={shots} hits={hits} />
      <ScorePop pop={pop} />
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
