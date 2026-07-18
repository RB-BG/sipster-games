// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { card, scriptedDeck } from './deck'
import { createGame, reduce } from './reducer'
import type { Card, Command, GameState, PlayerProfile } from './types'

const P1: PlayerProfile = { id: 'p1', name: 'Ann', emoji: '🦊' }
const P2: PlayerProfile = { id: 'p2', name: 'Bo', emoji: '🐼' }
const P3: PlayerProfile = { id: 'p3', name: 'Cas', emoji: '🐸' }

/** Start een potje met een vast kaart-script en het opgegeven aantal spelers. */
function started(deck: Card[], players: PlayerProfile[] = [P1, P2]) {
  const rng = scriptedDeck(deck)
  let state = createGame(players[0])
  for (const p of players.slice(1)) {
    state = reduce(state, { t: 'ADD_PLAYER', profile: p }, rng).state
  }
  state = reduce(state, { t: 'START_GAME' }, rng).state
  return { state, rng }
}

/** Draai de volgende kaart namens de speler die aan zet is. */
function flip(state: GameState, rng: ReturnType<typeof scriptedDeck>) {
  return reduce(state, { t: 'FLIP_CARD', playerId: state.turn!.playerId }, rng)
}

function apply(state: GameState, cmd: Command, rng: ReturnType<typeof scriptedDeck>) {
  return reduce(state, cmd, rng)
}

describe('createGame', () => {
  it('begint in de lobby met alleen de host', () => {
    const s = createGame(P1)
    expect(s.phase).toBe('lobby')
    expect(s.players).toHaveLength(1)
    expect(s.hostId).toBe('p1')
    expect(s.cup).toBe(0)
    expect(s.kingsDrawn).toBe(0)
  })
})

describe('START_GAME', () => {
  it('deelt de deck, zet de eerste speler aan zet en de fase op playing', () => {
    const { state } = started([card(3, 'hearts'), card(4, 'spades')])
    expect(state.phase).toBe('playing')
    expect(state.turn?.playerId).toBe('p1')
    expect(state.deck).toHaveLength(2)
    expect(state.drawIndex).toBe(0)
    expect(state.currentCard).toBeNull()
  })

  it('weigert met minder dan 2 spelers', () => {
    const rng = scriptedDeck([])
    const res = reduce(createGame(P1), { t: 'START_GAME' }, rng)
    expect(res.error).toBe('NOT_ENOUGH_PLAYERS')
  })
})

describe('FLIP_CARD: gewone kaart', () => {
  it('onthult de kaart en geeft de beurt door met de klok mee', () => {
    const { state, rng } = started([card(3, 'hearts'), card(6, 'clubs')])
    const res = flip(state, rng)
    expect(res.state.currentCard).toEqual(card(3, 'hearts'))
    expect(res.state.turn?.playerId).toBe('p2')
    expect(res.events.some((e) => e.t === 'CARD_FLIPPED')).toBe(true)
  })

  it('wrapt de beurt terug naar de eerste speler', () => {
    const { state, rng } = started([card(3, 'hearts'), card(6, 'clubs'), card(9, 'spades')])
    let s = flip(state, rng).state
    expect(s.turn?.playerId).toBe('p2')
    s = flip(s, rng).state
    expect(s.turn?.playerId).toBe('p1') // terug bij het begin, deck nog niet op
    expect(s.phase).toBe('playing')
  })

  it('weigert een flip als het niet jouw beurt is', () => {
    const { state, rng } = started([card(3, 'hearts')])
    const res = reduce(state, { t: 'FLIP_CARD', playerId: 'p2' }, rng)
    expect(res.error).toBe('NOT_YOUR_TURN')
  })

  it('weigert een flip in de lobby', () => {
    const rng = scriptedDeck([])
    const res = reduce(createGame(P1), { t: 'FLIP_CARD', playerId: 'p1' }, rng)
    expect(res.error).toBe('WRONG_PHASE')
  })
})

