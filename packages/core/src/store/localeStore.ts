// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'

export interface LocaleStore<TLocale extends string, TStrings> {
  locale: TLocale
  /** De actieve taalset; los veld zodat selectors er direct op reageren. */
  strings: TStrings
  setLocale: (locale: TLocale) => void
}

/**
 * Bouwt een taal-store voor een app. Generiek over de talen-set: elke app
 * levert zijn eigen `locales`-map, opslagsleutel en fallback-taal. De store en
 * de detectie-/persistentie-logica leven zo maar één keer.
 */
export function createLocaleStore<TLocale extends string, TStrings>(
  locales: Record<TLocale, TStrings>,
  storageKey: string,
  fallback: TLocale,
) {
  function isLocale(value: string | null): value is TLocale {
    return value !== null && value in locales
  }

  /** Opgeslagen voorkeur > browsertaal > fallback. */
  function detectLocale(): TLocale {
    try {
      const stored = localStorage.getItem(storageKey)
      if (isLocale(stored)) return stored
    } catch {
      // localStorage geblokkeerd (private mode); val terug op de browsertaal.
    }
    const base = (typeof navigator !== 'undefined' ? navigator.language : '')
      .slice(0, 2)
      .toLowerCase()
    return isLocale(base) ? base : fallback
  }

  function persist(locale: TLocale): void {
    try {
      localStorage.setItem(storageKey, locale)
    } catch {
      // Niet kritiek; de keuze geldt dan alleen deze sessie.
    }
  }

  const initial = detectLocale()
  if (typeof document !== 'undefined') document.documentElement.lang = initial

  const useLocaleStore = create<LocaleStore<TLocale, TStrings>>((set) => ({
    locale: initial,
    strings: locales[initial],
    setLocale: (locale) => {
      persist(locale)
      if (typeof document !== 'undefined') document.documentElement.lang = locale
      set({ locale, strings: locales[locale] })
    },
  }))

  /** Hook voor componenten: de UI hertekent bij een taalwissel. */
  const useStrings = (): TStrings => useLocaleStore((s) => s.strings)

  return { useLocaleStore, useStrings }
}
