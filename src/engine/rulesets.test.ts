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

describe('eerste bepaalt het tempo', () => {
  it('latere spelers krijgen max evenveel worpen als speler 1', () => {
    let state = roll(setup(3, { tempo: true }), 'p1', [6, 4])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(state.round.tempoLimit).toBe(1)
    expect(state.turn?.maxThrows).toBe(1)

    // p2 is na één worp meteen klaar.
    state = roll(state, 'p2', [5, 4])
    expect(state.players[1].roundScore).toBe(54)
    expect(state.turn?.playerId).toBe('p3')
  })

  it('mex op de eerste worp zet het tempo op 1', () => {
    const state = roll(setup(2, { tempo: true }), 'p1', [2, 1])
    expect(state.round.tempoLimit).toBe(1)
    expect(state.turn?.maxThrows).toBe(1)
  })

  it('zonder tempo-regel blijft het gewoon 3 worpen', () => {
    let state = roll(setup(2), 'p1', [6, 4])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(state.turn?.maxThrows).toBe(3)
  })

  it('de limiet reset elke ronde', () => {
    let state = roll(setup(2, { tempo: true }), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [3, 2])
    state = ok(state, { t: 'NEXT_ROUND' })
    expect(state.round.tempoLimit).toBeNull()
    expect(state.turn?.maxThrows).toBe(3)
  })
})

describe('32 beëindigt de beurt', () => {
  it('na een 32 is de beurt direct voorbij, ook met worpen over', () => {
    const state = roll(setup(2), 'p1', [3, 2])
    expect(state.players[0].roundScore).toBe(32)
    expect(state.turn?.playerId).toBe('p2')
  })

  it('met de afslaan-regel blijft de 32 juist open om af te slaan', () => {
    const state = roll(setup(2, { afslaan: true }), 'p1', [3, 2])
    expect(state.turn?.playerId).toBe('p1')
    expect(state.turn?.locked).toBe(false)
    expect(state.turn?.afslaanWindow).toBe(true)
  })
})

describe('gedwongen einde van de eerste speler zet het tempo, ook zonder toggle', () => {
  it('mex in één worp: de rest krijgt ook maar één worp', () => {
    const state = roll(setup(3), 'p1', [2, 1])
    expect(state.round.tempoLimit).toBe(1)
    expect(state.turn?.maxThrows).toBe(1)
  })

  it('32 in twee worpen: de rest krijgt er ook twee', () => {
    let state = roll(setup(3), 'p1', [6, 4])
    state = roll(state, 'p1', [3, 2])
    expect(state.round.tempoLimit).toBe(2)
    expect(state.turn?.maxThrows).toBe(2)
  })

  it('vrijwillig vroeg stoppen zet zonder tempo-regel géén limiet', () => {
    let state = roll(setup(3), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    expect(state.round.tempoLimit).toBeNull()
    expect(state.turn?.maxThrows).toBe(3)
  })

  it('een gedwongen einde van een látere speler zet geen limiet', () => {
    let state = roll(setup(3), 'p1', [6, 5])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [2, 1])
    expect(state.round.tempoLimit).toBeNull()
    expect(state.turn?.maxThrows).toBe(3)
  })
})

describe('omgekeerde mex', () => {
  it('65 mag omgedraaid worden naar mex, maar telt niet voor de multiplier', () => {
    let state = roll(setup(2, { omgekeerdeMex: true }), 'p1', [6, 5])
    state = ok(state, { t: 'FLIP_65', playerId: 'p1' })

    expect(state.players[0].roundScore).toBe(1000)
    expect(state.round.mexCount).toBe(0)
    expect(state.turn?.playerId).toBe('p2')
  })

  it('geeft een FLIPPED_65 event met de omgedraaide waarden', () => {
    const state = roll(setup(2, { omgekeerdeMex: true }), 'p1', [6, 5])
    const result = reduce(state, { t: 'FLIP_65', playerId: 'p1' }, noRng)
    expect(result.events[0]).toMatchObject({ t: 'FLIPPED_65', values: [1, 2] })
  })

  it('kan alleen met 65 en alleen als de regel aanstaat', () => {
    const zonder = roll(setup(2), 'p1', [6, 5])
    expect(reduce(zonder, { t: 'FLIP_65', playerId: 'p1' }, noRng).error).toBe('WRONG_PHASE')

    const verkeerdeWorp = roll(setup(2, { omgekeerdeMex: true }), 'p1', [6, 4])
    expect(reduce(verkeerdeWorp, { t: 'FLIP_65', playerId: 'p1' }, noRng).error).toBe(
      'INVALID_DIE',
    )
  })
})

