// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { QuestionIndex, RuleConfig } from './types'

/**
 * Slokken-formules voor bussen. Alles schaalt met de basiseenheid
 * `standaardSlokken` (standaard 1, dus de natuurlijke getallen).
 */

/** Vraag N (0-based index) is N+1 slokken waard. */
export function questionSips(rules: RuleConfig, questionIndex: QuestionIndex): number {
  return (questionIndex + 1) * rules.standaardSlokken
}

/** Een piramide-rij is z'n rij-waarde aan slokken waard. */
export function pyramidSips(rules: RuleConfig, rowValue: number): number {
  return rowValue * rules.standaardSlokken
}

/** Betrapte leugenaar of valse beschuldiger: dubbel de inzet. */
export function bluffPenalty(rowSips: number): number {
  return rowSips * 2
}

/**
 * Foute bus-gok: je drinkt evenveel slokken als de kaartpositie waar je stond
 * (kaart 1 = 1, kaart 3 = 3, …). De straf loopt dus op naarmate je verder komt,
 * maar na de misser ga je terug naar kaart 1 en begint hij weer bij 1.
 */
export function busSips(rules: RuleConfig, cardNumber: number): number {
  return cardNumber * rules.standaardSlokken
}
