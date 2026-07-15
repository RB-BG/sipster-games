// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { createLocaleStore } from '@sipster/core/localeStore'
import { locales, type Locale, type Strings } from '@/i18n/strings'

// De store-logica leeft in @sipster/core; hier alleen de bussen-talen + namespace.
export const { useLocaleStore, useStrings } = createLocaleStore<Locale, Strings>(
  locales,
  'bussen.locale',
  'nl',
)
