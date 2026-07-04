import RAPIER from '@dimforge/rapier3d-compat'
import { Quaternion } from 'three'
import { mulberry32 } from '@/lib/seededRng'
import type { DieId } from '@/engine/types'
import {
  DIE_ANGULAR_DAMPING,
  DIE_FRICTION,
  DIE_HALF,
  DIE_LINEAR_DAMPING,
  DIE_RESTITUTION,
  FLOOR_FRICTION,
  FLOOR_RESTITUTION,
  GRAVITY,
  MAX_PRESIM_STEPS,
  TIME_STEP,
  TRAY,
} from './constants'

let rapierReady: Promise<unknown> | null = null

/** Wasm-init van de headless rapier; eenmalig, hergebruikt daarna. */
export function initHeadlessRapier(): Promise<unknown> {
  rapierReady ??= RAPIER.init()
  return rapierReady
}

export interface LaunchState {
  position: [number, number, number]
  rotation: { x: number; y: number; z: number; w: number }
  linvel: [number, number, number]
  angvel: [number, number, number]
}

export interface HeldPose {
  position: [number, number, number]
  rotation: { x: number; y: number; z: number; w: number }
}

/**
 * Deterministische startcondities voor een worp. Zelfde seed = zelfde animatie
 * op elk toestel. Er wordt altijd voor beide stenen geconsumeerd zodat het
 * aantal rng-calls niet afhangt van welke stenen meedoen.
 */
export function seededLaunch(seed: number): [LaunchState, LaunchState] {
  const rnd = mulberry32(seed)
  const launches: LaunchState[] = []
  for (let i = 0; i < 2; i++) {
    const x = (i === 0 ? -0.9 : 0.9) + (rnd() - 0.5) * 0.6
    const position: [number, number, number] = [x, 2.2 + rnd() * 0.5, 2.4 + rnd() * 0.4]
    const axis = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]
    const len = Math.hypot(...axis) || 1
    const angle = rnd() * Math.PI * 2
    const s = Math.sin(angle / 2)
    const rotation = {
      x: (axis[0] / len) * s,
      y: (axis[1] / len) * s,
      z: (axis[2] / len) * s,
      w: Math.cos(angle / 2),
    }
    const linvel: [number, number, number] = [
      (rnd() - 0.5) * 4,
      0.5 + rnd() * 0.8,
      -8.5 - rnd() * 3,
    ]
    const angvel: [number, number, number] = [
      (rnd() - 0.5) * 30,
      (rnd() - 0.5) * 30,
      (rnd() - 0.5) * 30,
    ]
    launches.push({ position, rotation, linvel, angvel })
  }
  return launches as [LaunchState, LaunchState]
}

export interface PresimInput {
  /** Per die-id: launch als hij meegooit, anders null. */
  launches: [LaunchState | null, LaunchState | null]
  /** Per die-id: vaste pose als hij vastligt (obstakel), anders null. */
  heldPoses: [HeldPose | null, HeldPose | null]
}

export interface SettledPose {
  position: [number, number, number]
  quaternion: Quaternion
}

/**
 * Headless voor-simulatie: bouwt exact dezelfde wereld als de zichtbare scène
 * en stept tot alle stenen slapen. Retourneert per gegooide steen de eindpose,
 * zodat de visuele mesh vooraf geremapt kan worden en een vangnet de steen
 * desnoods direct op zijn eindstand kan zetten. Aanroepen ná initHeadlessRapier().
 */
export function presimSettle(input: PresimInput): (SettledPose | null)[] {
  const world = new RAPIER.World({ x: GRAVITY[0], y: GRAVITY[1], z: GRAVITY[2] })
  world.timestep = TIME_STEP

  buildTray(world)

  const heldIds: DieId[] = [0, 1]
  for (const id of heldIds) {
    const pose = input.heldPoses[id]
    if (!pose) continue
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(...pose.position)
        .setRotation(pose.rotation),
    )
    world.createCollider(dieCollider(), body)
  }

  const dynamic: { id: DieId; body: RAPIER.RigidBody }[] = []
  for (const id of heldIds) {
    const launch = input.launches[id]
    if (!launch) continue
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(...launch.position)
        .setRotation(launch.rotation)
        .setLinvel(...launch.linvel)
        .setAngvel({ x: launch.angvel[0], y: launch.angvel[1], z: launch.angvel[2] })
        .setLinearDamping(DIE_LINEAR_DAMPING)
        .setAngularDamping(DIE_ANGULAR_DAMPING)
        .setCcdEnabled(true),
    )
    world.createCollider(dieCollider(), body)
    dynamic.push({ id, body })
  }

  for (let step = 0; step < MAX_PRESIM_STEPS; step++) {
    world.step()
    if (dynamic.every((d) => d.body.isSleeping())) break
  }

  const result: (SettledPose | null)[] = [null, null]
  for (const { id, body } of dynamic) {
    const r = body.rotation()
    const t = body.translation()
    result[id] = {
      position: [t.x, t.y, t.z],
      quaternion: new Quaternion(r.x, r.y, r.z, r.w),
    }
  }

  world.free()
  return result
}

function dieCollider(): RAPIER.ColliderDesc {
  return RAPIER.ColliderDesc.cuboid(DIE_HALF, DIE_HALF, DIE_HALF)
    .setFriction(DIE_FRICTION)
    .setRestitution(DIE_RESTITUTION)
}

/** Vloer + vier onzichtbare muren; maten identiek aan Table.tsx. */
function buildTray(world: RAPIER.World): void {
  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0))
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(TRAY.hx + 1, 0.5, TRAY.hz + 1)
      .setFriction(FLOOR_FRICTION)
      .setRestitution(FLOOR_RESTITUTION),
    floor,
  )

  const { hx, hz, wallHeight, wallThickness } = TRAY
  const walls: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, wallHeight / 2, -hz - wallThickness], size: [hx + 1, wallHeight / 2, wallThickness] },
    { pos: [0, wallHeight / 2, hz + wallThickness], size: [hx + 1, wallHeight / 2, wallThickness] },
    { pos: [-hx - wallThickness, wallHeight / 2, 0], size: [wallThickness, wallHeight / 2, hz + 1] },
    { pos: [hx + wallThickness, wallHeight / 2, 0], size: [wallThickness, wallHeight / 2, hz + 1] },
  ]
  for (const wall of walls) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...wall.pos))
    world.createCollider(RAPIER.ColliderDesc.cuboid(...wall.size), body)
  }
}
