import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, type Group } from 'three'
import type { Die as DieValue, DieId } from '@/engine/types'
import { GRAVITY, SETTLE_TIMEOUT_MS, TIME_STEP } from './constants'
import DieMesh from './Die'
import { remapQuaternion, topFace } from './faceMap'
import {
  initHeadlessRapier,
  presimSettle,
  seededLaunch,
  type HeldPose,
  type LaunchState,
  type SettledPose,
} from './steering'
import Table from './Table'

export interface RollRequest {
  /** Nieuw id triggert een nieuwe worp. */
  id: number
  dieIds: DieId[]
  /** Authoritative uitkomsten, zelfde volgorde als dieIds. */
  values: DieValue[]
  animSeed: number
}

export interface FlipRequest {
  /** Nieuw id triggert een omdraai-animatie (omgekeerde mex). */
  id: number
  /** Per die-id de waarde die boven moet komen, null = niet aanraken. */
  values: (DieValue | null)[]
}

interface DiceSceneProps {
  roll: RollRequest | null
  flip?: FlipRequest | null
  held: [boolean, boolean]
  onDieClick?: (id: DieId) => void
  onSettled?: (rollId: number, values: DieValue[]) => void
}

export default function DiceScene({ roll, flip, held, onDieClick, onSettled }: DiceSceneProps) {
  const [rolling, setRolling] = useState(false)

  return (
    <Canvas
      shadows
      frameloop="demand"
      camera={{ position: [0, 8, 6], fov: 45 }}
      className="touch-none"
    >
      <CameraRig />
      <ambientLight intensity={0.55} color="#ffe8c4" />
      <directionalLight
        castShadow
        position={[4, 10, 4]}
        intensity={1.6}
        color="#ffd9a0"
        shadow-mapSize={[1024, 1024]}
      />
      {/* independent: physics stept op wandkloktijd, niet per frame; anders
          rolt de worp op een 120Hz-scherm dubbel zo snel ("krokant"). */}
      <Physics gravity={GRAVITY} timeStep={TIME_STEP} updateLoop="independent" paused={!rolling}>
        <Table />
        <RollDirector
          roll={roll}
          flip={flip}
          held={held}
          rolling={rolling}
          setRolling={setRolling}
          onDieClick={onDieClick}
          onSettled={onSettled}
        />
      </Physics>
    </Canvas>
  )
}

function CameraRig() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.lookAt(0, 0, 0.4)
  }, [camera])
  return null
}

interface ActiveRoll {
  id: number
  dieIds: DieId[]
  values: DieValue[]
  deadline: number
  /** Slerp-vangnet als de replay toch afwijkt van de pre-simulatie. */
  correction: { dieId: DieId; from: Quaternion; to: Quaternion }[] | null
  correctionStart: number
  /** Eindposes uit de pre-sim, voor het harde vangnet als de renderloop stilvalt. */
  settledPoses: (SettledPose | null)[]
  forceTimer: number
}

const CORRECTION_MS = 150

interface RollDirectorProps {
  roll: RollRequest | null
  flip?: FlipRequest | null
  held: [boolean, boolean]
  rolling: boolean
  setRolling: (v: boolean) => void
  onDieClick?: (id: DieId) => void
  onSettled?: (rollId: number, values: DieValue[]) => void
}

interface FlipInProgress {
  list: { dieId: DieId; from: Quaternion; to: Quaternion }[]
  start: number
}

const FLIP_MS = 350

