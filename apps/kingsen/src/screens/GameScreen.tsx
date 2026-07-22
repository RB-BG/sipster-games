// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useState } from 'react'
import { Volume2, VolumeX, X } from 'lucide-react'
import Coaster from '@/components/Coaster'
import CupMeter from '@/components/CupMeter'
import PlayerChip from '@/components/PlayerChip'
import Card from '@/cards/Card'
import { MAX_CUP_AMOUNT } from '@/engine/validate'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useStrings } from '@/store/localeStore'
import { hapticDeal, hapticFanfare } from '@/lib/haptics'
import { isMuted, playDeal, playFanfare, setMuted } from '@/lib/sound'

type State = NonNullable<ReturnType<typeof useGameAdapter>['state']>
type Strings = ReturnType<typeof useStrings>
type Dispatch = ReturnType<typeof useGameAdapter>['dispatch']

export default function GameScreen() {
  const strings = useStrings()
  const { state, myPlayerId, isHost, animating, cardAnim, lastError, connection, dispatch, onRollSettled, leave } =
    useGameAdapter()

  useWakeLock()

  // Kaart-geluid bij een nieuwe reveal.
  const animId = cardAnim?.id ?? 0
  useEffect(() => {
    if (animId === 0) return
    playDeal()
    hapticDeal()
  }, [animId])

  // Einde van het potje: fanfare.
  const ended = state?.phase === 'ended'
  useEffect(() => {
    if (!ended) return
    playFanfare()
    hapticFanfare()
  }, [ended])

  const [muted, setMutedState] = useState(isMuted)
  function toggleMuted() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  if (!state) return null
  const canAct = (playerId: string) => myPlayerId === null || myPlayerId === playerId
  const actorId = state.pending?.playerId ?? state.turn?.playerId ?? null
  const heroFlip = cardAnim
    ? { id: cardAnim.id, card: cardAnim.card, animSeed: cardAnim.animSeed }
    : null

  const roleBadge = (playerId: string) =>
    state.activeRules
      .filter((r) => (r.rank === 11 || r.rank === 12) && r.byPlayerId === playerId)
      .map((r) => strings.roleBadge(r.rank))
      .join('')

  return (
    <main className="relative flex h-dvh flex-col px-safe pt-safe pb-safe">
      <header className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
        <span className="font-heading font-bold text-ivory">{strings.appName}</span>
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
          <PlayerChip
            key={player.id}
            player={player}
            active={player.id === state.turn?.playerId}
            badge={roleBadge(player.id)}
          />
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-start gap-3 overflow-y-auto px-4 py-2">
        <Card flip={heroFlip} faceDown={heroFlip === null} size={128} onSettled={onRollSettled} />

        {!animating && state.currentCard && (
          <div className="text-center">
            <p className="text-xl font-bold text-cyan-soft">{strings.cardName(state.currentCard.rank)}</p>
            <p className="mx-auto max-w-xs text-sm text-ivory">
              {strings.cardInstruction(state.currentCard.rank)}
            </p>
          </div>
        )}

        <CupMeter sips={state.cup} kings={state.kingsDrawn} />

        {state.activeRules.length > 0 && <ActiveRules state={state} strings={strings} />}

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

        {ended && <EndedOverlay />}
      </div>

      {!animating && !ended && (
        <section className="flex flex-col gap-2 p-4">
          {lastError && <p className="text-center text-sm text-destructive">{strings.errors[lastError]}</p>}
          {state.pending?.kind === 'cup' ? (
            <CupPour
              state={state}
              actorId={actorId}
              canAct={canAct}
              hostControls={isHost || myPlayerId === null}
              dispatch={dispatch}
            />
          ) : state.pending?.kind === 'rule' ? (
            <RuleInput
              state={state}
              actorId={actorId}
              canAct={canAct}
              hostControls={isHost || myPlayerId === null}
              dispatch={dispatch}
            />
          ) : (
            <FlipBar
              state={state}
              actorId={actorId}
              canAct={canAct}
              hostControls={isHost || myPlayerId === null}
              dispatch={dispatch}
            />
          )}
        </section>
      )}
    </main>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-night-950/70 p-4">
      {children}
    </div>
  )
}

function playerName(state: State, id: string | null): string {
  const p = state.players.find((pl) => pl.id === id)
  return p ? `${p.emoji} ${p.name}` : ''
}