describe('ridder', () => {
  it('1 en 1 maakt je ridder, zonder kronings-slokken', () => {
    const result = reduce(
      setup(2, { ridder: true }),
      { t: 'ROLL', playerId: 'p1' },
      scriptedRollSource([1, 1]),
    )
    expect(result.state.ridderId).toBe('p1')
    expect(result.state.players[0].sipsTotal).toBe(0)
    expect(result.events).toContainEqual({ t: 'RIDDER_GESLAGEN', playerId: 'p1', dubbel: false })
  })

  it('de ridder drinkt het aantal ogen bij elk honderdtal, ook van zichzelf', () => {
    let state = roll(setup(2, { ridder: true }), 'p1', [1, 1])
    // p1 is ridder; beide 1-en liggen vast, dus blijven staan met 100.
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    // p2 gooit 300: de ridder drinkt 3.
    state = roll(state, 'p2', [3, 3])
    expect(state.players[0].sipsTotal).toBe(3)
    expect(state.sipsLog.at(-1)).toMatchObject({ playerId: 'p1', amount: 3, reason: 'ridder' })
  })

  it('ridderschap gaat over als een ander 1 en 1 gooit', () => {
    let state = roll(setup(2, { ridder: true }), 'p1', [1, 1])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [1, 1])
    expect(state.ridderId).toBe('p2')
    // De oude ridder drinkt niet voor het onttronings-honderdtal.
    expect(state.players[0].sipsTotal).toBe(0)
  })

  it('de ridder die zelf opnieuw 1 en 1 gooit drinkt één slok', () => {
    let state = roll(setup(2, { ridder: true }), 'p1', [1, 1])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    // p2 gooit mex: p1 verliest met zijn 100 en begint de volgende ronde.
    state = roll(state, 'p2', [2, 1])
    state = ok(state, { t: 'NEXT_ROUND' })
    expect(state.turn?.playerId).toBe('p1')
    state = roll(state, 'p1', [1, 1])
    expect(state.ridderId).toBe('p1')
    expect(state.sipsLog.at(-1)).toMatchObject({ playerId: 'p1', amount: 1, reason: 'ridder' })
  })

  it('dubbele ridder drinkt dubbel bij honderdtallen', () => {
    let state = roll(setup(2, { ridder: true, dubbeleRidder: true }), 'p1', [1, 1])
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    state = roll(state, 'p2', [2, 1])
    state = ok(state, { t: 'NEXT_ROUND' })
    // Promotie tot dubbele ridder (geen slok voor die worp zelf).
    state = roll(state, 'p1', [1, 1])
    expect(state.ridderDubbel).toBe(true)
    state = ok(state, { t: 'END_TURN', playerId: 'p1' })
    // p2 gooit 400: dubbele ridder drinkt 8.
    state = roll(state, 'p2', [4, 4])
    expect(state.sipsLog.at(-1)).toMatchObject({ playerId: 'p1', amount: 8 })
  })
})

