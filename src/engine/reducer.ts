import { is31, isMex, scoreRank } from './score'
import { loserSips, sips31 } from './sips'
import type { RollSource } from './rng'
import type {
  Command,
  Die,
  DieId,
  DieState,
  EngineEvent,
  ErrorCode,
  GameState,
  PlayerProfile,
  PlayerState,
  RuleConfig,
  TurnState,
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
    round: { number: 0, startingPlayerId: host.id, mexCount: 0, tempoLimit: null },
    turn: null,
    ridderId: null,
    tiebreak: null,
    sipsLog: [],
  }
}

/**
 * De enige plek waar GameState verandert. Puur gegeven de RollSource:
 * met een scripted bron is elke uitkomst deterministisch testbaar.
 * Bij een validatiefout blijft de state onaangeroerd.
 */
export function reduce(state: GameState, cmd: Command, rng: RollSource): ReduceResult {
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
      draft.phase = 'playing'
      draft.round = {
        number: 1,
        startingPlayerId: draft.players[0].id,
        mexCount: 0,
        tempoLimit: null,
      }
      draft.turn = newTurn(draft.players[0].id)
      break

    case 'ROLL':
      applyRoll(draft, events, rng)
      break

    case 'HOLD_DIE':
      dieById(draft, cmd.dieId).onTable = true
      break

    case 'PICKUP_DIE':
      dieById(draft, cmd.dieId).onTable = false
      break

    case 'END_TURN':
      finalizeTurn(draft, events)
      break

    case 'GIVE_SIPS_31': {
      const amount = sips31(draft.rules)
      const target = playerById(draft, cmd.targetPlayerId)
      target.sipsTotal += amount
      draft.sipsLog.push({
        playerId: target.id,
        amount,
        reason: 'gekregen31',
        round: draft.round.number,
      })
      const turn = draft.turn as TurnState
      turn.pending31 = false
      events.push({
        t: 'SIPS_GIVEN',
        fromPlayerId: cmd.playerId,
        toPlayerId: target.id,
        amount,
      })
      break
    }

    case 'TIEBREAK_ROLL':
      applyTiebreakRoll(draft, events, cmd.playerId, rng)
      break

    case 'NEXT_ROUND':
      startNextRound(draft)
      break

    case 'SET_CONNECTED':
      playerById(draft, cmd.playerId).connected = cmd.connected
      break

    case 'FORFEIT_TURN':
      finalizeTurn(draft, events)
      break
  }

  return { state: draft, events }
}

function newPlayer(profile: PlayerProfile): PlayerState {
  return {
    ...profile,
    connected: true,
    sipsTotal: 0,
    roundScore: null,
    hasPlayedThisRound: false,
  }
}

function newTurn(playerId: string, maxThrows = 3): TurnState {
  return { playerId, dice: null, throwsUsed: 0, maxThrows, pending31: false, locked: false }
}

function applyRoll(draft: GameState, events: EngineEvent[], rng: RollSource): void {
  const turn = draft.turn as TurnState
  let dieIds: DieId[]

  if (turn.dice === null) {
    turn.dice = [
      { id: 0, value: 1, onTable: false, vers: null },
      { id: 1, value: 1, onTable: false, vers: null },
    ]
    dieIds = [0, 1]
  } else {
    // Stale 1/2 moeten verplicht mee: oppakken gebeurt hier automatisch.
    for (const die of turn.dice) {
      if (die.vers === 'stale') {
        die.onTable = false
        die.vers = null
      }
    }
    dieIds = turn.dice.filter((d) => !d.onTable).map((d) => d.id)
  }

  const values = dieIds.map(() => rng.roll())
  const animSeed = rng.seed()
  dieIds.forEach((id, i) => {
    turn.dice![id].value = values[i]
  })
  events.push({ t: 'DICE_ROLLED', playerId: turn.playerId, dieIds, values, animSeed })

  const [a, b] = [turn.dice[0].value, turn.dice[1].value]
  const rolled31 = is31(a, b)

  if (isMex(a, b)) {
    draft.round.mexCount++
    events.push({ t: 'MEX_ROLLED', playerId: turn.playerId })
    finalizeTurn(draft, events)
    return
  }

  // De 31-worp telt niet mee: niet voor het aantal worpen, niet voor de versheid.
  if (!rolled31) {
    turn.throwsUsed++
    for (const die of turn.dice) {
      if (die.vers === 'fresh' && !dieIds.includes(die.id)) die.vers = 'stale'
    }
  }

  // Nieuw gegooide 1 of 2 moet blijven liggen en is één worp vers.
  for (const id of dieIds) {
    const die = turn.dice[id]
    if (die.value <= 2) {
      die.onTable = true
      die.vers = 'fresh'
    }
  }

  if (rolled31) {
    turn.pending31 = true
    return
  }

  if (turn.throwsUsed >= turn.maxThrows) {
    finalizeTurn(draft, events)
  }
}

