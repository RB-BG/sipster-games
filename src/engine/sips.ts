import type { AfslaanVerdict, RuleConfig } from './types'

/**
 * Slokken voor de verliezer van een ronde:
 * standaard aantal × aantal mexxen (minimaal 1) × tiebreak-verdubbeling.
 */
export function loserSips(rules: RuleConfig, mexCount: number, multiplier = 1): number {
  return rules.standaardSlokken * Math.max(1, mexCount) * multiplier
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
