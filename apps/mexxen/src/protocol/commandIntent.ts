// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Command } from '@/engine/types'
import type { Intent } from './messages'

/**
 * De UI spreekt in Commands; op het netwerk gaan Intents (de host bepaalt de
 * speler-id). Elke door de UI verzonden Command moet hier een Intent opleveren,
 * anders slikt de netStore de actie stil in (zie de test): een ontbrekende case
 * betekende dat de afslaan- en omgekeerde-mex-knop in P2P niets deden.
 */
export function commandToIntent(cmd: Command): Intent | null {
  switch (cmd.t) {
    case 'SET_RULES':
      return { t: 'SET_RULES', rules: cmd.rules }
    case 'START_GAME':
      return { t: 'START_GAME' }
    case 'ROLL':
      return { t: 'ROLL' }
    case 'HOLD_DIE':
      return { t: 'HOLD_DIE', dieId: cmd.dieId }
    case 'PICKUP_DIE':
      return { t: 'PICKUP_DIE', dieId: cmd.dieId }
    case 'END_TURN':
      return { t: 'END_TURN' }
    case 'GIVE_SIPS_31':
      return { t: 'GIVE_SIPS_31', targetPlayerId: cmd.targetPlayerId }
    case 'AFSLAAN':
      return { t: 'AFSLAAN' }
    case 'FLIP_65':
      return { t: 'FLIP_65' }
    case 'TIEBREAK_ROLL':
      return { t: 'TIEBREAK_ROLL' }
    case 'NEXT_ROUND':
      return { t: 'NEXT_ROUND' }
    case 'END_GAME':
      return { t: 'END_GAME' }
    case 'FORFEIT_TURN':
      return { t: 'FORFEIT_TURN' }
    default:
      return null
  }
}
