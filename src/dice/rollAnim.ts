// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { mulberry32 } from '@/lib/seededRng'
import type { Die } from '@/engine/types'

/**
 * Rusthoek (graden) die de kubus zo draait dat de waarde naar de kijker wijst.
 * Zie FACE_TRANSFORMS voor de plaatsing van elk vlak.
 */
export function restingRotation(value: Die): { x: number; y: number } {
  switch (value) {
    case 1:
      return { x: 0, y: 0 }
    case 2:
      return { x: -90, y: 0 }
    case 3:
      return { x: 0, y: -90 }
    case 4:
      return { x: 0, y: 90 }
    case 5:
      return { x: 90, y: 0 }
    case 6:
      return { x: 0, y: 180 }
  }
}

/**
 * Kleinste hoek >= huidige + minTurns volledige slagen die op dezelfde
 * oriëntatie uitkomt als `resting`. Zo draait de kubus altijd vooruit naar
 * de nieuwe waarde, nooit terug: geen zichtbare "snap".
 */
function forwardTo(current: number, resting: number, minTurns: number): number {
  const base = current + minTurns * 360
  const delta = (((resting - base) % 360) + 360) % 360
  return base + delta
}

/**
 * Doelrotatie voor een tuimelworp: minstens twee volle slagen, met een
 * seed-afhankelijk extra rondje zodat elk toestel dezelfde worp toont.
 * De landing is exact `restingRotation(value)` (mod 360), dus altijd juist.
 */
export function rollTarget(
  current: { x: number; y: number },
  value: Die,
  seed: number,
  index: number,
): { x: number; y: number } {
  const rnd = mulberry32((seed ^ (index * 0x9e3779b9)) >>> 0)
  const rest = restingRotation(value)
  const turnsX = 2 + Math.floor(rnd() * 2)
  const turnsY = 2 + Math.floor(rnd() * 2)
  return {
    x: forwardTo(current.x, rest.x, turnsX),
    y: forwardTo(current.y, rest.y, turnsY),
  }
}

/** Doelrotatie voor een omdraai (omgekeerde mex): één nette slag vooruit. */
export function flipTarget(
  current: { x: number; y: number },
  value: Die,
): { x: number; y: number } {
  const rest = restingRotation(value)
  return {
    x: forwardTo(current.x, rest.x, 1),
    y: forwardTo(current.y, rest.y, 0),
  }
}

/** Ogen-posities per vlak, als percentages binnen het vlak. */
export const PIP_LAYOUT: Record<Die, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
}

/** De zes vlakken van de kubus: waarde, 3D-transform en ogen. */
export const FACE_TRANSFORMS: { value: Die; transform: string }[] = [
  { value: 1, transform: 'rotateY(0deg)' },
  { value: 6, transform: 'rotateY(180deg)' },
  { value: 3, transform: 'rotateY(90deg)' },
  { value: 4, transform: 'rotateY(-90deg)' },
  { value: 2, transform: 'rotateX(90deg)' },
  { value: 5, transform: 'rotateX(-90deg)' },
]
