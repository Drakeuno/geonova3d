import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Html, Outlines } from '@react-three/drei'
import type { Escenario } from '@/motor/escenarios'
import { alturaTerrenoMm, type PuntoControl } from '@/motor/terreno'
import { COLORES_3D, gradienteToon } from './materiales'

interface Props {
  escenario: Escenario
  control: PuntoControl[]
  baseMm: number
}

function Edificio({ x, y, ancho, largo, alto, nombre, sueloM }: { x: number; y: number; ancho: number; largo: number; alto: number; nombre?: string; sueloM: number }) {
  const gradiente = gradienteToon()
  return (
    <group position={[x, sueloM, -y]}>
      <mesh position={[0, alto / 2, 0]}>
        <boxGeometry args={[ancho, alto, largo]} />
        <meshToonMaterial color={COLORES_3D.muro} gradientMap={gradiente} />
        <Outlines thickness={1.5} color={COLORES_3D.contorno} />
      </mesh>
      {/* Ventanas corridas, una por piso. */}
      {[2.4, 5.9, 9.4].filter((h) => h < alto - 1).map((h) => (
        <mesh key={h} position={[0, h, 0]}>
          <boxGeometry args={[ancho + 0.04, 1.3, largo + 0.04]} />
          <meshToonMaterial color={COLORES_3D.detalleNivel} gradientMap={gradiente} />
        </mesh>
      ))}
      <mesh position={[0, alto + 0.25, 0]}>
        <boxGeometry args={[ancho + 0.8, 0.5, largo + 0.8]} />
        <meshToonMaterial color={COLORES_3D.techo} gradientMap={gradiente} />
        <Outlines thickness={1.5} color={COLORES_3D.contorno} />
      </mesh>
      {nombre && (
        <Html position={[0, alto + 2.5, 0]} center className="pointer-events-none whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-tierra-800 shadow">
          {nombre}
        </Html>
      )}
    </group>
  )
}

/** Estanque elevado: depósito cilíndrico sobre cuatro pilares y una escalera de servicio. */
function Estanque({ x, y, alto, radio, nombre, sueloM }: { x: number; y: number; alto: number; radio: number; nombre?: string; sueloM: number }) {
  const gradiente = gradienteToon()
  const pilares: [number, number][] = [
    [radio * 0.6, radio * 0.6],
    [-radio * 0.6, radio * 0.6],
    [radio * 0.6, -radio * 0.6],
    [-radio * 0.6, -radio * 0.6],
  ]
  return (
    <group position={[x, sueloM, -y]}>
      {pilares.map(([px, pz], i) => (
        <mesh key={i} position={[px, alto / 2, pz]}>
          <boxGeometry args={[0.35, alto, 0.35]} />
          <meshToonMaterial color={COLORES_3D.muro} gradientMap={gradiente} />
          <Outlines thickness={1.2} color={COLORES_3D.contorno} />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[radio * 1.8, 0.2, radio * 1.8]} />
        <meshToonMaterial color={COLORES_3D.hito} gradientMap={gradiente} />
      </mesh>
      <mesh position={[0, alto + 1.4, 0]}>
        <cylinderGeometry args={[radio, radio, 2.8, 20]} />
        <meshToonMaterial color={COLORES_3D.estanque} gradientMap={gradiente} />
        <Outlines thickness={1.5} color={COLORES_3D.contorno} />
      </mesh>
      <mesh position={[0, alto + 3, 0]}>
        <coneGeometry args={[radio * 1.05, 0.8, 20]} />
        <meshToonMaterial color={COLORES_3D.detalleNivel} gradientMap={gradiente} />
      </mesh>
      {nombre && (
        <Html position={[0, alto + 4.6, 0]} center className="pointer-events-none whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-tierra-800 shadow">
          {nombre}
        </Html>
      )}
    </group>
  )
}

function Arboles({ arboles }: { arboles: { x: number; sueloM: number; y: number; alto: number }[] }) {
  const troncos = useRef<THREE.InstancedMesh>(null)
  const copas = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    arboles.forEach((a, i) => {
      const altoTronco = a.alto * 0.35
      m.compose(new THREE.Vector3(a.x, a.sueloM + altoTronco / 2, -a.y), new THREE.Quaternion(), new THREE.Vector3(a.alto * 0.05, altoTronco, a.alto * 0.05))
      troncos.current?.setMatrixAt(i, m)
      m.compose(
        new THREE.Vector3(a.x, a.sueloM + altoTronco + (a.alto * 0.7) / 2 - 0.3, -a.y),
        new THREE.Quaternion(),
        new THREE.Vector3(a.alto * 0.28, a.alto * 0.7, a.alto * 0.28),
      )
      copas.current?.setMatrixAt(i, m)
    })
    if (troncos.current) troncos.current.instanceMatrix.needsUpdate = true
    if (copas.current) copas.current.instanceMatrix.needsUpdate = true
  }, [arboles])

  const gradiente = gradienteToon()
  return (
    <>
      <instancedMesh ref={troncos} args={[undefined, undefined, arboles.length]}>
        <cylinderGeometry args={[0.7, 1, 1, 6]} />
        <meshToonMaterial color={COLORES_3D.tronco} gradientMap={gradiente} />
      </instancedMesh>
      <instancedMesh ref={copas} args={[undefined, undefined, arboles.length]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshToonMaterial color={COLORES_3D.copa} gradientMap={gradiente} />
        <Outlines thickness={1.2} color={COLORES_3D.copaOscura} />
      </instancedMesh>
    </>
  )
}

/** Edificios, estanques y árboles: solo ambientan, no tienen cota que medir. */
export function Elementos({ escenario, control, baseMm }: Props) {
  const sueloM = (x: number, y: number) => (alturaTerrenoMm(control, x, y) - baseMm) / 1000
  const arboles = useMemo(
    () =>
      escenario.elementos.flatMap((el) => (el.tipo === 'arbol' ? [{ x: el.x, y: el.y, alto: el.alto, sueloM: (alturaTerrenoMm(control, el.x, el.y) - baseMm) / 1000 }] : [])),
    [escenario, control, baseMm],
  )
  return (
    <>
      {escenario.elementos.map((el, i) =>
        el.tipo === 'edificio' ? (
          <Edificio key={i} {...el} sueloM={sueloM(el.x, el.y)} />
        ) : el.tipo === 'estanque' ? (
          <Estanque key={i} {...el} sueloM={sueloM(el.x, el.y)} />
        ) : null,
      )}
      {arboles.length > 0 && <Arboles arboles={arboles} />}
    </>
  )
}
