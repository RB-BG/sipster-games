// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'

/**
 * Beleid voor het tonen van een interstitial tussen de rondes. Puur en
 * platform-onafhankelijk (geen DOM/Capacitor): de UI-laag beslist met
 * adsEnabled() óf er überhaupt ads mogen, deze store bepaalt alleen hoe vaak.
 * De tijd komt als argument binnen (now), zodat het geheel deterministisch
 * te testen is.
 */
export interface AdPolicyConfig {
  /** Toon hoogstens eens per zoveel ronde-einden. */
  everyNRounds: number
  /** Minimale rust tussen twee interstitials, in seconden. */
  minSecondsBetween: number
  /** Harde bovengrens per potje, zodat het nooit spammerig wordt. */
  maxPerSession: number
  /** Niet in de eerste rondes: het spel moet eerst op gang komen. */
  firstEligibleRound: number
}

export interface AdPolicyStore {
  shownCount: number
  lastShownAt: number
  lastRoundShown: number | null
  /** Mag er ná ronde `round` (net afgelopen) een interstitial komen? */
  mayShow: (round: number, now: number) => boolean
  /** Leg vast dat er zojuist één getoond is. */
  markShown: (round: number, now: number) => void
  /** Nieuw potje: tellers terug naar nul. */
  reset: () => void
}

export function createAdPolicy(config: AdPolicyConfig) {
  return create<AdPolicyStore>((set, get) => ({
    shownCount: 0,
    lastShownAt: 0,
    lastRoundShown: null,

    mayShow: (round, now) => {
      const { shownCount, lastShownAt, lastRoundShown } = get()
      if (shownCount >= config.maxPerSession) return false
      if (round < config.firstEligibleRound) return false
      // Nooit twee keer voor dezelfde ronde (het einde-effect kan hertriggeren).
      if (round === lastRoundShown) return false
      if (lastShownAt > 0 && now - lastShownAt < config.minSecondsBetween * 1000) return false
      return (round - config.firstEligibleRound) % config.everyNRounds === 0
    },

    markShown: (round, now) =>
      set((s) => ({ shownCount: s.shownCount + 1, lastShownAt: now, lastRoundShown: round })),

    reset: () => set({ shownCount: 0, lastShownAt: 0, lastRoundShown: null }),
  }))
}
