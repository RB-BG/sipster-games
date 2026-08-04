// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { describe, expect, it } from 'vitest'
import type { Command } from '@/engine/types'
import { commandToIntent } from './commandIntent'

const PID = 'p1'

// Elke Command die de UI dispatcht (dispatch = sendCommand in P2P). Host-interne
// commands (ADD_PLAYER, REMOVE_PLAYER, SET_CONNECTED) horen hier niet: die maakt
// de host zelf, niet de knoppen.
const UI_COMMANDS: Command[] = [
  { t: 'SET_RULES', rules: { standaardSlokken: 2 } as never },
  { t: 'START_GAME' },
  { t: 'ROLL', playerId: PID },
  { t: 'HOLD_DIE', playerId: PID, dieId: 0 },
  { t: 'PICKUP_DIE', playerId: PID, dieId: 1 },
  { t: 'END_TURN', playerId: PID },
  { t: 'GIVE_SIPS_31', playerId: PID, targetPlayerId: 'p2' },
  { t: 'TIEBREAK_ROLL', playerId: PID },
  { t: 'NEXT_ROUND' },
  { t: 'FORFEIT_TURN', playerId: PID },
  { t: 'FLIP_65', playerId: PID },
  { t: 'AFSLAAN', playerId: PID },
  { t: 'END_GAME' },
]

describe('commandToIntent', () => {
  // Een ontbrekende case liet sendCommand de actie stil inslikken: zo deden de
  // afslaan- en omgekeerde-mex-knop in P2P niets. Dit dekt die regressie af.
  it.each(UI_COMMANDS)('mapt de UI-command $t naar een intent', (cmd) => {
    const intent = commandToIntent(cmd)
    expect(intent).not.toBeNull()
    expect(intent?.t).toBe(cmd.t)
  })

  it('laat host-interne commands ongemoeid (geen netwerk-intent)', () => {
    expect(commandToIntent({ t: 'ADD_PLAYER', profile: { id: PID, name: 'x', emoji: '🎲' } })).toBeNull()
    expect(commandToIntent({ t: 'REMOVE_PLAYER', playerId: PID })).toBeNull()
    expect(commandToIntent({ t: 'SET_CONNECTED', playerId: PID, connected: false })).toBeNull()
  })
})
