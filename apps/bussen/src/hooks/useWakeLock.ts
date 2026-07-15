// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capacitor-community/keep-awake'

/**
 * Houdt het scherm aan zolang de component gemount is; zonder wake lock
 * vergrendelt de telefoon en sterft de WebRTC-verbinding.
 * Native (Capacitor) gebruikt de keep-awake-plugin, want WKWebView kent de
 * Screen Wake Lock API niet betrouwbaar. Op web de browser-API, die iOS bij
 * tab-wissel loslaat, dus opnieuw pakken bij visibilitychange.
 */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active) return

    if (Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(() => {})
      return () => {
        KeepAwake.allowSleep().catch(() => {})
      }
    }

    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Geweigerd (batterijbesparing e.d.); geen ramp, alleen minder robuust.
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      lock?.release().catch(() => {})
    }
  }, [active])
}
