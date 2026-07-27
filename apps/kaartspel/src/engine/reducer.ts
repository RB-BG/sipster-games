// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { DeckSource } from './deck'
import type {
  Command,
  EngineEvent,
  ErrorCode,
  GameState,
  HandCard,
  PlayerProfile,
  PlayerState,
  RoundEntry,
  RoundResult,
} from './types'
import {
  ASSAF_FACTOR,
  ASSAF_TIE_PENALTY,
  BAK_VALUE,
  DEFAULT_RULES,
  HALF_BAK_SIPS,
  HALF_BAK_VALUE,
} from './types'
import { handValue, sameCard } from './values'
import { validateCommand } from './validate'

export interface ReduceResult {
  state: GameState
  events: EngineEvent[]
  error?: ErrorCode
}

export function createGame(host: PlayerProfile, rules = DEFAULT_RULES): GameState {
  return {
    version: 0,
    phase: 'lobby',
    rules,
    hostId: host.id,
    players: [newPlayer(host)],
    round: 0,
    deck: [],
    drawIndex: 0,
    discardTop: [],
    discardBuried: [],
    turn: null,
    roundResult: null,
  }
}

/**
 * De enige plek waar GameState verandert. Puur gegeven de DeckSource: met een
 * scripted deck is elke uitkomst deterministisch testbaar. Bij een validatiefout
 * blijft de state onaangeroerd.
 */
export function reduce(state: GameState, cmd: Command, rng: DeckSource): ReduceResult {
  const error = validateCommand(state, cmd)
  if (error) return { state, events: [], error }

  const draft = structuredClone(state)
  const events: EngineEvent[] = []
  draft.version++

  switch (cmd.t) {
    case 'ADD_PLAYER':
      draft.players.push(newPlayer(cmd.profile))
      break

    case 'REMOVE_PLAYER':
      draft.players = draft.players.filter((p) => p.id !== cmd.playerId)
      break

    case 'SET_RULES':
      draft.rules = cmd.rules
      break

    case 'START_GAME':
      draft.round = 1
      for (const p of draft.players) {
        p.score = 0
        p.sips = 0
      }
      deal(draft, rng)
      draft.phase = 'playing'
      events.push({ t: 'PHASE_CHANGED', phase: 'playing' })
      break

    case 'PLAY_TURN':
      playTurn(draft, events, cmd.playerId, cmd.discard, cmd.drawFrom, rng)
      break

    case 'CALL_YOUSEF':
      callYousef(draft, events, cmd.playerId)
      break

    case 'DRAW_BAK': {
      const player = playerById(draft, cmd.playerId)
      player.score -= BAK_VALUE
      events.push({ t: 'BAK_DRAWN', playerId: cmd.playerId })
      break
    }

    case 'BUY_OFF': {
      const player = playerById(draft, cmd.playerId)
      player.score -= HALF_BAK_VALUE
      player.sips += HALF_BAK_SIPS
      break
    }

    case 'NEXT_ROUND':
      draft.round++
      draft.roundResult = null
      deal(draft, rng)
      draft.phase = 'playing'
      events.push({ t: 'PHASE_CHANGED', phase: 'playing' })
      break

    case 'SET_CONNECTED':
      playerById(draft, cmd.playerId).connected = cmd.connected
      break

    case 'FORFEIT_TURN':
      advanceTurn(draft)
      break

    case 'END_GAME':
      draft.phase = 'ended'
      draft.turn = null
      events.push({ t: 'PHASE_CHANGED', phase: 'ended' })
      break
  }

  return { state: draft, events }
}

function newPlayer(profile: PlayerProfile): PlayerState {
  return { ...profile, connected: true, hand: [], score: 0, sips: 0 }
}

function playerById(draft: GameState, id: string): PlayerState {
  return draft.players.find((p) => p.id === id) as PlayerState
}

function firstConnected(draft: GameState): PlayerState {
  return draft.players.find((p) => p.connected) ?? draft.players[0]
}

/** Deelt een verse ronde: schud, deel handen, en draai één startkaart op de aflegstapel. */
function deal(draft: GameState, rng: DeckSource): void {
  draft.deck = rng.shuffle()
  draft.drawIndex = 0
  draft.discardBuried = []
  for (const p of draft.players) p.hand = []
  for (let i = 0; i < draft.rules.handSize; i++) {
    for (const p of draft.players) p.hand.push(draft.deck[draft.drawIndex++])
  }
  draft.discardTop = [draft.deck[draft.drawIndex++]]
  draft.turn = { playerId: firstConnected(draft).id }
}

