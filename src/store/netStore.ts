import { create } from 'zustand'
import type { GameState, PlayerProfile, RuleConfig } from '@/engine/types'
import { strings } from '@/i18n/strings'
import { createHostLoop, type HostLoop } from '@/net/hostLoop'
import { createGuestTransport, createHostTransport } from '@/net/peerTransport'
import type { GuestStatus, GuestTransport } from '@/net/transport'
import type { Intent } from '@/protocol/messages'

// Verbindingen zijn niet-serialiseerbaar; buiten de zustand-state houden.
let hostLoop: HostLoop | null = null
let guestTransport: GuestTransport | null = null

interface NetStore {
  role: 'none' | 'host' | 'guest'
  status: GuestStatus | 'idle'
  roomCode: string | null
  netState: GameState | null
  netError: string | null
  myPlayerId: string | null
  hostLobby(profile: PlayerProfile): Promise<void>
  joinLobby(roomCode: string, profile: PlayerProfile): Promise<void>
  sendIntent(intent: Intent): void
  setRules(rules: RuleConfig): void
  leave(): void
}

export const useNetStore = create<NetStore>((set, get) => ({
  role: 'none',
  status: 'idle',
  roomCode: null,
  netState: null,
  netError: null,
  myPlayerId: null,

  hostLobby: async (profile) => {
    set({ status: 'connecting', netError: null })
    try {
      const transport = await createHostTransport({
        onIntent: (peerId, intent) => hostLoop?.handleIntent(peerId, intent),
        onGuestDisconnect: (peerId) => hostLoop?.handleDisconnect(peerId),
      })
      hostLoop = createHostLoop(transport, profile, (state) => set({ netState: state }))
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
        onEvent: (event) => {
          if (event.t === 'STATE') set({ netState: event.state })
          else if (event.t === 'ERROR') set({ netError: strings.errors[event.code] })
        },
        onStatus: (status) => {
          set({ status })
          if (status === 'closed') set({ netError: strings.net.tableClosed })
        },
      })
      set({ role: 'guest', roomCode: code, myPlayerId: profile.id })
    } catch {
      set({ status: 'idle', netError: strings.net.joinFailed })
    }
  },

  sendIntent: (intent) => {
    if (get().role === 'host') hostLoop?.dispatchLocal(intent)
    else guestTransport?.sendIntent(intent)
  },

  setRules: (rules) => get().sendIntent({ t: 'SET_RULES', rules }),

  leave: () => {
    if (get().role === 'guest') guestTransport?.sendIntent({ t: 'LEAVE' })
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
      myPlayerId: null,
    })
  },
}))
