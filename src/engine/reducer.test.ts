import { describe, expect, it } from 'vitest'
import { createGame, reduce } from './reducer'
import { scriptedRollSource, type RollSource } from './rng'
import { scoreRank } from './score'
import type { Command, Die, GameState, RuleConfig } from './types'
import { DEFAULT_RULES } from './types'

/** Commands die niet gooien mogen de rng nooit aanraken; deze bron gooit dan een error. */
const noRng = scriptedRollSource([])

function ok(state: GameState, cmd: Command, rng: RollSource = noRng): GameState {
  const result = reduce(state, cmd, rng)
  expect(result.error).toBeUndefined()
  return result.state
}

function roll(state: GameState, playerId: string, values: Die[]): GameState {
  return ok(state, { t: 'ROLL', playerId }, scriptedRollSource(values))
}

function setup(playerCount: number, rules?: Partial<RuleConfig>): GameState {
  let state = createGame(
    { id: 'p1', name: 'Speler 1', emoji: '🎲' },
    { ...DEFAULT_RULES, ...rules },
  )
  for (let i = 2; i <= playerCount; i++) {
    state = ok(state, {
      t: 'ADD_PLAYER',
      profile: { id: `p${i}`, name: `Speler ${i}`, emoji: '🍺' },
    })
  }
  return ok(state, { t: 'START_GAME' })
}

describe('lobby', () => {
  it('start met de host als eerste speler', () => {
    const state = createGame({ id: 'p1', name: 'Ruben', emoji: '🎲' })
    expect(state.phase).toBe('lobby')
    expect(state.players.map((p) => p.id)).toEqual(['p1'])
    expect(state.hostId).toBe('p1')
  })

  it('weigert starten met minder dan twee spelers', () => {
    const state = createGame({ id: 'p1', name: 'Ruben', emoji: '🎲' })
    expect(reduce(state, { t: 'START_GAME' }, noRng).error).toBe('NOT_ENOUGH_PLAYERS')
  })

  it('weigert dubbel joinen', () => {
    const state = createGame({ id: 'p1', name: 'Ruben', emoji: '🎲' })
    const result = reduce(
      state,
      { t: 'ADD_PLAYER', profile: { id: 'p1', name: 'Kloon', emoji: '👯' } },
      noRng,
    )
    expect(result.error).toBe('ALREADY_JOINED')
  })

  it('weigert joinen na de start', () => {
    const state = setup(2)
    const result = reduce(
      state,
      { t: 'ADD_PLAYER', profile: { id: 'p3', name: 'Laat', emoji: '🦊' } },
      noRng,
    )
    expect(result.error).toBe('WRONG_PHASE')
  })

  it('start bij de eerste speler met een verse beurt', () => {
    const state = setup(3)
    expect(state.phase).toBe('playing')
    expect(state.round.number).toBe(1)
    expect(state.turn?.playerId).toBe('p1')
    expect(state.turn?.dice).toBeNull()
    expect(state.turn?.maxThrows).toBe(3)
  })
})

