import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  FLOOR_FRICTION,
  FLOOR_RESTITUTION,
  TRAY,
} from './constants'

/**
 * Houten tafelblad + vier onzichtbare muren (dice tray).
 * Collider-maten identiek aan buildTray in steering.ts.
 */
export default function Table() {
  const { hx, hz, wallHeight, wallThickness } = TRAY
  return (
    <>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <CuboidCollider
          args={[hx + 1, 0.5, hz + 1]}
          friction={FLOOR_FRICTION}
          restitution={FLOOR_RESTITUTION}
        />
        <mesh position={[0, 0.499, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[(hx + 1) * 2, (hz + 1) * 2]} />
          <meshStandardMaterial color="#3a2410" roughness={0.85} metalness={0.05} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[0, wallHeight / 2, -hz - wallThickness]}>
        <CuboidCollider args={[hx + 1, wallHeight / 2, wallThickness]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, wallHeight / 2, hz + wallThickness]}>
        <CuboidCollider args={[hx + 1, wallHeight / 2, wallThickness]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-hx - wallThickness, wallHeight / 2, 0]}>
        <CuboidCollider args={[wallThickness, wallHeight / 2, hz + 1]} />
      </RigidBody>
      <RigidBody type="fixed" position={[hx + wallThickness, wallHeight / 2, 0]}>
        <CuboidCollider args={[wallThickness, wallHeight / 2, hz + 1]} />
      </RigidBody>
    </>
  )
}
