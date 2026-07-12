// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { AfslaanVerdict, RuleConfig } from './types'

/**
 * Slokken voor de verliezer van een ronde: elke mex die ronde verdubbelt de inzet.
 * standaard aantal × 2^aantal-mexxen × tiebreak-verdubbeling.
 * (2 → 4 bij één mex → 8 bij twee mexxen, enz.)
 */
export function loserSips(rules: RuleConfig, mexCount: number, multiplier = 1): number {
  return rules.standaardSlokken * 2 ** mexCount * multiplier
}

/** Bij 31 deelt de gooier het standaard aantal slokken uit. */
export function sips31(rules: RuleConfig): number {
  return rules.standaardSlokken
}

/** Strafmatrix voor afslaan; terecht afslaan kost niets. */
export function afslaanPenalty(verdict: AfslaanVerdict): number {
  switch (verdict) {
    case 'terecht':
      return 0
    case 'onterecht':
      return 2
    case 'zelfAfgeklopt':
    case 'mexAfgeklopt':
      return 4
    case 'eigenMexAfgeklopt':
      return 8
  }
}