function RollDirector({ roll, flip, held, setRolling, onDieClick, onSettled }: RollDirectorProps) {
  const invalidate = useThree((s) => s.invalidate)
  const body0 = useRef<RapierRigidBody | null>(null)
  const body1 = useRef<RapierRigidBody | null>(null)
  const visual0 = useRef<Group | null>(null)
  const visual1 = useRef<Group | null>(null)
  const bodies = [body0, body1]
  const visuals = [visual0, visual1]
  const active = useRef<ActiveRoll | null>(null)
  const flipping = useRef<FlipInProgress | null>(null)

  const finishRoll = () => {
    const current = active.current
    if (!current) return
    window.clearTimeout(current.forceTimer)
    active.current = null
    setRolling(false)
    onSettled?.(current.id, current.values)
  }

  /** Zet gooiende stenen direct op hun pre-gesimuleerde eindpose en rond af. */
  const forceSettle = (rollId: number) => {
    const current = active.current
    if (!current || current.id !== rollId) return
    for (const id of current.dieIds) {
      const body = bodies[id].current
      const pose = current.settledPoses[id]
      if (!body || !pose) continue
      const [x, y, z] = pose.position
      body.setTranslation({ x, y, z }, true)
      body.setRotation(pose.quaternion, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      body.sleep()
    }
    finishRoll()
    invalidate()
  }

  // Omgekeerde mex: draai de visuele mesh naar de nieuwe waarde, physics blijft liggen.
  useEffect(() => {
    if (!flip) return
    const list: FlipInProgress['list'] = []
    flip.values.forEach((value, id) => {
      const body = bodies[id as DieId].current
      const visual = visuals[id as DieId].current
      if (value === null || !body || !visual) return
      const r = body.rotation()
      const bodyQ = new Quaternion(r.x, r.y, r.z, r.w)
      list.push({
        dieId: id as DieId,
        from: visual.quaternion.clone(),
        to: remapQuaternion(bodyQ, value),
      })
    })
    if (list.length > 0) {
      flipping.current = { list, start: performance.now() }
      invalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip?.id])

  useEffect(() => {
    if (!roll) return
    let cancelled = false

    ;(async () => {
      await initHeadlessRapier()
      if (cancelled) return

      const launches = seededLaunch(roll.animSeed)
      const launchInput: [LaunchState | null, LaunchState | null] = [null, null]
      const heldInput: [HeldPose | null, HeldPose | null] = [null, null]

      for (const id of [0, 1] as DieId[]) {
        if (roll.dieIds.includes(id)) {
          launchInput[id] = launches[id]
        } else {
          // Niet-gegooide steen ligt vast en doet als obstakel mee in de pre-sim.
          const body = bodies[id].current
          if (body) {
            const t = body.translation()
            const r = body.rotation()
            heldInput[id] = {
              position: [t.x, t.y, t.z],
              rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
            }
          }
        }
      }

      // Pre-simulatie: waar eindigt elke steen? Remap de visuele mesh zodat
      // de authoritative waarde daar boven ligt, vóór er ook maar één frame rendert.
      const settled = presimSettle({ launches: launchInput, heldPoses: heldInput })
      roll.dieIds.forEach((id, i) => {
        const pose = settled[id]
        const visual = visuals[id].current
        if (pose && visual) visual.quaternion.copy(remapQuaternion(pose.quaternion, roll.values[i]))
      })

      for (const id of roll.dieIds) {
        const body = bodies[id].current
        const launch = launches[id]
        if (!body) continue
        const [x, y, z] = launch.position
        body.setTranslation({ x, y, z }, true)
        body.setRotation(launch.rotation, true)
        body.setLinvel({ x: launch.linvel[0], y: launch.linvel[1], z: launch.linvel[2] }, true)
        body.setAngvel({ x: launch.angvel[0], y: launch.angvel[1], z: launch.angvel[2] }, true)
      }

      // Hard vangnet, los van de renderloop: valt rAF stil (achtergrond-tab,
      // kapotte WebGL-context), dan zetten we de stenen direct op hun eindpose.
      const forceTimer = window.setTimeout(() => forceSettle(roll.id), SETTLE_TIMEOUT_MS + 250)

      active.current = {
        id: roll.id,
        dieIds: roll.dieIds,
        values: roll.values,
        deadline: performance.now() + SETTLE_TIMEOUT_MS,
        correction: null,
        correctionStart: 0,
        settledPoses: settled,
        forceTimer,
      }
      setRolling(true)
      invalidate()
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll?.id])

  useFrame(() => {
    const flipNow = flipping.current
    if (flipNow) {
      invalidate()
      const t = Math.min(1, (performance.now() - flipNow.start) / FLIP_MS)
      for (const item of flipNow.list) {
        visuals[item.dieId].current?.quaternion.slerpQuaternions(item.from, item.to, t)
      }
      if (t >= 1) flipping.current = null
    }

    const current = active.current
    if (!current) return
    invalidate()

    if (current.correction === null) {
      const settled =
        current.dieIds.every((id) => bodies[id].current?.isSleeping()) ||
        performance.now() > current.deadline
      if (!settled) return

      const corrections: NonNullable<ActiveRoll['correction']> = []
      current.dieIds.forEach((id, i) => {
        const body = bodies[id].current
        const visual = visuals[id].current
        if (!body || !visual) return
        const r = body.rotation()
        const bodyQ = new Quaternion(r.x, r.y, r.z, r.w)
        const effective = bodyQ.clone().multiply(visual.quaternion)
        if (topFace(effective) !== current.values[i]) {
          corrections.push({
            dieId: id,
            from: visual.quaternion.clone(),
            to: remapQuaternion(bodyQ, current.values[i]),
          })
        }
      })

      if (corrections.length === 0) {
        finishRoll()
      } else {
        current.correction = corrections
        current.correctionStart = performance.now()
      }
      return
    }

    const t = Math.min(1, (performance.now() - current.correctionStart) / CORRECTION_MS)
    for (const c of current.correction) {
      visuals[c.dieId].current?.quaternion.slerpQuaternions(c.from, c.to, t)
    }
    if (t >= 1) finishRoll()
  })

  return (
    <>
      <DieMesh id={0} held={held[0]} bodyRef={body0} visualRef={visual0} onClick={onDieClick} />
      <DieMesh id={1} held={held[1]} bodyRef={body1} visualRef={visual1} onClick={onDieClick} />
    </>
  )
}
