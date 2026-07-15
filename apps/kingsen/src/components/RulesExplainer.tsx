// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useStrings } from '@/store/localeStore'

/** De regel-uitleg als definitielijst; gedeeld door de RulesEditor en de RulesScreen. */
export default function RulesExplainer() {
  const strings = useStrings()
  return (
    <dl className="flex flex-col gap-2">
      {strings.rulesExplain.map(([title, text]) => (
        <div key={title}>
          <dt className="font-semibold text-ivory">{title}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  )
}
