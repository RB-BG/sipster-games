import { is31, is32, isMex, scoreRank } from './score'
import { afslaanPenalty, loserSips, sips31 } from './sips'
import type { RollSource } from './rng'
import type {
  AfslaanVerdict,
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
  TiebreakState,
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
    ridderDubbel: false,
    lastTurnSummary: null,
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
      draft.turn = newTurn(draft, draft.players[0].id)
      break

    case 'ROLL':
      applyRoll(draft, events, rng)
      break

    case 'HOLD_DIE':
      dieById(draft, cmd.dieId).onTable = true
      ;(draft.turn as TurnState).afslaanWindow = false
      break

    case 'PICKUP_DIE':
      // Oppakken is ook het afslaan-preventiegebaar: de 32 ligt niet meer vast te slaan.
      dieById(draft, cmd.dieId).onTable = false
      ;(draft.turn as TurnState).afslaanWindow = false
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

    case 'END_GAME':
      draft.phase = 'ended'
      draft.turn = null
      draft.tiebreak = null
      break

    case 'SET_CONNECTED':
      playerById(draft, cmd.playerId).connected = cmd.connected
      break

    case 'FORFEIT_TURN':
      if (draft.phase === 'tiebreak') {
        // Wie de kamp verlaat, verliest hem: hij stond toch al op verlies.
        applyRoundLoss(draft, events, cmd.playerId, (draft.tiebreak as TiebreakState).multiplier)
      } else {
        const turn = draft.turn as TurnState
        if (turn.pending31) {
          // Een liggende 31 is nooit een eindscore (rank 31 zou onder 32 duiken).
          turn.pending31 = false
          turn.dice = null
        }
        finalizeTurn(draft, events)
      }
      break

    case 'FLIP_65':
      applyFlip65(draft, events)
      break

    case 'AFSLAAN':
      applyAfslaan(draft, events, cmd.playerId)
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

function newTurn(draft: GameState, playerId: string): TurnState {
  // De tempoLimit wordt alleen gezet als hij moet gelden (tempo-regel, of een
  // gedwongen vroeg einde van de eerste speler), dus hier onvoorwaardelijk toepassen.
  const maxThrows = draft.round.tempoLimit !== null ? Math.min(3, draft.round.tempoLimit) : 3
  return {
    playerId,
    dice: null,
    throwsUsed: 0,
    maxThrows,
    pending31: false,
    locked: false,
    afslaanWindow: false,
  }
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

  // De 31-worp telt niet mee: niet voor het aantal worpen, niet voor de versheid.
  if (!rolled31) {
    turn.throwsUsed++
    for (const die of turn.dice) {
      if (die.vers === 'fresh' && !dieIds.includes(die.id)) die.vers = 'stale'
    }
  }

  applyRidder(draft, events, a, b)

  if (isMex(a, b)) {
    draft.round.mexCount++
    events.push({ t: 'MEX_ROLLED', playerId: turn.playerId })
    finalizeTurn(draft, events)
    return
  }

  // Nieuw gegooide 1 of 2 moet blijven liggen en is één worp vers.
  for (const id of dieIds) {
    const die = turn.dice[id]
    if (die.value <= 2) {
      die.onTable = true
      die.vers = 'fresh'
    }
  }

  // Je legt nooit beide stenen tegelijk vast: een verse 1/2 blijft maar één
  // worp liggen. Bij dubbel 1 of dubbel 2 (beide vers deze worp) houd je er
  // daarom één en blijft de ander gooibaar, ook als je er ridder mee wordt.
  if (turn.dice[0].vers === 'fresh' && turn.dice[1].vers === 'fresh') {
    const free = turn.dice[1]
    free.onTable = false
    free.vers = null
  }

  if (rolled31) {
    turn.pending31 = true
    return
  }

  const rolled32 = is32(a, b)

  // Een 32 beëindigt de beurt direct. Behalve met de afslaan-regelset:
  // dan blijft hij open, zodat de gooier kan oppakken vóór iemand afslaat.
  if (rolled32 && !draft.rules.afslaan) {
    finalizeTurn(draft, events)
    return
  }

  // Een 32 met worpen over ligt open om af te slaan.
  turn.afslaanWindow = draft.rules.afslaan && rolled32 && turn.throwsUsed < turn.maxThrows

  if (turn.throwsUsed >= turn.maxThrows) {
    // 65 op de laatste worp blijft open als omgekeerde mex aanstaat:
    // de gooier kiest zelf tussen flippen en blijven staan.
    const keepOpen = draft.rules.omgekeerdeMex && scoreRank(a, b) === 65
    if (!keepOpen) finalizeTurn(draft, events)
  }
}

/** Ridder-regelset: 1+1 (ont)troont; elk honderdtal laat de ridder drinken. */
function applyRidder(draft: GameState, events: EngineEvent[], a: Die, b: Die): void {
  if (!draft.rules.ridder || a !== b) return
  const roller = (draft.turn as TurnState).playerId

  if (a === 1) {
    if (draft.ridderId === roller) {
      if (draft.rules.dubbeleRidder && !draft.ridderDubbel) {
        draft.ridderDubbel = true
        events.push({ t: 'RIDDER_GESLAGEN', playerId: roller, dubbel: true })
      } else {
        ridderDrinkt(draft, events, 1)
      }
    } else {
      // Nieuwe ridder; die drinkt niet voor het eigen kroningshonderdtal.
      draft.ridderId = roller
      draft.ridderDubbel = false
      events.push({ t: 'RIDDER_GESLAGEN', playerId: roller, dubbel: false })
    }
    return
  }

  if (draft.ridderId) ridderDrinkt(draft, events, a)
}

function ridderDrinkt(draft: GameState, events: EngineEvent[], ogen: number): void {
  const amount = ogen * (draft.ridderDubbel ? 2 : 1)
  const knight = playerById(draft, draft.ridderId as string)
  knight.sipsTotal += amount
  draft.sipsLog.push({
    playerId: knight.id,
    amount,
    reason: 'ridder',
    round: draft.round.number,
  })
  events.push({ t: 'RIDDER_DRINKT', playerId: knight.id, amount })
}

/** Omgekeerde mex: 6 en 5 fysiek omdraaien wordt 1 en 2; telt niet in mexCount. */
function applyFlip65(draft: GameState, events: EngineEvent[]): void {
  const turn = draft.turn as TurnState
  const dice = turn.dice as [DieState, DieState]
  for (const die of dice) {
    die.value = die.value === 6 ? 1 : 2
  }
  events.push({ t: 'FLIPPED_65', playerId: turn.playerId, values: [dice[0].value, dice[1].value] })
  finalizeTurn(draft, events)
}

function applyAfslaan(draft: GameState, events: EngineEvent[], slammerId: string): void {
  const turn = draft.turn
  const windowOpen = turn !== null && !turn.locked && turn.afslaanWindow

  let verdict: AfslaanVerdict
  if (windowOpen) {
    verdict = slammerId === (turn as TurnState).playerId ? 'zelfAfgeklopt' : 'terecht'
    ;(turn as TurnState).afslaanWindow = false
    // De 32 ligt vast: beurt is voorbij, ook bij een (domme) zelf-afklop.
    finalizeTurn(draft, events)
  } else if (draft.lastTurnSummary?.wasMex && (draft.turn === null || draft.turn.dice === null)) {
    // De vorige beurt eindigde nét op mex: die afslaan is extra onterecht.
    verdict = slammerId === draft.lastTurnSummary.playerId ? 'eigenMexAfgeklopt' : 'mexAfgeklopt'
  } else {
    verdict = 'onterecht'
  }

  const penalty = afslaanPenalty(verdict)
  if (penalty > 0) {
    const slammer = playerById(draft, slammerId)
    slammer.sipsTotal += penalty
    draft.sipsLog.push({
      playerId: slammerId,
      amount: penalty,
      reason: 'straf',
      round: draft.round.number,
    })
  }
  events.push({ t: 'AFSLAAN', byPlayerId: slammerId, verdict })
}

function finalizeTurn(draft: GameState, events: EngineEvent[]): void {
  const turn = draft.turn as TurnState
  turn.locked = true
  turn.afslaanWindow = false

  const player = playerById(draft, turn.playerId)
  // Forfeit vóór de eerste worp: geen dice, dus geen score; kan dan niet verliezen.
  player.roundScore = turn.dice ? scoreRank(turn.dice[0].value, turn.dice[1].value) : null
  player.hasPlayedThisRound = true
  draft.lastTurnSummary = { playerId: player.id, wasMex: player.roundScore === 1000 }
  events.push({ t: 'TURN_ENDED', playerId: player.id })

  // De eerste beurt van de ronde zet het tempo (forfeit zonder worp telt als 1).
  // Met de tempo-regel telt elk vroeg einde; een gedwongen einde (mex of 32)
  // van de eerste speler zet het maximum altijd, ook zonder die regel.
  const isFirstOfRound = draft.players.filter((p) => p.hasPlayedThisRound).length === 1
  if (isFirstOfRound && draft.round.tempoLimit === null) {
    const forcedEnd = player.roundScore === 1000 || player.roundScore === 32
    if (draft.rules.tempo || forcedEnd) {
      draft.round.tempoLimit = Math.max(1, turn.throwsUsed)
    }
  }

  const next = nextUnplayedPlayer(draft, turn.playerId)
  if (next !== null) {
    draft.turn = newTurn(draft, next.id)
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
  draft.lastTurnSummary = null
  draft.turn = newTurn(draft, draft.round.startingPlayerId)
}

function playerById(draft: GameState, id: string): PlayerState {
  return draft.players.find((p) => p.id === id) as PlayerState
}

function dieById(draft: GameState, dieId: DieId): DieState {
  const turn = draft.turn as TurnState
  return (turn.dice as [DieState, DieState])[dieId]
}
