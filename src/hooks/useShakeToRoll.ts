// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef, useState } from 'react'

const GRANT_KEY = 'mexxen.motion'
const SHAKE_THRESHOLD = 14
const COOLDOWN_MS = 1500

interface MotionEventCtor {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function needsIosPermission(): boolean {
  return (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as MotionEventCtor).requestPermission === 'function'
  )
}

export interface ShakeControls {
  supported: boolean
  /** iOS wil expliciete toestemming; aanroepen vanuit een tap (bv. de Gooi-knop). */
  requestFromGesture(): void
}

/**
 * Schudden = gooien. Android werkt direct; iOS vraagt eenmalig permissie,
 * die we onthouden zodat een volgende sessie hem stil opnieuw kan claimen.
 */
export function useShakeToRoll(enabled: boolean, onShake: () => void): ShakeControls {
  const supported = typeof DeviceMotionEvent !== 'undefined'
  const [granted, setGranted] = useState(() => {
    if (!needsIosPermission()) return supported
    try {
      return localStorage.getItem(GRANT_KEY) === 'granted'
    } catch {
      return false
    }
  })
  const onShakeRef = useRef(onShake)
  useEffect(() => {
    onShakeRef.current = onShake
  })
  const lastShake = useRef(0)

  function requestFromGesture(): void {
    const ctor = DeviceMotionEvent as unknown as MotionEventCtor
    if (!ctor.requestPermission) return
    ctor
      .requestPermission()
      .then((result) => {
        setGranted(result === 'granted')
        try {
          localStorage.setItem(GRANT_KEY, result)
        } catch {
          // Niet kritiek.
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!enabled || !supported || !granted) return

    const handler = (event: DeviceMotionEvent) => {
      const a = event.acceleration
      if (!a) return
      const magnitude = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0)
      const now = performance.now()
      if (magnitude > SHAKE_THRESHOLD && now - lastShake.current > COOLDOWN_MS) {
        lastShake.current = now
        onShakeRef.current()
      }
    }

    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [enabled, supported, granted])

  return { supported, requestFromGesture }
}
