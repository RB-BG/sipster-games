// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { beforeEach, describe, expect, it } from 'vitest'
import { card, orderedDeck, scriptedDeck, type DeckSource } from './deck'
import { PYRAMID_ROW_SIZES } from './pyramid'
import { createGame, reduce } from './reducer'
import type { AnswerChoice, Card, Command, GameState, PlayerProfile } from './types'

const A: PlayerProfile = { id: 'a', name: 'Ann', emoji: '🅰️' }
const B: PlayerProfile = { id: 'b', name: 'Bo', emoji: '🅱️' }

function step(state: GameState, cmd: Command, rng: DeckSource): GameState {
  const r = reduce(state, cmd, rng)
  if (r.error) throw new Error(`onverwachte fout ${r.error} bij ${cmd.t}`)
  return r.state
}

/** Twee-speler-potje dat via de geordende deck in de questions-fase start. */
function startedGame(rng: DeckSource): GameState {
  let s = createGame(A, { standaardSlokken: 1, bluffen: true, busLengte: 5 })
  s = step(s, { t: 'ADD_PLAYER', profile: B }, rng)
  s = step(s, { t: 'START_GAME' }, rng)
  return s
}

describe('START_GAME', () => {
  it('deelt een deck, gaat naar questions en zet de eerste beurt', () => {
    const rng = scriptedDeck(orderedDeck())
    const s = startedGame(rng)
    expect(s.phase).toBe('questions')
    expect(s.deck.length).toBe(52)
    expect(s.turn).toEqual({ playerId: 'a', questionIndex: 0, revealed: [] })
  })
})

describe('questions: goed vs fout', () => {
  let rng: DeckSource
  beforeEach(() => {
    // Ann krijgt hearts 2,3,4,5 (idx 0..3): rood, oplopend.
    rng = scriptedDeck(orderedDeck())
  })

  it('goed antwoord levert een pending give op die slokken uitdeelt', () => {
    let s = startedGame(rng)
    // Q0: hearts2 is rood, antwoord 'rood' is goed.
    s = step(s, { t: 'ANSWER', playerId: 'a', choice: 'rood' }, rng)
    expect(s.pendingGive).toEqual({ playerId: 'a', amount: 1 })
    // Geen antwoord toegestaan zolang de give openstaat.
    expect(reduce(s, { t: 'ANSWER', playerId: 'a', choice: 'hoger' }, rng).error).toBe('PENDING_GIVE')
    s = step(s, { t: 'GIVE_SIPS', playerId: 'a', targetPlayerId: 'b' }, rng)
    expect(s.players[1].sipsTotal).toBe(1)
    expect(s.pendingGive).toBeNull()
    expect(s.turn?.questionIndex).toBe(1)
  })

  it('fout antwoord laat de speler zelf drinken en gaat door', () => {
    let s = startedGame(rng)
    // Q0: hearts2 rood, antwoord 'zwart' is fout: 1 slok.
    s = step(s, { t: 'ANSWER', playerId: 'a', choice: 'zwart' }, rng)
    expect(s.players[0].sipsTotal).toBe(1)
    expect(s.pendingGive).toBeNull()
    expect(s.turn?.questionIndex).toBe(1)
  })

  it('hoger/lager telt gelijk als fout', () => {
    // Deck zo dat kaart 2 gelijk is aan kaart 1 in rank.
    const deck: Card[] = [card(7, 'hearts'), card(7, 'clubs'), card(3, 'spades'), card(4, 'spades')]
    const r = scriptedDeck([...deck, ...orderedDeck()])
    let s = startedGame(r)
    s = step(s, { t: 'ANSWER', playerId: 'a', choice: 'rood' }, r) // Q0 goed
    s = step(s, { t: 'GIVE_SIPS', playerId: 'a', targetPlayerId: 'b' }, r)
    // Q1: 7 vs 7 gelijk -> altijd fout.
    s = step(s, { t: 'ANSWER', playerId: 'a', choice: 'hoger' }, r)
    expect(s.players[0].sipsTotal).toBe(2)
  })
})

describe('questions -> pyramid transitie', () => {
  it('na de laatste speler zijn Q4 wordt de piramide gelegd', () => {
    const rng = scriptedDeck(orderedDeck())
    let s = startedGame(rng)
    // Beide spelers vier keer fout: geen give-stappen nodig, elk 1+2+3+4 = 10 slokken.
    const wrong: AnswerChoice[] = ['zwart', 'lager', 'binnen', 'niet']
    for (let p = 0; p < 2; p++) {
      for (const choice of wrong) {
        s = step(s, { t: 'ANSWER', playerId: s.turn!.playerId, choice }, rng)
      }
    }
    expect(s.phase).toBe('pyramid')
    expect(s.turn).toBeNull()
    expect(s.pyramid?.rows.map((r) => r.length)).toEqual(PYRAMID_ROW_SIZES)
    expect(s.players[0].hand.length).toBe(4)
    expect(s.players[1].hand.length).toBe(4)
    expect(s.players[0].sipsTotal).toBe(10)
    expect(s.players[1].sipsTotal).toBe(10)
  })
})