describe('King\'s Cup', () => {
  it('koning 1-3 opent de cup-invoer en telt slokken op', () => {
    const { state, rng } = started([card(13, 'spades'), card(3, 'hearts')])
    const flipped = flip(state, rng)
    expect(flipped.state.kingsDrawn).toBe(1)
    expect(flipped.state.pending).toEqual({ kind: 'cup', playerId: 'p1' })
    expect(flipped.state.turn?.playerId).toBe('p1') // beurt nog niet door

    // Zolang de cup niet gevuld is, kan niemand draaien.
    const blocked = reduce(flipped.state, { t: 'FLIP_CARD', playerId: 'p1' }, rng)
    expect(blocked.error).toBe('PENDING_INPUT')

    const filled = apply(flipped.state, { t: 'ADD_TO_CUP', playerId: 'p1', amount: 4 }, rng)
    expect(filled.state.cup).toBe(4)
    expect(filled.state.pending).toBeNull()
    expect(filled.state.turn?.playerId).toBe('p2')
    expect(filled.events.some((e) => e.t === 'CUP_FILLED')).toBe(true)
  })

  it('weigert een ongeldig aantal slokken', () => {
    const { state, rng } = started([card(13, 'spades')])
    const flipped = flip(state, rng)
    expect(reduce(flipped.state, { t: 'ADD_TO_CUP', playerId: 'p1', amount: 0 }, rng).error).toBe(
      'INVALID_AMOUNT',
    )
    expect(reduce(flipped.state, { t: 'ADD_TO_CUP', playerId: 'p1', amount: 99 }, rng).error).toBe(
      'INVALID_AMOUNT',
    )
  })

  it('de 4e koning eindigt het potje; de cup blijft staan om leeg te drinken', () => {
    const deck = [card(13, 'spades'), card(13, 'hearts'), card(13, 'clubs'), card(13, 'diamonds')]
    const { state: initial, rng } = started(deck)
    let state = initial
    // koning 1
    state = flip(state, rng).state
    state = apply(state, { t: 'ADD_TO_CUP', playerId: 'p1', amount: 2 }, rng).state
    // koning 2
    state = flip(state, rng).state
    state = apply(state, { t: 'ADD_TO_CUP', playerId: 'p2', amount: 3 }, rng).state
    // koning 3
    state = flip(state, rng).state
    state = apply(state, { t: 'ADD_TO_CUP', playerId: 'p1', amount: 1 }, rng).state
    expect(state.kingsDrawn).toBe(3)
    expect(state.cup).toBe(6)
    // koning 4
    const end = flip(state, rng)
    expect(end.state.kingsDrawn).toBe(4)
    expect(end.state.phase).toBe('ended')
    expect(end.state.cup).toBe(6)
    expect(end.state.currentCard).toEqual(card(13, 'diamonds'))
    expect(end.state.pending).toBeNull()
  })
})

describe('nieuwe regel (5)', () => {
  it('opent de regel-invoer en legt de regel vast', () => {
    const { state, rng } = started([card(5, 'clubs'), card(3, 'hearts')])
    const flipped = flip(state, rng)
    expect(flipped.state.pending).toEqual({ kind: 'rule', playerId: 'p1' })

    const ruled = apply(flipped.state, { t: 'SET_RULE', playerId: 'p1', text: '  geen namen  ' }, rng)
    expect(ruled.state.activeRules).toHaveLength(1)
    expect(ruled.state.activeRules[0]).toMatchObject({ rank: 5, byPlayerId: 'p1', text: 'geen namen' })
    expect(ruled.state.pending).toBeNull()
    expect(ruled.state.turn?.playerId).toBe('p2')
  })

  it('weigert een lege regel', () => {
    const { state, rng } = started([card(5, 'clubs')])
    const flipped = flip(state, rng)
    expect(reduce(flipped.state, { t: 'SET_RULE', playerId: 'p1', text: '   ' }, rng).error).toBe(
      'INVALID_TEXT',
    )
  })
})

describe('rollen (boer/vrouw)', () => {
  it('koppelt de rol aan de speler zonder de beurt te blokkeren', () => {
    const { state, rng } = started([card(11, 'spades'), card(12, 'hearts')])
    const res = flip(state, rng)
    expect(res.state.pending).toBeNull()
    expect(res.state.activeRules).toHaveLength(1)
    expect(res.state.activeRules[0]).toMatchObject({ rank: 11, byPlayerId: 'p1' })
    expect(res.state.turn?.playerId).toBe('p2')
  })

  it('een nieuwe drager van dezelfde rol verdringt de vorige', () => {
    const { state, rng } = started([card(11, 'spades'), card(11, 'hearts')])
    let s = flip(state, rng).state // p1 wordt duimmeester
    s = flip(s, rng).state // p2 draait ook een boer
    const thumbRules = s.activeRules.filter((r) => r.rank === 11)
    expect(thumbRules).toHaveLength(1)
    expect(thumbRules[0].byPlayerId).toBe('p2')
  })
})

