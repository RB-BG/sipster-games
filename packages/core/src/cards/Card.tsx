// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { color, rankLabel, suitSymbol } from './display'
import type { Card as CardValue } from './types'
import { flipTarget, restingRotation } from './dealAnim'

export interface FlipRequest {
  /** Nieuw id triggert een nieuwe flip-animatie. */
  id: number
  /** De host-authoritative kaart die bovenkomt. */
  card: CardValue
  animSeed: number
}

const FLIP_MS = 620

/** De voorkant van een kaart: grote rank + suit, hoog contrast, rood/zwart. */
export function CardFace({ card, size = 120 }: { card: CardValue; size?: number }) {
  const isRed = color(card) === 'red'
  const rank = rankLabel(card.rank)
  const suit = suitSymbol(card.suit)
  return (
    <div className={`card-face-front ${isRed ? 'card-red' : 'card-black'}`} style={faceSize(size)}>
      <span className="card-corner card-corner-tl">
        <span className="card-corner-rank">{rank}</span>
      </span>
      <span className="card-center-suit">{suit}</span>
      <span className="card-corner card-corner-br">
        <span className="card-corner-rank">{rank}</span>
      </span>
    </div>
  )
}

/** De achterkant: thema-patroon voor een dichte kaart. */
export function CardBack({ size = 120 }: { size?: number }) {
  return <div className="card-back" style={faceSize(size)} aria-label="dichte kaart" />
}

/** Statische kaart (voor grids, handen en rijen): open of dicht. */
export function StaticCard({
  card,
  faceDown,
  size = 120,
  dim,
}: {
  card?: CardValue | null
  faceDown?: boolean
  size?: number
  dim?: boolean
}) {
  return (
    <div className={`card-static ${dim ? 'card-dim' : ''}`}>
      {faceDown || !card ? <CardBack size={size} /> : <CardFace card={card} size={size} />}
    </div>
  )
}

interface CardProps {
  flip: FlipRequest | null
  /** Ligt dicht zolang er geen (nieuwe) flip is. */
  faceDown?: boolean
  size?: number
  onSettled?: (flipId: number) => void
  /** Gevuurd op het landingsmoment, met de opengekomen kaart. */
  onReveal?: (card: CardValue) => void
}

/**
 * 2.5D speelkaart: een CSS-3D-plane die rond de Y-as flipt. De uitkomst is
 * altijd de host-authoritative kaart (geen replay-afwijking), en elk toestel
 * toont dezelfde flip via de gedeelde animSeed. De opgebouwde hoek blijft in
 * een ref (nooit terugdraaien) zodat er geen zichtbare snap is.
 */
export default function Card({ flip, faceDown = true, size = 120, onSettled, onReveal }: CardProps) {
  const reduced = useReducedMotion() ?? false
  const controls = useAnimationControls()
  const rot = useRef(restingRotation(false))
  const settleTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!flip) return
    const target = flipTarget(rot.current, true, flip.animSeed)
    rot.current = target
    void controls.start({
      rotateY: target,
      transition: reduced ? { duration: 0 } : { duration: FLIP_MS / 1000, ease: [0.2, 0.8, 0.25, 1] },
    })
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(
      () => {
        onReveal?.(flip.card)
        onSettled?.(flip.id)
      },
      reduced ? 0 : FLIP_MS,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip?.id])

  // Zonder actieve flip volgt de statische stand (open/dicht) de faceDown-prop.
  useEffect(() => {
    if (flip) return
    const target = forwardResting(rot.current, !faceDown)
    rot.current = target
    void controls.start({ rotateY: target, transition: reduced ? { duration: 0 } : { duration: 0.35 } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceDown, flip?.id])

  useEffect(() => {
    return () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    }
  }, [])

  return (
    <div className="card-stage" style={{ width: size, height: size }}>
      <motion.div
        className="card-3d"
        style={{ width: size, height: size }}
        initial={{ rotateY: 180 }}
        animate={controls}
      >
        <div className="card-side card-side-front">
          {flip ? <CardFace card={flip.card} size={size} /> : <CardBack size={size} />}
        </div>
        <div className="card-side card-side-back">
          <CardBack size={size} />
        </div>
      </motion.div>
    </div>
  )
}

function forwardResting(current: number, faceUp: boolean): number {
  const resting = restingRotation(faceUp)
  const base = current
  const delta = (((resting - base) % 360) + 360) % 360
  return base + delta
}

function faceSize(size: number): React.CSSProperties {
  return { width: size, height: size }
}
