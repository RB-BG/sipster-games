// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, X } from 'lucide-react'
import Coaster from '@/components/Coaster'
import PlayerChip from '@/components/PlayerChip'
import ScorePop, { type Pop, type PopKind } from '@/components/effects/ScorePop'
import { DrinkShotLayer, SHOT_MS, type Hit, type Shot } from '@/components/effects/DrinkShots'
import Card, { StaticCard } from '@/cards/Card'
import { flatFlipOrder } from '@/engine/pyramid'
import type { AnswerChoice, Card as CardValue, PlayerState, Rank, Suit } from '@/engine/types'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStrings } from '@/store/localeStore'
import { hapticDeal, hapticDrink, hapticFanfare, hapticSlap } from '@/lib/haptics'
import { isMuted, playDeal, playDrink, playFanfare, playSlap, setMuted } from '@/lib/sound'

// De vier vragen, elk met hun twee keuzes.
const QUESTION_CHOICES: AnswerChoice[][] = [
  ['rood', 'zwart'],
  ['hoger', 'lager'],
  ['binnen', 'buiten'],
  ['heb', 'niet'],
]

export default function GameScreen() {
  const strings = useStrings()
  const {
    state,
    myPlayerId,
    isHost,
    animating,
    cardAnim,
    bluffToast,
    lastError,
    connection,
    dispatch,
    onRollSettled,
    leave,
  } = useGameAdapter()

  useWakeLock()

  // Tik op een spelerchip om (open) zijn kaarten te bekijken en claims te controleren.
  const [inspectId, setInspectId] = useState<string | null>(null)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  // --- Fullscreen pops -----------------------------------------------------
  const [pop, setPop] = useState<Pop | null>(null)
  const popTimer = useRef<number | null>(null)
  // Op een microtaak gezet zodat het geen synchrone setState in een effect is.
  function firePop(kind: PopKind, name?: string, ms = 1300) {
    const id = Date.now()
    window.setTimeout(() => setPop({ id, kind, name }), 0)
    if (popTimer.current !== null) window.clearTimeout(popTimer.current)
    popTimer.current = window.setTimeout(() => setPop(null), ms)
  }

  // Call bluff: toast + pop wanneer de verdict verandert.
  const [dismissedToastId, setDismissedToastId] = useState(0)
  const toastId = bluffToast?.id ?? 0
  useEffect(() => {
    if (toastId === 0) return
    playSlap()
    hapticSlap()
    const s = stateRef.current
    const target = s?.players.find((p) => p.id === bluffToast?.targetPlayerId)
    firePop(bluffToast?.verdict === 'betrapt' ? 'bluf-betrapt' : 'bluf-mis', target?.name, 1600)
    const timer = window.setTimeout(() => setDismissedToastId(toastId), 3200)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId])
  const toastVisible = bluffToast !== null && toastId !== dismissedToastId

  // Kaart-geluid bij een nieuwe reveal.
  const animId = cardAnim?.id ?? 0
  useEffect(() => {
    if (animId === 0) return
    playDeal()
    hapticDeal()
  }, [animId])

  // Goed geraden (questions): pop zodra de pending give verschijnt.
  const pendingGiveKey = state?.pendingGive
    ? `${state.pendingGive.playerId}:${state.pendingGive.amount}`
    : ''
  const seenGive = useRef<string | null>(null)
  useEffect(() => {
    if (seenGive.current === null) {
      seenGive.current = pendingGiveKey
      return
    }
    if (
      pendingGiveKey &&
      pendingGiveKey !== seenGive.current &&
      stateRef.current?.phase === 'questions'
    ) {
      firePop('correct', undefined, 1100)
    }
    seenGive.current = pendingGiveKey
  }, [pendingGiveKey])

  // Einde van het potje: fanfare.
  const ended = state?.phase === 'ended'
  useEffect(() => {
    if (!ended) return
    firePop('bus-uit', undefined, 1800)
    playFanfare()
    hapticFanfare()
  }, [ended])

  // --- Drink-shots: elke nieuwe sipsLog-entry vliegt een biertje naar de chip.
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
    if (seenSips.current === null || seenSips.current > log.length) {
      seenSips.current = log.length
      return
    }
    const fresh = log.slice(seenSips.current)
    const startIndex = seenSips.current
    seenSips.current = log.length
    if (fresh.length === 0) return

    // Pop op een foute gok of een bus-af (bluf heeft z'n eigen toast/pop).
    const last = fresh[fresh.length - 1]
    if (last.reason === 'fout') firePop('fout', undefined, 1000)
    else if (last.reason === 'bus') firePop('bus-af', undefined, 1200)

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
        key: `${startIndex + i}-${entry.playerId}`,
        playerId: entry.playerId,
        amount: entry.amount,
        x0: stageRect.left + stageRect.width / 2 - mainRect.left - 16,
        y0: stageRect.top + stageRect.height / 2 - mainRect.top - 16,
        x1: c.left + c.width / 2 - mainRect.left - 16,
        y1: c.top + c.height / 2 - mainRect.top - 16,
      }
      window.setTimeout(() => {
        setShots((prev) => [...prev, shot])
        window.setTimeout(() => {
          setShots((prev) => prev.filter((s) => s.key !== shot.key))
          arrive(shot)
        }, SHOT_MS)
      }, i * 260)
    })
  }, [sipsLogLength])

  const [muted, setMutedState] = useState(isMuted)
  function toggleMuted() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  if (!state) return null
  const { phase } = state
  const canAct = (playerId: string) => myPlayerId === null || myPlayerId === playerId

  // Slokken die een speler in de huidige fase binnenkreeg (bussen kent geen rondes).
  const phaseSips = (playerId: string) =>
    state.sipsLog
      .filter((e) => e.phase === phase && e.playerId === playerId)
      .reduce((sum, e) => sum + e.amount, 0)

  const heroFlip = cardAnim
    ? { id: cardAnim.id, card: cardAnim.card, animSeed: cardAnim.animSeed }
    : null

  return (
    <main ref={mainRef} className="relative flex h-dvh flex-col px-safe pt-safe pb-safe">
      <header className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
        <span>{phaseName(phase, strings)}</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleMuted} aria-label={muted ? strings.soundOn : strings.soundOff}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button type="button" onClick={leave} aria-label={strings.stopGame}>
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-2 px-4 pb-2">
        {state.players.map((player) => (
          <motion.div
            key={player.id}
            ref={(el) => {
              if (el) chipEls.current.set(player.id, el)
              else chipEls.current.delete(player.id)
            }}
            animate={hits.some((h) => h.playerId === player.id) ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <button
              type="button"
              onClick={() => setInspectId(player.id)}
              aria-label={strings.handTitle(player.name)}
              className="block active:scale-95"
            >
              <PlayerChip
                player={player}
                active={player.id === state.turn?.playerId}
                roundSips={phaseSips(player.id)}
                driver={state.bus?.driverIds.includes(player.id) ?? false}
              />
            </button>
          </motion.div>
        ))}
      </div>
      <p className="pb-1 text-center text-[10px] text-muted-foreground">{strings.scoreLegend}</p>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-4"
      >
        <Card flip={heroFlip} faceDown={heroFlip === null} size={132} onSettled={onRollSettled} />

        {phase === 'questions' && <QuestionsStage state={state} />}
        {phase === 'pyramid' && <PyramidStage state={state} />}
        {phase === 'bus' && <BusStage state={state} />}

        {connection === 'reconnecting' && (
          <Overlay>
            <Coaster className="w-72 text-center">
              <p className="text-cyan-soft">{strings.connectionLost}</p>
            </Coaster>
          </Overlay>
        )}
        {connection === 'closed' && (
          <Overlay>
            <Coaster className="flex w-72 flex-col gap-3 text-center">
              <p className="text-cyan-soft">{strings.tableGone}</p>
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

        {toastVisible && bluffToast && (
          <p className="absolute inset-x-4 top-2 z-20 rounded-lg bg-night-950/90 px-3 py-2 text-center text-sm text-cyan-soft">
            {strings.bluffVerdict(
              state.players.find((p) => p.id === bluffToast.byPlayerId)?.name ?? '',
              bluffToast.verdict,
            )}
          </p>
        )}

        {ended && <EndedOverlay />}
      </div>

      {!animating && phase !== 'ended' && (
        <section className="flex flex-col gap-2 p-4">
          {lastError && <p className="text-center text-sm text-destructive">{strings.errors[lastError]}</p>}
          <SkipBar state={state} isHost={isHost} dispatch={dispatch} />
          {state.pendingGive && !state.pyramid?.openClaim ? (
            <GiveBar state={state} canAct={canAct} dispatch={dispatch} />
          ) : phase === 'questions' ? (
            <QuestionsActions state={state} canAct={canAct} dispatch={dispatch} />
          ) : phase === 'pyramid' ? (
            <PyramidActions
              state={state}
              myPlayerId={myPlayerId}
              isHost={isHost}
              canAct={canAct}
              dispatch={dispatch}
            />
          ) : phase === 'bus' ? (
            <BusActions state={state} canAct={canAct} dispatch={dispatch} />
          ) : null}
        </section>
      )}

      <HandInspector
        player={state.players.find((p) => p.id === inspectId) ?? null}
        onClose={() => setInspectId(null)}
      />

      <DrinkShotLayer shots={shots} hits={hits} />
      <ScorePop pop={pop} />
    </main>
  )
}

type State = NonNullable<ReturnType<typeof useGameAdapter>['state']>
type Strings = ReturnType<typeof useStrings>
type Dispatch = ReturnType<typeof useGameAdapter>['dispatch']

function phaseName(phase: string, strings: Strings): string {
  switch (phase) {
    case 'questions':
      return strings.questionsPhase
    case 'pyramid':
      return strings.pyramidPhase
    case 'bus':
      return strings.busPhase
    default:
      return strings.finalTitle
  }
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-night-950/70 p-4">
      {children}
    </div>
  )
}

