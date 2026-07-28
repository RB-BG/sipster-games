// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { type ReactNode, useState } from 'react'
import { Eye, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import { StaticCard } from '@/cards/Card'
import PlayerChip from '@/components/PlayerChip'
import type { Command, GameState, HandCard } from '@/engine/types'
import { handValue, isValidGroup, sameCard } from '@/engine/values'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useWakeLock } from '@/hooks/useWakeLock'
import { hapticDeal, hapticDrink, hapticFanfare } from '@/lib/haptics'
import { isMuted, playDeal, playDrink, playFanfare, setMuted } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { useStrings } from '@/store/localeStore'

type Strings = ReturnType<typeof useStrings>
type Dispatch = (cmd: Command) => void

/** Stabiele identiteit van een kaart, om de zojuist getrokken kaart te herkennen. */
function cardKey(c: HandCard): string {
  return c.kind === 'joker' ? `j${c.jid}` : `${c.suit}-${c.rank}`
}

/** Kaartweergave die ook een joker aankan; de joker vult de kaart net als de andere. */
function CardView({
  card,
  size = 80,
  faceDown = false,
}: {
  card?: HandCard | null
  size?: number
  faceDown?: boolean
}) {
  if (faceDown || !card) return <StaticCard faceDown size={size} />
  if (card.kind === 'joker') {
    return (
      <div className="card-static">
        <div className="card-face-front" style={{ width: size, height: size, color: '#e0a92e' }}>
          <span className="card-corner card-corner-tl">
            <span className="card-corner-rank">★</span>
          </span>
          <span className="card-center-suit">★</span>
          <span className="card-corner card-corner-br">
            <span className="card-corner-rank">★</span>
          </span>
        </div>
      </div>
    )
  }
  return <StaticCard card={{ suit: card.suit, rank: card.rank }} size={size} />
}

/** Rijtje spelerchips met de bak-meter en (tijdens het spelen) het kaart-aantal. */
function Scoreboard({
  state,
  activeId,
  showCards,
}: {
  state: GameState
  activeId?: string
  showCards: boolean
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {state.players.map((p) => (
        <PlayerChip
          key={p.id}
          player={p}
          active={p.id === activeId}
          cards={showCards ? (p.handCount ?? p.hand.length) : undefined}
        />
      ))}
    </div>
  )
}

function TopBar({
  title,
  onLeave,
  label,
  strings,
}: {
  title: string
  onLeave: () => void
  label: string
  strings: Strings
}) {
  const [muted, setMutedState] = useState(isMuted())
  return (
    <header className="flex items-center justify-between gap-2">
      <h1 className="min-w-0 truncate text-lg font-bold text-ivory">{title}</h1>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !muted
            setMuted(next)
            setMutedState(next)
          }}
          aria-label={muted ? strings.soundOff : strings.soundOn}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground active:scale-95"
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        <button
          type="button"
          onClick={onLeave}
          aria-label={label}
          className="rounded-lg bg-secondary p-2 text-secondary-foreground active:scale-95"
        >
          <X className="size-5" />
        </button>
      </div>
    </header>
  )
}

/** Trek- en aflegstapel naast elkaar. */
function Piles({ top, strings }: { top?: HandCard | null; strings: Strings }) {
  return (
    <div className="flex items-end justify-center gap-8 py-2">
      <div className="flex flex-col items-center gap-1">
        <CardView faceDown size={72} />
        <span className="text-xs text-muted-foreground">{strings.yousef.deck}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <CardView card={top} size={72} />
        <span className="text-xs text-muted-foreground">{strings.yousef.discardPile}</span>
      </div>
    </div>
  )
}

