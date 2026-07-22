// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { cryptoDeckSource, type DeckSource } from '@/engine/deck'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, EngineEvent, GameState, PlayerProfile, RuleConfig } from '@/engine/types'
import type { GameEvent, Intent } from '@/protocol/messages'
import type { HostTransport } from './transport'

const MAX_NAME_LENGTH = 24
const MAX_EMOJI_LENGTH = 16

/**
 * Vorm-check op berichten van buiten: de engine gaat uit van welgevormde
 * commands, dus een handgemaakt bericht met verkeerde veldtypes moet hier
 * stranden in plaats van als TypeError in de reducer.
 */
function wellFormed(intent: Intent): boolean {
  switch (intent.t) {
    case 'JOIN':
      return (
        typeof intent.profile === 'object' &&
        intent.profile !== null &&
        typeof intent.profile.id === 'string' &&
        intent.profile.id.length > 0 &&
        intent.profile.id.length <= 64 &&
        typeof intent.profile.name === 'string' &&
        typeof intent.profile.emoji === 'string'
      )
    case 'SET_RULES':
      return (
        typeof intent.rules === 'object' &&
        intent.rules !== null &&
        Number.isInteger(intent.rules.standaardSlokken)
      )
    case 'ADD_TO_CUP':
      return Number.isInteger(intent.amount)
    case 'SET_RULE':
      return typeof intent.text === 'string'
    case 'ADD_SIPS':
      return typeof intent.targetPlayerId === 'string' && Number.isInteger(intent.amount)
    case 'LEAVE':
    case 'START_GAME':
    case 'FLIP_CARD':
    case 'FORFEIT_TURN':
    case 'END_GAME':
    case 'REQUEST_SYNC':
      return true
    default:
      // Onbekend berichttype: weigeren.
      return false
  }
}

/** Neemt alleen de verwachte profielvelden over, met naam- en emoji-cap. */
function sanitizeProfile(profile: PlayerProfile): PlayerProfile {
  return {
    id: profile.id,
    name: profile.name.trim().slice(0, MAX_NAME_LENGTH),
    emoji: profile.emoji.slice(0, MAX_EMOJI_LENGTH),
  }
}

/**
 * Wat guests te zien krijgen: zonder de nog te trekken kaarten, anders leest
 * een guest met devtools de komende koningen uit. De host houdt de volledige state.
 */
export function publicState(state: GameState): GameState {
  const pub = structuredClone(state)
  pub.deck = []
  pub.drawIndex = 0
  return pub
}

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
    transport.broadcast({ t: 'STATE', state: publicState(state) })
    onState(state)
  }

  function handleIntent(peerId: string | null, intent: Intent): void {
    // Een malformed of onverwacht bericht mag de host-loop nooit slopen:
    // weigeren met een nette ERROR in plaats van een uncaught exception
    // in de transport-datahandler.
    try {
      if (peerId !== null && !wellFormed(intent)) {
        transport.send(peerId, { t: 'ERROR', code: 'MALFORMED' })
        return
      }
      handle(peerId, intent)
    } catch {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'MALFORMED' })
    }
  }

  function handle(peerId: string | null, intent: Intent): void {
    if (intent.t === 'JOIN') {
      if (peerId === null) return
      const profile = sanitizeProfile(intent.profile)
      // De host-stoel is nooit via het netwerk te claimen, en een stoel die
      // nog live op een andere peer zit evenmin (anders kaapt een guest
      // andermans identiteit, inclusief host-only rechten). Is de oude
      // verbinding dood (page-reload), dan mag dezelfde speler overnemen.
      // Eén stoel per peer: een tweede JOIN met een andere id is spam.
      const existing = peerToPlayer.get(peerId)
      const claimedPeer = playerToPeer.get(profile.id)
      if (
        profile.id === state.hostId ||
        (existing && existing !== profile.id) ||
        (claimedPeer && claimedPeer !== peerId && transport.isConnected(claimedPeer))
      ) {
        transport.send(peerId, { t: 'ERROR', code: 'ALREADY_JOINED' })
        return
      }
      if (state.players.some((p) => p.id === profile.id)) {
        // Reconnect van een bekende speler: online markeren en resyncen.
        if (claimedPeer && claimedPeer !== peerId) peerToPlayer.delete(claimedPeer)
        peerToPlayer.set(peerId, profile.id)
        playerToPeer.set(profile.id, peerId)
        apply({ t: 'SET_CONNECTED', playerId: profile.id, connected: true }, peerId)
        transport.send(peerId, { t: 'STATE', state: publicState(state) })
        return
      }
      // Nieuwe speler: pas na een geslaagde ADD_PLAYER mappen, anders blijft
      // een afgewezen joiner (bv. mid-game) spook-gemapt: hij zou state
      // kunnen opvragen en zijn latere disconnect vuurt een spook-error.
      const before = state
      apply({ t: 'ADD_PLAYER', profile }, peerId)
      if (state !== before) {
        peerToPlayer.set(peerId, profile.id)
        playerToPeer.set(profile.id, peerId)
      }
      return
    }

    const playerId = peerId === null ? state.hostId : peerToPlayer.get(peerId)
    if (!playerId) {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'UNKNOWN_PLAYER' })
      return
    }

    if (intent.t === 'REQUEST_SYNC') {
      if (peerId) transport.send(peerId, { t: 'STATE', state: publicState(state) })
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

    // Slokken uitdelen mag alleen de actieve speler (de draaier) of de host,
    // zodat een willekeurige guest niet stiekem andermans totaal opdrijft.
    if (
      intent.t === 'ADD_SIPS' &&
      playerId !== state.hostId &&
      playerId !== state.turn?.playerId
    ) {
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
    case 'ADD_SIPS':
      return { t: 'ADD_SIPS', targetPlayerId: intent.targetPlayerId, amount: intent.amount }
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
