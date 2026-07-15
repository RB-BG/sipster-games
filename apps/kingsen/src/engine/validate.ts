// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Command, ErrorCode, GameState } from './types'

/** Grens op een cup-inschenking, om onzin-invoer te weren. */
export const MAX_CUP_AMOUNT = 50
/** Maximale lengte van een zelfgeschreven regel. */
export const MAX_RULE_LENGTH = 80

/**
 * Controleert of een command nu geldig is. Puur: geen state-mutatie.
 * Autorisatie (mag deze peer dit namens deze speler?) is de taak van de
 * host-loop, niet van de engine: hotseat kent geen peers.
 */
export function validateCommand(state: GameState, cmd: Command): ErrorCode | null {
  switch (cmd.t) {
    case 'ADD_PLAYER':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (state.players.some((p) => p.id === cmd.profile.id)) return 'ALREADY_JOINED'
      return null

    case 'REMOVE_PLAYER':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'SET_RULES':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (!Number.isInteger(cmd.rules.standaardSlokken)) return 'INVALID_RULES'
      if (cmd.rules.standaardSlokken < 1 || cmd.rules.standaardSlokken > 10) return 'INVALID_RULES'
      return null

    case 'START_GAME':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (state.players.length < 2) return 'NOT_ENOUGH_PLAYERS'
      return null

    case 'FLIP_CARD':
      if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
      if (state.turn.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      if (state.pending !== null) return 'PENDING_INPUT'
      if (state.drawIndex >= state.deck.length) return 'NOTHING_TO_FLIP'
      return null

    case 'ADD_TO_CUP':
      if (state.phase !== 'playing') return 'WRONG_PHASE'
      if (state.pending === null || state.pending.kind !== 'cup') return 'NOT_PENDING'
      if (state.pending.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      if (!Number.isInteger(cmd.amount)) return 'INVALID_AMOUNT'
      if (cmd.amount < 1 || cmd.amount > MAX_CUP_AMOUNT) return 'INVALID_AMOUNT'
      return null

    case 'SET_RULE':
      if (state.phase !== 'playing') return 'WRONG_PHASE'
      if (state.pending === null || state.pending.kind !== 'rule') return 'NOT_PENDING'
      if (state.pending.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      if (cmd.text.trim().length === 0) return 'INVALID_TEXT'
      if (cmd.text.trim().length > MAX_RULE_LENGTH) return 'INVALID_TEXT'
      return null

    case 'SET_CONNECTED':
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'FORFEIT_TURN':
      if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
      return null

    case 'END_GAME':
      if (state.phase === 'lobby') return 'WRONG_PHASE'
      return null
  }
}
