// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { locales, type Locale } from '@/i18n/strings'
import { useLocaleStore } from '@/store/localeStore'

/** Korte labels per taal, in de taal zelf (autoniem), taal-onafhankelijk. */
const LABELS: Record<Locale, string> = {
  nl: 'NL',
  en: 'EN',
}

const CODES = Object.keys(locales) as Locale[]

/** Compacte taalkiezer; wisselen verandert de UI live via de localeStore. */
export default function LocaleSwitch() {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  return (
    <div
      role="group"
      aria-label="Taal / Language"
      className="flex gap-0.5 rounded-lg bg-secondary/60 p-0.5 text-sm"
    >
      {CODES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={
              active
                ? 'rounded-md bg-amber-warm px-2.5 py-1 font-semibold text-wood-950'
                : 'rounded-md px-2.5 py-1 text-muted-foreground transition-colors active:text-ivory'
            }
          >
            {LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