describe('gooien', () => {
  it('eerste worp gooit beide dobbelstenen', () => {
    const state = roll(setup(2), 'p1', [6, 4])
    expect(state.turn?.dice?.map((d) => d.value)).toEqual([6, 4])
    expect(state.turn?.throwsUsed).toBe(1)
  })

  it('geeft een DICE_ROLLED event met waarden en animSeed', () => {
    const result = reduce(setup(2), { t: 'ROLL', playerId: 'p1' }, scriptedRollSource([6, 4]))
    expect(result.events[0]).toMatchObject({
      t: 'DICE_ROLLED',
      playerId: 'p1',
      dieIds: [0, 1],
      values: [6, 4],
    })
  })

  it('een ander dan de actieve speler mag niet gooien', () => {
    const result = reduce(setup(2), { t: 'ROLL', playerId: 'p2' }, scriptedRollSource([6, 4]))
    expect(result.error).toBe('NOT_YOUR_TURN')
    expect(result.state.turn?.dice).toBeNull()
  })

  it('na drie worpen is de beurt voorbij', () => {
    let state = roll(setup(2), 'p1', [6, 4])
    state = roll(state, 'p1', [5, 4])
    state = roll(state, 'p1', [4, 3])
    expect(state.players[0].roundScore).toBe(43)
    expect(state.turn?.playerId).toBe('p2')
  })

  it('blijven staan geeft de beurt door met de huidige score', () => {
    let state = roll(setup(2), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(state.players[0].roundScore).toBe(65)
    expect(state.players[0].hasPlayedThisRound).toBe(true)
    expect(state.turn?.playerId).toBe('p2')
  })

  it('blijven staan kan niet vóór de eerste worp', () => {
    expect(reduce(setup(2), { t: 'END_TURN', playerId: 'p1' }, noRng).error).toBe('HAS_NOT_THROWN')
  })
})

describe('mex', () => {
  it('mex beëindigt de beurt direct en telt mee', () => {
    const state = roll(setup(2), 'p1', [2, 1])
    expect(state.players[0].roundScore).toBe(1000)
    expect(state.round.mexCount).toBe(1)
    expect(state.turn?.playerId).toBe('p2')
  })

  it('geeft een MEX_ROLLED event', () => {
    const result = reduce(setup(2), { t: 'ROLL', playerId: 'p1' }, scriptedRollSource([1, 2]))
    expect(result.events.some((e) => e.t === 'MEX_ROLLED')).toBe(true)
  })
})

describe('verse 1 en 2', () => {
  it('een gegooide 1 blijft verplicht liggen', () => {
    const state = roll(setup(2), 'p1', [6, 1])
    const die = state.turn?.dice?.[1]
    expect(die?.onTable).toBe(true)
    expect(die?.vers).toBe('fresh')
  })

  it('een verse 1 kan niet opgepakt worden', () => {
    const state = roll(setup(2), 'p1', [6, 1])
    expect(reduce(state, { t: 'PICKUP_DIE', playerId: 'p1', dieId: 1 }, noRng).error).toBe(
      'INVALID_DIE',
    )
  })

  it('de volgende worp gooit alleen de vrije steen', () => {
    let state = roll(setup(2), 'p1', [6, 1])
    const result = reduce(state, { t: 'ROLL', playerId: 'p1' }, scriptedRollSource([5]))
    expect(result.error).toBeUndefined()
    state = result.state
    expect(state.turn?.dice?.map((d) => d.value)).toEqual([5, 1])
  })

  it('vers wordt stale na één overleefde worp en moet daarna mee', () => {
    let state = roll(setup(2), 'p1', [6, 1])
    state = roll(state, 'p1', [5])
    expect(state.turn?.dice?.[1].vers).toBe('stale')

    // Derde worp: de stale 1 gaat automatisch mee, beide stenen krijgen een nieuwe waarde.
    state = roll(state, 'p1', [4, 3])
    expect(state.players[0].roundScore).toBe(43)
  })

  it('een herworpen 1 wordt opnieuw vers', () => {
    let state = roll(setup(2), 'p1', [6, 1])
    state = roll(state, 'p1', [5])
    state = roll(state, 'p1', [6, 1])
    // Drie worpen gebruikt: beurt voorbij, score 61 met de opnieuw gegooide 1.
    expect(state.players[0].roundScore).toBe(61)
  })

  it('met twee vastliggende stenen valt er niets te gooien', () => {
    const state = roll(setup(2), 'p1', [2, 2])
    expect(state.turn?.dice?.every((d) => d.onTable)).toBe(true)
    expect(reduce(state, { t: 'ROLL', playerId: 'p1' }, noRng).error).toBe('NO_ROLLABLE_DICE')

    // Blijven staan met 200 kan wel.
    const einde = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(einde.players[0].roundScore).toBe(200)
  })
})

describe('vasthouden en oppakken', () => {
  it('een vrije steen mag vastgehouden en weer opgepakt worden', () => {
    let state = roll(setup(2), 'p1', [6, 3])
    state = ok(state, { t: 'HOLD_DIE', playerId: 'p1', dieId: 0 })
    expect(state.turn?.dice?.[0].onTable).toBe(true)
    expect(state.turn?.dice?.[0].vers).toBeNull()

    // Alleen de losse steen wordt gegooid.
    state = roll(state, 'p1', [5])
    expect(state.turn?.dice?.map((d) => d.value)).toEqual([6, 5])

    state = ok(state, { t: 'PICKUP_DIE', playerId: 'p1', dieId: 0 })
    expect(state.turn?.dice?.[0].onTable).toBe(false)
  })

  it('vasthouden kan niet vóór de eerste worp', () => {
    expect(reduce(setup(2), { t: 'HOLD_DIE', playerId: 'p1', dieId: 0 }, noRng).error).toBe(
      'HAS_NOT_THROWN',
    )
  })

  it('een al vastgehouden steen nogmaals vasthouden is ongeldig', () => {
    let state = roll(setup(2), 'p1', [6, 3])
    state = ok(state, { t: 'HOLD_DIE', playerId: 'p1', dieId: 0 })
    expect(reduce(state, { t: 'HOLD_DIE', playerId: 'p1', dieId: 0 }, noRng).error).toBe(
      'INVALID_DIE',
    )
  })
})

describe('31', () => {
  it('31 kost geen worp en vraagt eerst slokken uitdelen', () => {
    const state = roll(setup(2), 'p1', [3, 1])
    expect(state.turn?.throwsUsed).toBe(0)
    expect(state.turn?.pending31).toBe(true)
    expect(state.turn?.dice?.[1].vers).toBe('fresh')
  })

  it('gooien en blijven staan zijn geblokkeerd tot de slokken zijn uitgedeeld', () => {
    const state = roll(setup(2), 'p1', [3, 1])
    expect(reduce(state, { t: 'ROLL', playerId: 'p1' }, noRng).error).toBe('PENDING_31')
    expect(reduce(state, { t: 'END_TURN', playerId: 'p1' }, noRng).error).toBe('PENDING_31')
  })

  it('slokken aan jezelf geven mag niet', () => {
    const state = roll(setup(2), 'p1', [3, 1])
    expect(
      reduce(state, { t: 'GIVE_SIPS_31', playerId: 'p1', targetPlayerId: 'p1' }, noRng).error,
    ).toBe('INVALID_TARGET')
  })

  it('uitgedeelde slokken komen bij de ontvanger en in de log', () => {
    let state = roll(setup(2), 'p1', [3, 1])
    const result = reduce(
      state,
      { t: 'GIVE_SIPS_31', playerId: 'p1', targetPlayerId: 'p2' },
      noRng,
    )
    expect(result.error).toBeUndefined()
    state = result.state
    expect(state.players[1].sipsTotal).toBe(2)
    expect(state.sipsLog).toEqual([
      { playerId: 'p2', amount: 2, reason: 'gekregen31', round: 1 },
    ])
    expect(result.events).toContainEqual({
      t: 'SIPS_GIVEN',
      fromPlayerId: 'p1',
      toPlayerId: 'p2',
      amount: 2,
    })
  })

  it('de herworp na 31 kan mex opleveren via de liggende 1', () => {
    let state = roll(setup(2), 'p1', [3, 1])
    state = ok(state, { t: 'GIVE_SIPS_31', playerId: 'p1', targetPlayerId: 'p2' })
    state = roll(state, 'p1', [2])
    expect(state.players[0].roundScore).toBe(1000)
    expect(state.round.mexCount).toBe(1)
  })

  it('de herworp telt wel gewoon als worp en veroudert de 1', () => {
    let state = roll(setup(2), 'p1', [3, 1])
    state = ok(state, { t: 'GIVE_SIPS_31', playerId: 'p1', targetPlayerId: 'p2' })
    state = roll(state, 'p1', [5])
    expect(state.turn?.throwsUsed).toBe(1)
    expect(state.turn?.dice?.[1].vers).toBe('stale')
  })

  it('slokken uitdelen zonder 31 is ongeldig', () => {
    const state = roll(setup(2), 'p1', [6, 4])
    expect(
      reduce(state, { t: 'GIVE_SIPS_31', playerId: 'p1', targetPlayerId: 'p2' }, noRng).error,
    ).toBe('NOT_PENDING_31')
  })
})

describe('ronde-einde', () => {
  it('de unieke laagste verliest en drinkt het standaard aantal', () => {
    let state = roll(setup(2), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    // 32 legt de beurt direct vast, dus de worp zelf sluit de ronde af.
    const result = reduce(state, { t: 'ROLL', playerId: 'p2' }, scriptedRollSource([3, 2]))
    expect(result.error).toBeUndefined()
    state = result.state

    expect(state.phase).toBe('roundEnd')
    expect(state.players[1].sipsTotal).toBe(2)
    expect(state.round.startingPlayerId).toBe('p2')
    expect(result.events).toContainEqual({ t: 'ROUND_ENDED', loserId: 'p2', sips: 2 })
  })

  it('elke mex verdubbelt de inzet voor de verliezer', () => {
    let state = roll(setup(3), 'p1', [2, 1])
    state = roll(state, 'p2', [1, 2])
    state = roll(state, 'p3', [3, 2])

    expect(state.phase).toBe('roundEnd')
    expect(state.players[2].sipsTotal).toBe(4)
  })

  it('de verliezer begint de volgende ronde en alles staat weer klaar', () => {
    let state = roll(setup(2), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [3, 2])
    state = ok(state, { t: 'NEXT_ROUND' })

    expect(state.phase).toBe('playing')
    expect(state.round.number).toBe(2)
    expect(state.round.mexCount).toBe(0)
    expect(state.turn?.playerId).toBe('p2')
    expect(state.players.every((p) => p.roundScore === null)).toBe(true)
    expect(state.players.every((p) => !p.hasPlayedThisRound)).toBe(true)
    // Slokken blijven staan over rondes heen.
    expect(state.players[1].sipsTotal).toBe(2)
  })

  it('volgende ronde starten kan alleen na een ronde-einde', () => {
    expect(reduce(setup(2), { t: 'NEXT_ROUND' }, noRng).error).toBe('WRONG_PHASE')
  })
})

describe('tiebreak', () => {
  function tiedGame(rules?: Partial<RuleConfig>): GameState {
    let state = roll(setup(2, rules), 'p1', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [2, 6])
    return ok(state, { t: 'END_TURN', playerId: 'p2' })
  }

  it('gelijke laagste scores leiden tot een tiebreak', () => {
    const state = tiedGame()
    expect(state.phase).toBe('tiebreak')
    expect(state.tiebreak?.playerIds).toEqual(['p1', 'p2'])
    expect(state.tiebreak?.multiplier).toBe(1)
  })

  it('hoogste verliest (standaardinstelling)', () => {
    let state = tiedGame()
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4]))
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p2' }, scriptedRollSource([2]))

    expect(state.phase).toBe('roundEnd')
    expect(state.players[0].sipsTotal).toBe(2)
    expect(state.players[1].sipsTotal).toBe(0)
  })

  it('laagste verliest als dat zo is afgesproken', () => {
    let state = tiedGame({ tiebreakHoogsteVerliest: false })
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4]))
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p2' }, scriptedRollSource([2]))

    expect(state.players[1].sipsTotal).toBe(2)
  })

  it('opnieuw gelijk verdubbelt de slokken', () => {
    let state = tiedGame()
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4]))
    const result = reduce(state, { t: 'TIEBREAK_ROLL', playerId: 'p2' }, scriptedRollSource([4]))
    state = result.state

    expect(state.phase).toBe('tiebreak')
    expect(state.tiebreak?.multiplier).toBe(2)
    expect(result.events).toContainEqual({
      t: 'TIEBREAK_TIED',
      playerIds: ['p1', 'p2'],
      multiplier: 2,
    })

    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([6]))
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p2' }, scriptedRollSource([3]))
    expect(state.players[0].sipsTotal).toBe(4)
  })

  it('wie niet gebonden is doet niet mee aan de tiebreak', () => {
    // Drie spelers, alle drie 62: iedereen gebonden; twee delen daarna de hoogste worp.
    let state = roll(setup(3), 'p1', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p2' })
    state = roll(state, 'p3', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p3' })

    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([5]))
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p2' }, scriptedRollSource([5]))
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p3' }, scriptedRollSource([2]))

    // p3 is veilig; p1 en p2 gooien opnieuw met verdubbelde inzet.
    expect(state.tiebreak?.playerIds).toEqual(['p1', 'p2'])
    expect(state.tiebreak?.multiplier).toBe(2)
    expect(
      reduce(state, { t: 'TIEBREAK_ROLL', playerId: 'p3' }, scriptedRollSource([1])).error,
    ).toBe('NOT_YOUR_TURN')
  })

  it('twee keer gooien in dezelfde tiebreak-ronde mag niet', () => {
    let state = tiedGame()
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4]))
    expect(
      reduce(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4])).error,
    ).toBe('ALREADY_ROLLED')
  })
})

describe('state-integriteit', () => {
  it('version loopt op bij elke geslaagde mutatie', () => {
    const before = setup(2)
    const after = roll(before, 'p1', [6, 4])
    expect(after.version).toBe(before.version + 1)
  })

  it('een afgewezen command laat de state exact intact', () => {
    const before = setup(2)
    const result = reduce(before, { t: 'ROLL', playerId: 'p2' }, scriptedRollSource([6, 4]))
    expect(result.state).toBe(before)
    expect(result.state.version).toBe(before.version)
  })

  it('scoreRank en roundScore zijn consistent', () => {
    let state = roll(setup(2), 'p1', [4, 4])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(state.players[0].roundScore).toBe(scoreRank(4, 4))
  })
})