/** Toont de kaarten van één speler in een modaltje; tik buiten of op Sluit om te sluiten. */
function HandInspector({ player, onClose }: { player: PlayerState | null; onClose: () => void }) {
  const strings = useStrings()
  if (!player) return null
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-night-950/80 p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Coaster className="flex w-64 flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-cyan-soft">
            {player.emoji} {strings.handTitle(player.name)}
          </p>
          {player.hand.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1.5">
              {player.hand.map((c, i) => (
                <StaticCard key={i} card={c} size={56} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{strings.handEmpty}</p>
          )}
          <p className="text-xs text-muted-foreground">{player.sipsTotal} 🍺</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95"
          >
            {strings.close}
          </button>
        </Coaster>
      </div>
    </div>
  )
}

/**
 * Host-noodrem: is de speler op wie iedereen wacht (beurt, give of bus)
 * weggevallen, dan kan de host zijn actie overslaan in plaats van de hele
 * tafel te moeten sluiten. In hotseat is iedereen "connected" en rendert
 * dit dus nooit.
 */
function SkipBar({ state, isHost, dispatch }: { state: State; isHost: boolean; dispatch: Dispatch }) {
  const strings = useStrings()
  if (!isHost) return null
  const stuckId =
    state.phase === 'questions'
      ? (state.pendingGive?.playerId ?? state.turn?.playerId)
      : state.phase === 'pyramid'
        ? (state.pyramid?.openClaim?.claimantId ?? state.pendingGive?.playerId)
        : state.phase === 'bus'
          ? state.bus?.driverIds.find(
              (id) => state.players.find((p) => p.id === id)?.connected === false,
            )
          : undefined
  const stuck = state.players.find((p) => p.id === stuckId)
  if (!stuck || stuck.connected) return null
  return (
    <button
      type="button"
      onClick={() => dispatch({ t: 'FORFEIT_TURN' })}
      className="self-center rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground active:scale-95"
    >
      {strings.skipTurn(stuck.name)}
    </button>
  )
}

// --- Questions -----------------------------------------------------------

function QuestionsStage({ state }: { state: State }) {
  const strings = useStrings()
  const turn = state.turn
  if (!turn) return null
  const player = state.players.find((p) => p.id === turn.playerId)
  const hand = player?.hand ?? []
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-lg font-semibold text-cyan-soft">
        {player?.emoji} {player?.name} {strings.turnOf}
      </p>
      {hand.length > 0 && (
        <div className="flex gap-1.5">
          {hand.map((c, i) => (
            <StaticCard key={i} card={c} size={52} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionsActions({
  state,
  canAct,
  dispatch,
}: {
  state: State
  canAct: (id: string) => boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  const turn = state.turn
  if (!turn) return null
  const player = state.players.find((p) => p.id === turn.playerId)
  if (!canAct(turn.playerId)) {
    return <p className="text-center text-sm text-muted-foreground">{strings.passPhone(player?.name ?? '')}</p>
  }
  const choices = QUESTION_CHOICES[turn.questionIndex]
  return (
    <>
      <div className="text-center">
        <p className="text-lg font-bold text-ivory">{strings.questionTitle(turn.questionIndex)}</p>
        <p className="text-xs text-muted-foreground">{strings.questionSub(turn.questionIndex)}</p>
      </div>
      <div className="flex gap-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => dispatch({ t: 'ANSWER', playerId: turn.playerId, choice })}
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground active:scale-95"
          >
            {strings.answerLabel(choice)}
          </button>
        ))}
      </div>
    </>
  )
}

// --- Give (gedeeld door questions en piramide) ---------------------------

function GiveBar({
  state,
  canAct,
  dispatch,
}: {
  state: State
  canAct: (id: string) => boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  const give = state.pendingGive!
  const giver = state.players.find((p) => p.id === give.playerId)
  if (!canAct(give.playerId)) {
    return <p className="text-center text-sm text-muted-foreground">{strings.waitingForGive(giver?.name ?? '')}</p>
  }
  return (
    <>
      <p className="text-center text-lg font-bold text-cyan-soft">{strings.giveTitle(give.amount)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {state.players
          .filter((p) => p.id !== give.playerId)
          .map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => dispatch({ t: 'GIVE_SIPS', playerId: give.playerId, targetPlayerId: p.id })}
              className="rounded-lg bg-secondary px-4 py-2 text-secondary-foreground active:scale-95"
            >
              {p.emoji} {p.name}
            </button>
          ))}
      </div>
    </>
  )
}

// --- Piramide ------------------------------------------------------------

function PyramidStage({ state }: { state: State }) {
  const pyramid = state.pyramid
  if (!pyramid) return null
  const total = flatFlipOrder(pyramid.rows).length
  let flatIndex = 0
  return (
    <div className="flex flex-col-reverse items-center gap-1">
      {pyramid.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((c, i) => {
            const isFlipped = flatIndex < pyramid.flipIndex
            const isCurrent = flatIndex === pyramid.flipIndex - 1
            flatIndex++
            return (
              <StaticCard
                key={i}
                card={c}
                faceDown={!isFlipped}
                size={isCurrent ? 54 : 44}
                dim={isFlipped && !isCurrent}
              />
            )
          })}
        </div>
      ))}
      <p className="mt-1 text-xs text-muted-foreground">
        {pyramid.flipIndex} / {total}
      </p>
    </div>
  )
}

function PyramidActions({
  state,
  myPlayerId,
  isHost,
  canAct,
  dispatch,
}: {
  state: State
  myPlayerId: string | null
  isHost: boolean
  canAct: (id: string) => boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  const pyramid = state.pyramid!
  const total = flatFlipOrder(pyramid.rows).length
  const claimant = pyramid.openClaim?.claimantId ?? null

  // Een lopende claim: de claimant deelt zijn slokken uit (GiveBar), en zolang
  // het claim-venster open is mag elke andere speler call bluff roepen.
  if (claimant !== null) {
    const callers = state.players.filter((p) => p.id !== claimant && canAct(p.id))
    return (
      <>
        {state.pendingGive && <GiveBar state={state} canAct={canAct} dispatch={dispatch} />}
        {state.rules.bluffen && callers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {callers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => dispatch({ t: 'CALL_BLUFF', playerId: p.id, targetPlayerId: claimant })}
                className="rounded-full bg-destructive px-5 py-3 font-bold text-ivory active:scale-90"
              >
                {myPlayerId === null ? `${p.emoji} ` : ''}
                {strings.callBluff}
              </button>
            ))}
          </div>
        )}
      </>
    )
  }

  const rank = pyramid.currentRank
  const canFlip = pyramid.flipIndex < total
  const claimers =
    rank !== null
      ? state.players.filter((p) => canAct(p.id) && canClaim(p, rank, state.rules.bluffen))
      : []

  return (
    <>
      {rank !== null && claimers.length > 0 && (
        <>
          <p className="text-center text-xs text-muted-foreground">{strings.pyramidHint}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {claimers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => dispatch({ t: 'PLAY_CARD', playerId: p.id, card: claimCard(p.hand, rank) })}
                className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground active:scale-95"
              >
                {myPlayerId === null ? `${p.emoji} ` : ''}
                {strings.claim}
              </button>
            ))}
          </div>
        </>
      )}
      {(isHost || myPlayerId === null) &&
        (canFlip ? (
          <button
            type="button"
            onClick={() => dispatch({ t: 'FLIP_PYRAMID', playerId: state.hostId })}
            className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground active:scale-95"
          >
            {strings.flipCard}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ t: 'NEXT_PHASE' })}
            className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground active:scale-95"
          >
            {strings.startBus}
          </button>
        ))}
      {!isHost && myPlayerId !== null && !canFlip && (
        <p className="text-center text-sm text-muted-foreground">{strings.waitingForFlip}</p>
      )}
    </>
  )
}