/** De hand als een rij kaarten; tikbaar (selecteren) of alleen-lezen. */
function HandGrid({
  hand,
  selected,
  onToggle,
  highlightKey,
  size = 64,
}: {
  hand: HandCard[]
  selected?: HandCard[]
  onToggle?: (card: HandCard) => void
  highlightKey?: string
  size?: number
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {hand.map((card, i) => {
        const isSel = selected?.some((s) => sameCard(s, card))
        const isNew = highlightKey !== undefined && cardKey(card) === highlightKey
        const inner = <CardView card={card} size={size} />
        const cls = cn(
          'rounded-xl transition-transform',
          isSel && '-translate-y-3 ring-2 ring-primary',
          isNew && 'ring-2 ring-amber-400',
        )
        return onToggle ? (
          <button key={i} type="button" onClick={() => onToggle(card)} className={cls}>
            {inner}
          </button>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}

/** Afscherm-scherm bij het doorgeven van de telefoon (hotseat-privacy). */
function PassGate({ name, onShow, strings }: { name: string; onShow: () => void; strings: Strings }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="text-2xl font-bold text-ivory">{strings.yousef.passTitle(name)}</p>
      <p className="text-sm text-muted-foreground">{strings.yousef.passHint}</p>
      <button
        type="button"
        onClick={onShow}
        className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg active:scale-95"
      >
        <Eye className="size-5" />
        {strings.yousef.showHand}
      </button>
    </div>
  )
}

/** De afleg-/trek-/Yousef-acties onderaan de speelbeurt. */
function ActionBar({
  state,
  selected,
  hv,
  onPlay,
  onYousef,
  strings,
}: {
  state: GameState
  selected: HandCard[]
  hv: number
  onPlay: (drawFrom: 'deck' | 'discard') => void
  onYousef: () => void
  strings: Strings
}) {
  const canDiscard = selected.length > 0 && isValidGroup(selected, state.rules.jokerWildcard)
  const canYousef = state.finalTurns === null && hv <= state.rules.yousefMax
  const hasTop = state.discardTop.length > 0
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-xs text-muted-foreground">
        {state.finalTurns
          ? strings.yousef.finalLap
          : selected.length > 0 && !canDiscard
            ? strings.yousef.invalidGroup
            : strings.yousef.pickCards}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canDiscard}
          onClick={() => onPlay('deck')}
          className="flex-1 rounded-lg bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground active:scale-95 disabled:opacity-40"
        >
          {strings.yousef.drawDeck}
        </button>
        <button
          type="button"
          disabled={!canDiscard || !hasTop}
          onClick={() => onPlay('discard')}
          className="flex-1 rounded-lg bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground active:scale-95 disabled:opacity-40"
        >
          {strings.yousef.drawDiscard}
        </button>
      </div>
      {state.finalTurns === null && (
        <button
          type="button"
          disabled={!canYousef}
          onClick={onYousef}
          className="rounded-lg bg-primary px-3 py-3 text-lg font-bold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40"
        >
          {hv <= state.rules.yousefMax
            ? strings.yousef.callYousef
            : strings.yousef.yousefLocked(state.rules.yousefMax)}
        </button>
      )}
    </div>
  )
}

/**
 * Hotseat: iedereen op één toestel. Per beurt: afscherm-scherm, dan de hand
 * spelen, dan even je nieuwe hand bekijken en bewust doorgeven aan de volgende.
 */
function HotseatView({
  state,
  dispatch,
  leave,
  strings,
}: {
  state: GameState
  dispatch: Dispatch
  leave: () => void
  strings: Strings
}) {
  const [stage, setStage] = useState<'gate' | 'hand' | 'review'>('gate')
  const [selected, setSelected] = useState<HandCard[]>([])
  const [review, setReview] = useState<{ playerId: string; keptKeys: string[] } | null>(null)

  const active = state.players.find((p) => p.id === state.turn?.playerId)
  const title = `${strings.appName} · ${strings.round(state.round)}`

  function frame(children: ReactNode) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
        <TopBar title={title} onLeave={leave} label={strings.leaveTable} strings={strings} />
        {children}
      </main>
    )
  }

  if (stage === 'review' && review) {
    const player = state.players.find((p) => p.id === review.playerId)
    const drawn = player?.hand.find((c) => !review.keptKeys.includes(cardKey(c)))
    return frame(
      <div className="mt-4 flex flex-1 flex-col items-center gap-4">
        <p className="text-lg font-bold text-ivory">{player?.name}</p>
        <p className="text-sm text-muted-foreground">{strings.yousef.reviewHint}</p>
        {player && <HandGrid hand={player.hand} highlightKey={drawn ? cardKey(drawn) : undefined} />}
        <button
          type="button"
          onClick={() => {
            setReview(null)
            setStage('gate')
          }}
          className="mt-auto rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg active:scale-95"
        >
          {strings.yousef.passButton(active?.name ?? '')}
        </button>
      </div>,
    )
  }

  if (!active) return null

  if (stage === 'gate') {
    return frame(<PassGate name={active.name} onShow={() => setStage('hand')} strings={strings} />)
  }

  // stage === 'hand'
  const hv = handValue(active.hand)
  function toggle(card: HandCard) {
    setSelected((prev) =>
      prev.some((s) => sameCard(s, card)) ? prev.filter((s) => !sameCard(s, card)) : [...prev, card],
    )
  }
  function play(drawFrom: 'deck' | 'discard') {
    if (!active) return
    const kept = active.hand.filter((c) => !selected.some((s) => sameCard(s, c)))
    setReview({ playerId: active.id, keptKeys: kept.map(cardKey) })
    setSelected([])
    setStage('review')
    playDeal()
    hapticDeal()
    dispatch({ t: 'PLAY_TURN', playerId: active.id, discard: selected, drawFrom })
  }
  function yousef() {
    if (!active) return
    setSelected([])
    setStage('gate')
    playFanfare()
    hapticFanfare()
    dispatch({ t: 'CALL_YOUSEF', playerId: active.id })
  }

  return frame(
    <>
      <Scoreboard state={state} activeId={active.id} showCards />
      <Piles top={state.discardTop.at(-1)} strings={strings} />
      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="text-sm text-muted-foreground">{strings.yousef.handValue(hv)}</span>
        <HandGrid hand={active.hand} selected={selected} onToggle={toggle} />
      </div>
      <ActionBar
        state={state}
        selected={selected}
        hv={hv}
        onPlay={play}
        onYousef={yousef}
        strings={strings}
      />
    </>,
  )
}

