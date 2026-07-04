import type { PlayerProfile } from '@/engine/types'

const PROFILE_KEY = 'mexxen.profile'

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
