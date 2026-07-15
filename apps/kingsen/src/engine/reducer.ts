// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { cardEffect } from './cardActions'
import type { DeckSource } from './deck'
import type {
  Card,
  Command,
  EngineEvent,
  ErrorCode,
  GameState,
  PlayerProfile,
  PlayerState,
} from './types'
import { DEFAULT_RULES } from './types'
import { validateCommand } from './validate'

export interface ReduceResult {
  state: GameState
  events: EngineEvent[]
  error?: ErrorCode
}

export function createGame(
  host: PlayerProfile,
  rules = DEFAULT_RULES,
): GameState {
  return {
    version: 0,
    phase: 'lobby',
    rules,
    hostId: host.id,
    players: [newPlayer(host)],
    deck: [],
    drawIndex: 0,
    turn: null,
    currentCard: null,
    activeRules: [],
    nextRuleId: 1,
    kingsDrawn: 0,
    cup: 0,
    pending: null,
  }
}

/**
 * De enige plek waar GameState verandert. Puur gegeven de DeckSource:
 * met een scripted deck is elke uitkomst deterministisch testbaar.
 * Bij een validatiefout blijft de state onaangeroerd.
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
      startGame(draft, events, rng)
      break

    case 'FLIP_CARD':
      flipCard(draft, events, rng)
      break

    case 'ADD_TO_CUP':
      applyAddToCup(draft, events, cmd.playerId, cmd.amount)
      break

    case 'SET_RULE':
      applySetRule(draft, events, cmd.playerId, cmd.text)
      break

    case 'SET_CONNECTED':
      playerById(draft, cmd.playerId).connected = cmd.connected
      break

    case 'FORFEIT_TURN':
      // Weggevallen actieve speler: laat een eventuele invoer vallen en ga door.
      draft.pending = null
      advanceOrEnd(draft, events)
      break

    case 'END_GAME':
      endGame(draft, events)
      break
  }

  return { state: draft, events }
}

function newPlayer(profile: PlayerProfile): PlayerState {
  return { ...profile, connected: true }
}

/** Trekt de volgende kaart uit de geschudde deck. */
function drawCard(draft: GameState): Card {
  return draft.deck[draft.drawIndex++]
}

function startGame(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  draft.deck = rng.shuffle()
  draft.drawIndex = 0
  draft.currentCard = null
  draft.activeRules = []
  draft.nextRuleId = 1
  draft.kingsDrawn = 0
  draft.cup = 0
  draft.pending = null
  draft.phase = 'playing'
  draft.turn = { playerId: draft.players[0].id }
  events.push({ t: 'PHASE_CHANGED', phase: 'playing' })
}

function flipCard(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  const card = drawCard(draft)
  draft.currentCard = card
  events.push({ t: 'CARD_FLIPPED', card, animSeed: rng.seed() })

  const effect = cardEffect(card.rank)
  const flipperId = draft.turn!.playerId

  switch (effect) {
    case 'king': {
      draft.kingsDrawn++
      if (draft.kingsDrawn >= 4) {
        // 4e koning: de speler drinkt het volle glas, het potje eindigt.
        endGame(draft, events)
        return
      }
      // Koning 1-3: de speler schenkt slokken in het glas (ADD_TO_CUP).
      draft.pending = { kind: 'cup', playerId: flipperId }
      return
    }
    case 'newRule':
      // De speler typt een nieuwe regel (SET_RULE) voordat het spel doorgaat.
      draft.pending = { kind: 'rule', playerId: flipperId }
      return
    case 'roleThumb':
    case 'roleQuestion':
      // Rol aan de speler koppelen; een eventuele vorige drager van dezelfde rol vervalt.
      draft.activeRules = draft.activeRules.filter((r) => r.rank !== card.rank)
      draft.activeRules.push({
        id: draft.nextRuleId++,
        rank: card.rank,
        byPlayerId: flipperId,
        text: '',
      })
      break
    case 'none':
      break
  }

  advanceOrEnd(draft, events)
}

function applyAddToCup(
  draft: GameState,
  events: EngineEvent[],
  playerId: string,
  amount: number,
): void {
  draft.cup += amount
  draft.pending = null
  events.push({ t: 'CUP_FILLED', playerId, amount, total: draft.cup })
  advanceOrEnd(draft, events)
}

function applySetRule(
  draft: GameState,
  events: EngineEvent[],
  playerId: string,
  text: string,
): void {
  draft.activeRules.push({
    id: draft.nextRuleId++,
    rank: 10,
    byPlayerId: playerId,
    text: text.trim(),
  })
  draft.pending = null
  advanceOrEnd(draft, events)
}

/** Geen kaarten meer over: einde. Anders de beurt naar de volgende speler. */
function advanceOrEnd(draft: GameState, events: EngineEvent[]): void {
  if (draft.drawIndex >= draft.deck.length) {
    endGame(draft, events)
    return
  }
  advanceTurn(draft)
}

/** Volgende speler met de klok mee; slaat weggevallen spelers over. */
function advanceTurn(draft: GameState): void {
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

function endGame(draft: GameState, events: EngineEvent[]): void {
  draft.phase = 'ended'
  draft.turn = null
  draft.pending = null
  events.push({ t: 'PHASE_CHANGED', phase: 'ended' })
}

function playerById(draft: GameState, id: string): PlayerState {
  return draft.players.find((p) => p.id === id) as PlayerState
}
