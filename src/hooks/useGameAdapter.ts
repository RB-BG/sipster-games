import type { Command, ErrorCode, GameState } from '@/engine/types'
import type { GuestStatus } from '@/net/transport'
import { useGameStore, type FlipAnim, type RollAnim } from '@/store/gameStore'
import { useNetStore, type AfslaanToast } from '@/store/netStore'

export interface GameAdapter {
  state: GameState | null
  /** null = hotseat: iedereen speelt op dit toestel. */
  myPlayerId: string | null
  isHost: boolean
  animating: boolean
  rollAnim: RollAnim | null
  flipAnim: FlipAnim | null
  afslaanToast: AfslaanToast | null
  lastError: ErrorCode | null
  /** Verbindingsstatus; hotseat is altijd 'idle'. */
  connection: GuestStatus | 'idle'
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
      state: net.viewState,
      myPlayerId: net.myPlayerId,
      isHost: net.role === 'host',
      animating: net.animating,
      rollAnim: net.rollAnim,
      flipAnim: net.flipAnim,
      afslaanToast: net.afslaanToast,
      lastError: net.lastError,
      connection: net.status,
      dispatch: net.sendCommand,
      onRollSettled: net.onRollSettled,
      leave: net.leave,
    }
  }

  return {
    state: hot.viewState,
    myPlayerId: null,
    isHost: true,
    animating: hot.animating,
    rollAnim: hot.rollAnim,
    flipAnim: hot.flipAnim,
    afslaanToast: null,
    lastError: hot.lastError,
    connection: 'idle',
    dispatch: hot.dispatch,
    onRollSettled: hot.onRollSettled,
    leave: hot.reset,
  }
}
