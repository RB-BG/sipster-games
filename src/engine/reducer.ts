// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { color, isHigher, isInside, sameSuit } from './cards'
import type { DeckSource } from './deck'
import { flatFlipOrder, PYRAMID_ROW_SIZES } from './pyramid'
import { bluffPenalty, busSips, pyramidSips, questionSips } from './sips'
import type {
  AnswerChoice,
  BluffVerdict,
  BusChoice,
  Card,
  Command,
  EngineEvent,
  ErrorCode,
  GameState,
  PlayerProfile,
  PlayerState,
  QuestionIndex,
  RuleConfig,
  SipReason,
} from './types'
import { DEFAULT_RULES } from './types'
import { validateCommand } from './validate'

export interface ReduceResult {
  state: GameState
  events: EngineEvent[]
  error?: ErrorCode
}

export function createGame(host: PlayerProfile, rules: RuleConfig = DEFAULT_RULES): GameState {
  return {
    version: 0,
    phase: 'lobby',
    rules,
    hostId: host.id,
    players: [newPlayer(host)],
    deck: [],
    drawIndex: 0,
    turn: null,
    pyramid: null,
    bus: null,
    pendingGive: null,
    sipsLog: [],
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

    case 'ANSWER':
      applyAnswer(draft, events, rng, cmd.choice)
      break

    case 'GIVE_SIPS':
      applyGiveSips(draft, events, rng, cmd.targetPlayerId)
      break

    case 'FLIP_PYRAMID':
      flipNextCard(draft, events, rng)
      break

    case 'PLAY_CARD':
      applyPlayCard(draft, cmd.playerId, cmd.card)
      break

    case 'CALL_BLUFF':
      applyCallBluff(draft, events, cmd.playerId, cmd.targetPlayerId)
      break

    case 'BUS_GUESS':
      applyBusGuess(draft, events, rng, cmd.choice)
      break

    case 'NEXT_PHASE':
      startBus(draft, events, rng)
      break

    case 'SET_CONNECTED':
      playerById(draft, cmd.playerId).connected = cmd.connected
      break

    case 'FORFEIT_TURN':
      // Weggevallen speler in het vragenrondje: sla zijn resterende vragen over.
      draft.pendingGive = null
      advanceQuestions(draft, events, rng)
      break

    case 'END_GAME':
      draft.phase = 'ended'
      draft.turn = null
      draft.pyramid = null
      draft.bus = null
      draft.pendingGive = null
      events.push({ t: 'PHASE_CHANGED', phase: 'ended' })
      break
  }

  return { state: draft, events }
}

function newPlayer(profile: PlayerProfile): PlayerState {
  return { ...profile, connected: true, sipsTotal: 0, hand: [] }
}

function drink(draft: GameState, playerId: string, amount: number, reason: SipReason): void {
  const player = playerById(draft, playerId)
  player.sipsTotal += amount
  draft.sipsLog.push({ playerId, amount, reason })
}

/** Trekt de volgende kaart uit de geschudde deck; herschudt bij uitputting. */
function drawCard(draft: GameState, rng: DeckSource): Card {
  if (draft.drawIndex >= draft.deck.length) {
    draft.deck = rng.shuffle()
    draft.drawIndex = 0
  }
  return draft.deck[draft.drawIndex++]
}

// --- Vragenrondje --------------------------------------------------------

function startGame(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  draft.deck = rng.shuffle()
  draft.drawIndex = 0
  for (const player of draft.players) {
    player.hand = []
    player.sipsTotal = 0
  }
  draft.sipsLog = []
  draft.phase = 'questions'
  draft.turn = { playerId: draft.players[0].id, questionIndex: 0, revealed: [] }
  events.push({ t: 'PHASE_CHANGED', phase: 'questions' })
}

