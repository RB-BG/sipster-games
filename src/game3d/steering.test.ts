import { beforeAll, describe, expect, it } from 'vitest'
import { DIE_HALF, TRAY } from './constants'
import { topFace } from './faceMap'
import {
  initHeadlessRapier,
  presimSettle,
  seededLaunch,
  type PresimInput,
} from './steering'

beforeAll(async () => {
  await initHeadlessRapier()
})

function presimInput(seed: number): PresimInput {
  const launches = seededLaunch(seed)
  return { launches: [launches[0], launches[1]], heldPoses: [null, null] }
}

describe('seededLaunch', () => {
  it('zelfde seed geeft identieke startcondities', () => {
    expect(seededLaunch(12345)).toEqual(seededLaunch(12345))
  })

  it('verschillende seeds geven verschillende worpen', () => {
    expect(seededLaunch(1)).not.toEqual(seededLaunch(2))
  })
})

describe('presimSettle', () => {
  it('is deterministisch: zelfde input geeft exact dezelfde eindposes', () => {
    const a = presimSettle(presimInput(42))
    const b = presimSettle(presimInput(42))
    expect(a.map((p) => p && [p.position, p.quaternion.toArray()])).toEqual(
      b.map((p) => p && [p.position, p.quaternion.toArray()]),
    )
  })

  it('beide stenen komen plat op de tafel tot rust, binnen de bak', () => {
    for (const seed of [7, 1337, 987654321]) {
      const settled = presimSettle(presimInput(seed))
      for (const pose of settled) {
        expect(pose).not.toBeNull()
        const { position, quaternion } = pose as NonNullable<typeof pose>
        expect([1, 2, 3, 4, 5, 6]).toContain(topFace(quaternion))
        // Plat op de vloer: middelpunt op halve steenhoogte.
        expect(position[1]).toBeGreaterThan(DIE_HALF - 0.05)
        expect(position[1]).toBeLessThan(DIE_HALF + 0.05)
        expect(Math.abs(position[0])).toBeLessThan(TRAY.hx + 0.5)
        expect(Math.abs(position[2])).toBeLessThan(TRAY.hz + 0.5)
      }
    }
  })

  it('een vastliggende steen wordt niet gesimuleerd', () => {
    const launches = seededLaunch(42)
    const settled = presimSettle({
      launches: [launches[0], null],
      heldPoses: [null, { position: [1.7, 0.5, 2.7], rotation: { x: 0, y: 0, z: 0, w: 1 } }],
    })
    expect(settled[0]).not.toBeNull()
    expect(settled[1]).toBeNull()
  })
})
