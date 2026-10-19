import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { COLORES_3D, gradienteToon } from './materiales'

// Nivel automático sobre trípode, armado con primitivas. El eje del anteojo queda a `alturaM` sobre
// el suelo; el cuerpo gira hasta apuntar a la mira (rumbo).

interface Props {
  posicion: [number, number, number]
  alturaM: number
  rumbo: number
}

const EJE_Y = new THREE.Vector3(0, 1, 0)

/** Pata del trípode: un cilindro entre la cabeza y el pie. */
function Pata({ desde, hasta }: { desde: THREE.Vector3; hasta: THREE.Vector3 }) {
  const { centro, quaternion, largo } = useMemo(() => {
    const dir = hasta.clone().sub(desde)
    return {
      centro: desde.clone().add(hasta).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(EJE_Y, dir.clone().normalize()),
      largo: dir.length(),
    }
  }, [desde, hasta])
  return (
    <mesh position={centro} quaternion={quaternion}>
      <cylinderGeometry args={[0.018, 0.014, largo, 6]} />
      <meshToonMaterial color={COLORES_3D.madera} gradientMap={gradienteToon()} />
      <Outlines thickness={1} color={COLORES_3D.contorno} />
    </mesh>
  )
}

export function Nivel({ posicion, alturaM, rumbo }: Props) {
  const cuerpo = useRef<THREE.Group>(null)
  const gradiente = gradienteToon()
  const cabeza = alturaM - 0.2
  const patas = useMemo(
    () =>
      [90, 210, 330].map((g) => {
        const a = (g * Math.PI) / 180
        return { desde: new THREE.Vector3(0, cabeza, 0), hasta: new THREE.Vector3(0.55 * Math.cos(a), 0, -0.55 * Math.sin(a)) }
      }),
    [cabeza],
  )

  // Giro suave hacia la mira; mientras gira, pide cuadros nuevos (la escena dibuja a demanda).
  useFrame(({ invalidate }) => {
    const g = cuerpo.current
    if (!g) return
    const delta = Math.atan2(Math.sin(rumbo - g.rotation.y), Math.cos(rumbo - g.rotation.y))
    if (Math.abs(delta) > 0.002) {
      g.rotation.y += delta * 0.15
      invalidate()
    } else g.rotation.y = rumbo
  })

  return (
    <group position={posicion}>
      {patas.map((p, i) => (
        <Pata key={i} desde={p.desde} hasta={p.hasta} />
      ))}
      <mesh position={[0, cabeza, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 16]} />
        <meshToonMaterial color={COLORES_3D.metal} gradientMap={gradiente} />
        <Outlines thickness={1} color={COLORES_3D.contorno} />
      </mesh>
      {/* Base nivelante con sus tres tornillos. */}
      <mesh position={[0, cabeza + 0.04, 0]}>
        <cylinderGeometry args={[0.07, 0.075, 0.035, 12]} />
        <meshToonMaterial color={COLORES_3D.detalleNivel} gradientMap={gradiente} />
      </mesh>
      {[90, 210, 330].map((g) => {
        const a = (g * Math.PI) / 180
        return (
          <mesh key={g} position={[0.062 * Math.cos(a), cabeza + 0.04, -0.062 * Math.sin(a)]}>
            <cylinderGeometry args={[0.014, 0.014, 0.04, 8]} />
            <meshToonMaterial color={COLORES_3D.metal} gradientMap={gradiente} />
          </mesh>
        )
      })}
      <group ref={cuerpo} position={[0, alturaM, 0]} rotation={[0, rumbo, 0]}>
        <mesh position={[0, -0.07, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.2]} />
          <meshToonMaterial color={COLORES_3D.cuerpoNivel} gradientMap={gradiente} />
          <Outlines thickness={1.2} color={COLORES_3D.contorno} />
        </mesh>
        {/* Anteojo: el objetivo mira hacia −z. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.26, 16]} />
          <meshToonMaterial color={COLORES_3D.cuerpoNivel} gradientMap={gradiente} />
          <Outlines thickness={1.2} color={COLORES_3D.contorno} />
        </mesh>
        <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.036, 0.032, 0.04, 16]} />
          <meshToonMaterial color={COLORES_3D.detalleNivel} gradientMap={gradiente} />
        </mesh>
        <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.02, 0.05, 12]} />
          <meshToonMaterial color={COLORES_3D.detalleNivel} gradientMap={gradiente} />
        </mesh>
        {/* Nivel esférico. */}
        <mesh position={[0.075, -0.05, 0.03]}>
          <cylinderGeometry args={[0.02, 0.02, 0.012, 16]} />
          <meshToonMaterial color={COLORES_3D.pasto} gradientMap={gradiente} />
        </mesh>
      </group>
    </group>
  )
}
