import type { Die, DieId, ErrorCode, GameState, PlayerProfile, RuleConfig } from '@/engine/types'

/** Hoog dit op bij incompatibele wijzigingen; clients met een andere versie weigeren. */
export const PROTOCOL_VERSION = 1

/** Guest -> host (de host stuurt zijn eigen intents door dezelfde loop, loopback). */
export type Intent =
  | { t: 'JOIN'; profile: PlayerProfile }
  | { t: 'LEAVE' }
  | { t: 'SET_RULES'; rules: RuleConfig }
  | { t: 'START_GAME' }
  | { t: 'ROLL' }
  | { t: 'HOLD_DIE'; dieId: DieId }
  | { t: 'PICKUP_DIE'; dieId: DieId }
  | { t: 'END_TURN' }
  | { t: 'GIVE_SIPS_31'; targetPlayerId: string }
  | { t: 'AFSLAAN' }
  | { t: 'FLIP_65' }
  /** Host-only: beëindig de beurt van de (weggevallen) actieve speler. */
  | { t: 'FORFEIT_TURN' }
  | { t: 'TIEBREAK_ROLL' }
  | { t: 'NEXT_ROUND' }
  | { t: 'REQUEST_SYNC' }

/**
 * Host -> clients. Na elke mutatie gaat de volledige GameState mee (klein object):
 * geen delta's betekent geen desync en triviale reconnect.
 * ROLL_EVENT is transient, puur voor de gelijktijdige worp-animatie;
 * de nieuwe waarden staan ook al in de bijbehorende STATE.
 */
export type GameEvent =
  | { t: 'STATE'; state: GameState }
  | { t: 'ROLL_EVENT'; rollId: string; playerId: string; dieIds: DieId[]; values: Die[]; animSeed: number }
  | { t: 'TIEBREAK_ROLL_EVENT'; playerId: string; value: Die; animSeed: number }
  | { t: 'AFSLAAN_EVENT'; byPlayerId: string; verdictCode: string }
  | { t: 'ERROR'; code: ErrorCode }
