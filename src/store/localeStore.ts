// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { create } from 'zustand'
import { locales, type Locale, type Strings } from '@/i18n/strings'

const LOCALE_KEY = 'mexxen.locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && value in locales
}

/** Opgeslagen voorkeur > browsertaal > Nederlands. */
function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // localStorage geblokkeerd (private mode); val terug op de browsertaal.
  }
  const base = (typeof navigator !== 'undefined' ? navigator.language : '')
    .slice(0, 2)
    .toLowerCase()
  return isLocale(base) ? base : 'nl'
}

function persist(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // Niet kritiek; de keuze geldt dan alleen deze sessie.
  }
}

interface LocaleStore {
  locale: Locale
  /** De actieve taalset; los veld zodat selectors er direct op reageren. */
  strings: Strings
  setLocale: (locale: Locale) => void
}

const initial = detectLocale()
if (typeof document !== 'undefined') document.documentElement.lang = initial

export const useLocaleStore = create<LocaleStore>((set) => ({
  locale: initial,
  strings: locales[initial],
  setLocale: (locale) => {
    persist(locale)
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    set({ locale, strings: locales[locale] })
  },
}))

/** Hook voor componenten: de UI hertekent bij een taalwissel. */
export function useStrings(): Strings {
  return useLocaleStore((s) => s.strings)
}
