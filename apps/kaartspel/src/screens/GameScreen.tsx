// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useState } from 'react'
import { Eye, Trophy, X } from 'lucide-react'
import { StaticCard } from '@/cards/Card'
import PlayerChip from '@/components/PlayerChip'
import { BAK_THRESHOLD, type Command, type GameState, type HandCard } from '@/engine/types'
import { handValue, isValidGroup, sameCard } from '@/engine/values'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useWakeLock } from '@/hooks/useWakeLock'
import { cn } from '@/lib/utils'
import { useStrings } from '@/store/localeStore'

type Strings = ReturnType<typeof useStrings>
type Dispatch = (cmd: Command) => void

/** Kaartweergave die ook een joker aankan (core-Card kent geen joker). */
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
        <div className="card-face-front card-black" style={{ width: size, height: size }}>
          <span className="card-center-suit">🃏</span>
        </div>
      </div>
    )
  }
  return <StaticCard card={{ suit: card.suit, rank: card.rank }} size={size} />
}

/** Rijtje spelerchips met de bak-meter (cumulatieve score). */
function Scoreboard({ state, activeId }: { state: GameState; activeId?: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {state.players.map((p) => (
        <PlayerChip key={p.id} player={p} active={p.id === activeId} />
      ))}
    </div>
  )
}

function TopBar({
  title,
  onLeave,
  label,
}: {
  title: string
  onLeave: () => void
  label: string
}) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-lg font-bold text-ivory">{title}</h1>
      <button
        type="button"
        onClick={onLeave}
        aria-label={label}
        className="rounded-lg bg-secondary p-2 text-secondary-foreground active:scale-95"
      >
        <X className="size-5" />
      </button>
    </header>
  )
}

/** Afscherm-scherm bij het doorgeven van de telefoon (hotseat-privacy). */
function PassGate({
  name,
  onShow,
  strings,
}: {
  name: string
  onShow: () => void
  strings: Strings
}) {
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

/** De actieve beurt: afscherm-scherm, dan de hand met afleg-/trek-acties. */
function TurnView({
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
  // Deze view krijgt van de parent een key per beurt, dus lokale state (afscherming
  // + selectie) reset vanzelf zodra de volgende speler aan zet is.
  const active = state.turn?.playerId ?? ''
  const player = state.players.find((p) => p.id === active)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<HandCard[]>([])

  if (!player) return null

  if (!revealed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
        <TopBar title={`${strings.appName} · ${strings.round(state.round)}`} onLeave={leave} label={strings.leaveTable} />
        <PassGate name={player.name} onShow={() => setRevealed(true)} strings={strings} />
      </main>
    )
  }

  const hv = handValue(player.hand)
  const canDiscard = selected.length > 0 && isValidGroup(selected)
  const canYousef = hv < state.rules.yousefMax
  const top = state.discardTop[state.discardTop.length - 1]

  function toggle(card: HandCard) {
    setSelected((prev) =>
      prev.some((s) => sameCard(s, card))
        ? prev.filter((s) => !sameCard(s, card))
        : [...prev, card],
    )
  }

  function play(drawFrom: 'deck' | 'discard') {
    // Na de zet wisselt de beurt; de parent remount deze view (nieuwe key),
    // waardoor de afscherming voor de volgende speler vanzelf terugkomt.
    dispatch({ t: 'PLAY_TURN', playerId: active, discard: selected, drawFrom })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <TopBar title={`${player.emoji} ${player.name}`} onLeave={leave} label={strings.leaveTable} />
      <Scoreboard state={state} activeId={active} />

      {/* Trek- en aflegstapel. */}
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

      {/* De eigen hand. */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <span className="text-sm text-muted-foreground">{strings.yousef.handValue(hv)}</span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {player.hand.map((card, i) => {
            const isSel = selected.some((s) => sameCard(s, card))
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(card)}
                className={cn('rounded-xl transition-transform', isSel && '-translate-y-3 rounded-xl ring-2 ring-primary')}
              >
                <CardView card={card} size={64} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Acties. */}
      <div className="flex flex-col gap-2">
        <p className="text-center text-xs text-muted-foreground">
          {selected.length > 0 && !canDiscard ? strings.yousef.invalidGroup : strings.yousef.pickCards}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canDiscard}
            onClick={() => play('deck')}
            className="flex-1 rounded-lg bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground active:scale-95 disabled:opacity-40"
          >
            {strings.yousef.drawDeck}
          </button>
          <button
            type="button"
            disabled={!canDiscard || !top}
            onClick={() => play('discard')}
            className="flex-1 rounded-lg bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground active:scale-95 disabled:opacity-40"
          >
            {strings.yousef.drawDiscard}
          </button>
        </div>
        <button
          type="button"
          disabled={!canYousef}
          onClick={() => dispatch({ t: 'CALL_YOUSEF', playerId: active })}
          className="rounded-lg bg-primary px-3 py-3 text-lg font-bold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40"
        >
          {canYousef ? strings.yousef.callYousef : strings.yousef.yousefLocked(state.rules.yousefMax)}
        </button>
      </div>
    </main>
  )
}

/** Ronde-einde: alle handen open, de uitslag, en bak trekken / afkopen. */
function RoundEndView({
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
  const result = state.roundResult
  if (!result) return null
  const caller = state.players.find((p) => p.id === result.callerId)
  const anyBakDue = state.players.some((p) => p.score >= BAK_THRESHOLD)

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <TopBar title={strings.yousef.roundOver} onLeave={leave} label={strings.leaveTable} />

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
          const bakDue = player.score >= BAK_THRESHOLD
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
              <div className="flex flex-wrap gap-1">
                {entry.hand.map((card, i) => (
                  <CardView key={i} card={card} size={44} />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  dispatch(bakDue ? { t: 'DRAW_BAK', playerId: player.id } : { t: 'BUY_OFF', playerId: player.id })
                }
                className={cn(
                  'self-start rounded-lg px-3 py-1.5 text-sm font-semibold active:scale-95',
                  bakDue
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {bakDue ? strings.yousef.drawBak : strings.yousef.buyOff}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <button
          type="button"
          disabled={anyBakDue}
          onClick={() => dispatch({ t: 'NEXT_ROUND' })}
          className="rounded-lg bg-primary px-3 py-3 text-lg font-semibold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40"
        >
          {strings.yousef.nextRound}
        </button>
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
      <TopBar title={strings.finalTitle} onLeave={leave} label={strings.backHome} />
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
  const { state, dispatch, leave, lastError } = useGameAdapter()
  useWakeLock()

  if (!state) return null

  const view =
    state.phase === 'ended' ? (
      <EndView state={state} leave={leave} strings={strings} />
    ) : state.phase === 'roundEnd' ? (
      <RoundEndView state={state} dispatch={dispatch} leave={leave} strings={strings} />
    ) : (
      <TurnView
        key={state.turn?.playerId ?? 'none'}
        state={state}
        dispatch={dispatch}
        leave={leave}
        strings={strings}
      />
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