/** De blijvende regels en rollen op tafel. */
function ActiveRules({ state, strings }: { state: State; strings: Strings }) {
  return (
    <Coaster className="w-full max-w-xs">
      <h2 className="mb-1 text-xs text-muted-foreground">{strings.activeRulesTitle}</h2>
      <ul className="flex flex-col gap-1 text-sm text-ivory">
        {state.activeRules.map((rule) => {
          const by = state.players.find((p) => p.id === rule.byPlayerId)
          // Vrije regel = eigen tekst; een rol (boer/vrouw) heeft geen tekst.
          const isFreeRule = rule.text.length > 0
          const label = isFreeRule ? rule.text : strings.cardName(rule.rank)
          return (
            <li key={rule.id} className="flex items-start gap-1.5">
              <span aria-hidden>{isFreeRule ? '📜' : strings.roleBadge(rule.rank)}</span>
              <span>
                {label}
                {by && <span className="text-muted-foreground"> ({by.emoji})</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </Coaster>
  )
}

/** De actieve speler draait de volgende kaart; de rest wacht. */
function FlipBar({
  state,
  actorId,
  canAct,
  hostControls,
  dispatch,
}: {
  state: State
  actorId: string | null
  canAct: (id: string) => boolean
  hostControls: boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  if (actorId === null) return null
  const mine = canAct(actorId)
  return (
    <>
      {mine ? (
        <button
          type="button"
          onClick={() => dispatch({ t: 'FLIP_CARD', playerId: actorId })}
          className="rounded-lg bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground active:scale-95"
        >
          {strings.flipCard}
        </button>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {strings.waitingForFlip(playerName(state, actorId))}
        </p>
      )}
      {hostControls && (
        <button
          type="button"
          onClick={() => dispatch({ t: 'FORFEIT_TURN' })}
          className="self-center text-xs text-muted-foreground active:text-ivory"
        >
          {strings.skipTurn}
        </button>
      )}
    </>
  )
}

/**
 * Host-noodrem bij een openstaande invoer: valt de pending speler weg, dan
 * kon niemand meer verder (FORFEIT_TURN was alleen via de FlipBar bereikbaar).
 */
function SkipPending({ dispatch }: { dispatch: Dispatch }) {
  const strings = useStrings()
  return (
    <button
      type="button"
      onClick={() => dispatch({ t: 'FORFEIT_TURN' })}
      className="self-center text-xs text-muted-foreground active:text-ivory"
    >
      {strings.skipTurn}
    </button>
  )
}

/** Koning: schenk slokken in het glas. */
function CupPour({
  state,
  actorId,
  canAct,
  hostControls,
  dispatch,
}: {
  state: State
  actorId: string | null
  canAct: (id: string) => boolean
  hostControls: boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  const step = state.rules.standaardSlokken
  const [amount, setAmount] = useState(step)
  if (actorId === null) return null
  if (!canAct(actorId)) {
    return (
      <>
        <p className="text-center text-sm text-muted-foreground">
          {strings.waitingForFlip(playerName(state, actorId))}
        </p>
        {hostControls && <SkipPending dispatch={dispatch} />}
      </>
    )
  }
  return (
    <>
      <p className="text-center text-lg font-bold text-cyan-soft">{strings.pourPrompt}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setAmount((a) => Math.max(step, a - step))}
          className="size-10 rounded-lg bg-secondary text-xl text-secondary-foreground disabled:opacity-40"
          disabled={amount <= step}
        >
          −
        </button>
        <span className="w-10 text-center text-2xl font-bold text-ivory">{amount}</span>
        <button
          type="button"
          onClick={() => setAmount((a) => Math.min(MAX_CUP_AMOUNT, a + step))}
          className="size-10 rounded-lg bg-secondary text-xl text-secondary-foreground disabled:opacity-40"
          disabled={amount + step > MAX_CUP_AMOUNT}
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ t: 'ADD_TO_CUP', playerId: actorId, amount })}
        className="rounded-lg bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground active:scale-95"
      >
        {strings.pour}
      </button>
    </>
  )
}

/** Rang 5: leg een nieuwe regel vast. */
function RuleInput({
  state,
  actorId,
  canAct,
  hostControls,
  dispatch,
}: {
  state: State
  actorId: string | null
  canAct: (id: string) => boolean
  hostControls: boolean
  dispatch: Dispatch
}) {
  const strings = useStrings()
  const [text, setText] = useState('')
  if (actorId === null) return null
  if (!canAct(actorId)) {
    return (
      <>
        <p className="text-center text-sm text-muted-foreground">
          {strings.waitingForFlip(playerName(state, actorId))}
        </p>
        {hostControls && <SkipPending dispatch={dispatch} />}
      </>
    )
  }
  return (
    <>
      <p className="text-center text-lg font-bold text-cyan-soft">{strings.ruleInputPrompt}</p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={strings.rulePlaceholder}
        maxLength={80}
        className="rounded-lg border border-input bg-night-950/40 px-3 py-2 text-ivory placeholder:text-muted-foreground"
      />
      <button
        type="button"
        disabled={text.trim().length === 0}
        onClick={() => dispatch({ t: 'SET_RULE', playerId: actorId, text })}
        className="rounded-lg bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
      >
        {strings.saveRule}
      </button>
    </>
  )
}

/** Einde: het glas moet leeg, en de blijvende regels blijven nog even in beeld. */
function EndedOverlay() {
  const strings = useStrings()
  const { state, leave } = useGameAdapter()
  if (!state) return null
  return (
    <Overlay>
      <Coaster className="flex w-72 flex-col items-center gap-3 text-center">
        <h2 className="text-lg font-bold text-cyan-soft">{strings.finalTitle}</h2>
        <div className="text-5xl">👑🍺</div>
        <p className="text-xl font-bold text-ivory">{strings.drinkCup(state.cup)}</p>
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
