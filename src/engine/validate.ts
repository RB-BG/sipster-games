import type { Command, ErrorCode, GameState, TurnState } from './types'

/**
 * Controleert of een command nu geldig is. Puur: geen state-mutatie.
 * Autorisatie (mag deze peer dit namens deze speler?) is de taak van de host-loop,
 * niet van de engine: hotseat kent geen peers.
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
      if (cmd.rules.standaardSlokken < 1) return 'INVALID_RULES'
      return null

    case 'START_GAME':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (state.players.length < 2) return 'NOT_ENOUGH_PLAYERS'
      return null

    case 'ROLL': {
      const err = requireTurn(state, cmd.playerId)
      if (err) return err
      const turn = state.turn as TurnState
      if (turn.pending31) return 'PENDING_31'
      if (turn.dice !== null) {
        const rollable = turn.dice.some((d) => !d.onTable || d.vers === 'stale')
        if (!rollable) return 'NO_ROLLABLE_DICE'
      }
      return null
    }

    case 'HOLD_DIE':
    case 'PICKUP_DIE': {
      const err = requireTurn(state, cmd.playerId)
      if (err) return err
      const turn = state.turn as TurnState
      if (turn.pending31) return 'PENDING_31'
      if (turn.dice === null) return 'HAS_NOT_THROWN'
      const die = turn.dice[cmd.dieId]
      // Verse en stale 1/2 zijn onaanraakbaar: liggen verplicht, of moeten verplicht mee.
      if (die.vers !== null) return 'INVALID_DIE'
      if (cmd.t === 'HOLD_DIE' && die.onTable) return 'INVALID_DIE'
      if (cmd.t === 'PICKUP_DIE' && !die.onTable) return 'INVALID_DIE'
      return null
    }

    case 'END_TURN': {
      const err = requireTurn(state, cmd.playerId)
      if (err) return err
      const turn = state.turn as TurnState
      if (turn.pending31) return 'PENDING_31'
      if (turn.dice === null) return 'HAS_NOT_THROWN'
      return null
    }

    case 'GIVE_SIPS_31': {
      const err = requireTurn(state, cmd.playerId)
      if (err) return err
      const turn = state.turn as TurnState
      if (!turn.pending31) return 'NOT_PENDING_31'
      if (cmd.targetPlayerId === cmd.playerId) return 'INVALID_TARGET'
      if (!state.players.some((p) => p.id === cmd.targetPlayerId)) return 'INVALID_TARGET'
      return null
    }

    case 'TIEBREAK_ROLL': {
      if (state.phase !== 'tiebreak' || state.tiebreak === null) return 'WRONG_PHASE'
      if (!state.tiebreak.playerIds.includes(cmd.playerId)) return 'NOT_YOUR_TURN'
      if (state.tiebreak.rolls[cmd.playerId] !== null) return 'ALREADY_ROLLED'
      return null
    }

    case 'NEXT_ROUND':
      if (state.phase !== 'roundEnd') return 'WRONG_PHASE'
      return null

    case 'SET_CONNECTED':
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'FORFEIT_TURN':
      if (state.phase !== 'playing' || state.turn === null || state.turn.locked)
        return 'WRONG_PHASE'
      if (state.turn.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      return null
  }
}

function requireTurn(state: GameState, playerId: string): ErrorCode | null {
  if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
  if (state.turn.locked) return 'WRONG_PHASE'
  if (state.turn.playerId !== playerId) return 'NOT_YOUR_TURN'
  return null
}