function applyAnswer(
  draft: GameState,
  events: EngineEvent[],
  rng: DeckSource,
  choice: AnswerChoice,
): void {
  const turn = draft.turn!
  const index = turn.questionIndex
  const card = drawCard(draft, rng)
  const player = playerById(draft, turn.playerId)
  player.hand.push(card)
  events.push({ t: 'CARD_DEALT', playerId: turn.playerId, card, animSeed: rng.seed() })

  const correct = evaluateAnswer(index, turn.revealed, card, choice)
  turn.revealed.push(card)
  const amount = questionSips(draft.rules, index)

  if (correct) {
    // Goed: de speler deelt N slokken uit; hij kiest zo een doelwit (GIVE_SIPS).
    draft.pendingGive = { playerId: turn.playerId, amount }
    return
  }

  // Fout: de speler drinkt zelf en gaat door naar de volgende vraag/speler.
  drink(draft, turn.playerId, amount, 'fout')
  stepAfterQuestion(draft, events, rng)
}

/** Bepaalt of een antwoord goed is; `revealed` is de hand vóór deze kaart. */
function evaluateAnswer(
  index: QuestionIndex,
  revealed: Card[],
  card: Card,
  choice: AnswerChoice,
): boolean {
  switch (index) {
    case 0:
      return color(card) === (choice === 'rood' ? 'red' : 'black')
    case 1:
      // Gelijk telt als fout, ongeacht de keuze.
      if (card.rank === revealed[0].rank) return false
      return choice === 'hoger' ? isHigher(card, revealed[0]) : !isHigher(card, revealed[0])
    case 2: {
      const inside = isInside(card, revealed[0], revealed[1])
      return (choice === 'binnen') === inside
    }
    case 3: {
      const has = sameSuit(card, revealed)
      return (choice === 'heb') === has
    }
  }
}

/** Na een afgehandelde vraag: volgende vraag, of volgende speler/fase. */
function stepAfterQuestion(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  const turn = draft.turn!
  if (turn.questionIndex >= 3) {
    advanceQuestions(draft, events, rng)
  } else {
    turn.questionIndex = (turn.questionIndex + 1) as QuestionIndex
  }
}

function advanceQuestions(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  const turn = draft.turn!
  const idx = draft.players.findIndex((p) => p.id === turn.playerId)
  const next = draft.players[idx + 1]
  if (next) {
    draft.turn = { playerId: next.id, questionIndex: 0, revealed: [] }
  } else {
    startPyramid(draft, events, rng)
  }
}

// --- Slokken uitdelen (gedeeld door vragenrondje en piramide) ------------

function applyGiveSips(
  draft: GameState,
  events: EngineEvent[],
  rng: DeckSource,
  targetPlayerId: string,
): void {
  const give = draft.pendingGive!
  drink(draft, targetPlayerId, give.amount, 'gekregen')
  events.push({
    t: 'SIPS_GIVEN',
    fromPlayerId: give.playerId,
    toPlayerId: targetPlayerId,
    amount: give.amount,
  })
  draft.pendingGive = null

  if (draft.phase === 'questions') {
    // De give hoorde bij een goed beantwoorde vraag: ga verder.
    stepAfterQuestion(draft, events, rng)
    return
  }

  if (draft.phase === 'pyramid' && draft.pyramid?.openClaim) {
    // Een eerlijke claim wordt afgelegd: de kaart gaat uit de hand.
    resolveTruthfulClaim(draft)
    draft.pyramid.openClaim = null
  }
}

// --- Piramide ------------------------------------------------------------

function startPyramid(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  const rows: Card[][] = PYRAMID_ROW_SIZES.map((size) =>
    Array.from({ length: size }, () => drawCard(draft, rng)),
  )
  draft.pyramid = {
    rows,
    flipIndex: 0,
    currentRank: null,
    currentRowValue: 0,
    openClaim: null,
  }
  draft.turn = null
  draft.phase = 'pyramid'
  events.push({ t: 'PHASE_CHANGED', phase: 'pyramid' })
}

function flipNextCard(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  const pyramid = draft.pyramid!
  const flat = flatFlipOrder(pyramid.rows)
  const next = flat[pyramid.flipIndex]
  pyramid.flipIndex++
  pyramid.currentRank = next.card.rank
  pyramid.currentRowValue = next.rowValue
  events.push({ t: 'CARD_FLIPPED', card: next.card, rowValue: next.rowValue, animSeed: rng.seed() })
}

