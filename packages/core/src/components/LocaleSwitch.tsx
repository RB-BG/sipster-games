// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

export interface LocaleSwitchProps<TLocale extends string> {
  /** Beschikbare talen, in weergavevolgorde. */
  codes: readonly TLocale[]
  locale: TLocale
  onSelect: (locale: TLocale) => void
  /** Klasse voor de actieve tab; het accent verschilt per app-thema. */
  activeClassName: string
}

/**
 * Compacte taalkiezer. Generiek over de talen-set: de app bindt zijn eigen
 * localeStore en thema-accent in een dunne adapter. Labels zijn de
 * taalcodes zelf (NL/EN), taal-onafhankelijk.
 */
export default function LocaleSwitch<TLocale extends string>({
  codes,
  locale,
  onSelect,
  activeClassName,
}: LocaleSwitchProps<TLocale>) {
  return (
    <div
      role="group"
      aria-label="Taal / Language"
      className="flex gap-0.5 rounded-lg bg-secondary/60 p-0.5 text-sm"
    >
      {codes.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => onSelect(code)}
            aria-pressed={active}
            className={
              active
                ? activeClassName
                : 'rounded-md px-2.5 py-1 text-muted-foreground transition-colors active:text-ivory'
            }
          >
            {code.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
