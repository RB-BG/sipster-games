// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import { useEffect, useRef } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { cardLabel, color } from './display'
import type { Card as CardValue } from './types'
import { flipTarget, restingRotation } from './dealAnim'
import backArt from './assets/back.png'

/**
 * De 52 kaartillustraties (rang + suit als los teken; het kaartlichaam blijft CSS).
 * Het zijn alfamaskers, geen gekleurde plaatjes: de app kleurt ze via currentColor
 * op .card-red / .card-black, zodat elk spel z'n eigen kaartkleuren houdt.
 * Vite bundelt ze via de glob, vandaar de lookup op pad.
 */
const FACES = import.meta.glob('./assets/faces/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function faceArt(card: CardValue): string {
  return FACES[`./assets/faces/${card.suit}-${card.rank}.png`]
}

export interface FlipRequest {
  /** Nieuw id triggert een nieuwe flip-animatie. */
  id: number
  /** De host-authoritative kaart die bovenkomt. */
  card: CardValue
  animSeed: number
}

const FLIP_MS = 620

/** De voorkant van een kaart: de illustratie op het kaartlichaam van de app. */
export function CardFace({ card, size = 120 }: { card: CardValue; size?: number }) {
  const isRed = color(card) === 'red'
  return (
    <div className={`card-face-front ${isRed ? 'card-red' : 'card-black'}`} style={faceSize(size)}>
      <span
        className="card-art"
        role="img"
        aria-label={cardLabel(card)}
        style={{ '--card-art': `url(${faceArt(card)})` } as React.CSSProperties}
      />
    </div>
  )
}

/**
 * De achterkant: hetzelfde kaartlichaam als de voorkant, met het donkere veld als
 * masker eroverheen. De decoratie zijn de gaten in dat masker, dus die krijgt de
 * kleur van het lichaam en kleurt vanzelf mee met het thema van de app.
 */
export function CardBack({ size = 120 }: { size?: number }) {
  return (
    <div
      className="card-back"
      aria-label="dichte kaart"
      style={{ ...faceSize(size), '--card-back-art': `url(${backArt})` } as React.CSSProperties}
    />
  )
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
    <div className="card-stage" style={faceSize(size)}>
      <motion.div
        className="card-3d"
        style={faceSize(size)}
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

/**
 * Kaartverhouding, gelijk aan het sjabloon van de illustraties (150 x 200), zodat de
 * rang + suit exact vullen zoals in de pack en niets vervormt. `size` is de hoogte, de
 * breedte volgt daaruit: kaarten worden dus smaller dan de oude vierkanten, nooit
 * hoger, zodat bestaande layouts niet verticaal kunnen overlopen.
 */
const CARD_RATIO = 0.75

function faceSize(size: number): React.CSSProperties {
  return { width: Math.round(size * CARD_RATIO), height: size }
}
