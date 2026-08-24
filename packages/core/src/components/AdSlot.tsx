// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef } from 'react'
import { adsClient, adsEnabled, loadAdSenseScript, pushAd } from '../lib/ads'

export interface AdSlotProps {
  /** De ad-unit-slot-ID uit het AdSense-dashboard. */
  slot: string
  /** Zichtbaar label boven de advertentie (uit de app-strings), bv. "Advertentie". */
  label: string
  className?: string
  /** AdSense-formaat; 'auto' laat Google de vorm kiezen. */
  format?: string
}

/**
 * Eén AdSense-advertentieblok. Rendert niets op native of zonder configuratie,
 * zodat het veilig in de gedeelde UI kan staan (web-only via adsEnabled()).
 */
export default function AdSlot({ slot, label, className, format = 'auto' }: AdSlotProps) {
  const pushed = useRef(false)
  const client = adsClient()

  useEffect(() => {
    // Ref-guard: React StrictMode voert effecten in dev dubbel uit, maar per
    // <ins> mag er precies één push naar adsbygoogle.
    if (!adsEnabled() || pushed.current) return
    pushed.current = true
    loadAdSenseScript()
    pushAd()
  }, [])

  if (!adsEnabled() || client === null) return null

  return (
    <div className={className}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
