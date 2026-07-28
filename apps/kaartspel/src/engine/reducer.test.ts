// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import { card, joker, orderedDeck, scriptedDeck } from './deck'
import { createGame, reduce } from './reducer'
import { DEFAULT_RULES, type GameState, type HandCard, type PlayerProfile } from './types'

/** Bron met een volledig deck, voor commands die delen (START_GAME, NEXT_ROUND). */
const FULL = scriptedDeck(orderedDeck())

function profile(id: string): PlayerProfile {
  return { id, name: id, emoji: '🙂' }
}

function lobbyWith(ids: string[]): GameState {
  let state = createGame(profile(ids[0]))
  for (const id of ids.slice(1)) {
    state = reduce(state, { t: 'ADD_PLAYER', profile: profile(id) }, FULL).state
  }
  return state
}

/** Bouwt direct een speel-state met vaste handen, om scoring te isoleren. */
function makePlaying(hands: HandCard[][], overrides: Partial<GameState> = {}): GameState {
  const players = hands.map((hand, i) => ({
    id: `p${i}`,
    name: `p${i}`,
    emoji: '🙂',
    connected: true,
    hand,
    score: 0,
    sips: 0,
  }))
  return {
    version: 1,
    phase: 'playing',
    rules: { ...DEFAULT_RULES },
    hostId: 'p0',
    players,
    round: 1,
    deck: [card(8, 'diamonds'), card(8, 'clubs')],
    drawIndex: 0,
    discardTop: [card(7, 'hearts')],
    discardBuried: [],
    turn: { playerId: 'p0' },
    roundResult: null,
    finalTurns: null,
    ...overrides,
  }
}

/**
 * Roept Yousef en laat daarna de overige spelers hun laatste beurt passen
 * (FORFEIT verandert de hand niet), zodat de scoring op vaste handen te testen is.
 */
function yousefAndSkip(state: GameState, callerId: string): GameState {
  let s = reduce(state, { t: 'CALL_YOUSEF', playerId: callerId }, FULL).state
  while (s.finalTurns) s = reduce(s, { t: 'FORFEIT_TURN' }, FULL).state
  return s
}

describe('createGame + lobby', () => {
  it('start in de lobby met de host als enige speler', () => {
    const s = createGame(profile('p0'))
    expect(s.phase).toBe('lobby')
    expect(s.players).toHaveLength(1)
    expect(s.round).toBe(0)
  })
  it('weigert dezelfde speler tweemaal', () => {
    const s = lobbyWith(['p0'])
    const r = reduce(s, { t: 'ADD_PLAYER', profile: profile('p0') }, FULL)
    expect(r.error).toBe('ALREADY_JOINED')
  })
  it('START_GAME vereist minstens twee spelers', () => {
    const r = reduce(lobbyWith(['p0']), { t: 'START_GAME' }, FULL)
    expect(r.error).toBe('NOT_ENOUGH_PLAYERS')
  })
})

describe('START_GAME', () => {
  it('deelt handen, draait een startkaart en zet de beurt bij de eerste speler', () => {
    const r = reduce(lobbyWith(['p0', 'p1']), { t: 'START_GAME' }, FULL)
    expect(r.state.phase).toBe('playing')
    expect(r.state.round).toBe(1)
    expect(r.state.players[0].hand).toHaveLength(5)
    expect(r.state.players[1].hand).toHaveLength(5)
    expect(r.state.discardTop).toHaveLength(1)
    expect(r.state.drawIndex).toBe(2 * 5 + 1)
    expect(r.state.turn).toEqual({ playerId: 'p0' })
    expect(r.events).toContainEqual({ t: 'PHASE_CHANGED', phase: 'playing' })
  })
})