/** P2P: dit toestel toont zijn eigen hand; acties alleen op de eigen beurt. */
function NetView({
  state,
  dispatch,
  leave,
  strings,
  viewerId,
}: {
  state: GameState
  dispatch: Dispatch
  leave: () => void
  strings: Strings
  viewerId: string
}) {
  const [selected, setSelected] = useState<HandCard[]>([])
  const viewer = state.players.find((p) => p.id === viewerId)
  if (!viewer) return null
  const activePlayer = state.players.find((p) => p.id === state.turn?.playerId)
  const canAct = state.turn?.playerId === viewerId
  const hv = handValue(viewer.hand)

  function toggle(card: HandCard) {
    setSelected((prev) =>
      prev.some((s) => sameCard(s, card)) ? prev.filter((s) => !sameCard(s, card)) : [...prev, card],
    )
  }
  function play(drawFrom: 'deck' | 'discard') {
    dispatch({ t: 'PLAY_TURN', playerId: viewerId, discard: selected, drawFrom })
    setSelected([])
    playDeal()
    hapticDeal()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <TopBar title={`${viewer.emoji} ${viewer.name}`} onLeave={leave} label={strings.leaveTable} strings={strings} />
      <Scoreboard state={state} activeId={state.turn?.playerId} showCards />
      <Piles top={state.discardTop.at(-1)} strings={strings} />
      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="text-sm text-muted-foreground">{strings.yousef.handValue(hv)}</span>
        <HandGrid hand={viewer.hand} selected={canAct ? selected : undefined} onToggle={canAct ? toggle : undefined} />
      </div>
      {canAct ? (
        <ActionBar
          state={state}
          selected={selected}
          hv={hv}
          onPlay={play}
          onYousef={() => {
            playFanfare()
            hapticFanfare()
            dispatch({ t: 'CALL_YOUSEF', playerId: viewerId })
          }}
          strings={strings}
        />
      ) : (
        <p className="rounded-lg bg-card px-4 py-3 text-center text-sm text-muted-foreground">
          {strings.yousef.waitingFor(activePlayer?.name ?? '?')}
        </p>
      )}
    </main>
  )
}

/**
 * Ronde-einde: alle handen open, de uitslag, bak trekken / afkopen. In P2P mag
 * je alleen je eigen bak afhandelen en start alleen de host de volgende ronde.
 */