// --- Piramide: claims en bluffen ----------------------------------------

function pyramidGame(
  handA: Card[],
  handB: Card[],
  currentRank: number | null,
  rowValue: number,
  bluffen = true,
): GameState {
  return {
    version: 1,
    phase: 'pyramid',
    rules: { standaardSlokken: 1, bluffen, busLengte: 5 },
    hostId: 'a',
    players: [
      { ...A, connected: true, sipsTotal: 0, hand: handA },
      { ...B, connected: true, sipsTotal: 0, hand: handB },
    ],
    deck: orderedDeck(),
    drawIndex: 30,
    turn: null,
    pyramid: {
      rows: [],
      flipIndex: 0,
      currentRank: currentRank as Card['rank'] | null,
      currentRowValue: rowValue,
      openClaim: null,
    },
    bus: null,
    pendingGive: null,
    sipsLog: [],
  }
}

describe('piramide claims', () => {
  const rng = scriptedDeck(orderedDeck())

  it('eerlijke claim legt de kaart af en deelt de rij-slokken uit', () => {
    let s = pyramidGame([card(10, 'clubs')], [], 10, 3)
    s = step(s, { t: 'PLAY_CARD', playerId: 'a', card: card(10, 'clubs') }, rng)
    expect(s.pyramid?.openClaim?.truthful).toBe(true)
    expect(s.pendingGive).toEqual({ playerId: 'a', amount: 3 })
    s = step(s, { t: 'GIVE_SIPS', playerId: 'a', targetPlayerId: 'b' }, rng)
    expect(s.players[1].sipsTotal).toBe(3)
    expect(s.players[0].hand.length).toBe(0)
    expect(s.pyramid?.openClaim).toBeNull()
  })

  it('betrapte leugenaar drinkt dubbel en de give vervalt', () => {
    let s = pyramidGame([card(5, 'clubs')], [], 10, 3)
    s = step(s, { t: 'PLAY_CARD', playerId: 'a', card: card(10, 'hearts') }, rng)
    expect(s.pyramid?.openClaim?.truthful).toBe(false)
    s = step(s, { t: 'CALL_BLUFF', playerId: 'b', targetPlayerId: 'a' }, rng)
    expect(s.players[0].sipsTotal).toBe(6) // 2 * rowValue 3
    expect(s.players[1].sipsTotal).toBe(0)
    expect(s.pendingGive).toBeNull()
    expect(s.pyramid?.openClaim).toBeNull()
    expect(s.players[0].hand.length).toBe(1) // kaart blijft: had 'm niet
  })

  it('valse beschuldiging: aanklager drinkt dubbel, eerlijke claim staat', () => {
    let s = pyramidGame([card(10, 'clubs')], [], 10, 3)
    s = step(s, { t: 'PLAY_CARD', playerId: 'a', card: card(10, 'clubs') }, rng)
    s = step(s, { t: 'CALL_BLUFF', playerId: 'b', targetPlayerId: 'a' }, rng)
    expect(s.players[1].sipsTotal).toBe(6) // aanklager B drinkt dubbel
    expect(s.players[0].hand.length).toBe(0) // eerlijke kaart afgelegd
    expect(s.pendingGive).toEqual({ playerId: 'a', amount: 3 }) // give staat nog
    s = step(s, { t: 'GIVE_SIPS', playerId: 'a', targetPlayerId: 'b' }, rng)
    expect(s.players[1].sipsTotal).toBe(9)
  })

  it('zonder bluf-regel moet de claim waar zijn', () => {
    const s = pyramidGame([card(5, 'clubs')], [], 10, 3, false)
    expect(reduce(s, { t: 'PLAY_CARD', playerId: 'a', card: card(10, 'hearts') }, rng).error).toBe(
      'INVALID_CARD',
    )
  })

  it('je kunt je eigen claim niet aanvechten', () => {
    let s = pyramidGame([card(10, 'clubs')], [], 10, 3)
    s = step(s, { t: 'PLAY_CARD', playerId: 'a', card: card(10, 'clubs') }, rng)
    expect(reduce(s, { t: 'CALL_BLUFF', playerId: 'a', targetPlayerId: 'a' }, rng).error).toBe(
      'INVALID_TARGET',
    )
  })
})

