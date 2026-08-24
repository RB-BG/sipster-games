// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

// De AdSense-laag leeft in @sipster/core; hier alleen de mexxen-configuratie uit
// de env. AdSense draait alleen op web (nooit in de Capacitor-app), en zonder
// VITE_ADSENSE_CLIENT blijft alles dormant.
import { configureAds } from '@sipster/core/ads'

const client = import.meta.env.VITE_ADSENSE_CLIENT
if (client) configureAds({ client })

/** Slot-ID van de interstitial-ad-unit; leeg als er (nog) geen is ingesteld. */
export const interstitialSlot: string = import.meta.env.VITE_ADSENSE_SLOT_INTERSTITIAL ?? ''

export { adsEnabled } from '@sipster/core/ads'
