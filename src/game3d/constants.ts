/**
 * Gedeelde physics- en scène-parameters.
 * De headless pre-simulatie (steering.ts) en de zichtbare wereld (DiceScene)
 * MOETEN identiek geconfigureerd zijn, anders wijkt de replay af.
 */
export const DIE_HALF = 0.5
export const DIE_FRICTION = 0.4
export const DIE_RESTITUTION = 0.35
/** Lichte demping haalt het zenuwachtige natrillen uit de worp. */
export const DIE_LINEAR_DAMPING = 0.2
export const DIE_ANGULAR_DAMPING = 0.3
export const FLOOR_FRICTION = 0.6
export const FLOOR_RESTITUTION = 0.25

/** Bak (dice tray) waarin de stenen rollen: binnenmaten vanaf het midden. */
export const TRAY = { hx: 3, hz: 3.5, wallHeight: 4, wallThickness: 0.3 }

export const GRAVITY: [number, number, number] = [0, -25, 0]
export const TIME_STEP = 1 / 60
export const MAX_PRESIM_STEPS = 900
export const SETTLE_TIMEOUT_MS = 3000

/** Rustposities bij spelstart. */
export const START_POSITIONS: [number, number, number][] = [
  [-1, DIE_HALF, 0],
  [1, DIE_HALF, 0],
]

/** Zijslots waar vastliggende (verse/vastgehouden) stenen naartoe schuiven. */
export const HELD_POSITIONS: [number, number, number][] = [
  [-1.7, DIE_HALF, 2.7],
  [1.7, DIE_HALF, 2.7],
]
