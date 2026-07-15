// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Rank } from './types'

/**
 * Het spel-effect van een kaart-rang. De meeste kaarten voer je in het echt uit
 * (`none`): de engine onthult alleen de kaart en de UI toont de instructie. De
 * engine-stateful kaarten veranderen de spelstand:
 * - `newRule`  (10): de speler typt een vrije regel die blijft staan.
 * - `roleThumb` (J): duimmeester; de rol blijft aan de speler gekoppeld.
 * - `roleQuestion` (Q): vraagmeester; idem.
 * - `king` (K): vult de cup-meter; de 4e koning eindigt het potje.
 *
 * De instructieteksten per kaart leven in i18n (`src/i18n/strings.ts`), niet hier,
 * zodat de engine taal-neutraal blijft.
 */
export type CardEffect = 'none' | 'newRule' | 'roleThumb' | 'roleQuestion' | 'king'

export function cardEffect(rank: Rank): CardEffect {
  switch (rank) {
    case 10:
      return 'newRule'
    case 11:
      return 'roleThumb'
    case 12:
      return 'roleQuestion'
    case 13:
      return 'king'
    default:
      return 'none'
  }
}
