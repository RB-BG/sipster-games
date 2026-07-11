/**
 * Haptische feedback op de spelmomenten. Op native (Capacitor) via de
 * Haptics-plugin, want iOS kent geen navigator.vibrate; op web valt het terug
 * op de Vibration API (werkt op Android, stil op iOS-Safari). De web-patronen
 * blijven exact zoals ze waren. Alles faalt stil; haptics is nooit kritiek.
 */
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const native = Capacitor.isNativePlatform()

function web(pattern: number | number[]): void {
  navigator.vibrate?.(pattern)
}

/** Lichte tik bij het gooien. */
export function hapticRoll(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else web(30)
}

/** Doffe klap bij afslaan. */
export function hapticSlap(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
  else web(80)
}

/** Kort tikje als een drink-shot inslaat. */
export function hapticDrink(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else web(40)
}

/** Feestelijke roffel bij mex. */
export function hapticMex(): void {
  if (native) void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  else web([50, 60, 50])
}

/** Roffel bij de ridderslag. */
export function hapticRidder(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
  else web([40, 40, 80])
}
