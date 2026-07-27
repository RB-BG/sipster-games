// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { ErrorCode, GameState, HandCard, PlayerProfile, RuleConfig } from '@/engine/types'

/** Hoog dit op bij incompatibele wijzigingen; clients met een andere versie weigeren. */
export const PROTOCOL_VERSION = 2

/** Soort kaart-animatie (voor later; de hand-UI en animaties komen in chunk 3). */
export type CardAnimKind = 'flip' | 'deal'

/** Guest -> host (de host stuurt zijn eigen intents door dezelfde loop, loopback). */
export type Intent =
  | { t: 'JOIN'; profile: PlayerProfile }
  | { t: 'LEAVE' }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  /** Een beurt: leg kaarten af en trek van de stapel of de aflegstapel. */
  | { t: 'PLAY_TURN'; discard: HandCard[]; drawFrom: 'deck' | 'discard' }
  /** "Yousef" roepen aan het begin van je beurt. */
  | { t: 'CALL_YOUSEF' }
  /** roundEnd: een bak trekken (score -20). */
  | { t: 'DRAW_BAK' }
  /** roundEnd: een halve bak afkopen (score -10, +10 slokken). */
  | { t: 'BUY_OFF' }
  /** roundEnd -> playing: host deelt de volgende ronde. */
  | { t: 'NEXT_ROUND' }
  /** Host-only: sla de beurt van de (weggevallen) actieve speler over. */
  | { t: 'FORFEIT_TURN' }
  | { t: 'END_GAME' }
  | { t: 'REQUEST_SYNC' }

/**
 * Host -> clients. Na elke mutatie gaat de volledige GameState mee (klein object):
 * geen delta's betekent geen desync en triviale reconnect. Het CARD_EVENT-bericht
 * is transient (voor een latere reveal-animatie) en wordt nu nog niet uitgezonden.
 */
export type GameEvent =
  | { t: 'STATE'; state: GameState }
  | { t: 'CARD_EVENT'; animId: string; kind: CardAnimKind; card: HandCard; animSeed: number }
  | { t: 'ERROR'; code: ErrorCode }