function applyPlayCard(draft: GameState, playerId: string, card: Card): void {
  const pyramid = draft.pyramid!
  const player = playerById(draft, playerId)
  const truthful = player.hand.some((c) => c.rank === pyramid.currentRank)
  pyramid.openClaim = {
    claimantId: playerId,
    card,
    rowValue: pyramid.currentRowValue,
    truthful,
  }
  // De claimant deelt de rij-slokken uit; hij kiest een doelwit (GIVE_SIPS).
  draft.pendingGive = { playerId, amount: pyramidSips(draft.rules, pyramid.currentRowValue) }
}

/** Neemt bij een eerlijke claim één kaart van de juiste rank uit de hand. */
function resolveTruthfulClaim(draft: GameState): void {
  const claim = draft.pyramid!.openClaim!
  if (!claim.truthful) return
  const player = playerById(draft, claim.claimantId)
  const idx = player.hand.findIndex((c) => c.rank === claim.card.rank)
  if (idx >= 0) player.hand.splice(idx, 1)
}

function applyCallBluff(
  draft: GameState,
  events: EngineEvent[],
  byPlayerId: string,
  targetPlayerId: string,
): void {
  const pyramid = draft.pyramid!
  const claim = pyramid.openClaim!
  const rowSips = pyramidSips(draft.rules, claim.rowValue)
  let verdict: BluffVerdict

  if (!claim.truthful) {
    // Betrapte leugenaar: drinkt dubbel, de claim vervalt (geen give).
    verdict = 'betrapt'
    drink(draft, claim.claimantId, bluffPenalty(rowSips), 'bluf')
    draft.pendingGive = null
  } else {
    // Valse beschuldiging: de aanklager drinkt dubbel, de eerlijke claim staat.
    verdict = 'onterecht'
    drink(draft, byPlayerId, bluffPenalty(rowSips), 'bluf')
    resolveTruthfulClaim(draft)
    // pendingGive blijft staan: de claimant deelt zijn verdiende slokken nog uit.
  }

  pyramid.openClaim = null
  events.push({ t: 'BLUFF_CALLED', byPlayerId, targetPlayerId, verdict })
}

// --- Bus -----------------------------------------------------------------

function startBus(draft: GameState, events: EngineEvent[], rng: DeckSource): void {
  const maxHand = Math.max(...draft.players.map((p) => p.hand.length))
  const driverIds = draft.players.filter((p) => p.hand.length === maxHand).map((p) => p.id)
  const cards = Array.from({ length: draft.rules.busLengte }, () => drawCard(draft, rng))
  draft.bus = { driverIds, cards, position: 0, strikes: 0 }
  draft.pyramid = null
  draft.phase = 'bus'
  events.push({ t: 'PHASE_CHANGED', phase: 'bus' })

  // Een bus van één kaart is meteen uitgereden.
  if (cards.length <= 1) endGame(draft, events)
}

function applyBusGuess(
  draft: GameState,
  events: EngineEvent[],
  rng: DeckSource,
  choice: BusChoice,
): void {
  const bus = draft.bus!
  const current = bus.cards[bus.position]
  const next = bus.cards[bus.position + 1]
  const correct =
    next.rank !== current.rank &&
    (choice === 'hoger' ? next.rank > current.rank : next.rank < current.rank)

  events.push({ t: 'BUS_CARD', card: next, correct, animSeed: rng.seed() })

  if (correct) {
    bus.position++
    if (bus.position >= bus.cards.length - 1) endGame(draft, events)
    return
  }

  // Fout: oplopende straf voor elke chauffeur, opnieuw beginnen met verse kaarten.
  bus.strikes++
  const amount = busSips(draft.rules, bus.strikes)
  for (const id of bus.driverIds) drink(draft, id, amount, 'bus')
  bus.cards = Array.from({ length: draft.rules.busLengte }, () => drawCard(draft, rng))
  bus.position = 0
  events.push({ t: 'BUS_RESET', animSeed: rng.seed() })
}

function endGame(draft: GameState, events: EngineEvent[]): void {
  draft.phase = 'ended'
  draft.bus = null
  draft.pendingGive = null
  events.push({ t: 'PHASE_CHANGED', phase: 'ended' })
}

function playerById(draft: GameState, id: string): PlayerState {
  return draft.players.find((p) => p.id === id) as PlayerState
}
