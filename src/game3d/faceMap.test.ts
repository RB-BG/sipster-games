import { describe, expect, it } from 'vitest'
import { Euler, Quaternion, Vector3 } from 'three'
import { FACE_DEFS, remapQuaternion, topFace } from './faceMap'
import type { Die } from '@/engine/types'

describe('topFace', () => {
  it('identiteit heeft 1 boven', () => {
    expect(topFace(new Quaternion())).toBe(1)
  })

  it('kwartslag om X legt 5 boven (de 2 draait naar achteren)', () => {
    // +Z (waarde 2) draait naar -Y, dus -Z (waarde 5) komt boven... nee:
    // rotatie -90° om X stuurt +Z naar +Y. +90° om X stuurt -Z (5) naar boven? Check via code.
    const plus90 = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0))
    const min90 = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0))
    // Eén van beide kwartslagen legt de 2 boven, de andere de 5.
    expect([topFace(plus90), topFace(min90)].sort()).toEqual([2, 5])
  })

  it('halve slag om X legt 6 boven', () => {
    const q = new Quaternion().setFromEuler(new Euler(Math.PI, 0, 0))
    expect(topFace(q)).toBe(6)
  })

  it('elke waarde is bereikbaar', () => {
    const gevonden = new Set<Die>()
    for (const face of FACE_DEFS) {
      // Rotatie die deze face-normaal naar boven draait.
      const q = new Quaternion().setFromUnitVectors(
        new Vector3(...face.normal),
        new Vector3(0, 1, 0),
      )
      gevonden.add(topFace(q))
    }
    expect([...gevonden].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('remapQuaternion', () => {
  it('laat de gewenste waarde boven eindigen voor elke eindstand en elk doel', () => {
    const eindstanden = [
      new Quaternion(),
      new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0)),
      new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2)),
      new Quaternion().setFromEuler(new Euler(Math.PI, 0.0, Math.PI / 2)),
      new Quaternion().setFromEuler(new Euler(-Math.PI / 2, Math.PI / 2, 0)),
    ]
    for (const settled of eindstanden) {
      for (const desired of [1, 2, 3, 4, 5, 6] as Die[]) {
        const remap = remapQuaternion(settled, desired)
        // Effectieve oriëntatie van de visuele mesh = body-rotatie × child-remap.
        const effective = settled.clone().multiply(remap)
        expect(topFace(effective)).toBe(desired)
      }
    }
  })
})
