// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

/** Spelersprofiel-vorm; structureel gelijk aan de PlayerProfile van elke app. */
export interface Profile {
  id: string
  name: string
  emoji: string
}

/**
 * Bouwt de localStorage-helpers voor profiel + huisregels. Generiek over het
 * regels-type: elke app levert zijn eigen RuleConfig-defaults en namespace
 * (bv. 'mexxen.' / 'bussen.'), zodat de laad-/bewaarlogica maar één keer bestaat.
 */
export function createStorage<TRules>(opts: {
  profileKey: string
  rulesKey: string
  defaultRules: TRules
}) {
  const { profileKey, rulesKey, defaultRules } = opts

  function loadProfile(): Profile | null {
    try {
      const raw = localStorage.getItem(profileKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Profile
      if (!parsed.id || !parsed.name || !parsed.emoji) return null
      return parsed
    } catch {
      return null
    }
  }

  function saveProfile(profile: Profile): void {
    try {
      localStorage.setItem(profileKey, JSON.stringify(profile))
    } catch {
      // localStorage kan vol of geblokkeerd zijn (private mode); profiel is niet kritiek.
    }
  }

  function newPlayerId(): string {
    return crypto.randomUUID()
  }

  /** Huisregels van het vorige potje; nieuwe velden vallen terug op de defaults. */
  function loadRules(): TRules {
    try {
      const raw = localStorage.getItem(rulesKey)
      if (!raw) return defaultRules
      return { ...defaultRules, ...(JSON.parse(raw) as Partial<TRules>) }
    } catch {
      return defaultRules
    }
  }

  function saveRules(rules: TRules): void {
    try {
      localStorage.setItem(rulesKey, JSON.stringify(rules))
    } catch {
      // Opslag geweigerd; huisregels onthouden is niet kritiek.
    }
  }

  return { loadProfile, saveProfile, newPlayerId, loadRules, saveRules }
}
