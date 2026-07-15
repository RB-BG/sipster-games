// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { PlayerProfile, RuleConfig } from '@/engine/types'
import { DEFAULT_RULES } from '@/engine/types'

const PROFILE_KEY = 'mexxen.profile'
const RULES_KEY = 'mexxen.rules'

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlayerProfile
    if (!parsed.id || !parsed.name || !parsed.emoji) return null
    return parsed
  } catch {
    return null
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage kan vol of geblokkeerd zijn (private mode); profiel is niet kritiek.
  }
}

export function newPlayerId(): string {
  return crypto.randomUUID()
}

/** Huisregels van het vorige potje; nieuwe velden vallen terug op de defaults. */
export function loadRules(): RuleConfig {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (!raw) return DEFAULT_RULES
    return { ...DEFAULT_RULES, ...(JSON.parse(raw) as Partial<RuleConfig>) }
  } catch {
    return DEFAULT_RULES
  }
}

export function saveRules(rules: RuleConfig): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules))
  } catch {
    // Opslag geweigerd; huisregels onthouden is niet kritiek.
  }
}
