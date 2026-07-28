// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { cryptoDeckSource, type DeckSource } from '@/engine/deck'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, GameState, PlayerProfile, RuleConfig } from '@/engine/types'
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
        Number.isInteger(intent.rules.handSize) &&
        Number.isInteger(intent.rules.yousefMax) &&
        typeof intent.rules.jokerWildcard === 'boolean' &&
        typeof intent.rules.assafEveryoneScores === 'boolean' &&
        Number.isInteger(intent.rules.bakThreshold)
      )
    case 'PLAY_TURN':
      return (
        Array.isArray(intent.discard) &&
        intent.discard.every(isWellFormedCard) &&
        (intent.drawFrom === 'deck' || intent.drawFrom === 'discard')
      )
    case 'LEAVE':
    case 'START_GAME':
    case 'CALL_YOUSEF':
    case 'DRAW_BAK':
    case 'BUY_OFF':
    case 'NEXT_ROUND':
    case 'FORFEIT_TURN':
    case 'END_GAME':
    case 'REQUEST_SYNC':
      return true
    default:
      // Onbekend berichttype: weigeren.
      return false
  }
}

/** Vorm-check op één kaart uit een afleg-groep (een normale kaart of een joker). */
function isWellFormedCard(c: unknown): boolean {
  if (typeof c !== 'object' || c === null) return false
  const card = c as { kind?: unknown; suit?: unknown; rank?: unknown; jid?: unknown }
  if (card.kind === 'joker') return Number.isInteger(card.jid)
  return card.kind === 'card' && typeof card.suit === 'string' && Number.isInteger(card.rank)
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
 * een guest met devtools de komende deck-volgorde uit. De host houdt de volledige state.
 */
export function publicState(state: GameState): GameState {
  const pub = structuredClone(state)
  pub.deck = []
  pub.drawIndex = 0
  return pub
}

/**
 * De state zoals speler `viewerId` hem mag zien: de deck verborgen, en tijdens
 * het spelen andermans hand vervangen door alleen een kaart-aantal. Zo lekt geen
 * enkele guest andermans kaarten. Bij het ronde-einde (open handen) en het einde
 * blijven alle handen zichtbaar zodat iedereen de uitslag ziet.
 */
export function stateFor(state: GameState, viewerId: string): GameState {
  const view = publicState(state)
  if (state.phase !== 'playing') return view
  for (const player of view.players) {
    if (player.id === viewerId) continue
    player.handCount = player.hand.length
    player.hand = []
  }
  return view
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
  onState(stateFor(state, state.hostId))

  /**
   * Stuur elke ontvanger zijn eigen kijk op de state (eigen hand volledig,
   * andermans hand verborgen). Per-peer i.p.v. één broadcast, want in Yousef is
   * elke hand geheim. De host krijgt zijn kijk via onState.
   */
  function broadcastState(): void {
    for (const [peerId, playerId] of peerToPlayer) {
      transport.send(peerId, { t: 'STATE', state: stateFor(state, playerId) })
    }
    onState(stateFor(state, state.hostId))
  }

  function apply(cmd: Command, replyPeer: string | null): void {
    const result = reduce(state, cmd, rng)
    if (result.error) {
      if (replyPeer) transport.send(replyPeer, { t: 'ERROR', code: result.error })
      else onEvent?.({ t: 'ERROR', code: result.error })
      return
    }
    state = result.state
    // Kaart-reveal-events (voor animatie) komen in chunk 5; nu draagt de
    // STATE per ontvanger alle zichtbare informatie.
    broadcastState()
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
        // apply -> broadcastState stuurt deze (nu gemapte) peer meteen zijn eigen kijk.
        apply({ t: 'SET_CONNECTED', playerId: profile.id, connected: true }, peerId)
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
        // Pas na het mappen: stuur de nieuwe speler zijn eigen kijk op de state
        // (broadcastState tijdens apply bereikte hem nog niet).
        transport.send(peerId, { t: 'STATE', state: stateFor(state, profile.id) })
      }
      return
    }

    const playerId = peerId === null ? state.hostId : peerToPlayer.get(peerId)
    if (!playerId) {
      if (peerId) transport.send(peerId, { t: 'ERROR', code: 'UNKNOWN_PLAYER' })
      return
    }

    if (intent.t === 'REQUEST_SYNC') {
      if (peerId) transport.send(peerId, { t: 'STATE', state: stateFor(state, playerId) })
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
      intent.t === 'NEXT_ROUND' ||
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
    case 'PLAY_TURN':
      return { t: 'PLAY_TURN', playerId, discard: intent.discard, drawFrom: intent.drawFrom }
    case 'CALL_YOUSEF':
      return { t: 'CALL_YOUSEF', playerId }
    case 'DRAW_BAK':
      return { t: 'DRAW_BAK', playerId }
    case 'BUY_OFF':
      return { t: 'BUY_OFF', playerId }
    case 'NEXT_ROUND':
      return { t: 'NEXT_ROUND' }
    case 'END_GAME':
      return { t: 'END_GAME' }
    default:
      return null
  }
}
