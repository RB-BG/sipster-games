// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'
import { cryptoDeckSource } from '@/engine/deck'
import { createGame, reduce } from '@/engine/reducer'
import type { Command, ErrorCode, GameState, HandCard, PlayerProfile, RuleConfig } from '@/engine/types'
import type { CardAnimKind } from '@/protocol/messages'

/** Kaart-animatie voor de Card-component; landt op de host-authoritative kaart. */
export interface CardAnim {
  id: number
  kind: CardAnimKind
  card: HandCard
  animSeed: number
}

export type Screen = 'home' | 'setup' | 'host' | 'join' | 'rules'

interface GameStore {
  state: GameState | null
  /**
   * Wat de UI rendert: loopt één animatie achter op `state`, zodat overlays en
   * de meter de uitslag niet verklappen terwijl de kaart nog draait.
   */
  viewState: GameState | null
  screen: Screen
  /** true zolang de kaart-flip nog speelt; UI verklapt de uitslag dan nog niet. */
  animating: boolean
  cardAnim: CardAnim | null
  lastError: ErrorCode | null
  setScreen: (screen: Screen) => void
  startHotseat: (profiles: PlayerProfile[], rules: RuleConfig) => void
  dispatch: (cmd: Command) => void
  onRollSettled: () => void
  reset: () => void
}

// Hotseat: dit toestel is de host, dus de crypto-bron mag hier draaien.
const rng = cryptoDeckSource()

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  viewState: null,
  screen: 'home',
  animating: false,
  cardAnim: null,
  lastError: null,

  setScreen: (screen) => set({ screen }),

  startHotseat: (profiles, rules) => {
    let state = createGame(profiles[0], rules)
    for (const profile of profiles.slice(1)) {
      state = reduce(state, { t: 'ADD_PLAYER', profile }, rng).state
    }
    state = reduce(state, { t: 'START_GAME' }, rng).state
    set({
      state,
      viewState: state,
      animating: false,
      cardAnim: null,
      lastError: null,
    })
  },

  dispatch: (cmd) => {
    const { state } = get()
    if (!state) return
    const result = reduce(state, cmd, rng)
    if (result.error) {
      set({ lastError: result.error })
      return
    }
    // Kaart-animaties (viewState-freeze) komen terug in chunk 3 samen met de
    // hand-UI; voor nu rendert de UI direct de nieuwe state.
    set({ state: result.state, viewState: result.state, lastError: null })
  },

  onRollSettled: () => set({ animating: false, viewState: get().state }),

  reset: () =>
    set({
      state: null,
      viewState: null,
      screen: 'home',
      animating: false,
      cardAnim: null,
      lastError: null,
    }),
}))
