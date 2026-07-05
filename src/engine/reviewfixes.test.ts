import { describe, expect, it } from 'vitest'
import { createGame, reduce } from './reducer'
import { scriptedRollSource, type RollSource } from './rng'
import type { Command, Die, GameState, RuleConfig } from './types'
import { DEFAULT_RULES } from './types'

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

describe('omgekeerde mex op de laatste worp', () => {
  function derdeWorp65(rules?: Partial<RuleConfig>): GameState {
    let state = roll(setup(2, rules), 'p1', [6, 4])
    state = roll(state, 'p1', [5, 4])
    return roll(state, 'p1', [6, 5])
  }

  it('de beurt blijft open: flippen kan nog', () => {
    let state = derdeWorp65({ omgekeerdeMex: true })
    expect(state.turn?.locked).toBe(false)
    // Verder gooien kan uiteraard niet meer.
    expect(reduce(state, { t: 'ROLL', playerId: 'p1' }, noRng).error).toBe('WRONG_PHASE')

    state = ok(state, { t: 'FLIP_65', playerId: 'p1' })
    expect(state.players[0].roundScore).toBe(1000)
    expect(state.round.mexCount).toBe(0)
  })

  it('blijven staan met de 65 kan ook', () => {
    let state = derdeWorp65({ omgekeerdeMex: true })
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(state.players[0].roundScore).toBe(65)
  })

  it('zonder de regel sluit de derde worp de beurt gewoon af', () => {
    const state = derdeWorp65()
    expect(state.players[0].roundScore).toBe(65)
    expect(state.turn?.playerId).toBe('p2')
  })
})

describe('forfeit-randgevallen', () => {
  it('forfeit met een liggende 31 geeft geen eindscore', () => {
    let state = roll(setup(2), 'p1', [3, 1])
    expect(state.turn?.pending31).toBe(true)
    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p1' })
    // Rank 31 zou onder de 32 duiken; een forfeit-31 telt daarom niet.
    expect(state.players[0].roundScore).toBeNull()
  })

  it('forfeit in de tiebreak: de wegvaller verliest de kamp', () => {
    let state = roll(setup(2), 'p1', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [2, 6])
    state = ok(state, { t: 'END_TURN', playerId: 'p2' })
    expect(state.phase).toBe('tiebreak')

    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p2' })
    expect(state.phase).toBe('roundEnd')
    expect(state.players[1].sipsTotal).toBe(2)
    expect(state.round.startingPlayerId).toBe('p2')
  })

  it('tiebreak-forfeit respecteert de verdubbelde inzet', () => {
    let state = roll(setup(2), 'p1', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [2, 6])
    state = ok(state, { t: 'END_TURN', playerId: 'p2' })
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4]))
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p2' }, scriptedRollSource([4]))
    expect(state.tiebreak?.multiplier).toBe(2)

    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p1' })
    expect(state.players[0].sipsTotal).toBe(4)
  })

  it('forfeit voor een speler die al gegooid heeft in de kamp is ongeldig', () => {
    let state = roll(setup(2), 'p1', [6, 2])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [2, 6])
    state = ok(state, { t: 'END_TURN', playerId: 'p2' })
    state = ok(state, { t: 'TIEBREAK_ROLL', playerId: 'p1' }, scriptedRollSource([4]))
    expect(reduce(state, { t: 'FORFEIT_TURN', playerId: 'p1' }, noRng).error).toBe(
      'ALREADY_ROLLED',
    )
  })
})

describe('potje afsluiten', () => {
  function naRonde(): GameState {
    let state = roll(setup(2), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [3, 2])
    return ok(state, { t: 'END_TURN', playerId: 'p2' })
  }

  it('kan alleen na een ronde-einde', () => {
    expect(reduce(setup(2), { t: 'END_GAME' }, noRng).error).toBe('WRONG_PHASE')
    const state = ok(naRonde(), { t: 'END_GAME' })
    expect(state.phase).toBe('ended')
    expect(state.turn).toBeNull()
    // De eindstand (slokken) blijft staan.
    expect(state.players[1].sipsTotal).toBe(2)
  })

  it('na afsluiten is geen enkele spelactie meer geldig', () => {
    const state = ok(naRonde(), { t: 'END_GAME' })
    expect(reduce(state, { t: 'NEXT_ROUND' }, noRng).error).toBe('WRONG_PHASE')
    expect(reduce(state, { t: 'ROLL', playerId: 'p1' }, noRng).error).toBe('WRONG_PHASE')
  })
})
