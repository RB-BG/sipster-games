// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { createAdPolicy } from '@sipster/core/adPolicy'

// De beleidslogica leeft in @sipster/core; hier alleen de mexxen-caps: pas vanaf
// ronde 2, daarna hoogstens elke twee ronde-einden, minstens 45s ertussen en
// maximaal zes keer per potje.
export const useAdPolicy = createAdPolicy({
  everyNRounds: 2,
  minSecondsBetween: 45,
  maxPerSession: 6,
  firstEligibleRound: 2,
})
