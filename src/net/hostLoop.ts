import { createGame, reduce } from '@/engine/reducer'
import { cryptoRollSource, type RollSource } from '@/engine/rng'
import type { Command, EngineEvent, GameState, PlayerProfile } from '@/engine/types'
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
  rng: RollSource = cryptoRollSource(),
): HostLoop {
  let state = createGame(hostProfile)
  const peerToPlayer = new Map<string, string>()
  const playerToPeer = new Map<string, string>()
  onState(state)

  function apply(cmd: Command, replyPeer: string | null): void {
    const result = reduce(state, cmd, rng)
    if (result.error) {
      if (replyPeer) transport.send(replyPeer, { t: 'ERROR', code: result.error })
      return
    }
    state = result.state
    for (const event of result.events) {
      const wire = toGameEvent(event, state.version)
      if (wire) transport.broadcast(wire)
    }
    transport.broadcast({ t: 'STATE', state })
    onState(state)
  }

  function handleIntent(peerId: string | null, intent: Intent): void {
    if (intent.t === 'JOIN') {
      if (peerId === null) return
      peerToPlayer.set(peerId, intent.profile.id)
      playerToPeer.set(intent.profile.id, peerId)
      if (state.players.some((p) => p.id === intent.profile.id)) {
        // Reconnect van een bekende speler: alleen resyncen.
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
      apply({ t: 'REMOVE_PLAYER', playerId }, peerId)
      return
    }

    const hostOnly = intent.t === 'SET_RULES' || intent.t === 'START_GAME' || intent.t === 'NEXT_ROUND'
    if (hostOnly && playerId !== state.hostId) {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'NOT_YOUR_TURN' })
      return
    }

    const cmd = intentToCommand(intent, playerId)
    if (cmd) apply(cmd, peerId)
  }

  function handleDisconnect(peerId: string): void {
    const playerId = peerToPlayer.get(peerId)
    if (!playerId) return
    forgetPeer(playerId)
    // In de lobby is weg gewoon weg; midden in een potje volgt reconnect (chunk 6).
    if (state.phase === 'lobby') apply({ t: 'REMOVE_PLAYER', playerId }, null)
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
    case 'ROLL':
      return { t: 'ROLL', playerId }
    case 'HOLD_DIE':
      return { t: 'HOLD_DIE', playerId, dieId: intent.dieId }
    case 'PICKUP_DIE':
      return { t: 'PICKUP_DIE', playerId, dieId: intent.dieId }
    case 'END_TURN':
      return { t: 'END_TURN', playerId }
    case 'GIVE_SIPS_31':
      return { t: 'GIVE_SIPS_31', playerId, targetPlayerId: intent.targetPlayerId }
    case 'TIEBREAK_ROLL':
      return { t: 'TIEBREAK_ROLL', playerId }
    case 'NEXT_ROUND':
      return { t: 'NEXT_ROUND' }
    default:
      // AFSLAAN en FLIP_65 volgen met de extra rulesets (chunk 7).
      return null
  }
}

function toGameEvent(event: EngineEvent, version: number): GameEvent | null {
  switch (event.t) {
    case 'DICE_ROLLED':
      return {
        t: 'ROLL_EVENT',
        rollId: String(version),
        playerId: event.playerId,
        dieIds: event.dieIds,
        values: event.values,
        animSeed: event.animSeed,
      }
    case 'TIEBREAK_ROLLED':
      return {
        t: 'TIEBREAK_ROLL_EVENT',
        playerId: event.playerId,
        value: event.value,
        animSeed: event.animSeed,
      }
    default:
      // Alle overige informatie zit al in de STATE-broadcast.
      return null
  }
}
