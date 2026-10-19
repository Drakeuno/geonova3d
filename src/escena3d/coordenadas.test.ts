import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { aMundo, rumboHacia } from './coordenadas'

describe('coordenadas del mundo 3D', () => {
  it('el norte del plano es −z y la cota se mide desde la base', () => {
    expect(aMundo(10, 20, 101_500, 100_000)).toEqual([10, 1.5, -20])
  })

  it('el frente (−z) de un objeto girado con rumboHacia apunta al objetivo', () => {
    const desde = { x: 3, y: 4 }
    for (const hacia of [{ x: 13, y: 4 }, { x: 3, y: 30 }, { x: -20, y: -5 }, { x: 8, y: -40 }]) {
      const frente = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rumboHacia(desde, hacia))
      const [ox, , oz] = aMundo(desde.x, desde.y, 0, 0)
      const [tx, , tz] = aMundo(hacia.x, hacia.y, 0, 0)
      const esperado = new THREE.Vector3(tx - ox, 0, tz - oz).normalize()
      expect(frente.distanceTo(esperado)).toBeLessThan(1e-9)
    }
  })
})
