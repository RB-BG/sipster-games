import { useEffect, type RefObject } from 'react'
import { Quaternion, Vector3, type Group } from 'three'
import { RoundedBox } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { DieId } from '@/engine/types'
import {
  DIE_ANGULAR_DAMPING,
  DIE_FRICTION,
  DIE_HALF,
  DIE_LINEAR_DAMPING,
  DIE_RESTITUTION,
  HELD_POSITIONS,
  START_POSITIONS,
} from './constants'
import { FACE_DEFS } from './faceMap'

const PIP_RADIUS = 0.09
const PIP_SPREAD = 0.22

/** 2D-posities van de ogen per waarde, in het vlak van de face. */
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-PIP_SPREAD, -PIP_SPREAD], [PIP_SPREAD, PIP_SPREAD]],
  3: [[-PIP_SPREAD, -PIP_SPREAD], [0, 0], [PIP_SPREAD, PIP_SPREAD]],
  4: [[-PIP_SPREAD, -PIP_SPREAD], [-PIP_SPREAD, PIP_SPREAD], [PIP_SPREAD, -PIP_SPREAD], [PIP_SPREAD, PIP_SPREAD]],
  5: [[-PIP_SPREAD, -PIP_SPREAD], [-PIP_SPREAD, PIP_SPREAD], [0, 0], [PIP_SPREAD, -PIP_SPREAD], [PIP_SPREAD, PIP_SPREAD]],
  6: [[-PIP_SPREAD, -PIP_SPREAD], [-PIP_SPREAD, 0], [-PIP_SPREAD, PIP_SPREAD], [PIP_SPREAD, -PIP_SPREAD], [PIP_SPREAD, 0], [PIP_SPREAD, PIP_SPREAD]],
}

interface PipInstance {
  position: [number, number, number]
  quaternion: Quaternion
}

/** Alle 21 ogen, eenmalig berekend volgens de FACE_DEFS-mapping. */
const PIPS: PipInstance[] = FACE_DEFS.flatMap(({ value, normal }) => {
  const n = new Vector3(...normal)
  // Orthonormale basis in het face-vlak.
  const helper = Math.abs(n.y) === 1 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
  const t1 = new Vector3().crossVectors(n, helper).normalize()
  const t2 = new Vector3().crossVectors(n, t1).normalize()
  const facing = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n)

  return PIP_LAYOUTS[value].map(([u, v]) => {
    const pos = n
      .clone()
      .multiplyScalar(DIE_HALF + 0.001)
      .addScaledVector(t1, u)
      .addScaledVector(t2, v)
    return { position: [pos.x, pos.y, pos.z] as [number, number, number], quaternion: facing }
  })
})

interface DieProps {
  id: DieId
  held: boolean
  bodyRef: RefObject<RapierRigidBody | null>
  /** De remapbare visuele child; steering draait deze, nooit de body zelf. */
  visualRef: RefObject<Group | null>
  onClick?: (id: DieId) => void
}

export default function Die({ id, held, bodyRef, visualRef, onClick }: DieProps) {
  // Vastgelegde steen schuift naar zijn zijslot; oriëntatie (de waarde) blijft staan.
  useEffect(() => {
    const body = bodyRef.current
    if (!body || !held) return
    const [x, y, z] = HELD_POSITIONS[id]
    body.setTranslation({ x, y, z }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }, [held, id, bodyRef])

  return (
    <RigidBody
      ref={bodyRef}
      type={held ? 'fixed' : 'dynamic'}
      colliders={false}
      ccd
      linearDamping={DIE_LINEAR_DAMPING}
      angularDamping={DIE_ANGULAR_DAMPING}
      position={START_POSITIONS[id]}
    >
      <CuboidCollider
        args={[DIE_HALF, DIE_HALF, DIE_HALF]}
        friction={DIE_FRICTION}
        restitution={DIE_RESTITUTION}
      />
      <group
        ref={visualRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(id)
        }}
      >
        <RoundedBox args={[1, 1, 1]} radius={0.12} smoothness={3} castShadow>
          <meshStandardMaterial color="#f3ecd9" roughness={0.35} />
        </RoundedBox>
        {PIPS.map((pip, i) => (
          <mesh key={i} position={pip.position} quaternion={pip.quaternion}>
            <circleGeometry args={[PIP_RADIUS, 20]} />
            <meshStandardMaterial color="#17130e" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  )
}
