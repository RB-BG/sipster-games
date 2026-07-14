// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

export type Die = 1 | 2 | 3 | 4 | 5 | 6
export type DieId = 0 | 1

/**
 * Versheid van een vastliggende 1 of 2:
 * 'fresh' = mag nog precies één worp blijven liggen,
 * 'stale' = moet bij de volgende worp verplicht mee.
 */
export type Versheid = 'fresh' | 'stale'

export type GamePhase = 'lobby' | 'playing' | 'tiebreak' | 'roundEnd' | 'ended'

export interface RuleConfig {
  standaardSlokken: number
  /** Eerste bepaalt het tempo: latere spelers max evenveel worpen als speler 1. */
  tempo: boolean
  /** 65 mag omgedraaid worden naar mex (telt niet mee voor de drink-multiplier). */
  omgekeerdeMex: boolean
  ridder: boolean
  dubbeleRidder: boolean
  afslaan: boolean
  /** Vooraf afgesproken: wint bij tiebreak de laagste of verliest de hoogste. */
  tiebreakHoogsteVerliest: boolean
}

export const DEFAULT_RULES: RuleConfig = {
  standaardSlokken: 2,
  tempo: false,
  omgekeerdeMex: false,
  ridder: false,
  dubbeleRidder: false,
  afslaan: false,
  tiebreakHoogsteVerliest: true,
}

export interface PlayerProfile {
  id: string
  name: string
  emoji: string
}

export interface PlayerState extends PlayerProfile {
  connected: boolean
  sipsTotal: number
  /** Score-rang van de eindworp deze ronde (zie scoreRank), null zolang niet gespeeld. */
  roundScore: number | null
  hasPlayedThisRound: boolean
}

export interface DieState {
  id: DieId
  value: Die
  /** Ligt vast op tafel: verse 1/2 (verplicht) of vrijwillig vastgehouden. */
  onTable: boolean
  /** Alleen gezet voor een vastliggende 1 of 2; null bij vrijwillige hold. */
  vers: Versheid | null
}

export interface TurnState {
  playerId: string
  /** null tot de eerste worp van de beurt. */
  dice: [DieState, DieState] | null
  throwsUsed: number
  maxThrows: number
  /** 31 gegooid: eerst slokken uitdelen, dan gratis herworp. */
  pending31: boolean
  /** Beurt definitief voorbij (mex, worpen op, blijven staan). */
  locked: boolean
  /** Er ligt een afslaanbare 32: open tot de gooier een steen oppakt of doorgaat. */
  afslaanWindow: boolean
}

export type AfslaanVerdict =
  | 'terecht'
  | 'onterecht'
  | 'zelfAfgeklopt'
  | 'mexAfgeklopt'
  | 'eigenMexAfgeklopt'

export type SipReason = 'verliezer' | 'gekregen31' | 'straf' | 'ridder'

export interface SipEntry {
  playerId: string
  amount: number
  reason: SipReason
  round: number
}

export interface TiebreakState {
  playerIds: string[]
  rolls: Record<string, Die | null>
  multiplier: number
}

export interface RoundState {
  number: number
  startingPlayerId: string
  /** Aantal echte mexxen deze ronde (omgekeerde mex telt niet mee). */
  mexCount: number
  /** Worpenlimiet gezet door de eerste speler (alleen bij rules.tempo). */
  tempoLimit: number | null
}

export interface GameState {
  /** Monotoon oplopend, voor snapshot-ordering bij guests. */
  version: number
  phase: GamePhase
  rules: RuleConfig
  hostId: string
  /** Volgorde in de array = speelvolgorde. */
  players: PlayerState[]
  round: RoundState
  turn: TurnState | null
  ridderId: string | null
  ridderDubbel: boolean
  /** Laatst afgeronde beurt; nodig om een afgeklopte mex te herkennen. */
  lastTurnSummary: { playerId: string; wasMex: boolean } | null
  tiebreak: TiebreakState | null
  sipsLog: SipEntry[]
}

/** Wat een speler wil doen; de reducer valideert en voert uit. */
export type Command =
  | { t: 'ADD_PLAYER'; profile: PlayerProfile }
  | { t: 'REMOVE_PLAYER'; playerId: string }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  | { t: 'ROLL'; playerId: string }
  | { t: 'HOLD_DIE'; playerId: string; dieId: DieId }
  | { t: 'PICKUP_DIE'; playerId: string; dieId: DieId }
  | { t: 'END_TURN'; playerId: string }
  | { t: 'GIVE_SIPS_31'; playerId: string; targetPlayerId: string }
  | { t: 'TIEBREAK_ROLL'; playerId: string }
  | { t: 'NEXT_ROUND' }
  | { t: 'SET_CONNECTED'; playerId: string; connected: boolean }
  /** Host beëindigt de beurt van een weggevallen speler; zonder worp geen score. */
  | { t: 'FORFEIT_TURN'; playerId: string }
  /** Omgekeerde mex: 65 omdraaien naar 21. */
  | { t: 'FLIP_65'; playerId: string }
  | { t: 'AFSLAAN'; playerId: string }
  /** Potje afsluiten na een ronde: eindstand tonen. */
  | { t: 'END_GAME' }

/** Transiente gebeurtenissen voor animatie, geluid en toasts; state is al bijgewerkt. */
export type EngineEvent =
  | { t: 'DICE_ROLLED'; playerId: string; dieIds: DieId[]; values: Die[]; animSeed: number }
  | { t: 'MEX_ROLLED'; playerId: string }
  | { t: 'FLIPPED_65'; playerId: string; values: [Die, Die] }
  | { t: 'AFSLAAN'; byPlayerId: string; verdict: AfslaanVerdict }
  | { t: 'RIDDER_GESLAGEN'; playerId: string; dubbel: boolean }
  | { t: 'RIDDER_DRINKT'; playerId: string; amount: number }
  | { t: 'SIPS_GIVEN'; fromPlayerId: string; toPlayerId: string; amount: number }
  | { t: 'TURN_ENDED'; playerId: string }
  | { t: 'TIEBREAK_STARTED'; playerIds: string[] }
  | { t: 'TIEBREAK_ROLLED'; playerId: string; value: Die; animSeed: number }
  | { t: 'TIEBREAK_TIED'; playerIds: string[]; multiplier: number }
  | { t: 'ROUND_ENDED'; loserId: string; sips: number }

export type ErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ALREADY_JOINED'
  | 'UNKNOWN_PLAYER'
  | 'PENDING_31'
  | 'NOT_PENDING_31'
  | 'NO_ROLLABLE_DICE'
  | 'HAS_NOT_THROWN'
  | 'INVALID_DIE'
  | 'INVALID_TARGET'
  | 'ALREADY_ROLLED'
  | 'INVALID_RULES'
