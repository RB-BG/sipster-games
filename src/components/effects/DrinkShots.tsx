// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { AnimatePresence, motion } from 'framer-motion'

export interface Shot {
  key: string
  playerId: string
  amount: number
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Hit {
  key: string
  playerId: string
  amount: number
  x: number
  y: number
}

export const SHOT_MS = 700

/**
 * De "arcane shot": een bierprojectiel dat in een boog van de dobbelstenen
 * naar de chip vliegt van de speler die moet drinken, met een +N-inslag.
 */
export function DrinkShotLayer({ shots, hits }: { shots: Shot[]; hits: Hit[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {shots.map((shot) => (
        <motion.span
          key={shot.key}
          className="absolute left-0 top-0 text-3xl drop-shadow-lg"
          initial={{ x: shot.x0, y: shot.y0, scale: 0.4, opacity: 0 }}
          animate={{
            x: [shot.x0, (shot.x0 + shot.x1) / 2, shot.x1],
            y: [shot.y0, Math.min(shot.y0, shot.y1) - 90, shot.y1],
            scale: [0.5, 1.35, 0.9],
            opacity: [0, 1, 1],
            rotate: [0, -20, 14],
          }}
          transition={{ duration: SHOT_MS / 1000, times: [0, 0.5, 1], ease: 'easeInOut' }}
        >
          🍺
        </motion.span>
      ))}

      <AnimatePresence>
        {hits.map((hit) => (
          <motion.span
            key={hit.key}
            className="absolute left-0 top-0 whitespace-nowrap text-lg font-extrabold text-cyan-soft drop-shadow"
            initial={{ x: hit.x, y: hit.y, opacity: 0, scale: 0.6 }}
            animate={{ x: hit.x, y: hit.y - 38, opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0, y: hit.y - 54 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          >
            +{hit.amount} 🍺
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
