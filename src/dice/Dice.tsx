// Copyright © 2026 Bussen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from 'framer-motion'
import { scoreLabel } from '@/engine/score'
import type { Die as DieValue, DieId } from '@/engine/types'
import {
  FACE_TRANSFORMS,
  PIP_LAYOUT,
  flipTarget,
  restingRotation,
  rollTarget,
} from './rollAnim'

export interface RollRequest {
  /** Nieuw id triggert een nieuwe worp. */
  id: number
  dieIds: DieId[]
  /** Authoritative uitkomsten, zelfde volgorde als dieIds. */
  values: DieValue[]
  animSeed: number
  /** Kamp-worp: er telt maar één steen, dus toon geen gecombineerde score. */
  single?: boolean
}

export interface FlipRequest {
  /** Nieuw id triggert een omdraai-animatie (omgekeerde mex). */
  id: number
  /** Per die-id de waarde die boven moet komen, null = niet aanraken. */
  values: (DieValue | null)[]
}

interface DiceProps {
  roll: RollRequest | null
  flip?: FlipRequest | null
  held: [boolean, boolean]
  onDieClick?: (id: DieId) => void
  onSettled?: (rollId: number, values: DieValue[]) => void
  /**
   * Meldt bij het landen wat er ligt ('mex', '32', '64', …). Bijzondere
   * scores flitsen dan niet lokaal: de parent toont een fullscreen pop.
   */
  onScore?: (label: string) => void
}

const DIE_SIZE = 84
const ROLL_MS = 800
const FLIP_MS = 450

interface Flash {
  id: number
  text: string
  mex: boolean
}

/**
 * 2.5D dobbelstenen: CSS-3D-kubussen met een strakke tuimel-animatie.
 * De uitkomst is altijd de authoritative waarde (geen physics, geen replay-
 * afwijking), en elk toestel toont dezelfde worp via de gedeelde animSeed.
 * De rotatie wordt imperatief gedreven met animation-controls, zodat de
 * opgebouwde hoek in een ref kan blijven (nooit terugdraaien) zonder re-render.
 */
export default function Dice({ roll, flip, held, onDieClick, onSettled, onScore }: DiceProps) {
  const reduced = useReducedMotion() ?? false
  const shake = useAnimationControls()
  const cube0 = useAnimationControls()
  const cube1 = useAnimationControls()
  const cubes = [cube0, cube1]

  const rot = useRef<[{ x: number; y: number }, { x: number; y: number }]>([
    restingRotation(1),
    restingRotation(1),
  ])
  const dieValues = useRef<[DieValue, DieValue]>([1, 1])

  const settleTimer = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [burstId, setBurstId] = useState(0)

  function land(text: string, mex: boolean, showFlash = true) {
    if (!reduced) {
      void shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.34 } })
    }
    if (mex && !reduced) setBurstId((n) => n + 1)
    if (!showFlash) return
    setFlash({ id: Date.now(), text, mex })
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1200)
  }

  // Worp: tuimel de betrokken stenen naar hun waarde, meld daarna de landing.
  useEffect(() => {
    if (!roll) return
    roll.dieIds.forEach((id, i) => {
      const value = roll.values[i]
      dieValues.current[id] = value
      const target = rollTarget(rot.current[id], value, roll.animSeed, id)
      rot.current[id] = target
      void cubes[id].start({
        rotateX: target.x,
        rotateY: target.y,
        transition: reduced ? { duration: 0 } : { duration: ROLL_MS / 1000, ease: [0.15, 0.85, 0.25, 1] },
      })
    })

    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(
      () => {
        // Alleen de kamp-worp toont één losse steen; een gewone worp met een
        // vastliggende 1/2 telt gewoon beide stenen bij elkaar (bv. 5 + verse 1 = 51).
        const text = roll.single
          ? String(dieValues.current[roll.dieIds[0]])
          : scoreLabel(dieValues.current[0], dieValues.current[1])
        // Bijzondere scores krijgen een fullscreen pop van de parent;
        // de lokale flits blijft voor de gewone worpen.
        const special = onScore && (text === 'mex' || text === '32' || text === '31')
        land(text, text === 'mex', !special)
        if (special) onScore(text)
        onSettled?.(roll.id, roll.values)
      },
      reduced ? 0 : ROLL_MS,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll?.id])

  // Omgekeerde mex: draai de stenen om naar 1 en 2. De store rondt de
  // animating-vlag zelf af, dus hier geen onSettled.
  useEffect(() => {
    if (!flip) return
    flip.values.forEach((value, id) => {
      if (value === null) return
      dieValues.current[id as DieId] = value
      const target = flipTarget(rot.current[id as DieId], value)
      rot.current[id as DieId] = target
      void cubes[id as DieId].start({
        rotateX: target.x,
        rotateY: target.y,
        transition: reduced ? { duration: 0 } : { duration: FLIP_MS / 1000, ease: 'easeInOut' },
      })
    })
    const t = window.setTimeout(() => {
      land('mex', true, !onScore)
      onScore?.('mex')
    }, reduced ? 0 : FLIP_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip?.id])

  useEffect(() => {
    return () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    }
  }, [])

  return (
    <div className="dice-stage relative flex h-full w-full items-center justify-center overflow-hidden">
      <motion.div animate={shake} className="flex items-center justify-center gap-6">
        {([0, 1] as DieId[]).map((id) => (
          <motion.div
            key={id}
            className="die-wrap"
            animate={{
              scale: held[id] ? 0.6 : 1,
              y: held[id] ? DIE_SIZE * 0.55 : 0,
              opacity: held[id] ? 0.65 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <motion.button
              type="button"
              aria-label={`dobbelsteen ${id + 1}`}
              onClick={() => onDieClick?.(id)}
              className="dice-cube"
              style={{ width: DIE_SIZE, height: DIE_SIZE }}
              initial={{ rotateX: 0, rotateY: 0 }}
              animate={cubes[id]}
            >
              {FACE_TRANSFORMS.map((face) => (
                <span
                  key={face.value}
                  className="dice-face"
                  style={{
                    width: DIE_SIZE,
                    height: DIE_SIZE,
                    transform: `${face.transform} translateZ(${DIE_SIZE / 2}px)`,
                  }}
                >
                  {PIP_LAYOUT[face.value].map(([x, y], i) => (
                    <span key={i} className="dice-pip" style={{ left: `${x}%`, top: `${y}%` }} />
                  ))}
                </span>
              ))}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ scale: 0.4, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: -8 }}
            exit={{ scale: 0.8, opacity: 0, y: -28 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className={`pointer-events-none absolute font-heading font-extrabold drop-shadow-lg ${
              flash.mex ? 'text-5xl text-amber-soft' : 'text-4xl text-ivory'
            }`}
          >
            {flash.mex ? 'MEX!' : flash.text}
          </motion.div>
        )}
      </AnimatePresence>

      {burstId > 0 && <MexBurst key={burstId} />}
    </div>
  )
}

const BURST = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2
  return { x: Math.cos(angle) * 120, y: Math.sin(angle) * 120, emoji: i % 2 === 0 ? '🍺' : '✨' }
})

function MexBurst() {
  return (
    <div className="pointer-events-none absolute">
      {BURST.map((p, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  )
}
