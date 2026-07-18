// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type {
  AnswerChoice,
  BluffVerdict,
  BusChoice,
  Card,
  ErrorCode,
  GameState,
  PlayerProfile,
  RuleConfig,
} from '@/engine/types'

/** Hoog dit op bij incompatibele wijzigingen; clients met een andere versie weigeren. */
export const PROTOCOL_VERSION = 2

/** Soort kaart-animatie; alle drie landen op de host-authoritative kaart. */
export type CardAnimKind = 'deal' | 'flip' | 'bus'

/** Guest -> host (de host stuurt zijn eigen intents door dezelfde loop, loopback). */
export type Intent =
  | { t: 'JOIN'; profile: PlayerProfile }
  | { t: 'LEAVE' }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  | { t: 'ANSWER'; choice: AnswerChoice }
  | { t: 'GIVE_SIPS'; targetPlayerId: string }
  | { t: 'FLIP_PYRAMID' }
  | { t: 'PLAY_CARD'; card: Card }
  | { t: 'CALL_BLUFF'; targetPlayerId: string }
  /** `position`: de buspositie die de gokker zag; een verouderde gok wordt geweigerd. */
  | { t: 'BUS_GUESS'; choice: BusChoice; position: number }
  | { t: 'NEXT_PHASE' }
  /** Host-only: sla de beurt van de (weggevallen) actieve speler over. */
  | { t: 'FORFEIT_TURN' }
  | { t: 'END_GAME' }
  | { t: 'REQUEST_SYNC' }

/**
 * Host -> clients. Na elke mutatie gaat de volledige GameState mee (klein object):
 * geen delta's betekent geen desync en triviale reconnect. De CARD_EVENT-,
 * BLUFF_EVENT- en BUS_RESET_EVENT-berichten zijn transient (puur voor de
 * gelijktijdige animatie); de nieuwe waarden staan ook al in de bijbehorende STATE.
 */
export type GameEvent =
  | { t: 'STATE'; state: GameState }
  | { t: 'CARD_EVENT'; animId: string; kind: CardAnimKind; card: Card; animSeed: number }
  | { t: 'BLUFF_EVENT'; byPlayerId: string; targetPlayerId: string; verdict: BluffVerdict }
  | { t: 'BUS_RESET_EVENT'; animSeed: number }
  | { t: 'ERROR'; code: ErrorCode }
