import type { GameEvent, Intent } from '@/protocol/messages'

/**
 * Dun transport-contract rond PeerJS, zodat de netwerklaag later
 * verwisselbaar is voor een realtime-dienst zonder de rest te raken.
 * Ster-topologie: guests praten alleen met de host.
 */

export interface WireEnvelope {
  v: number
  msg: Intent | GameEvent
}

export interface HostTransport {
  roomCode: string
  send(peerId: string, event: GameEvent): void
  broadcast(event: GameEvent): void
  /** Leeft er op dit moment een open verbinding met deze peer? */
  isConnected(peerId: string): boolean
  close(): void
}

export interface HostCallbacks {
  onIntent(peerId: string, intent: Intent): void
  onGuestDisconnect(peerId: string): void
}

export type GuestStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface GuestTransport {
  sendIntent(intent: Intent): void
  close(): void
}

export interface GuestCallbacks {
  onEvent(event: GameEvent): void
  /** Elke keer dat de verbinding (opnieuw) opengaat; stuur hier JOIN. */
  onOpen(): void
  onStatus(status: GuestStatus): void
}
