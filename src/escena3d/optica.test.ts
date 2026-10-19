import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { campoVisualGrados, lecturaEnLaCruzMm, semiIntervaloEstadimetricoM, VENTANA_ANTEOJO_M } from './optica'

describe('óptica del anteojo', () => {
  it('el campo visual muestra 16 cm de mira a cualquier distancia', () => {
    for (const d of [10, 30, 66]) {
      const fov = (campoVisualGrados(d) * Math.PI) / 180
      expect(2 * d * Math.tan(fov / 2)).toBeCloseTo(VENTANA_ANTEOJO_M, 9)
    }
  })

  it('CP-01: la cruz cae en la lectura verdadera más el error del montaje', () => {
    expect(lecturaEnLaCruzMm(101_950, 100_120, 0)).toBe(1830)
    expect(lecturaEnLaCruzMm(101_950, 100_120, 3)).toBe(1833)
  })

  it('la cámara inclinada apunta exactamente a esa lectura de la mira', () => {
    // Cámara en la colimación (y = 0); la mira, a 30 m, con su pie 1,830 m más abajo.
    const camara = new THREE.PerspectiveCamera(campoVisualGrados(30), 1, 0.1, 100)
    const desplazamientoMm = -4
    camara.lookAt(0, desplazamientoMm / 1000, -30)
    camara.updateMatrixWorld()
    const rayo = new THREE.Raycaster()
    rayo.setFromCamera(new THREE.Vector2(0, 0), camara)
    const mira = new THREE.Plane(new THREE.Vector3(0, 0, 1), 30)
    const impacto = rayo.ray.intersectPlane(mira, new THREE.Vector3())!
    const lecturaEnMira = impacto.y + 1.83
    expect(lecturaEnMira * 1000).toBeCloseTo(lecturaEnLaCruzMm(101_950, 100_120, desplazamientoMm), 6)
  })

  it('los hilos estadimétricos se separan D/100 en total (K = 100)', () => {
    expect(2 * semiIntervaloEstadimetricoM(30)).toBeCloseTo(0.3, 9)
  })
})
