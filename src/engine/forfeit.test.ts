import { describe, expect, it } from 'vitest'
import { createGame, reduce } from './reducer'
import { scriptedRollSource, type RollSource } from './rng'
import type { Command, Die, GameState } from './types'

const noRng = scriptedRollSource([])

function ok(state: GameState, cmd: Command, rng: RollSource = noRng): GameState {
  const result = reduce(state, cmd, rng)
  expect(result.error).toBeUndefined()
  return result.state
}

function roll(state: GameState, playerId: string, values: Die[]): GameState {
  return ok(state, { t: 'ROLL', playerId }, scriptedRollSource(values))
}

function setup(playerCount: number): GameState {
  let state = createGame({ id: 'p1', name: 'Speler 1', emoji: '🎲' })
  for (let i = 2; i <= playerCount; i++) {
    state = ok(state, {
      t: 'ADD_PLAYER',
      profile: { id: `p${i}`, name: `Speler ${i}`, emoji: '🍺' },
    })
  }
  return ok(state, { t: 'START_GAME' })
}

describe('SET_CONNECTED', () => {
  it('markeert een speler als offline en weer online', () => {
    let state = setup(2)
    state = ok(state, { t: 'SET_CONNECTED', playerId: 'p2', connected: false })
    expect(state.players[1].connected).toBe(false)
    state = ok(state, { t: 'SET_CONNECTED', playerId: 'p2', connected: true })
    expect(state.players[1].connected).toBe(true)
  })

  it('werkt ook midden in een potje', () => {
    const state = roll(setup(2), 'p1', [6, 4])
    expect(reduce(state, { t: 'SET_CONNECTED', playerId: 'p2', connected: false }, noRng).error)
      .toBeUndefined()
  })
})

describe('FORFEIT_TURN', () => {
  it('vóór de eerste worp: geen score, en de speler kan niet verliezen', () => {
    let state = setup(3)
    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p1' })
    expect(state.players[0].roundScore).toBeNull()
    expect(state.players[0].hasPlayedThisRound).toBe(true)
    expect(state.turn?.playerId).toBe('p2')

    // p2 gooit lager dan p3; p2 verliest, de geforfeite p1 niet.
    // (32 legt de beurt direct vast.)
    state = roll(state, 'p2', [3, 2])
    state = roll(state, 'p3', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p3' })

    expect(state.phase).toBe('roundEnd')
    expect(state.players[1].sipsTotal).toBe(2)
    expect(state.players[0].sipsTotal).toBe(0)
  })

  it('na een worp telt de liggende score gewoon mee', () => {
    let state = setup(2)
    state = roll(state, 'p1', [5, 4])
    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p1' })
    expect(state.players[0].roundScore).toBe(54)
  })

  it('alleen voor de actieve speler', () => {
    const state = setup(2)
    expect(reduce(state, { t: 'FORFEIT_TURN', playerId: 'p2' }, noRng).error).toBe('NOT_YOUR_TURN')
  })

  it('iedereen forfeit: ronde eindigt zonder verliezer of slokken', () => {
    let state = setup(2)
    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p1' })
    state = ok(state, { t: 'FORFEIT_TURN', playerId: 'p2' })
    expect(state.phase).toBe('roundEnd')
    expect(state.sipsLog).toHaveLength(0)
    // En de volgende ronde start gewoon.
    state = ok(state, { t: 'NEXT_ROUND' })
    expect(state.phase).toBe('playing')
  })
})