describe('deck-uitputting', () => {
  it('eindigt het potje als de laatste kaart gedraaid is', () => {
    const { state, rng } = started([card(3, 'hearts'), card(6, 'clubs')])
    let s = flip(state, rng).state
    s = flip(s, rng).state
    expect(s.phase).toBe('ended')
  })
})

describe('FORFEIT_TURN', () => {
  it('slaat de actieve speler over en laat openstaande invoer vallen', () => {
    const { state, rng } = started([card(13, 'spades'), card(3, 'hearts')], [P1, P2, P3])
    const flipped = flip(state, rng) // p1 trekt koning -> pending cup
    expect(flipped.state.pending).not.toBeNull()
    const forfeited = reduce(flipped.state, { t: 'FORFEIT_TURN' }, rng)
    expect(forfeited.state.pending).toBeNull()
    expect(forfeited.state.turn?.playerId).toBe('p2')
  })
})

describe('verbindingen', () => {
  it('slaat weggevallen spelers over bij de beurtwissel', () => {
    const { state, rng } = started([card(3, 'hearts'), card(4, 'spades')], [P1, P2, P3])
    let s = reduce(state, { t: 'SET_CONNECTED', playerId: 'p2', connected: false }, rng).state
    s = flip(s, rng).state // p1 draait; p2 is weg, dus p3 is aan de beurt
    expect(s.turn?.playerId).toBe('p3')
  })
})

// --- Review-fixes: cap, verkeerde speler, laatste kaart, ended -------------

describe('review-fixes', () => {
  it('ADD_TO_CUP door de verkeerde speler is NOT_YOUR_TURN', () => {
    const { state, rng } = started([card(13, 'spades'), card(3, 'hearts')])
    const s = flip(state, rng).state // p1 trekt koning -> pending cup
    expect(apply(s, { t: 'ADD_TO_CUP', playerId: 'p2', amount: 2 }, rng).error).toBe(
      'NOT_YOUR_TURN',
    )
  })

  it('SET_RULE door de verkeerde speler is NOT_YOUR_TURN', () => {
    const { state, rng } = started([card(5, 'spades'), card(3, 'hearts')])
    const s = flip(state, rng).state // p1 trekt de regel-kaart -> pending rule
    expect(apply(s, { t: 'SET_RULE', playerId: 'p2', text: 'nee' }, rng).error).toBe(
      'NOT_YOUR_TURN',
    )
  })

  it('pending op de allerlaatste kaart: afhandelen eindigt het potje netjes', () => {
    const { state, rng } = started([card(5, 'spades')])
    let s = flip(state, rng).state
    expect(s.pending?.kind).toBe('rule')
    s = apply(s, { t: 'SET_RULE', playerId: 'p1', text: 'proost' }, rng).state
    expect(s.phase).toBe('ended')
    expect(s.pending).toBeNull()
  })

  it('intents in de ended-fase worden geweigerd', () => {
    const { state, rng } = started([card(3, 'hearts')])
    const s = flip(state, rng).state // laatste kaart -> ended
    expect(s.phase).toBe('ended')
    expect(apply(s, { t: 'FLIP_CARD', playerId: 'p1' }, rng).error).toBe('WRONG_PHASE')
    expect(apply(s, { t: 'ADD_PLAYER', profile: P3 }, rng).error).toBe('WRONG_PHASE')
  })

  it('ADD_PLAYER weigert boven MAX_PLAYERS', () => {
    const rng = scriptedDeck([card(3, 'hearts')])
    let s = createGame(P1)
    for (let i = 2; i <= 12; i++) {
      s = reduce(s, { t: 'ADD_PLAYER', profile: { id: `x${i}`, name: `X${i}`, emoji: '🍺' } }, rng)
        .state
    }
    expect(s.players.length).toBe(12)
    expect(
      reduce(s, { t: 'ADD_PLAYER', profile: { id: 'x13', name: 'X13', emoji: '🍺' } }, rng).error,
    ).toBe('GAME_FULL')
  })
})