describe('PLAY_TURN', () => {
  const hands = () => [
    [card(9, 'hearts'), card(9, 'diamonds'), card(3, 'clubs'), card(5, 'spades'), joker(0)],
    [card(2, 'spades')],
  ]

  it('legt een setje af en trekt van de stapel', () => {
    const s = makePlaying(hands())
    const r = reduce(
      s,
      {
        t: 'PLAY_TURN',
        playerId: 'p0',
        discard: [card(9, 'hearts'), card(9, 'diamonds')],
        drawFrom: 'deck',
      },
      FULL,
    )
    expect(r.error).toBeUndefined()
    expect(r.state.players[0].hand).toHaveLength(4)
    expect(r.state.players[0].hand).toContainEqual(card(8, 'diamonds')) // getrokken van de stapel
    expect(r.state.discardTop).toEqual([card(9, 'hearts'), card(9, 'diamonds')])
    expect(r.state.discardBuried).toContainEqual(card(7, 'hearts')) // oude top begraven
    expect(r.state.turn).toEqual({ playerId: 'p1' })
  })

  it('kan de bovenste afgelegde kaart oppakken i.p.v. van de stapel', () => {
    const s = makePlaying(hands())
    const r = reduce(
      s,
      { t: 'PLAY_TURN', playerId: 'p0', discard: [card(5, 'spades')], drawFrom: 'discard' },
      FULL,
    )
    expect(r.state.players[0].hand).toContainEqual(card(7, 'hearts')) // opgepakt van de aflegstapel
    expect(r.state.discardTop).toEqual([card(5, 'spades')])
    expect(r.events.some((e) => e.t === 'PLAYED' && e.fromDiscard)).toBe(true)
  })

  it('weigert een ongeldige afleg-groep', () => {
    const r = reduce(
      makePlaying(hands()),
      {
        t: 'PLAY_TURN',
        playerId: 'p0',
        discard: [card(9, 'hearts'), card(3, 'clubs')],
        drawFrom: 'deck',
      },
      FULL,
    )
    expect(r.error).toBe('INVALID_GROUP')
  })

  it('weigert kaarten die niet in de hand zitten', () => {
    const r = reduce(
      makePlaying(hands()),
      { t: 'PLAY_TURN', playerId: 'p0', discard: [card(2, 'diamonds')], drawFrom: 'deck' },
      FULL,
    )
    expect(r.error).toBe('CARD_NOT_IN_HAND')
  })

  it('weigert een beurt van de verkeerde speler', () => {
    const r = reduce(
      makePlaying(hands()),
      { t: 'PLAY_TURN', playerId: 'p1', discard: [card(2, 'spades')], drawFrom: 'deck' },
      FULL,
    )
    expect(r.error).toBe('NOT_YOUR_TURN')
  })
})

describe('CALL_YOUSEF', () => {
  it('mag niet met een te hoge hand (boven yousefMax)', () => {
    const s = makePlaying([[card(9, 'hearts'), card(9, 'diamonds')], [card(2, 'spades')]])
    const r = reduce(s, { t: 'CALL_YOUSEF', playerId: 'p0' }, FULL)
    expect(r.error).toBe('HAND_TOO_HIGH')
  })

  it('mag bij precies de drempel (5 of lager)', () => {
    const s = makePlaying([[card(5, 'hearts')], [card(2, 'spades')]])
    const r = reduce(s, { t: 'CALL_YOUSEF', playerId: 'p0' }, FULL)
    expect(r.error).toBeUndefined()
  })

  it('scoort niet meteen: iedereen behalve de roeper krijgt nog een beurt', () => {
    const s = makePlaying([[card(4, 'hearts')], [card(9, 'hearts')], [card(8, 'hearts')]])
    const r = reduce(s, { t: 'CALL_YOUSEF', playerId: 'p0' }, FULL)
    expect(r.state.phase).toBe('playing')
    expect(r.state.finalTurns).toEqual({ callerId: 'p0', queue: ['p1', 'p2'] })
    expect(r.state.turn).toEqual({ playerId: 'p1' })
    expect(r.events).toContainEqual({ t: 'YOUSEF_CALLED', callerId: 'p0' })
  })

  it('schone winst na de laatste ronde: roeper 0, de rest het verschil tot de roeper', () => {
    const s = makePlaying([[card(4, 'hearts')], [card(9, 'hearts')], [card(8, 'hearts')]])
    const end = yousefAndSkip(s, 'p0')
    expect(end.phase).toBe('roundEnd')
    expect(end.turn).toBeNull()
    expect(end.roundResult?.assaf).toBe(false)
    expect(end.players[0].score).toBe(0)
    expect(end.players[1].score).toBe(9 - 4)
    expect(end.players[2].score).toBe(8 - 4)
  })

  it('Assaf met iemand lager: roeper krijgt verschil x10, de rest 0', () => {
    // p0=4, p1=1 (aas), p2=8. Verkeerde call: (4-1)*10 = 30 voor p0.
    const end = yousefAndSkip(
      makePlaying([[card(4, 'hearts')], [card(14, 'hearts')], [card(8, 'hearts')]]),
      'p0',
    )
    expect(end.roundResult?.assaf).toBe(true)
    expect(end.players[0].score).toBe(30)
    expect(end.players[1].score).toBe(0)
    expect(end.players[2].score).toBe(0)
    expect(end.roundResult?.lowestValue).toBe(1)
  })

  it('Assaf bij gelijkspel: roeper +10, de rest 0', () => {
    const end = yousefAndSkip(
      makePlaying([[card(3, 'hearts')], [card(3, 'diamonds')], [card(8, 'hearts')]]),
      'p0',
    )
    expect(end.roundResult?.assaf).toBe(true)
    expect(end.players[0].score).toBe(10)
    expect(end.players[1].score).toBe(0)
    expect(end.players[2].score).toBe(0)
  })
})

