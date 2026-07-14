// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'
import { createGame, reduce } from '@/engine/reducer'
import { cryptoRollSource } from '@/engine/rng'
import type {
  Command,
  Die,
  DieId,
  ErrorCode,
  GameState,
  PlayerProfile,
  RuleConfig,
} from '@/engine/types'

/** Worp-animatie voor de Dice-component; zelfde vorm als RollRequest daar. */
export interface RollAnim {
  id: number
  dieIds: DieId[]
  values: Die[]
  animSeed: number
  /** Kamp-worp: er telt maar één steen, dus toon geen gecombineerde score. */
  single?: boolean
}

/** Omdraai-animatie (omgekeerde mex): per die-id de nieuwe waarde. */
export interface FlipAnim {
  id: number
  values: (Die | null)[]
}

export type Screen = 'home' | 'setup' | 'host' | 'join' | 'rules'

interface GameStore {
  state: GameState | null
  /**
   * Wat de UI rendert: loopt één animatie achter op `state`, zodat chips en
   * overlays de uitslag niet verklappen terwijl de stenen nog rollen.
   */
  viewState: GameState | null
  screen: Screen
  /** true zolang de 3D-worp nog speelt; UI verklapt de uitslag dan nog niet. */
  animating: boolean
  rollAnim: RollAnim | null
  flipAnim: FlipAnim | null
  lastError: ErrorCode | null
  setScreen: (screen: Screen) => void
  startHotseat: (profiles: PlayerProfile[], rules: RuleConfig) => void
  dispatch: (cmd: Command) => void
  onRollSettled: () => void
  reset: () => void
}

// Hotseat: dit toestel is de host, dus de crypto-bron mag hier draaien.
const rng = cryptoRollSource()

/** De flip-animatie (350ms) heeft geen settle-callback; een timer rondt af. */
const FLIP_SETTLE_MS = 450
let flipTimer: number | null = null

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  viewState: null,
  screen: 'home',
  animating: false,
  rollAnim: null,
  flipAnim: null,
  lastError: null,

  setScreen: (screen) => set({ screen }),

  startHotseat: (profiles, rules) => {
    let state = createGame(profiles[0], rules)
    for (const profile of profiles.slice(1)) {
      state = reduce(state, { t: 'ADD_PLAYER', profile }, rng).state
    }
    state = reduce(state, { t: 'START_GAME' }, rng).state
    set({ state, viewState: state, animating: false, rollAnim: null, flipAnim: null, lastError: null })
  },

  dispatch: (cmd) => {
    const { state, animating } = get()
    if (!state || animating) return
    const result = reduce(state, cmd, rng)
    if (result.error) {
      set({ lastError: result.error })
      return
    }

    let rollAnim = get().rollAnim
    let flipAnim = get().flipAnim
    let startsAnim = false
    for (const event of result.events) {
      if (event.t === 'DICE_ROLLED') {
        rollAnim = {
          id: result.state.version,
          dieIds: event.dieIds,
          values: event.values,
          animSeed: event.animSeed,
        }
        startsAnim = true
      } else if (event.t === 'TIEBREAK_ROLLED') {
        // Kamp-worp: één steen (die 0) met de gegooide waarde.
        rollAnim = {
          id: result.state.version,
          dieIds: [0],
          values: [event.value],
          animSeed: event.animSeed,
          single: true,
        }
        startsAnim = true
      } else if (event.t === 'FLIPPED_65') {
        flipAnim = { id: result.state.version, values: [event.values[0], event.values[1]] }
        // De flip is een korte animatie zonder settle-callback: timer rondt af.
        startsAnim = true
        if (flipTimer !== null) window.clearTimeout(flipTimer)
        flipTimer = window.setTimeout(() => get().onRollSettled(), FLIP_SETTLE_MS)
      }
    }

    set({
      state: result.state,
      // Tijdens een animatie blijft de weergave op de oude stand hangen.
      viewState: startsAnim ? get().viewState : result.state,
      lastError: null,
      rollAnim,
      flipAnim,
      animating: startsAnim,
    })
  },

  onRollSettled: () => set({ animating: false, viewState: get().state }),

  reset: () =>
    set({
      state: null,
      viewState: null,
      screen: 'home',
      animating: false,
      rollAnim: null,
      flipAnim: null,
      lastError: null,
    }),
}))
