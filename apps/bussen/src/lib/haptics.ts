// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

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

/** Lichte tik bij het delen of omdraaien van een kaart. */
export function hapticDeal(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else web(30)
}

/** Doffe klap bij een call bluff. */
export function hapticSlap(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
  else web(80)
}

/** Kort tikje als een drink-shot inslaat. */
export function hapticDrink(): void {
  if (native) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  else web(40)
}

/** Feestelijke roffel bij een goede uitkomst of het uitrijden van de bus. */
export function hapticFanfare(): void {
  if (native) void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  else web([50, 60, 50])
}