function RoundEndView({
  state,
  dispatch,
  leave,
  strings,
  viewerId,
  hotseat,
  isHost,
}: {
  state: GameState
  dispatch: Dispatch
  leave: () => void
  strings: Strings
  viewerId: string
  hotseat: boolean
  isHost: boolean
}) {
  const result = state.roundResult
  if (!result) return null
  const caller = state.players.find((p) => p.id === result.callerId)
  const anyBakDue = state.players.some((p) => p.score >= state.rules.bakThreshold)

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <TopBar title={strings.yousef.roundOver} onLeave={leave} label={strings.leaveTable} strings={strings} />

      <div className="rounded-xl bg-card p-3 text-center">
        <p className="font-semibold text-ivory">{strings.yousef.called(caller?.name ?? '?')}</p>
        <p className={cn('text-sm', result.assaf ? 'text-destructive' : 'text-emerald-400')}>
          {result.assaf ? strings.yousef.assaf : strings.yousef.clean}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {result.entries.map((entry) => {
          const player = state.players.find((p) => p.id === entry.playerId)
          if (!player) return null
          const bakDue = player.score >= state.rules.bakThreshold
          const mayResolve = hotseat || player.id === viewerId
          return (
            <div key={entry.playerId} className="flex flex-col gap-2 rounded-xl bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ivory">
                  {player.emoji} {player.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {strings.yousef.handValue(entry.handValue)} · {strings.yousef.gained(entry.gained)} →{' '}
                  <span className="font-bold text-ivory">{strings.yousef.points(player.score)}</span>
                </span>
              </div>
              <HandGrid hand={entry.hand} size={40} />
              {mayResolve && (
                <button
                  type="button"
                  onClick={() => {
                    playDrink()
                    hapticDrink()
                    dispatch(bakDue ? { t: 'DRAW_BAK', playerId: player.id } : { t: 'BUY_OFF', playerId: player.id })
                  }}
                  className={cn(
                    'self-start rounded-lg px-3 py-1.5 text-sm font-semibold active:scale-95',
                    bakDue ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {bakDue ? strings.yousef.drawBak : strings.yousef.buyOff}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {(hotseat || isHost) && (
          <button
            type="button"
            disabled={anyBakDue}
            onClick={() => dispatch({ t: 'NEXT_ROUND' })}
            className="rounded-lg bg-primary px-3 py-3 text-lg font-semibold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40"
          >
            {strings.yousef.nextRound}
          </button>
        )}
        {anyBakDue && <p className="text-center text-xs text-muted-foreground">{strings.yousef.bakPending}</p>}
      </div>
    </main>
  )
}

/** Einde potje: de eindstand (laagste score bovenaan). */
function EndView({ state, leave, strings }: { state: GameState; leave: () => void; strings: Strings }) {
  const ranked = [...state.players].sort((a, b) => a.score - b.score)
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <TopBar title={strings.finalTitle} onLeave={leave} label={strings.backHome} strings={strings} />
      <h2 className="flex items-center gap-2 text-lg font-bold text-ivory">
        <Trophy className="size-5 text-amber-400" />
        {strings.yousef.finalStandings}
      </h2>
      <div className="flex flex-col gap-2">
        {ranked.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-card p-3">
            <span className="font-semibold text-ivory">
              {i + 1}. {p.emoji} {p.name}
            </span>
            <span className="text-muted-foreground">{strings.yousef.points(p.score)}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={leave}
        className="mt-auto rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground active:scale-95"
      >
        {strings.backHome}
      </button>
    </main>
  )
}

export default function GameScreen() {
  const strings = useStrings()
  const { state, dispatch, leave, lastError, myPlayerId, isHost } = useGameAdapter()
  useWakeLock()

  if (!state) return null

  const hotseat = myPlayerId === null
  const viewerId = myPlayerId ?? state.turn?.playerId ?? state.hostId

  const view =
    state.phase === 'ended' ? (
      <EndView state={state} leave={leave} strings={strings} />
    ) : state.phase === 'roundEnd' ? (
      <RoundEndView
        state={state}
        dispatch={dispatch}
        leave={leave}
        strings={strings}
        viewerId={viewerId}
        hotseat={hotseat}
        isHost={isHost}
      />
    ) : hotseat ? (
      <HotseatView state={state} dispatch={dispatch} leave={leave} strings={strings} />
    ) : (
      <NetView state={state} dispatch={dispatch} leave={leave} strings={strings} viewerId={viewerId} />
    )

  return (
    <>
      {view}
      {lastError && (
        <p className="fixed inset-x-0 bottom-4 mx-auto w-fit rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
          {strings.errors[lastError] ?? lastError}
        </p>
      )}
    </>
  )
}
