import { Quaternion, Vector3 } from 'three'
import type { Die } from '@/engine/types'

/**
 * Welke waarde hoort bij welke lokale face-normaal van de kubus.
 * Standaard dobbelsteen: tegenoverliggende vlakken sommeren tot 7.
 * Die.tsx plaatst de ogen volgens exact deze mapping.
 */
export const FACE_DEFS: { value: Die; normal: [number, number, number] }[] = [
  { value: 1, normal: [0, 1, 0] },
  { value: 6, normal: [0, -1, 0] },
  { value: 2, normal: [0, 0, 1] },
  { value: 5, normal: [0, 0, -1] },
  { value: 3, normal: [1, 0, 0] },
  { value: 4, normal: [-1, 0, 0] },
]

const UP = new Vector3(0, 1, 0)

/** Welke waarde ligt boven, gegeven de oriëntatie van de steen. */
export function topFace(orientation: Quaternion): Die {
  let best: Die = 1
  let bestDot = -Infinity
  for (const face of FACE_DEFS) {
    const world = new Vector3(...face.normal).applyQuaternion(orientation)
    const dot = world.dot(UP)
    if (dot > bestDot) {
      bestDot = dot
      best = face.value
    }
  }
  return best
}

function normalOf(value: Die): Vector3 {
  const def = FACE_DEFS.find((f) => f.value === value) as (typeof FACE_DEFS)[number]
  return new Vector3(...def.normal)
}

/**
 * Rotatie voor de visuele child-mesh zodat `desired` boven komt te liggen
 * wanneer de rigid body op `settled` eindigt. De collider is een symmetrische
 * kubus, dus deze remap verandert niets aan de physics.
 */
export function remapQuaternion(settled: Quaternion, desired: Die): Quaternion {
  const settledTop = topFace(settled)
  return new Quaternion().setFromUnitVectors(normalOf(desired), normalOf(settledTop))
}
