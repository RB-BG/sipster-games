// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import LocaleSwitchBase from '@sipster/core/LocaleSwitch'
import { locales, type Locale } from '@/i18n/strings'
import { useLocaleStore } from '@/store/localeStore'

const CODES = Object.keys(locales) as Locale[]

/** Dunne adapter: bindt de kaartspel-talen en het eigen thema-accent aan de core-component. */
export default function LocaleSwitch() {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  return (
    <LocaleSwitchBase
      codes={CODES}
      locale={locale}
      onSelect={setLocale}
      activeClassName="rounded-md bg-cyan px-2.5 py-1 font-semibold text-night-950"
    />
  )
}
