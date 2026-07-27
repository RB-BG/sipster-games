// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Card, ErrorCode, GameState, PlayerProfile, RuleConfig } from '@/engine/types'

/** Hoog dit op bij incompatibele wijzigingen; clients met een andere versie weigeren. */
export const PROTOCOL_VERSION = 1

/** Soort kaart-animatie. In Kaartspel is er alleen de flip van de opengedraaide kaart. */
export type CardAnimKind = 'flip'

/** Guest -> host (de host stuurt zijn eigen intents door dezelfde loop, loopback). */
export type Intent =
  | { t: 'JOIN'; profile: PlayerProfile }
  | { t: 'LEAVE' }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  | { t: 'FLIP_CARD' }
  | { t: 'ADD_TO_CUP'; amount: number }
  | { t: 'SET_RULE'; text: string }
  /** Deel slokken uit aan een speler (negatief bedrag corrigeert). */
  | { t: 'ADD_SIPS'; targetPlayerId: string; amount: number }
  /** Host-only: sla de beurt van de (weggevallen) actieve speler over. */
  | { t: 'FORFEIT_TURN' }
  | { t: 'END_GAME' }
  | { t: 'REQUEST_SYNC' }

/**
 * Host -> clients. Na elke mutatie gaat de volledige GameState mee (klein object):
 * geen delta's betekent geen desync en triviale reconnect. Het CARD_EVENT-bericht
 * is transient (puur voor de gelijktijdige flip-animatie); de nieuwe waarden staan
 * ook al in de bijbehorende STATE.
 */
export type GameEvent =
  | { t: 'STATE'; state: GameState }
  | { t: 'CARD_EVENT'; animId: string; kind: CardAnimKind; card: Card; animSeed: number }
  | { t: 'ERROR'; code: ErrorCode }
