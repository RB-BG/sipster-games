// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Command, ErrorCode, GameState, HandCard, PlayerState } from './types'
import { BAK_THRESHOLD } from './types'
import { handValue, isValidGroup, sameCard } from './values'

/** Meer stoelen dan dit is geen gezellige tafel meer; weert ook lobby-flooding. */
export const MAX_PLAYERS = 8
export const MIN_HAND_SIZE = 2
export const MAX_HAND_SIZE = 7

function playerById(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id)
}

/** Zit elke opgegeven kaart (uniek) precies in de hand? */
function allInHand(hand: HandCard[], group: HandCard[]): boolean {
  for (let i = 0; i < group.length; i++) {
    // Geen dubbele verwijzing naar dezelfde kaart binnen de groep.
    if (group.findIndex((g) => sameCard(g, group[i])) !== i) return false
    if (!hand.some((h) => sameCard(h, group[i]))) return false
  }
  return true
}

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
      if (state.players.length >= MAX_PLAYERS) return 'GAME_FULL'
      return null

    case 'REMOVE_PLAYER':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (!playerById(state, cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'SET_RULES': {
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      const { handSize, yousefMax } = cmd.rules
      if (!Number.isInteger(handSize) || handSize < MIN_HAND_SIZE || handSize > MAX_HAND_SIZE)
        return 'INVALID_RULES'
      if (!Number.isInteger(yousefMax) || yousefMax < 1 || yousefMax > 15) return 'INVALID_RULES'
      return null
    }

    case 'START_GAME':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (state.players.length < 2) return 'NOT_ENOUGH_PLAYERS'
      return null

    case 'PLAY_TURN': {
      if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
      if (state.turn.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      const player = playerById(state, cmd.playerId)
      if (!player) return 'UNKNOWN_PLAYER'
      if (!isValidGroup(cmd.discard)) return 'INVALID_GROUP'
      if (!allInHand(player.hand, cmd.discard)) return 'CARD_NOT_IN_HAND'
      if (cmd.drawFrom === 'discard' && state.discardTop.length === 0) return 'EMPTY_DISCARD'
      return null
    }

    case 'CALL_YOUSEF': {
      if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
      if (state.turn.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      const player = playerById(state, cmd.playerId)
      if (!player) return 'UNKNOWN_PLAYER'
      if (handValue(player.hand) >= state.rules.yousefMax) return 'HAND_TOO_HIGH'
      return null
    }

    case 'DRAW_BAK': {
      if (state.phase !== 'roundEnd') return 'WRONG_PHASE'
      const player = playerById(state, cmd.playerId)
      if (!player) return 'UNKNOWN_PLAYER'
      if (player.score < BAK_THRESHOLD) return 'NO_BAK_DUE'
      return null
    }

    case 'BUY_OFF': {
      if (state.phase !== 'roundEnd') return 'WRONG_PHASE'
      const player = playerById(state, cmd.playerId)
      if (!player) return 'UNKNOWN_PLAYER'
      if (player.score >= BAK_THRESHOLD) return 'CANNOT_BUY_OFF'
      return null
    }

    case 'NEXT_ROUND':
      if (state.phase !== 'roundEnd') return 'WRONG_PHASE'
      if (state.players.some((p) => p.score >= BAK_THRESHOLD)) return 'BAK_PENDING'
      return null

    case 'SET_CONNECTED':
      if (!playerById(state, cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'FORFEIT_TURN':
      if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
      return null

    case 'END_GAME':
      if (state.phase === 'lobby') return 'WRONG_PHASE'
      return null
  }
}
