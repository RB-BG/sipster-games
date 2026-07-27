// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'
import type { Command, ErrorCode, GameState, PlayerProfile, RuleConfig } from '@/engine/types'
import { useLocaleStore } from './localeStore'
import { loadRules, saveRules } from '@/lib/storage'
import { createHostLoop, type HostLoop } from '@/net/hostLoop'
import { createGuestTransport, createHostTransport } from '@/net/peerTransport'
import type { GuestStatus, GuestTransport } from '@/net/transport'
import type { GameEvent, Intent } from '@/protocol/messages'
import type { CardAnim } from './gameStore'

// Verbindingen zijn niet-serialiseerbaar; buiten de zustand-state houden.
let hostLoop: HostLoop | null = null
let guestTransport: GuestTransport | null = null
let visibilityHandler: (() => void) | null = null
let animCounter = 0
// Dubbel-tik-bescherming voor guests: het rondje naar de host duurt even.
let pendingAction = false
let pendingActionTimer: number | null = null
// Rejoin na een page-reload: de host kan de oude verbinding nog open hebben.
let joinProfile: PlayerProfile | null = null
let joinRetries = 0
// Annulering: terug tikken tijdens 'connecting' verhoogt de teller, waarna een
// laat resolvend transport meteen wordt gesloten in plaats van de lobby te openen.
let connectGeneration = 0

interface NetStore {
  role: 'none' | 'host' | 'guest'
  status: GuestStatus | 'idle'
  roomCode: string | null
  netState: GameState | null
  /** Wat de game-UI rendert: loopt één animatie achter zodat niets verklapt wordt. */
  viewState: GameState | null
  /** Verbindingsfouten, al vertaald. */
  netError: string | null
  /** Afgewezen game-acties (engine ErrorCode). */
  lastError: ErrorCode | null
  myPlayerId: string | null
  animating: boolean
  cardAnim: CardAnim | null
  hostLobby(profile: PlayerProfile): Promise<void>
  joinLobby(roomCode: string, profile: PlayerProfile): Promise<void>
  sendIntent(intent: Intent): void
  sendCommand(cmd: Command): void
  setRules(rules: RuleConfig): void
  onRollSettled(): void
  leave(): void
}

/** Commands die een kaart-reveal (en dus een animatie) uitlokken. */
function triggersReveal(cmd: Command): boolean {
  return cmd.t === 'FLIP_CARD'
}

