// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { Capacitor } from '@capacitor/core'

/**
 * AdSense-integratie voor de webversie. Advertenties draaien BEWUST alleen op
 * web: AdSense in een WebView/Capacitor-app schendt het AdSense-beleid, dus op
 * native is alles hier een no-op. De publisher-ID komt uit de app (env) via
 * configureAds; zonder ID blijft de laag dormant (geen script, geen slots).
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

let client: string | null = null
let scriptRequested = false

/** Zet de AdSense-publisher-ID ('ca-pub-...'); één keer bij app-start. Leeg = uit. */
export function configureAds(opts: { client: string }): void {
  const value = opts.client.trim()
  client = value.length > 0 ? value : null
}

export function adsClient(): string | null {
  return client
}

/** Web én een client geconfigureerd: alleen dan mogen er ads draaien. */
export function adsEnabled(): boolean {
  return Capacitor.getPlatform() === 'web' && client !== null
}

/** Injecteert het adsbygoogle-script één keer, lui en alleen op web. */
export function loadAdSenseScript(): void {
  if (!adsEnabled() || scriptRequested || typeof document === 'undefined') return
  scriptRequested = true
  const script = document.createElement('script')
  script.async = true
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
}

/** Vraagt AdSense een geplaatste <ins>-slot te vullen. Faalt stil. */
export function pushAd(): void {
  if (!adsEnabled()) return
  try {
    ;(window.adsbygoogle = window.adsbygoogle ?? []).push({})
  } catch {
    // AdSense nog niet geladen of geblokkeerd (adblocker); niet kritiek.
  }
}
