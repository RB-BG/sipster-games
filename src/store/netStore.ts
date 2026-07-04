import { create } from 'zustand'
import type { Command, ErrorCode, GameState, PlayerProfile, RuleConfig } from '@/engine/types'
import { strings } from '@/i18n/strings'
import { createHostLoop, type HostLoop } from '@/net/hostLoop'
import { createGuestTransport, createHostTransport } from '@/net/peerTransport'
import type { GuestStatus, GuestTransport } from '@/net/transport'
import type { GameEvent, Intent } from '@/protocol/messages'
import type { RollAnim } from './gameStore'

// Verbindingen zijn niet-serialiseerbaar; buiten de zustand-state houden.
let hostLoop: HostLoop | null = null
let guestTransport: GuestTransport | null = null
let visibilityHandler: (() => void) | null = null
let animCounter = 0

interface NetStore {
  role: 'none' | 'host' | 'guest'
  status: GuestStatus | 'idle'
  roomCode: string | null
  netState: GameState | null
  /** Verbindingsfouten, al vertaald. */
  netError: string | null
  /** Afgewezen game-acties (engine ErrorCode). */
  lastError: ErrorCode | null
  myPlayerId: string | null
  animating: boolean
  rollAnim: RollAnim | null
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
        set({ netState: event.state })
        break
      case 'ROLL_EVENT':
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
        set({
          rollAnim: { id: ++animCounter, dieIds: [0], values: [event.value], animSeed: event.animSeed },
          animating: true,
        })
        break
      case 'ERROR':
        set({ lastError: event.code })
        break
    }
  }

  return {
    role: 'none',
    status: 'idle',
    roomCode: null,
    netState: null,
    netError: null,
    lastError: null,
    myPlayerId: null,
    animating: false,
    rollAnim: null,

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
          (state) => set({ netState: state }),
          undefined,
          handleGameEvent,
        )
        set({ role: 'host', status: 'open', roomCode: transport.roomCode, myPlayerId: profile.id })
      } catch {
        set({ status: 'idle', netError: strings.net.hostFailed })
      }
    },

    joinLobby: async (roomCode, profile) => {
      set({ status: 'connecting', netError: null })
      try {
        const code = roomCode.trim().toUpperCase()
        guestTransport = await createGuestTransport(code, {
          onOpen: () => guestTransport?.sendIntent({ t: 'JOIN', profile }),
          onEvent: handleGameEvent,
          onStatus: (status) => {
            set({ status })
            if (status === 'closed') set({ netError: strings.net.tableClosed })
          },
        })
        // Terug uit de achtergrond (scherm uit, tab-wissel): altijd even resyncen.
        visibilityHandler = () => {
          if (document.visibilityState === 'visible') {
            guestTransport?.sendIntent({ t: 'REQUEST_SYNC' })
          }
        }
        document.addEventListener('visibilitychange', visibilityHandler)
        set({ role: 'guest', roomCode: code, myPlayerId: profile.id })
      } catch {
        set({ status: 'idle', netError: strings.net.joinFailed })
      }
    },

    sendIntent: (intent) => {
      if (get().role === 'host') hostLoop?.dispatchLocal(intent)
      else guestTransport?.sendIntent(intent)
    },

    sendCommand: (cmd) => {
      const intent = commandToIntent(cmd)
      if (!intent) return
      set({ lastError: null })
      get().sendIntent(intent)
    },

    setRules: (rules) => get().sendIntent({ t: 'SET_RULES', rules }),

    onRollSettled: () => set({ animating: false }),

    leave: () => {
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
        netError: null,
        lastError: null,
        myPlayerId: null,
        animating: false,
        rollAnim: null,
      })
    },
  }
})

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
    case 'FORFEIT_TURN':
      return { t: 'FORFEIT_TURN' }
    default:
      return null
  }
}
