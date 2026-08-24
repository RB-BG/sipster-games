// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useState } from 'react'
import { adsEnabled } from '../lib/ads'
import AdSlot from './AdSlot'

export interface AdInterstitialStrings {
  /** Label boven de advertentie, bv. "Advertentie". */
  label: string
  /** Tekst op de knop zodra hij actief is, bv. "Verder". */
  continueLabel: string
  /** Tekst tijdens de teller, bv. (3) => "Verder over 3…". */
  continueInLabel: (seconds: number) => string
}

export interface AdInterstitialProps {
  slot: string
  strings: AdInterstitialStrings
  onClose: () => void
  /** Seconden dat de "verder"-knop nog uit staat. */
  countdownSeconds?: number
}

/**
 * Tussenscherm tussen de rondes: een echt fullscreen-scherm (geen zwevende
 * pop-up over lopend spel, dat is AdSense-beleidsrisico) met één advertentie en
 * een "verder"-knop die pas na een korte teller actief wordt. Rendert niets als
 * ads uitstaan (native of geen configuratie).
 */
export default function AdInterstitial({
  slot,
  strings,
  onClose,
  countdownSeconds = 5,
}: AdInterstitialProps) {
  const [left, setLeft] = useState(countdownSeconds)

  useEffect(() => {
    if (left <= 0) return
    const timer = window.setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [left])

  if (!adsEnabled()) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xl">
        <AdSlot slot={slot} label={strings.label} className="min-h-[250px]" />
        <button
          type="button"
          onClick={onClose}
          disabled={left > 0}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
        >
          {left > 0 ? strings.continueInLabel(left) : strings.continueLabel}
        </button>
      </div>
    </div>
  )
}
