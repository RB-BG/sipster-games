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
  /** Ook de host-UI wil ROLL_EVENTs en eigen ERRORs zien; broadcast bereikt hemzelf niet. */
  onEvent?: (event: GameEvent) => void,
): HostLoop {
  let state = createGame(hostProfile)
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
      intent.t === 'NEXT_ROUND' ||
      intent.t === 'END_GAME' ||
      intent.t === 'FORFEIT_TURN'
    if (hostOnly && playerId !== state.hostId) {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'NOT_YOUR_TURN' })
      return
    }

    if (intent.t === 'FORFEIT_TURN') {
      if (state.turn) {
        apply({ t: 'FORFEIT_TURN', playerId: state.turn.playerId }, peerId)
      } else if (state.tiebreak) {
        // In de kamp: sla de eerstvolgende speler over die nog moet gooien.
        const pending = state.tiebreak.playerIds.find((id) => state.tiebreak?.rolls[id] === null)
        if (pending) apply({ t: 'FORFEIT_TURN', playerId: pending }, peerId)
      }
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
    case 'END_GAME':
      return { t: 'END_GAME' }
    case 'FLIP_65':
      return { t: 'FLIP_65', playerId }
    case 'AFSLAAN':
      return { t: 'AFSLAAN', playerId }
    default:
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
    case 'FLIPPED_65':
      return { t: 'FLIP_EVENT', playerId: event.playerId, values: event.values }
    case 'AFSLAAN':
      return { t: 'AFSLAAN_EVENT', byPlayerId: event.byPlayerId, verdict: event.verdict }
    default:
      // Alle overige informatie zit al in de STATE-broadcast.
      return null
  }
}
