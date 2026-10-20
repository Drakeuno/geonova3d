import { useEffect, useRef, type ElementRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Vec3 } from './coordenadas'

// Cámaras predefinidas: vista general del terreno, planta (desde arriba, con el norte hacia arriba) o
// junto al instrumento, mirando la mira. Entre una y otra la cámara se desliza; el estudiante puede
// además girar y acercar con el mouse, el dedo o el teclado.

export type Vista = 'general' | 'planta' | 'instrumento'

/** Órdenes de cámara desde el teclado (flechas y +/−), para quien no usa mouse. */
export type MandoCamara = 'izquierda' | 'derecha' | 'arriba' | 'abajo' | 'acercar' | 'alejar'
export type MandosCamara = MutableRefObject<((m: MandoCamara) => void) | null>

/** Cuánto gira cada pulsación (7,5°) y cuánto acerca. */
const GIRO = Math.PI / 24
const ACERCAMIENTO = 1.2

interface Props {
  vista: Vista
  centro: Vec3
  radio: number
  /** Ojo detrás del instrumento y punto al que mira. */
  instrumento: { ojo: Vec3; objetivo: Vec3 } | null
  /** Aquí queda la función que aplica las órdenes del teclado. */
  mandos?: MandosCamara
}

export function ControlCamara({ vista, centro, radio, instrumento, mandos }: Props) {
  const controles = useRef<ElementRef<typeof OrbitControls>>(null)
  const { camera, invalidate } = useThree()
  const destino = useRef<{ posicion: THREE.Vector3; objetivo: THREE.Vector3 } | null>(null)

  useEffect(() => {
    const usarInstrumento = vista === 'instrumento' && instrumento
    destino.current = usarInstrumento
      ? { posicion: new THREE.Vector3(...instrumento.ojo), objetivo: new THREE.Vector3(...instrumento.objetivo) }
      : vista === 'planta'
        ? // Un poco al sur del centro (≈1°): así la pantalla queda con el norte (+y del escenario) hacia
          // arriba. Debe ser bastante mayor que el margen con que termina el deslizamiento (0,01).
          { posicion: new THREE.Vector3(centro[0], centro[1] + radio * 1.9, centro[2] + radio * 0.03), objetivo: new THREE.Vector3(...centro) }
        : {
            posicion: new THREE.Vector3(centro[0] + radio * 0.55, centro[1] + radio * 0.6, centro[2] + radio * 0.8),
            objetivo: new THREE.Vector3(...centro),
          }
    invalidate()
  }, [vista, instrumento, centro, radio, invalidate])

  useEffect(() => {
    if (!mandos) return
    mandos.current = (m) => {
      const c = controles.current
      if (!c) return
      destino.current = null
      if (m === 'izquierda' || m === 'derecha') c.setAzimuthalAngle(c.getAzimuthalAngle() + (m === 'izquierda' ? GIRO : -GIRO))
      else if (m === 'arriba' || m === 'abajo') c.setPolarAngle(c.getPolarAngle() + (m === 'arriba' ? -GIRO : GIRO))
      else if (m === 'acercar') c.dollyIn(ACERCAMIENTO)
      else c.dollyOut(ACERCAMIENTO)
      c.update()
      invalidate()
    }
    return () => {
      mandos.current = null
    }
  }, [mandos, invalidate])

  useFrame(() => {
    const d = destino.current
    const c = controles.current
    if (!d || !c) return
    camera.position.lerp(d.posicion, 0.12)
    c.target.lerp(d.objetivo, 0.12)
    c.update()
    if (camera.position.distanceTo(d.posicion) < 0.01 && c.target.distanceTo(d.objetivo) < 0.01) destino.current = null
    else invalidate()
  })

  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={1.5}
      maxDistance={radio * 3}
      // Si el estudiante toma el control, la cámara deja de deslizarse sola.
      onStart={() => (destino.current = null)}
    />
  )
}
