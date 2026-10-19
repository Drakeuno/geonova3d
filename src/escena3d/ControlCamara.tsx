import { useEffect, useRef, type ElementRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Vec3 } from './coordenadas'

// Cámaras predefinidas: vista general del terreno o junto al instrumento, mirando la mira. Entre una y
// otra la cámara se desliza; el estudiante puede además girar y acercar con el mouse o el dedo.

export type Vista = 'general' | 'instrumento'

interface Props {
  vista: Vista
  centro: Vec3
  radio: number
  /** Ojo detrás del instrumento y punto al que mira. */
  instrumento: { ojo: Vec3; objetivo: Vec3 } | null
}

export function ControlCamara({ vista, centro, radio, instrumento }: Props) {
  const controles = useRef<ElementRef<typeof OrbitControls>>(null)
  const { camera, invalidate } = useThree()
  const destino = useRef<{ posicion: THREE.Vector3; objetivo: THREE.Vector3 } | null>(null)

  useEffect(() => {
    const usarInstrumento = vista === 'instrumento' && instrumento
    destino.current = usarInstrumento
      ? { posicion: new THREE.Vector3(...instrumento.ojo), objetivo: new THREE.Vector3(...instrumento.objetivo) }
      : {
          posicion: new THREE.Vector3(centro[0] + radio * 0.55, centro[1] + radio * 0.6, centro[2] + radio * 0.8),
          objetivo: new THREE.Vector3(...centro),
        }
    invalidate()
  }, [vista, instrumento, centro, radio, invalidate])

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