export const useNetStore = create<NetStore>((set, get) => {
  function handleGameEvent(event: GameEvent) {
    switch (event.t) {
      case 'STATE':
        set({
          netState: event.state,
          // Tijdens een animatie blijft de weergave op de oude stand hangen.
          viewState: get().animating ? (get().viewState ?? event.state) : event.state,
        })
        break
      case 'CARD_EVENT':
        clearPendingAction()
        set({
          cardAnim: {
            id: ++animCounter,
            kind: event.kind,
            card: event.card,
            animSeed: event.animSeed,
          },
          animating: true,
        })
        break
      case 'ERROR':
        // Een afgewezen actie mag de optimistische animating-blokkade niet laten hangen.
        if (pendingAction) {
          clearPendingAction()
          set({ lastError: event.code, animating: false })
        } else {
          set({ lastError: event.code })
        }
        // Rejoin-race na een reload: de host ziet onze oude verbinding nog open.
        if (event.code === 'ALREADY_JOINED' && get().netState === null && joinRetries < 3) {
          joinRetries++
          window.setTimeout(() => {
            if (get().role === 'guest' && get().netState === null && joinProfile) {
              guestTransport?.sendIntent({ t: 'JOIN', profile: joinProfile })
            }
          }, 4000)
        }
        break
    }
  }

  function clearPendingAction() {
    pendingAction = false
    if (pendingActionTimer !== null) {
      window.clearTimeout(pendingActionTimer)
      pendingActionTimer = null
    }
  }

  return {
    role: 'none',
    status: 'idle',
    roomCode: null,
    netState: null,
    viewState: null,
    netError: null,
    lastError: null,
    myPlayerId: null,
    animating: false,
    cardAnim: null,

    hostLobby: async (profile) => {
      const gen = ++connectGeneration
      set({ status: 'connecting', netError: null })
      try {
        const transport = await createHostTransport({
          onIntent: (peerId, intent) => hostLoop?.handleIntent(peerId, intent),
          onGuestDisconnect: (peerId) => hostLoop?.handleDisconnect(peerId),
        })
        if (gen !== connectGeneration) {
          // Geannuleerd (terug getikt): roomcode weer vrijgeven.
          transport.close()
          return
        }
        hostLoop = createHostLoop(
          transport,
          profile,
          (state) =>
            set({
              netState: state,
              viewState: get().animating ? (get().viewState ?? state) : state,
            }),
          undefined,
          handleGameEvent,
          // De huisregels van het vorige potje als startpunt van de lobby.
          loadRules(),
        )
        set({ role: 'host', status: 'open', roomCode: transport.roomCode, myPlayerId: profile.id })
      } catch {
        if (gen !== connectGeneration) return
        set({ status: 'idle', netError: useLocaleStore.getState().strings.net.hostFailed })
      }
    },

    joinLobby: async (roomCode, profile) => {
      const gen = ++connectGeneration
      set({ status: 'connecting', netError: null })
      try {
        const code = roomCode.trim().toUpperCase()
        joinProfile = profile
        joinRetries = 0
        const transport = await createGuestTransport(code, {
          onOpen: () => guestTransport?.sendIntent({ t: 'JOIN', profile }),
          onEvent: handleGameEvent,
          onStatus: (status) => {
            set({ status })
            if (status === 'closed') set({ netError: useLocaleStore.getState().strings.net.tableClosed })
          },
        })
        if (gen !== connectGeneration) {
          // Geannuleerd (terug getikt): de verbinding niet alsnog aannemen.
          transport.close()
          return
        }
        guestTransport = transport
        // Terug uit de achtergrond (scherm uit, tab-wissel): altijd even resyncen.
        visibilityHandler = () => {
          if (document.visibilityState === 'visible') {
            guestTransport?.sendIntent({ t: 'REQUEST_SYNC' })
          }
        }
        document.addEventListener('visibilitychange', visibilityHandler)
        // De uitnodigings-parameter is verbruikt; anders bounce je bij terug/verlaten
        // steeds opnieuw het join-formulier in.
        stripRoomParam()
        set({ role: 'guest', roomCode: code, myPlayerId: profile.id })
      } catch {
        if (gen !== connectGeneration) return
        set({ status: 'idle', netError: useLocaleStore.getState().strings.net.joinFailed })
      }
    },

    sendIntent: (intent) => {
      if (get().role === 'host') hostLoop?.dispatchLocal(intent)
      else guestTransport?.sendIntent(intent)
    },

    sendCommand: (cmd) => {
      const intent = commandToIntent(cmd)
      if (!intent) return

      if (triggersReveal(cmd)) {
        if (get().animating || pendingAction) return
        // Optimistisch blokkeren tot het CARD_EVENT (of een ERROR) terugkomt;
        // de timeout is het vangnet als de host nooit antwoordt.
        pendingAction = true
        set({ animating: true, lastError: null })
        pendingActionTimer = window.setTimeout(() => {
          if (!pendingAction) return
          pendingAction = false
          pendingActionTimer = null
          set({ animating: false })
          get().sendIntent({ t: 'REQUEST_SYNC' })
        }, 8000)
        get().sendIntent(intent)
        return
      }

      set({ lastError: null })
      get().sendIntent(intent)
    },

    setRules: (rules) => {
      saveRules(rules)
      get().sendIntent({ t: 'SET_RULES', rules })
    },

    onRollSettled: () => set({ animating: false, viewState: get().netState }),

    leave: () => {
      connectGeneration++
      clearPendingAction()
      joinProfile = null
      if (get().role === 'guest') guestTransport?.sendIntent({ t: 'LEAVE' })
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler)
        visibilityHandler = null
      }
      guestTransport?.close()
      hostLoop?.close()
      guestTransport = null
      hostLoop = null
      set({
        role: 'none',
        status: 'idle',
        roomCode: null,
        netState: null,
        viewState: null,
        netError: null,
        lastError: null,
        myPlayerId: null,
        animating: false,
        cardAnim: null,
      })
    },
  }
})

/** Haal ?room= uit de URL zonder navigatie; de invite is verbruikt. */
function stripRoomParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('room')) return
  url.searchParams.delete('room')
  window.history.replaceState(null, '', url)
}

/** UI spreekt in Commands; op het netwerk gaan Intents (host bepaalt de speler-id). */
function commandToIntent(cmd: Command): Intent | null {
  switch (cmd.t) {
    case 'SET_RULES':
      return { t: 'SET_RULES', rules: cmd.rules }
    case 'START_GAME':
      return { t: 'START_GAME' }
    case 'FLIP_CARD':
      return { t: 'FLIP_CARD' }
    case 'ADD_TO_CUP':
      return { t: 'ADD_TO_CUP', amount: cmd.amount }
    case 'SET_RULE':
      return { t: 'SET_RULE', text: cmd.text }
    case 'ADD_SIPS':
      return { t: 'ADD_SIPS', targetPlayerId: cmd.targetPlayerId, amount: cmd.amount }
    case 'FORFEIT_TURN':
      return { t: 'FORFEIT_TURN' }
    case 'END_GAME':
      return { t: 'END_GAME' }
    default:
      return null
  }
}
