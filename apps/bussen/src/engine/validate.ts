// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { maxPlayers } from './deck'
import { pyramidTotal } from './pyramid'
import type { AnswerChoice, Command, ErrorCode, GameState, QuestionIndex } from './types'

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
      if (state.players.length >= maxPlayers(state.rules)) return 'GAME_FULL'
      return null

    case 'REMOVE_PLAYER':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'SET_RULES':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (cmd.rules.standaardSlokken < 1) return 'INVALID_RULES'
      if (cmd.rules.busLengte < 1 || cmd.rules.busLengte > 10) return 'INVALID_RULES'
      // Een langere bus mag de al aanwezige spelers niet buiten het deck-budget duwen.
      if (state.players.length > maxPlayers(cmd.rules)) return 'INVALID_RULES'
      return null

    case 'START_GAME':
      if (state.phase !== 'lobby') return 'WRONG_PHASE'
      if (state.players.length < 2) return 'NOT_ENOUGH_PLAYERS'
      return null

    case 'ANSWER': {
      if (state.phase !== 'questions' || state.turn === null) return 'WRONG_PHASE'
      if (state.turn.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      if (state.pendingGive !== null) return 'PENDING_GIVE'
      if (!choiceFitsQuestion(state.turn.questionIndex, cmd.choice)) return 'INVALID_CHOICE'
      return null
    }

    case 'GIVE_SIPS': {
      if (state.pendingGive === null) return 'NOT_PENDING_GIVE'
      if (state.pendingGive.playerId !== cmd.playerId) return 'NOT_YOUR_TURN'
      if (cmd.targetPlayerId === cmd.playerId) return 'INVALID_TARGET'
      if (!state.players.some((p) => p.id === cmd.targetPlayerId)) return 'INVALID_TARGET'
      return null
    }

    case 'FLIP_PYRAMID': {
      if (state.phase !== 'pyramid' || state.pyramid === null) return 'WRONG_PHASE'
      if (state.pyramid.openClaim !== null) return 'CLAIM_IN_PROGRESS'
      if (state.pendingGive !== null) return 'PENDING_GIVE'
      if (state.pyramid.flipIndex >= pyramidTotal(state.pyramid)) return 'NOTHING_TO_FLIP'
      return null
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'pyramid' || state.pyramid === null) return 'WRONG_PHASE'
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      const player = state.players.find((p) => p.id === cmd.playerId)
      const { currentRank, openClaim } = state.pyramid
      if (currentRank === null) return 'WRONG_PHASE'
      if (openClaim !== null) return 'CLAIM_IN_PROGRESS'
      // Na een onterechte call bluff staat de give van de eerdere claimant nog
      // open; een nieuwe claim zou die anders geruisloos overschrijven.
      if (state.pendingGive !== null) return 'PENDING_GIVE'
      if (cmd.card.rank !== currentRank) return 'INVALID_CARD'
      // Elke claim kost een kaart uit de hand: met een lege hand kun je niet meer
      // claimen (en dus ook niet meer bluffen).
      if (!player || player.hand.length === 0) return 'INVALID_CARD'
      // Zonder de bluf-regel moet de claim waar zijn: de kaart moet echt in de hand zitten.
      if (!state.rules.bluffen && !player.hand.some((c) => c.rank === currentRank)) {
        return 'INVALID_CARD'
      }
      return null
    }

    case 'CALL_BLUFF': {
      if (state.phase !== 'pyramid' || state.pyramid === null) return 'WRONG_PHASE'
      if (!state.rules.bluffen) return 'WRONG_PHASE'
      const { openClaim } = state.pyramid
      if (openClaim === null) return 'NO_OPEN_CLAIM'
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      if (cmd.playerId === openClaim.claimantId) return 'INVALID_TARGET'
      if (cmd.targetPlayerId !== openClaim.claimantId) return 'INVALID_TARGET'
      return null
    }

    case 'BUS_GUESS': {
      if (state.phase !== 'bus' || state.bus === null) return 'WRONG_PHASE'
      if (!state.bus.driverIds.includes(cmd.playerId)) return 'NOT_A_DRIVER'
      if (cmd.choice !== 'hoger' && cmd.choice !== 'lager') return 'INVALID_CHOICE'
      // Twee chauffeurs kunnen tegelijk gokken; de tweede gok hoort bij een
      // kaart die inmiddels al omgedraaid is en telt niet.
      if (cmd.position !== state.bus.position) return 'STALE_GUESS'
      return null
    }

    case 'NEXT_PHASE': {
      if (state.phase !== 'pyramid' || state.pyramid === null) return 'WRONG_PHASE'
      if (state.pyramid.openClaim !== null) return 'CLAIM_IN_PROGRESS'
      if (state.pendingGive !== null) return 'PENDING_GIVE'
      if (state.pyramid.flipIndex < pyramidTotal(state.pyramid)) return 'WRONG_PHASE'
      return null
    }

    case 'SET_CONNECTED':
      if (!state.players.some((p) => p.id === cmd.playerId)) return 'UNKNOWN_PLAYER'
      return null

    case 'FORFEIT_TURN': {
      // Vragenrondje: de beurt overslaan. Piramide: een openstaande claim of
      // give annuleren. Bus: weggevallen chauffeurs uit de bus halen.
      if (state.phase === 'questions') {
        return state.turn === null ? 'WRONG_PHASE' : null
      }
      if (state.phase === 'pyramid') {
        if (state.pendingGive !== null || state.pyramid?.openClaim) return null
        return 'WRONG_PHASE'
      }
      if (state.phase === 'bus' && state.bus !== null) {
        const disconnected = state.bus.driverIds.some(
          (id) => state.players.find((p) => p.id === id)?.connected === false,
        )
        return disconnected ? null : 'WRONG_PHASE'
      }
      return 'WRONG_PHASE'
    }

    case 'END_GAME':
      if (state.phase === 'lobby') return 'WRONG_PHASE'
      return null
  }
}

const QUESTION_CHOICES: Record<QuestionIndex, AnswerChoice[]> = {
  0: ['rood', 'zwart'],
  1: ['hoger', 'lager'],
  2: ['binnen', 'buiten'],
  3: ['heb', 'niet'],
}

function choiceFitsQuestion(index: QuestionIndex, choice: AnswerChoice): boolean {
  return QUESTION_CHOICES[index].includes(choice)
}
