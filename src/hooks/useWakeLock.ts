import { useEffect } from 'react'

/**
 * Houdt het scherm aan zolang de component gemount is; zonder wake lock
 * vergrendelt de telefoon en sterft de WebRTC-verbinding.
 * iOS laat de lock los bij tab-wissel, dus opnieuw pakken bij visibilitychange.
 */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
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