/**
 * Mag deze speler nu claimen? Elke claim legt een kaart af, dus met een lege hand
 * kan het niet meer. Zonder de bluf-regel moet de rank ook echt in de hand zitten.
 */
function canClaim(player: PlayerState, rank: Rank, bluffen: boolean): boolean {
  if (player.hand.length === 0) return false
  if (bluffen) return true
  return player.hand.some((c) => c.rank === rank)
}

/** Kies een kaart van de gevraagde rank uit de hand; bluf pakt een willekeurige suit. */
function claimCard(hand: CardValue[], rank: Rank): CardValue {
  const held = hand.find((c) => c.rank === rank)
  if (held) return held
  const suits: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
  return { rank, suit: suits[0] }
}

// --- Bus -----------------------------------------------------------------

function BusStage({ state }: { state: State }) {
  const strings = useStrings()
  const bus = state.bus
  if (!bus) return null
  const driverNames = bus.driverIds
    .map((id) => state.players.find((p) => p.id === id))
    .map((p) => `${p?.emoji ?? ''} ${p?.name ?? ''}`.trim())
    .join(', ')
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-lg font-semibold text-cyan-soft">{strings.busDriver(driverNames)}</p>
      <div className="flex flex-wrap justify-center gap-1">
        {bus.cards.map((c, i) => (
          <StaticCard
            key={i}
            card={c}
            faceDown={i > bus.position}
            size={i === bus.position ? 58 : 44}
            dim={i < bus.position}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strings.busPosition(bus.position + 1, bus.cards.length)}</p>
    </div>
  )
}

function BusActions({
  state,
  canAct,
  dispatch,
}: {
  state: State
  canAct: (id: string) => boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  const bus = state.bus!
  const driverId = bus.driverIds[0]
  const actor = bus.driverIds.find((id) => canAct(id))
  if (actor === undefined) {
    const name = state.players.find((p) => p.id === driverId)?.name ?? ''
    return <p className="text-center text-sm text-muted-foreground">{strings.waitingForBus(name)}</p>
  }
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => dispatch({ t: 'BUS_GUESS', playerId: actor, choice: 'hoger', position: bus.position })}
        className="flex-1 rounded-lg bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground active:scale-95"
      >
        {strings.higher}
      </button>
      <button
        type="button"
        onClick={() => dispatch({ t: 'BUS_GUESS', playerId: actor, choice: 'lager', position: bus.position })}
        className="flex-1 rounded-lg bg-accent px-4 py-3 text-lg font-semibold text-accent-foreground active:scale-95"
      >
        {strings.lower}
      </button>
    </div>
  )
}

// --- Einde ---------------------------------------------------------------

function EndedOverlay() {
  const strings = useStrings()
  const { state, leave } = useGameAdapter()
  if (!state) return null
  const ranked = [...state.players].sort((a, b) => b.sipsTotal - a.sipsTotal)
  return (
    <Overlay>
      <Coaster className="flex w-72 flex-col gap-3 text-center">
        <h2 className="text-lg font-bold text-cyan-soft">{strings.finalTitle}</h2>
        <ol className="flex flex-col gap-1">
          {ranked.map((p, i) => (
            <li key={p.id} className={i === 0 ? 'text-xl text-cyan-soft' : 'text-ivory'}>
              {i === 0 ? '🍺' : `${i + 1}.`} {p.emoji} {p.name}: {p.sipsTotal} {strings.sips}
            </li>
          ))}
        </ol>
        {ranked.length > 0 && <p className="text-sm text-muted-foreground">{strings.wettest(ranked[0].name)}</p>}
        <button
          type="button"
          onClick={leave}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95"
        >
          {strings.backHome}
        </button>
      </Coaster>
    </Overlay>
  )
}
