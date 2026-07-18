// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card, Rank } from '@sipster/core/cards/types'

export type { Card, Rank, Suit } from '@sipster/core/cards/types'

export type GamePhase = 'lobby' | 'playing' | 'ended'

export interface RuleConfig {
  /** Stapgrootte-eenheid voor de cup-meter (de +/- knoppen verhogen met dit aantal). */
  standaardSlokken: number
}

export const DEFAULT_RULES: RuleConfig = {
  standaardSlokken: 1,
}

export interface PlayerProfile {
  id: string
  name: string
  emoji: string
}

export interface PlayerState extends PlayerProfile {
  connected: boolean
}

/**
 * Een blijvende regel of rol die op tafel zichtbaar blijft tot het einde van het
 * potje. `rank` zegt welke kaart het veroorzaakte (5 = vrije regel; J = duimmeester;
 * Q = vraagmeester). Bij een regel (rank 5) staat de door de speler getypte tekst in
 * `text`; bij een rol is `text` leeg en leidt de UI de rolnaam af uit de rank (taal-neutraal).
 */
export interface ActiveRule {
  id: number
  rank: Rank
  byPlayerId: string
  text: string
}

/**
 * Invoer die de actieve speler nog moet afhandelen voordat de volgende speler mag
 * draaien: een koning vult de cup-meter, een 5 typt een nieuwe regel.
 */
export type Pending = { kind: 'cup'; playerId: string } | { kind: 'rule'; playerId: string } | null

/** Wie nu aan zet is om te draaien; null buiten de speel-fase. */
export type TurnState = { playerId: string } | null

export interface GameState {
  /** Monotoon oplopend, voor snapshot-ordering bij guests. */
  version: number
  phase: GamePhase
  rules: RuleConfig
  hostId: string
  /** Volgorde in de array = speelvolgorde (met de klok mee). */
  players: PlayerState[]
  /** De geschudde deck (host-authoritative); reduce popt puur op drawIndex. */
  deck: Card[]
  drawIndex: number
  /** Wie nu mag draaien; null buiten de speel-fase. */
  turn: TurnState
  /** De laatst omgedraaide kaart, tafel-breed zichtbaar tot de volgende flip. */
  currentCard: Card | null
  /** Blijvende regels en rollen (10, J, Q). */
  activeRules: ActiveRule[]
  /** Oplopende id-teller voor activeRules (uniek, ook na verwijderen). */
  nextRuleId: number
  /** Aantal reeds getrokken koningen (0..4). */
  kingsDrawn: number
  /** Slokken in het centrale glas (de King's Cup-meter). */
  cup: number
  /** Openstaande invoer; blokkeert de volgende flip. */
  pending: Pending
}

/** Wat een speler wil doen; de reducer valideert en voert uit. */
export type Command =
  | { t: 'ADD_PLAYER'; profile: PlayerProfile }
  | { t: 'REMOVE_PLAYER'; playerId: string }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  /** De actieve speler draait de volgende kaart om. */
  | { t: 'FLIP_CARD'; playerId: string }
  /** Koning: schenk `amount` slokken in het centrale glas. */
  | { t: 'ADD_TO_CUP'; playerId: string; amount: number }
  /** Rang 5: leg een nieuwe regel vast. */
  | { t: 'SET_RULE'; playerId: string; text: string }
  | { t: 'SET_CONNECTED'; playerId: string; connected: boolean }
  /** Host slaat de (weggevallen) actieve speler over. */
  | { t: 'FORFEIT_TURN' }
  | { t: 'END_GAME' }

/** Transiente gebeurtenissen voor animatie, geluid en toasts; state is al bijgewerkt. */
export type EngineEvent =
  | { t: 'CARD_FLIPPED'; card: Card; animSeed: number }
  | { t: 'CUP_FILLED'; playerId: string; amount: number; total: number }
  | { t: 'PHASE_CHANGED'; phase: GamePhase }

export type ErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ALREADY_JOINED'
  | 'UNKNOWN_PLAYER'
  | 'PENDING_INPUT'
  | 'NOT_PENDING'
  | 'NOTHING_TO_FLIP'
  | 'INVALID_RULES'
  | 'INVALID_AMOUNT'
  | 'INVALID_TEXT'
  | 'GAME_FULL'
  /** Bericht van buiten met een onverwachte vorm; komt nooit uit de engine zelf. */
  | 'MALFORMED'