/** Trekt de volgende kaart; is de stapel op, schud dan de begraven aflegstapel opnieuw. */
function drawFromDeck(draft: GameState, rng: DeckSource): HandCard {
  if (draft.drawIndex >= draft.deck.length && draft.discardBuried.length > 0) {
    draft.deck = rng.reshuffle(draft.discardBuried)
    draft.drawIndex = 0
    draft.discardBuried = []
  }
  return draft.deck[draft.drawIndex++]
}

function playTurn(
  draft: GameState,
  events: EngineEvent[],
  playerId: string,
  discard: HandCard[],
  drawFrom: 'deck' | 'discard',
  rng: DeckSource,
): void {
  const player = playerById(draft, playerId)
  // Leg de opgegeven kaarten af (verwijder ze uit de hand op identiteit).
  player.hand = player.hand.filter((h) => !discard.some((d) => sameCard(d, h)))

  const oldTop = draft.discardTop
  let drawn: HandCard
  const fromDiscard = drawFrom === 'discard'
  if (fromDiscard) {
    // Pak de bovenste afgelegde kaart; de rest van die groep raakt begraven.
    drawn = oldTop[oldTop.length - 1]
    draft.discardBuried.push(...oldTop.slice(0, -1))
  } else {
    drawn = drawFromDeck(draft, rng)
    draft.discardBuried.push(...oldTop)
  }
  player.hand.push(drawn)
  draft.discardTop = discard.map((c) => ({ ...c }))

  events.push({
    t: 'PLAYED',
    playerId,
    discard: discard.map((c) => ({ ...c })),
    drawn,
    fromDiscard,
    animSeed: rng.seed(),
  })
  advanceTurn(draft)
}

/**
 * Iemand roept "Yousef": de ronde stopt en wordt gescoord. De roeper wint schoon
 * als hij strikt de laagste is; anders is het Assaf en wordt alleen de roeper gestraft.
 */
function callYousef(draft: GameState, events: EngineEvent[], callerId: string): void {
  events.push({ t: 'YOUSEF_CALLED', callerId })
  const caller = playerById(draft, callerId)
  const callerValue = handValue(caller.hand)

  const othersValues = draft.players
    .filter((p) => p.id !== callerId)
    .map((p) => handValue(p.hand))
  const othersMin = Math.min(...othersValues)
  const lowestValue = Math.min(callerValue, othersMin)
  const assaf = othersMin <= callerValue

  const gained = new Map<string, number>()
  if (!assaf) {
    // Schone winst: de roeper 0, elke ander het verschil tot de roeper.
    gained.set(callerId, 0)
    for (const p of draft.players) {
      if (p.id === callerId) continue
      gained.set(p.id, handValue(p.hand) - callerValue)
    }
  } else {
    // Verkeerde call: alleen de roeper krijgt punten, de rest 0 (gegund).
    const penalty =
      othersMin < callerValue ? (callerValue - othersMin) * ASSAF_FACTOR : ASSAF_TIE_PENALTY
    for (const p of draft.players) gained.set(p.id, p.id === callerId ? penalty : 0)
  }

  const entries: RoundEntry[] = draft.players.map((p) => ({
    playerId: p.id,
    hand: p.hand.map((c) => ({ ...c })),
    handValue: handValue(p.hand),
    gained: gained.get(p.id) ?? 0,
  }))
  for (const p of draft.players) p.score += gained.get(p.id) ?? 0

  const result: RoundResult = { callerId, callerValue, lowestValue, assaf, entries }
  draft.roundResult = result
  draft.turn = null
  draft.phase = 'roundEnd'
  events.push({ t: 'ROUND_SCORED', result })
  events.push({ t: 'PHASE_CHANGED', phase: 'roundEnd' })
}

/** Volgende speler met de klok mee; slaat weggevallen spelers over. */
function advanceTurn(draft: GameState): void {
  if (draft.turn === null) return
  const players = draft.players
  const n = players.length
  const idx = players.findIndex((p) => p.id === draft.turn!.playerId)
  for (let step = 1; step <= n; step++) {
    const cand = players[(idx + step) % n]
    if (cand.connected) {
      draft.turn = { playerId: cand.id }
      return
    }
  }
  // Niemand verbonden: laat de beurt staan (host lost dit op).
}