function finalizeTurn(draft: GameState, events: EngineEvent[]): void {
  const turn = draft.turn as TurnState
  turn.locked = true

  const player = playerById(draft, turn.playerId)
  // Forfeit vóór de eerste worp: geen dice, dus geen score; kan dan niet verliezen.
  player.roundScore = turn.dice ? scoreRank(turn.dice[0].value, turn.dice[1].value) : null
  player.hasPlayedThisRound = true
  events.push({ t: 'TURN_ENDED', playerId: player.id })

  const next = nextUnplayedPlayer(draft, turn.playerId)
  if (next !== null) {
    draft.turn = newTurn(next.id)
  } else {
    evaluateRoundEnd(draft, events)
  }
}

function nextUnplayedPlayer(draft: GameState, afterId: string): PlayerState | null {
  const idx = draft.players.findIndex((p) => p.id === afterId)
  for (let i = 1; i <= draft.players.length; i++) {
    const candidate = draft.players[(idx + i) % draft.players.length]
    if (!candidate.hasPlayedThisRound) return candidate
  }
  return null
}

function evaluateRoundEnd(draft: GameState, events: EngineEvent[]): void {
  // Spelers zonder score (forfeit) dingen niet mee naar het verlies.
  const scored = draft.players.filter((p) => p.roundScore !== null)
  if (scored.length === 0) {
    draft.phase = 'roundEnd'
    draft.turn = null
    return
  }
  const lowest = Math.min(...scored.map((p) => p.roundScore as number))
  const losers = scored.filter((p) => p.roundScore === lowest)

  if (losers.length === 1) {
    applyRoundLoss(draft, events, losers[0].id, 1)
    return
  }

  draft.phase = 'tiebreak'
  draft.turn = null
  draft.tiebreak = {
    playerIds: losers.map((p) => p.id),
    rolls: Object.fromEntries(losers.map((p) => [p.id, null])),
    multiplier: 1,
  }
  events.push({ t: 'TIEBREAK_STARTED', playerIds: draft.tiebreak.playerIds })
}

function applyTiebreakRoll(
  draft: GameState,
  events: EngineEvent[],
  playerId: string,
  rng: RollSource,
): void {
  const tiebreak = draft.tiebreak as NonNullable<GameState['tiebreak']>
  const value = rng.roll()
  tiebreak.rolls[playerId] = value
  events.push({ t: 'TIEBREAK_ROLLED', playerId, value, animSeed: rng.seed() })

  const rolls = tiebreak.playerIds.map((id) => tiebreak.rolls[id])
  if (rolls.some((r) => r === null)) return

  const values = rolls as Die[]
  const extreme = draft.rules.tiebreakHoogsteVerliest ? Math.max(...values) : Math.min(...values)
  const sharers = tiebreak.playerIds.filter((id) => tiebreak.rolls[id] === extreme)

  if (sharers.length === 1) {
    applyRoundLoss(draft, events, sharers[0], tiebreak.multiplier)
    return
  }

  // Opnieuw gelijk: alleen de gedeelde extremen gooien nog eens, slokken verdubbelen.
  tiebreak.playerIds = sharers
  tiebreak.rolls = Object.fromEntries(sharers.map((id) => [id, null]))
  tiebreak.multiplier *= 2
  events.push({ t: 'TIEBREAK_TIED', playerIds: sharers, multiplier: tiebreak.multiplier })
}

function applyRoundLoss(
  draft: GameState,
  events: EngineEvent[],
  loserId: string,
  multiplier: number,
): void {
  const sips = loserSips(draft.rules, draft.round.mexCount, multiplier)
  const loser = playerById(draft, loserId)
  loser.sipsTotal += sips
  draft.sipsLog.push({ playerId: loserId, amount: sips, reason: 'verliezer', round: draft.round.number })

  draft.phase = 'roundEnd'
  draft.turn = null
  draft.tiebreak = null
  // De verliezer begint de volgende ronde.
  draft.round.startingPlayerId = loserId
  events.push({ t: 'ROUND_ENDED', loserId, sips })
}

function startNextRound(draft: GameState): void {
  for (const player of draft.players) {
    player.roundScore = null
    player.hasPlayedThisRound = false
  }
  draft.round = {
    number: draft.round.number + 1,
    startingPlayerId: draft.round.startingPlayerId,
    mexCount: 0,
    tempoLimit: null,
  }
  draft.phase = 'playing'
  draft.turn = newTurn(draft.round.startingPlayerId)
}

function playerById(draft: GameState, id: string): PlayerState {
  return draft.players.find((p) => p.id === id) as PlayerState
}

function dieById(draft: GameState, dieId: DieId): DieState {
  const turn = draft.turn as TurnState
  return (turn.dice as [DieState, DieState])[dieId]
}