describe('piramide flippen en naar de bus', () => {
  const rng = scriptedDeck(orderedDeck())

  it('flipt van onder naar boven met oplopende rij-waarde', () => {
    const s0 = pyramidGame([], [], null, 0)
    const deck = orderedDeck()
    let i = 0
    s0.pyramid!.rows = PYRAMID_ROW_SIZES.map((size) => deck.slice(i, (i += size)))
    const s = step(s0, { t: 'FLIP_PYRAMID', playerId: 'a' }, rng)
    expect(s.pyramid?.flipIndex).toBe(1)
    expect(s.pyramid?.currentRowValue).toBe(1)
    expect(s.pyramid?.currentRank).toBe(deck[0].rank)
  })

  it('NEXT_PHASE na de laatste flip start de bus met de meeste-kaarten-chauffeur', () => {
    const s0 = pyramidGame([card(2, 'hearts'), card(3, 'hearts')], [card(4, 'hearts')], null, 0)
    const deck = orderedDeck()
    let i = 0
    s0.pyramid!.rows = PYRAMID_ROW_SIZES.map((size) => deck.slice(i, (i += size)))
    s0.pyramid!.flipIndex = 15
    const s = step(s0, { t: 'NEXT_PHASE' }, rng)
    expect(s.phase).toBe('bus')
    expect(s.bus?.driverIds).toEqual(['a']) // A heeft 2 kaarten, B heeft er 1
    expect(s.bus?.cards.length).toBe(5)
  })
})

// --- Bus -----------------------------------------------------------------

function busGame(cards: Card[], busLengte: number, deckTail: Card[]): GameState {
  return {
    version: 1,
    phase: 'bus',
    rules: { standaardSlokken: 1, bluffen: true, busLengte },
    hostId: 'a',
    players: [
      { ...A, connected: true, sipsTotal: 0, hand: [] },
      { ...B, connected: true, sipsTotal: 0, hand: [] },
    ],
    deck: deckTail,
    drawIndex: 0,
    turn: null,
    pyramid: null,
    bus: { driverIds: ['a'], cards, position: 0, strikes: 0 },
    pendingGive: null,
    sipsLog: [],
  }
}

describe('bus', () => {
  const rng = scriptedDeck(orderedDeck())

  it('goede gok schuift een positie op', () => {
    const s0 = busGame([card(5, 'hearts'), card(9, 'clubs'), card(3, 'spades')], 3, [])
    const s = step(s0, { t: 'BUS_GUESS', playerId: 'a', choice: 'hoger' }, rng)
    expect(s.bus?.position).toBe(1)
    expect(s.phase).toBe('bus')
  })

  it('foute gok laat de chauffeur drinken en begint opnieuw met verse kaarten', () => {
    const tail = [card(2, 'clubs'), card(4, 'clubs'), card(6, 'clubs')]
    const s0 = busGame([card(5, 'hearts'), card(9, 'clubs'), card(3, 'spades')], 3, tail)
    // 9 > 5, dus 'lager' is fout.
    const s = step(s0, { t: 'BUS_GUESS', playerId: 'a', choice: 'lager' }, rng)
    expect(s.players[0].sipsTotal).toBe(1) // eerste misser = 1 slok
    expect(s.bus?.strikes).toBe(1)
    expect(s.bus?.position).toBe(0)
    expect(s.bus?.cards[0]).toEqual(tail[0]) // verse rij
  })

  it('laatste goede gok rijdt de bus uit -> ended', () => {
    const s0 = busGame([card(5, 'hearts'), card(9, 'clubs')], 2, [])
    const s = step(s0, { t: 'BUS_GUESS', playerId: 'a', choice: 'hoger' }, rng)
    expect(s.phase).toBe('ended')
  })

  it('alleen een chauffeur mag gokken', () => {
    const s = busGame([card(5, 'hearts'), card(9, 'clubs')], 2, [])
    expect(reduce(s, { t: 'BUS_GUESS', playerId: 'b', choice: 'hoger' }, rng).error).toBe(
      'NOT_A_DRIVER',
    )
  })
})

describe('validatie basis', () => {
  const rng = scriptedDeck(orderedDeck())
  it('START_GAME vereist twee spelers', () => {
    const s = createGame(A)
    expect(reduce(s, { t: 'START_GAME' }, rng).error).toBe('NOT_ENOUGH_PLAYERS')
  })
  it('END_GAME kan niet vanuit de lobby', () => {
    const s = createGame(A)
    expect(reduce(s, { t: 'END_GAME' }, rng).error).toBe('WRONG_PHASE')
  })
})
