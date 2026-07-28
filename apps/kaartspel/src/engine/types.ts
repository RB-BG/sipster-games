// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Rank, Suit } from '@sipster/core/cards/types'

export type { Rank, Suit } from '@sipster/core/cards/types'

/**
 * Een kaart in een hand, de trekstapel of de aflegstapel. Yousef speelt met een
 * standaarddeck (52) plus twee jokers. Core kent geen joker (rang 2..14), dus we
 * modelleren de kaart hier als een discriminated union en laten core ongemoeid.
 * Aas is rang 14 (core), maar telt in Yousef als 1 punt; zie `values.ts`.
 */
export type HandCard =
  | { kind: 'card'; suit: Suit; rank: Rank }
  | { kind: 'joker'; jid: number }

export type GamePhase = 'lobby' | 'playing' | 'roundEnd' | 'ended'

export interface RuleConfig {
  /** Aantal kaarten per hand bij het delen. */
  handSize: number
  /** "Yousef" roepen mag zodra je handwaarde < dit is (klassiek: 5). */
  yousefMax: number
  /** Mag een joker als wildcard een gat in een set/straat vullen? Uit = joker alleen los te spelen. */
  jokerWildcard: boolean
  /** Bij Assaf ook de andere spelers laten scoren (verschil tot de laagste), i.p.v. alleen de roeper straffen. */
  assafEveryoneScores: boolean
  /** Vanaf deze cumulatieve score moet je een bak trekken. */
  bakThreshold: number
}

export const DEFAULT_RULES: RuleConfig = {
  handSize: 5,
  yousefMax: 5,
  jokerWildcard: true,
  assafEveryoneScores: false,
  bakThreshold: 30,
}

export interface PlayerProfile {
  id: string
  name: string
  emoji: string
}

export interface PlayerState extends PlayerProfile {
  connected: boolean
  /**
   * De kaarten in de hand van deze speler (host-authoritative waarheid). In een
   * per-ontvanger gefilterde guest-state is dit voor andermans hand leeg; het
   * aantal kaarten staat dan in `handCount`.
   */
  hand: HandCard[]
  /** Alleen in gefilterde guest-state: aantal kaarten in andermans (verborgen) hand. */
  handCount?: number
  /** Cumulatieve strafpunten over het hele potje; de bak-meter. */
  score: number
  /** Cumulatief afgekochte slokken (halve bakken), puur voor het scorebord. */
  sips: number
}

/** Wie nu aan zet is; null buiten de speel-fase. */
export type TurnState = { playerId: string } | null

/**
 * Actief tussen een Yousef-call en de scoring: elke andere speler krijgt nog
 * precies één beurt (de roeper niet). `queue` is de resterende volgorde.
 */
export interface FinalTurns {
  callerId: string
  queue: string[]
}

/** De open weergave van één speler bij het eind van een ronde. */
export interface RoundEntry {
  playerId: string
  hand: HandCard[]
  handValue: number
  /** Punten die deze speler deze ronde bij zijn score kreeg. */
  gained: number
}

/**
 * De uitslag van een ronde, gezet zodra iemand "Yousef" roept. Blijft staan in
 * `phase: 'roundEnd'` tot de host een nieuwe ronde start.
 */
export interface RoundResult {
  callerId: string
  callerValue: number
  /** De laagste handwaarde aan tafel (excl. de roeper telt niet apart mee). */
  lowestValue: number
  /** True als de roeper niet (mede-)laagste was: verkeerde call, alleen de roeper wordt gestraft. */
  assaf: boolean
  entries: RoundEntry[]
}

export interface GameState {
  /** Monotoon oplopend, voor snapshot-ordering bij guests. */
  version: number
  phase: GamePhase
  rules: RuleConfig
  hostId: string
  /** Volgorde in de array = speelvolgorde (met de klok mee). */
  players: PlayerState[]
  /** Huidige ronde, 1-gebaseerd; open einde (geen vaste winst-conditie). */
  round: number
  /** De geschudde trekstapel (host-authoritative); reduce popt puur op drawIndex. */
  deck: HandCard[]
  drawIndex: number
  /**
   * De laatst afgelegde groep kaarten. De bovenste (laatste) daarvan is de kaart
   * die de volgende speler eventueel mag oppakken i.p.v. van de stapel te trekken.
   */
  discardTop: HandCard[]
  /** Afgelegde kaarten die niet meer oppakbaar zijn; hieruit wordt herschud bij een lege stapel. */
  discardBuried: HandCard[]
  /** Wie nu een beurt doet; null buiten `playing`. */
  turn: TurnState
  /** Uitslag van de zojuist afgelopen ronde; alleen gezet in `roundEnd`. */
  roundResult: RoundResult | null
  /** Actief na een Yousef-call, tot iedereen zijn laatste beurt heeft gehad. */
  finalTurns: FinalTurns | null
}

