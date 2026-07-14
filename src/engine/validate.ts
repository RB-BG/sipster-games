// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { scoreRank } from './score'
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
      // Kan alleen bij een open 65-op-laatste-worp (omgekeerde mex): flippen of blijven staan.
      if (turn.throwsUsed >= turn.maxThrows) return 'WRONG_PHASE'
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
      // Een vrije steen "oppakken" mag als afslaan-preventiegebaar bij een open window.
      if (cmd.t === 'PICKUP_DIE' && !die.onTable && !turn.afslaanWindow) return 'INVALID_DIE'
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
    case 'END_GAME':
      if (state.phase !== 'roundEnd') return 'WRONG_PHASE'
      return null

    case 'SET_CONNECTED':
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'FORFEIT_TURN':
      // Ook een weggevallen speler in de kamp moet over te slaan zijn.
      if (state.phase === 'tiebreak' && state.tiebreak !== null) {
        if (!state.tiebreak.playerIds.includes(cmd.playerId)) return 'NOT_YOUR_TURN'
        if (state.tiebreak.rolls[cmd.playerId] !== null) return 'ALREADY_ROLLED'
        return null
      }
      if (state.phase !== 'playing' || state.turn === null || state.turn.locked)
        return 'WRONG_PHASE'
      if (state.turn.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      return null

    case 'FLIP_65': {
      if (!state.rules.omgekeerdeMex) return 'WRONG_PHASE'
      const err = requireTurn(state, cmd.playerId)
      if (err) return err
      const turn = state.turn as TurnState
      if (turn.pending31) return 'PENDING_31'
      if (turn.dice === null) return 'HAS_NOT_THROWN'
      if (scoreRank(turn.dice[0].value, turn.dice[1].value) !== 65) return 'INVALID_DIE'
      return null
    }

    case 'AFSLAAN':
      // Ook een onterechte afklop is een geldige actie: de reducer velt het
      // oordeel. Ook in roundEnd, want een mex die de ronde afsloot moet
      // afklopbaar blijven (4/8 slokken straf).
      if (!state.rules.afslaan || (state.phase !== 'playing' && state.phase !== 'roundEnd'))
        return 'WRONG_PHASE'
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null
  }
}

function requireTurn(state: GameState, playerId: string): ErrorCode | null {
  if (state.phase !== 'playing' || state.turn === null) return 'WRONG_PHASE'
  if (state.turn.locked) return 'WRONG_PHASE'
  if (state.turn.playerId !== playerId) return 'NOT_YOUR_TURN'
  return null
}
