import type { Command, ErrorCode, GameState } from '@/engine/types'
import { useGameStore, type RollAnim } from '@/store/gameStore'
import { useNetStore } from '@/store/netStore'

export interface GameAdapter {
  state: GameState | null
  /** null = hotseat: iedereen speelt op dit toestel. */
  myPlayerId: string | null
  isHost: boolean
  animating: boolean
  rollAnim: RollAnim | null
  lastError: ErrorCode | null
  dispatch: (cmd: Command) => void
  onRollSettled: () => void
  leave: () => void
}

/** Eén interface voor GameScreen, of het potje nu lokaal (hotseat) of P2P loopt. */
export function useGameAdapter(): GameAdapter {
  const net = useNetStore()
  const hot = useGameStore()

  if (net.role !== 'none') {
    return {
      state: net.netState,
      myPlayerId: net.myPlayerId,
      isHost: net.role === 'host',
      animating: net.animating,
      rollAnim: net.rollAnim,
      lastError: net.lastError,
      dispatch: net.sendCommand,
      onRollSettled: net.onRollSettled,
      leave: net.leave,
    }
  }

  return {
    state: hot.state,
    myPlayerId: null,
    isHost: true,
    animating: hot.animating,
    rollAnim: hot.rollAnim,
    lastError: hot.lastError,
    dispatch: hot.dispatch,
    onRollSettled: hot.onRollSettled,
    leave: hot.reset,
  }
}
