// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'
import type {
  AfslaanVerdict,
  Command,
  ErrorCode,
  GameState,
  PlayerProfile,
  RuleConfig,
} from '@/engine/types'
import { useLocaleStore } from './localeStore'
import { loadRules, saveRules } from '@/lib/storage'
import { createHostLoop, type HostLoop } from '@/net/hostLoop'
import { createGuestTransport, createHostTransport } from '@/net/peerTransport'
import type { GuestStatus, GuestTransport } from '@/net/transport'
import type { GameEvent, Intent } from '@/protocol/messages'
import type { FlipAnim, RollAnim } from './gameStore'

export interface AfslaanToast {
  id: number
  byPlayerId: string
  verdict: AfslaanVerdict
}

// Verbindingen zijn niet-serialiseerbaar; buiten de zustand-state houden.
let hostLoop: HostLoop | null = null
let guestTransport: GuestTransport | null = null
let visibilityHandler: (() => void) | null = null
let animCounter = 0
// Dubbel-tik-bescherming voor guests: het rondje naar de host duurt even.
let pendingRoll = false
let pendingRollTimer: number | null = null
let lastAfslaanAt = 0
// Rejoin na een page-reload: de host kan de oude verbinding nog open hebben.
let joinProfile: PlayerProfile | null = null
let joinRetries = 0
const FLIP_SETTLE_MS = 450
let flipTimer: number | null = null

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
  rollAnim: RollAnim | null
  flipAnim: FlipAnim | null
  afslaanToast: AfslaanToast | null
  hostLobby(profile: PlayerProfile): Promise<void>
  joinLobby(roomCode: string, profile: PlayerProfile): Promise<void>
  sendIntent(intent: Intent): void
  sendCommand(cmd: Command): void
  setRules(rules: RuleConfig): void
  onRollSettled(): void
  leave(): void
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
      case 'ROLL_EVENT':
        clearPendingRoll()
        set({
          rollAnim: {
            id: ++animCounter,
            dieIds: event.dieIds,
            values: event.values,
            animSeed: event.animSeed,
          },
          animating: true,
        })
        break
      case 'TIEBREAK_ROLL_EVENT':
        clearPendingRoll()
        set({
          rollAnim: {
            id: ++animCounter,
            dieIds: [0],
            values: [event.value],
            animSeed: event.animSeed,
            single: true,
          },
          animating: true,
        })
        break
      case 'FLIP_EVENT':
        // De flip is een korte animatie zonder settle-callback: timer rondt af.
        set({
          flipAnim: { id: ++animCounter, values: [event.values[0], event.values[1]] },
          animating: true,
        })
        if (flipTimer !== null) window.clearTimeout(flipTimer)
        flipTimer = window.setTimeout(() => get().onRollSettled(), FLIP_SETTLE_MS)
        break
      case 'AFSLAAN_EVENT':
        set({
          afslaanToast: { id: ++animCounter, byPlayerId: event.byPlayerId, verdict: event.verdict },
        })
        break
      case 'ERROR':
        // Een afgewezen worp mag de optimistische animating-blokkade niet laten hangen.
        if (pendingRoll) {
          clearPendingRoll()
          set({ lastError: event.code, animating: false })
        } else {
          set({ lastError: event.code })
        }
        // Rejoin-race na een reload: de host ziet onze oude verbinding nog open.
        // Even wachten en opnieuw joinen; na een paar seconden is die stale close verwerkt.
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

  function clearPendingRoll() {
    pendingRoll = false
    if (pendingRollTimer !== null) {
      window.clearTimeout(pendingRollTimer)
      pendingRollTimer = null
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
    rollAnim: null,
    flipAnim: null,
    afslaanToast: null,

    hostLobby: async (profile) => {
      set({ status: 'connecting', netError: null })
      try {
        const transport = await createHostTransport({
          onIntent: (peerId, intent) => hostLoop?.handleIntent(peerId, intent),
          onGuestDisconnect: (peerId) => hostLoop?.handleDisconnect(peerId),
        })
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
        set({ status: 'idle', netError: useLocaleStore.getState().strings.net.hostFailed })
      }
    },

    joinLobby: async (roomCode, profile) => {
      set({ status: 'connecting', netError: null })
      try {
        const code = roomCode.trim().toUpperCase()
        joinProfile = profile
        joinRetries = 0
        guestTransport = await createGuestTransport(code, {
          onOpen: () => guestTransport?.sendIntent({ t: 'JOIN', profile }),
          onEvent: handleGameEvent,
          onStatus: (status) => {
            set({ status })
            if (status === 'closed') set({ netError: useLocaleStore.getState().strings.net.tableClosed })
          },
        })
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

      if (cmd.t === 'ROLL' || cmd.t === 'TIEBREAK_ROLL') {
        if (get().animating || pendingRoll) return
        // Optimistisch blokkeren tot het ROLL_EVENT (of een ERROR) terugkomt;
        // de timeout is het vangnet als de host nooit antwoordt. Ruim genoeg
        // dat een trage host niet tot een dubbele worp verleidt, en met een
        // resync zodat de knop pas na verse state weer vrijkomt.
        pendingRoll = true
        set({ animating: true, lastError: null })
        pendingRollTimer = window.setTimeout(() => {
          if (!pendingRoll) return
          pendingRoll = false
          pendingRollTimer = null
          set({ animating: false })
          get().sendIntent({ t: 'REQUEST_SYNC' })
        }, 8000)
        get().sendIntent(intent)
        return
      }

      if (cmd.t === 'AFSLAAN') {
        // Eén fysieke klap = één intent; een trillende dubbel-tik zou de
        // terechte afslager meteen een onterechte tweede klap bezorgen.
        const now = performance.now()
        if (now - lastAfslaanAt < 1200) return
        lastAfslaanAt = now
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
      clearPendingRoll()
      if (flipTimer !== null) {
        window.clearTimeout(flipTimer)
        flipTimer = null
      }
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
        rollAnim: null,
        flipAnim: null,
        afslaanToast: null,
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
    case 'ROLL':
      return { t: 'ROLL' }
    case 'HOLD_DIE':
      return { t: 'HOLD_DIE', dieId: cmd.dieId }
    case 'PICKUP_DIE':
      return { t: 'PICKUP_DIE', dieId: cmd.dieId }
    case 'END_TURN':
      return { t: 'END_TURN' }
    case 'GIVE_SIPS_31':
      return { t: 'GIVE_SIPS_31', targetPlayerId: cmd.targetPlayerId }
    case 'TIEBREAK_ROLL':
      return { t: 'TIEBREAK_ROLL' }
    case 'NEXT_ROUND':
      return { t: 'NEXT_ROUND' }
    case 'END_GAME':
      return { t: 'END_GAME' }
    case 'FORFEIT_TURN':
      return { t: 'FORFEIT_TURN' }
    default:
      return null
  }
}