describe('afslaan', () => {
  function met32(rules?: Partial<RuleConfig>): GameState {
    // p1 gooit 32 op de eerste worp: window open (nog 2 worpen over).
    return roll(setup(3, { afslaan: true, ...rules }), 'p1', [3, 2])
  }

  it('een 32 met worpen over is afslaanbaar', () => {
    expect(met32().turn?.afslaanWindow).toBe(true)
  })

  it('terecht afslaan legt de 32 vast zonder straf', () => {
    const result = reduce(met32(), { t: 'AFSLAAN', playerId: 'p2' }, noRng)
    expect(result.error).toBeUndefined()
    expect(result.state.players[0].roundScore).toBe(32)
    expect(result.state.players[1].sipsTotal).toBe(0)
    expect(result.events).toContainEqual({ t: 'AFSLAAN', byPlayerId: 'p2', verdict: 'terecht' })
  })

  it('de gooier voorkomt afslaan door een steen op te pakken', () => {
    let state = met32()
    // De 2 is vers en mag niet; de vrije 3 (die 0) oppakken sluit het window.
    state = ok(state, { t: 'PICKUP_DIE', playerId: 'p1', dieId: 0 })
    expect(state.turn?.afslaanWindow).toBe(false)

    const result = reduce(state, { t: 'AFSLAAN', playerId: 'p2' }, noRng)
    expect(result.state.players[1].sipsTotal).toBe(2)
    expect(result.events).toContainEqual({ t: 'AFSLAAN', byPlayerId: 'p2', verdict: 'onterecht' })
    // En de beurt van p1 loopt gewoon door.
    expect(result.state.turn?.locked).toBe(false)
  })

  it('een verse 2 oppakken blijft verboden, ook met open window', () => {
    expect(reduce(met32(), { t: 'PICKUP_DIE', playerId: 'p1', dieId: 1 }, noRng).error).toBe(
      'INVALID_DIE',
    )
  })

  it('na een terechte afklop is een tweede afklop onterecht', () => {
    let state = ok(met32(), { t: 'AFSLAAN', playerId: 'p2' })
    state = ok(state, { t: 'AFSLAAN', playerId: 'p3' })
    expect(state.players[2].sipsTotal).toBe(2)
  })

  it('een 32 op de laatste worp is niet afslaanbaar', () => {
    let state = roll(setup(2, { afslaan: true }), 'p1', [6, 4])
    state = roll(state, 'p1', [5, 4])
    state = roll(state, 'p1', [3, 2])
    // Beurt is al voorbij (3 worpen); afslaan is dus onterecht...
    // maar de state is doorgeschoven naar p2, die nog niet gegooid heeft.
    const result = reduce(state, { t: 'AFSLAAN', playerId: 'p2' }, noRng)
    expect(result.state.players[1].sipsTotal).toBe(2)
  })

  it('jezelf terecht afkloppen: 32 ligt vast én 4 slokken straf', () => {
    const result = reduce(met32(), { t: 'AFSLAAN', playerId: 'p1' }, noRng)
    expect(result.state.players[0].roundScore).toBe(32)
    expect(result.state.players[0].sipsTotal).toBe(4)
    expect(result.events).toContainEqual({
      t: 'AFSLAAN',
      byPlayerId: 'p1',
      verdict: 'zelfAfgeklopt',
    })
  })

  it('een mex afslaan kost 4, je eigen mex 8', () => {
    const state = roll(setup(3, { afslaan: true }), 'p1', [2, 1])
    // p1 gooide mex; beurt ging door naar p2 die nog niet wierp.
    const ander = reduce(state, { t: 'AFSLAAN', playerId: 'p3' }, noRng)
    expect(ander.state.players[2].sipsTotal).toBe(4)
    expect(ander.events).toContainEqual({
      t: 'AFSLAAN',
      byPlayerId: 'p3',
      verdict: 'mexAfgeklopt',
    })

    const eigen = reduce(state, { t: 'AFSLAAN', playerId: 'p1' }, noRng)
    expect(eigen.state.players[0].sipsTotal).toBe(8)
    expect(eigen.events).toContainEqual({
      t: 'AFSLAAN',
      byPlayerId: 'p1',
      verdict: 'eigenMexAfgeklopt',
    })
  })

  it('zonder de regelset is afslaan geen geldige actie', () => {
    const state = roll(setup(2), 'p1', [3, 2])
    expect(reduce(state, { t: 'AFSLAAN', playerId: 'p2' }, noRng).error).toBe('WRONG_PHASE')
  })
})
