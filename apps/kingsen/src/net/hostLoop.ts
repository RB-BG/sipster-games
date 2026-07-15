// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { cryptoDeckSource, type DeckSource } from '@/engine/deck'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, EngineEvent, GameState, PlayerProfile, RuleConfig } from '@/engine/types'
import type { GameEvent, Intent } from '@/protocol/messages'
import type { HostTransport } from './transport'

/**
 * De host is de enige bron van waarheid: intent binnen -> valideren ->
 * reducen -> events + volledige state broadcasten. De host speelt zelf
 * mee via dispatchLocal, door exact hetzelfde codepad (loopback).
 */
export interface HostLoop {
  readonly state: GameState
  handleIntent(peerId: string | null, intent: Intent): void
  handleDisconnect(peerId: string): void
  /** Intent van de host zelf, zonder netwerk. */
  dispatchLocal(intent: Intent): void
  close(): void
}

export function createHostLoop(
  transport: HostTransport,
  hostProfile: PlayerProfile,
  onState: (state: GameState) => void,
  rng: DeckSource = cryptoDeckSource(),
  /** Ook de host-UI wil kaart-events en eigen ERRORs zien; broadcast bereikt hemzelf niet. */
  onEvent?: (event: GameEvent) => void,
  /** Startregels, bv. de onthouden huisregels van de host. */
  initialRules?: RuleConfig,
): HostLoop {
  let state = createGame(hostProfile, initialRules)
  const peerToPlayer = new Map<string, string>()
  const playerToPeer = new Map<string, string>()
  onState(state)

  function apply(cmd: Command, replyPeer: string | null): void {
    const result = reduce(state, cmd, rng)
    if (result.error) {
      if (replyPeer) transport.send(replyPeer, { t: 'ERROR', code: result.error })
      else onEvent?.({ t: 'ERROR', code: result.error })
      return
    }
    state = result.state
    for (const event of result.events) {
      const wire = toGameEvent(event, state.version)
      if (wire) {
        transport.broadcast(wire)
        onEvent?.(wire)
      }
    }
    transport.broadcast({ t: 'STATE', state })
    onState(state)
  }

  function handleIntent(peerId: string | null, intent: Intent): void {
    if (intent.t === 'JOIN') {
      if (peerId === null) return
      // De host-stoel is nooit via het netwerk te claimen, en een stoel die
      // nog live op een andere peer zit evenmin (anders kaapt een guest
      // andermans identiteit, inclusief host-only rechten). Is de oude
      // verbinding dood (page-reload), dan mag dezelfde speler overnemen.
      const claimedPeer = playerToPeer.get(intent.profile.id)
      if (
        intent.profile.id === state.hostId ||
        (claimedPeer && claimedPeer !== peerId && transport.isConnected(claimedPeer))
      ) {
        transport.send(peerId, { t: 'ERROR', code: 'ALREADY_JOINED' })
        return
      }
      if (claimedPeer && claimedPeer !== peerId) peerToPlayer.delete(claimedPeer)
      peerToPlayer.set(peerId, intent.profile.id)
      playerToPeer.set(intent.profile.id, peerId)
      if (state.players.some((p) => p.id === intent.profile.id)) {
        // Reconnect van een bekende speler: online markeren en resyncen.
        apply({ t: 'SET_CONNECTED', playerId: intent.profile.id, connected: true }, peerId)
        transport.send(peerId, { t: 'STATE', state })
        return
      }
      apply({ t: 'ADD_PLAYER', profile: intent.profile }, peerId)
      return
    }

    const playerId = peerId === null ? state.hostId : peerToPlayer.get(peerId)
    if (!playerId) {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'UNKNOWN_PLAYER' })
      return
    }

    if (intent.t === 'REQUEST_SYNC') {
      if (peerId) transport.send(peerId, { t: 'STATE', state })
      return
    }
    if (intent.t === 'LEAVE') {
      forgetPeer(playerId)
      if (state.phase === 'lobby') {
        apply({ t: 'REMOVE_PLAYER', playerId }, peerId)
      } else {
        // Midden in een potje kan een speler niet uit de state; offline markeren
        // zodat de host de beurt kan overslaan.
        apply({ t: 'SET_CONNECTED', playerId, connected: false }, peerId)
      }
      return
    }

    const hostOnly =
      intent.t === 'SET_RULES' ||
      intent.t === 'START_GAME' ||
      intent.t === 'END_GAME' ||
      intent.t === 'FORFEIT_TURN'
    if (hostOnly && playerId !== state.hostId) {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'NOT_YOUR_TURN' })
      return
    }

    if (intent.t === 'FORFEIT_TURN') {
      apply({ t: 'FORFEIT_TURN' }, peerId)
      return
    }

    const cmd = intentToCommand(intent, playerId)
    if (cmd) apply(cmd, peerId)
  }

  function handleDisconnect(peerId: string): void {
    const playerId = peerToPlayer.get(peerId)
    if (!playerId) return
    forgetPeer(playerId)
    if (state.phase === 'lobby') {
      // In de lobby is weg gewoon weg.
      apply({ t: 'REMOVE_PLAYER', playerId }, null)
    } else {
      // Midden in een potje: offline markeren; de speler kan terugkomen.
      apply({ t: 'SET_CONNECTED', playerId, connected: false }, null)
    }
  }

  function forgetPeer(playerId: string): void {
    const peerId = playerToPeer.get(playerId)
    if (peerId) peerToPlayer.delete(peerId)
    playerToPeer.delete(playerId)
  }

  return {
    get state() {
      return state
    },
    handleIntent,
    handleDisconnect,
    dispatchLocal: (intent) => handleIntent(null, intent),
    close: () => transport.close(),
  }
}

function intentToCommand(intent: Intent, playerId: string): Command | null {
  switch (intent.t) {
    case 'SET_RULES':
      return { t: 'SET_RULES', rules: intent.rules }
    case 'START_GAME':
      return { t: 'START_GAME' }
    case 'FLIP_CARD':
      return { t: 'FLIP_CARD', playerId }
    case 'ADD_TO_CUP':
      return { t: 'ADD_TO_CUP', playerId, amount: intent.amount }
    case 'SET_RULE':
      return { t: 'SET_RULE', playerId, text: intent.text }
    case 'END_GAME':
      return { t: 'END_GAME' }
    default:
      return null
  }
}

function toGameEvent(event: EngineEvent, version: number): GameEvent | null {
  switch (event.t) {
    case 'CARD_FLIPPED':
      return {
        t: 'CARD_EVENT',
        animId: String(version),
        kind: 'flip',
        card: event.card,
        animSeed: event.animSeed,
      }
    default:
      // Alle overige informatie zit al in de STATE-broadcast.
      return null
  }
}
