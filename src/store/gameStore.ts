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
} from '@/engine/types'

/** Worp-animatie voor de DiceScene; zelfde vorm als RollRequest daar. */
export interface RollAnim {
  id: number
  dieIds: DieId[]
  values: Die[]
  animSeed: number
}

export type Screen = 'home' | 'setup' | 'host' | 'join'

interface GameStore {
  state: GameState | null
  screen: Screen
  /** true zolang de 3D-worp nog speelt; UI verklapt de uitslag dan nog niet. */
  animating: boolean
  rollAnim: RollAnim | null
  lastError: ErrorCode | null
  setScreen: (screen: Screen) => void
  startHotseat: (profiles: PlayerProfile[]) => void
  dispatch: (cmd: Command) => void
  onRollSettled: () => void
  reset: () => void
}

// Hotseat: dit toestel is de host, dus de crypto-bron mag hier draaien.
const rng = cryptoRollSource()

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  screen: 'home',
  animating: false,
  rollAnim: null,
  lastError: null,

  setScreen: (screen) => set({ screen }),

  startHotseat: (profiles) => {
    let state = createGame(profiles[0])
    for (const profile of profiles.slice(1)) {
      state = reduce(state, { t: 'ADD_PLAYER', profile }, rng).state
    }
    state = reduce(state, { t: 'START_GAME' }, rng).state
    set({ state, animating: false, rollAnim: null, lastError: null })
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
        }
        startsAnim = true
      }
    }

    set({ state: result.state, lastError: null, rollAnim, animating: startsAnim })
  },

  onRollSettled: () => set({ animating: false }),

  reset: () =>
    set({ state: null, screen: 'home', animating: false, rollAnim: null, lastError: null }),
}))
