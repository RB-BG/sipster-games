// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import RulesExplainerBase from '@sipster/core/RulesExplainer'
import { useStrings } from '@/store/localeStore'

/** Dunne adapter: de regel-uitleg komt uit de mexxen-strings. */
export default function RulesExplainer() {
  const strings = useStrings()
  return <RulesExplainerBase entries={strings.rulesExplain} />
}