describe('roundEnd: bakken, afkopen en de volgende ronde', () => {
  function assafState(): GameState {
    const s = makePlaying([[card(4, 'hearts')], [card(14, 'hearts')], [card(8, 'hearts')]])
    return yousefAndSkip(s, 'p0') // p0 score 30
  }

  it('DRAW_BAK haalt 20 punten weg', () => {
    const r = reduce(assafState(), { t: 'DRAW_BAK', playerId: 'p0' }, FULL)
    expect(r.state.players[0].score).toBe(10)
    expect(r.events).toContainEqual({ t: 'BAK_DRAWN', playerId: 'p0' })
  })

  it('een speler onder de 30 kan geen bak trekken', () => {
    const r = reduce(assafState(), { t: 'DRAW_BAK', playerId: 'p1' }, FULL)
    expect(r.error).toBe('NO_BAK_DUE')
  })

  it('BUY_OFF kost 10 punten en levert 10 slokken op', () => {
    const clean = yousefAndSkip(
      makePlaying([[card(4, 'hearts')], [card(9, 'hearts')], [card(8, 'hearts')]]),
      'p0',
    ) // p1 score 5
    const r = reduce(clean, { t: 'BUY_OFF', playerId: 'p1' }, FULL)
    expect(r.state.players[1].score).toBe(5 - 10)
    expect(r.state.players[1].sips).toBe(10)
  })

  it('afkopen mag niet bij een score van 30 of hoger', () => {
    const r = reduce(assafState(), { t: 'BUY_OFF', playerId: 'p0' }, FULL)
    expect(r.error).toBe('CANNOT_BUY_OFF')
  })

  it('NEXT_ROUND is geblokkeerd zolang iemand nog een bak moet trekken', () => {
    const r = reduce(assafState(), { t: 'NEXT_ROUND' }, FULL)
    expect(r.error).toBe('BAK_PENDING')
  })

  it('NEXT_ROUND deelt opnieuw, houdt scores en telt de ronde op', () => {
    const drawn = reduce(assafState(), { t: 'DRAW_BAK', playerId: 'p0' }, FULL).state // p0 -> 10
    const r = reduce(drawn, { t: 'NEXT_ROUND' }, FULL)
    expect(r.error).toBeUndefined()
    expect(r.state.phase).toBe('playing')
    expect(r.state.round).toBe(2)
    expect(r.state.roundResult).toBeNull()
    expect(r.state.players[0].hand).toHaveLength(5)
    expect(r.state.players[0].score).toBe(10) // score blijft cumulatief
  })
})

describe('huisregels', () => {
  it('joker-wildcard uit: een joker mag niet in een straat', () => {
    const hand = [card(4, 'hearts'), joker(0), card(6, 'clubs')]
    const off = makePlaying([hand, [card(2, 'spades')]], {
      rules: { ...DEFAULT_RULES, jokerWildcard: false },
    })
    const r = reduce(off, { t: 'PLAY_TURN', playerId: 'p0', discard: hand, drawFrom: 'deck' }, FULL)
    expect(r.error).toBe('INVALID_GROUP')

    // Met de wildcard aan (standaard) mag het wél.
    const on = makePlaying([hand, [card(2, 'spades')]])
    const ok = reduce(on, { t: 'PLAY_TURN', playerId: 'p0', discard: hand, drawFrom: 'deck' }, FULL)
    expect(ok.error).toBeUndefined()
  })

  it('assafEveryoneScores: bij Assaf scoort de rest het verschil tot de laagste', () => {
    const s = makePlaying([[card(4, 'hearts')], [card(14, 'hearts')], [card(8, 'hearts')]], {
      rules: { ...DEFAULT_RULES, assafEveryoneScores: true },
    })
    const end = yousefAndSkip(s, 'p0')
    // p0 (roeper) krijgt de straf, p1 is de laagste (0), p2 het verschil 8-1=7.
    expect(end.players[0].score).toBe(30)
    expect(end.players[1].score).toBe(0)
    expect(end.players[2].score).toBe(8 - 1)
  })

  it('bakThreshold hoger: geen bak nodig en de volgende ronde mag meteen', () => {
    const s = makePlaying([[card(4, 'hearts')], [card(14, 'hearts')], [card(8, 'hearts')]], {
      rules: { ...DEFAULT_RULES, bakThreshold: 100 },
    })
    const rEnd = yousefAndSkip(s, 'p0') // p0 score 30 < 100
    expect(reduce(rEnd, { t: 'DRAW_BAK', playerId: 'p0' }, FULL).error).toBe('NO_BAK_DUE')
    const next = reduce(rEnd, { t: 'NEXT_ROUND' }, FULL)
    expect(next.error).toBeUndefined()
    expect(next.state.phase).toBe('playing')
  })
})

describe('beurt-beheer', () => {
  it('FORFEIT_TURN slaat weggevallen spelers over', () => {
    const s = makePlaying([[card(2, 'hearts')], [card(3, 'hearts')], [card(4, 'hearts')]])
    s.players[1].connected = false
    const r = reduce(s, { t: 'FORFEIT_TURN' }, FULL)
    expect(r.state.turn).toEqual({ playerId: 'p2' })
  })

  it('END_GAME beëindigt het potje', () => {
    const r = reduce(
      makePlaying([[card(2, 'hearts')], [card(3, 'hearts')]]),
      { t: 'END_GAME' },
      FULL,
    )
    expect(r.state.phase).toBe('ended')
    expect(r.state.turn).toBeNull()
  })
})
