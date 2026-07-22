// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card, Rank } from '@sipster/core/cards/types'

export type { Card, Rank, Suit } from '@sipster/core/cards/types'

export type GamePhase = 'lobby' | 'questions' | 'pyramid' | 'bus' | 'ended'

/** De vier vragen, op volgorde. */
export type QuestionIndex = 0 | 1 | 2 | 3

/** Alle mogelijke antwoord-keuzes over de vier vragen. */
export type AnswerChoice =
  | 'rood'
  | 'zwart'
  | 'hoger'
  | 'lager'
  | 'binnen'
  | 'buiten'
  | 'heb'
  | 'niet'

export type BusChoice = 'hoger' | 'lager'

export interface RuleConfig {
  /** Basiseenheid: elke slok-uitkomst wordt hiermee vermenigvuldigd. */
  standaardSlokken: number
  /** Liegen in de piramide: claimen zonder de kaart, met call bluff. */
  bluffen: boolean
  /** Aantal kaarten in de bus-rij. */
  busLengte: number
}

export const DEFAULT_RULES: RuleConfig = {
  standaardSlokken: 1,
  bluffen: true,
  busLengte: 5,
}

export interface PlayerProfile {
  id: string
  name: string
  emoji: string
}

export interface PlayerState extends PlayerProfile {
  connected: boolean
  sipsTotal: number
  /** De kaarten die de speler nog vasthoudt (start als de 4 vraagkaarten). */
  hand: Card[]
}

/**
 * Beurt in het vragenrondje. Het rondje gaat per vraag de tafel rond: eerst
 * beantwoordt iedereen vraag 0, dan iedereen vraag 1, enz. `playerId` is de
 * speler die nu aan zet is; `questionIndex` de vraag die de hele tafel nu doet.
 * De eigen tot nu toe opengelegde kaarten staan in `PlayerState.hand`.
 */
export interface TurnState {
  playerId: string
  /** De vraag die nu beantwoord moet worden. */
  questionIndex: QuestionIndex
}

/** Een openstaande claim in de piramide (het afslaan-analoog). */
export interface Claim {
  claimantId: string
  card: Card
  /** Slokken die op het spel staan (de rij-waarde). */
  rowValue: number
  /** Heeft de claimant de rank echt in de hand? Verborgen voor validate. */
  truthful: boolean
}

export interface PyramidState {
  /** Van onder (index 0, 5 kaarten, 1 slok) naar boven (top, 1 kaart, 5 slokken). */
  rows: Card[][]
  /** Aantal reeds omgedraaide kaarten (vlakke telling, van onder naar boven). */
  flipIndex: number
  /** Rank van de laatst omgedraaide kaart; open om te claimen tot de volgende flip. */
  currentRank: Rank | null
  /** Rij-waarde (slokken) van die laatst omgedraaide kaart. */
  currentRowValue: number
  /** Een lopende claim die op afhandeling wacht (give of call bluff). */
  openClaim: Claim | null
}

export interface BusState {
  /** Wie de bus rijdt (meerdere bij gelijkspel). */
  driverIds: string[]
  /** De rij bus-kaarten (lengte = rules.busLengte). */
  cards: Card[]
  /** Hoeveel kaarten al goed geraden zijn (0 = eerste kaart ligt open). */
  position: number
  /** Aantal foute gokken tot nu toe; bepaalt de oplopende straf. */
  strikes: number
}

/** Een pending slokken-uitdeling: de speler kiest nog een doelwit. */
export interface PendingGive {
  playerId: string
  amount: number
}

export type SipReason = 'fout' | 'gekregen' | 'bluf' | 'bus'

export interface SipEntry {
  playerId: string
  amount: number
  reason: SipReason
  /** In welke fase de slok viel; de UI telt hiermee "deze fase" per speler. */
  phase: GamePhase
}

export type BluffVerdict = 'betrapt' | 'onterecht'

export interface GameState {
  /** Monotoon oplopend, voor snapshot-ordering bij guests. */
  version: number
  phase: GamePhase
  rules: RuleConfig
  hostId: string
  /** Volgorde in de array = speelvolgorde. */
  players: PlayerState[]
  /** De geschudde deck (host-authoritative); reduce popt puur op drawIndex. */
  deck: Card[]
  drawIndex: number
  /** Vragenrondje-beurt, null buiten de questions-fase. */
  turn: TurnState | null
  pyramid: PyramidState | null
  bus: BusState | null
  /** Openstaande slokken-uitdeling (vragenrondje of piramide-claim). */
  pendingGive: PendingGive | null
  sipsLog: SipEntry[]
}

/** Wat een speler wil doen; de reducer valideert en voert uit. */
export type Command =
  | { t: 'ADD_PLAYER'; profile: PlayerProfile }
  | { t: 'REMOVE_PLAYER'; playerId: string }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  | { t: 'ANSWER'; playerId: string; choice: AnswerChoice }
  | { t: 'GIVE_SIPS'; playerId: string; targetPlayerId: string }
  | { t: 'FLIP_PYRAMID'; playerId: string }
  | { t: 'PLAY_CARD'; playerId: string; card: Card }
  | { t: 'CALL_BLUFF'; playerId: string; targetPlayerId: string }
  /** `position` is de buspositie waarop de gok gebaseerd is; een verouderde gok wordt geweigerd. */
  | { t: 'BUS_GUESS'; playerId: string; choice: BusChoice; position: number }
  | { t: 'NEXT_PHASE' }
  | { t: 'SET_CONNECTED'; playerId: string; connected: boolean }
  /**
   * Host slaat de actie van een weggevallen speler over: de beurt in het
   * vragenrondje, een openstaande claim/give in de piramide, of weggevallen
   * chauffeurs in de bus.
   */
  | { t: 'FORFEIT_TURN' }
  | { t: 'END_GAME' }

/** Transiente gebeurtenissen voor animatie, geluid en toasts; state is al bijgewerkt. */
export type EngineEvent =
  | { t: 'CARD_DEALT'; playerId: string; card: Card; animSeed: number }
  | { t: 'CARD_FLIPPED'; card: Card; rowValue: number; animSeed: number }
  | { t: 'SIPS_GIVEN'; fromPlayerId: string; toPlayerId: string; amount: number }
  | { t: 'BLUFF_CALLED'; byPlayerId: string; targetPlayerId: string; verdict: BluffVerdict }
  | { t: 'BUS_CARD'; card: Card; correct: boolean; animSeed: number }
  | { t: 'BUS_RESET'; animSeed: number }
  | { t: 'PHASE_CHANGED'; phase: GamePhase }

export type ErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ALREADY_JOINED'
  | 'UNKNOWN_PLAYER'
  | 'PENDING_GIVE'
  | 'NOT_PENDING_GIVE'
  | 'INVALID_CHOICE'
  | 'INVALID_CARD'
  | 'INVALID_TARGET'
  | 'NO_OPEN_CLAIM'
  | 'CLAIM_IN_PROGRESS'
  | 'NOTHING_TO_FLIP'
  | 'NOT_A_DRIVER'
  | 'INVALID_RULES'
  | 'GAME_FULL'
  | 'STALE_GUESS'
  /** Bericht van buiten met een onverwachte vorm; komt nooit uit de engine zelf. */
  | 'MALFORMED'