/** Wat een speler wil doen; de reducer valideert en voert uit. */
export type Command =
  | { t: 'ADD_PLAYER'; profile: PlayerProfile }
  | { t: 'REMOVE_PLAYER'; playerId: string }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  /**
   * Een beurt: leg `discard` af (los, setje of straat) en trek daarna één kaart,
   * van de stapel (`deck`) of de bovenste afgelegde kaart (`discard`).
   */
  | { t: 'PLAY_TURN'; playerId: string; discard: HandCard[]; drawFrom: 'deck' | 'discard' }
  /** Aan het begin van je beurt "Yousef" roepen (mag bij handwaarde < yousefMax). */
  | { t: 'CALL_YOUSEF'; playerId: string }
  /** roundEnd: een speler met score >= 30 trekt een bak (-20). */
  | { t: 'DRAW_BAK'; playerId: string }
  /** roundEnd: een halve bak afkopen (-10 punten, +10 slokken). */
  | { t: 'BUY_OFF'; playerId: string }
  /** roundEnd -> playing: deel opnieuw en begin de volgende ronde. */
  | { t: 'NEXT_ROUND' }
  | { t: 'SET_CONNECTED'; playerId: string; connected: boolean }
  /** Host slaat de (weggevallen) actieve speler over. */
  | { t: 'FORFEIT_TURN' }
  | { t: 'END_GAME' }

/** Transiente gebeurtenissen voor animatie, geluid en toasts; state is al bijgewerkt. */
export type EngineEvent =
  | { t: 'PLAYED'; playerId: string; discard: HandCard[]; drawn: HandCard; fromDiscard: boolean; animSeed: number }
  | { t: 'YOUSEF_CALLED'; callerId: string }
  | { t: 'ROUND_SCORED'; result: RoundResult }
  | { t: 'BAK_DRAWN'; playerId: string }
  | { t: 'PHASE_CHANGED'; phase: GamePhase }

export type ErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ALREADY_JOINED'
  | 'UNKNOWN_PLAYER'
  | 'GAME_FULL'
  | 'INVALID_RULES'
  /** De opgegeven afleg-groep zit niet (helemaal) in de hand van de speler. */
  | 'CARD_NOT_IN_HAND'
  /** De afleg-groep is geen geldige losse kaart, set of straat. */
  | 'INVALID_GROUP'
  /** "Yousef" roepen mag niet: handwaarde te hoog. */
  | 'HAND_TOO_HIGH'
  /** Van de aflegstapel trekken kan niet: er ligt niets. */
  | 'EMPTY_DISCARD'
  /** Bak trekken / afkopen kan nu niet (verkeerde score of fase). */
  | 'NO_BAK_DUE'
  | 'CANNOT_BUY_OFF'
  /** Er staan nog bakken open; eerst afhandelen voor de volgende ronde. */
  | 'BAK_PENDING'
  /** Bericht van buiten met een onverwachte vorm; komt nooit uit de engine zelf. */
  | 'MALFORMED'

/** Puntwaarde van een hele bak (gaat er bij het trekken af). */
export const BAK_VALUE = 20
/** Puntwaarde van een halve bak (afkopen). */
export const HALF_BAK_VALUE = 10
/** Slokken die het afkopen van een halve bak kost. */
export const HALF_BAK_SIPS = 10
/** Strafpunten voor de roeper bij een gelijke laagste hand (Assaf-gelijkspel). */
export const ASSAF_TIE_PENALTY = 10
/** Vermenigvuldiger voor het verschil bij een strikt lagere hand (Assaf). */
export const ASSAF_FACTOR = 10
