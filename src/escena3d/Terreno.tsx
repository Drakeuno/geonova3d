import { useMemo } from 'react'
import * as THREE from 'three'
import type { Escenario } from '@/motor/escenarios'
import { puntosControl } from '@/motor/escenarios'
import { alturaTerrenoMm, limites, type Limites } from '@/motor/terreno'
import { COLORES_3D, gradienteToon } from './materiales'

/** Distancia de un punto a un segmento, en planta. */
function distanciaSegmento(px: number, py: number, [ax, ay]: [number, number], [bx, by]: [number, number]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Variación suave y determinista del pasto, para que no se vea plano. */
const ruido = (x: number, y: number) => (Math.sin(x * 0.21 + y * 0.13) + Math.sin(x * 0.07 - y * 0.19)) * 0.25 + 0.5

export function limitesEscena(e: Escenario): Limites {
  const extra = e.elementos.flatMap((el) => (el.tipo === 'camino' ? el.puntos.map(([x, y]) => ({ x, y })) : [{ x: el.x, y: el.y }]))
  return limites([...e.puntos, ...extra], 30)
}

/** Altura del suelo lejano (m sobre la base): un poco bajo la cota mínima del escenario. */
export const alturaHorizonteM = (e: Escenario, baseMm: number) => (Math.min(...puntosControl(e).map((p) => p.cotaMm)) - baseMm) / 1000 - 0.4

/** Franja del borde (m) donde el terreno baja suavemente hasta el suelo lejano. */
const BORDE_M = 12

export function Terreno({ escenario, baseMm }: { escenario: Escenario; baseMm: number }) {
  const geometria = useMemo(() => {
    const control = puntosControl(escenario)
    const lim = limitesEscena(escenario)
    const ancho = lim.maxX - lim.minX
    const largo = lim.maxY - lim.minY
    const g = new THREE.PlaneGeometry(ancho, largo, Math.ceil(ancho / 2), Math.ceil(largo / 2))
    g.rotateX(-Math.PI / 2)
    g.translate((lim.minX + lim.maxX) / 2, 0, -(lim.minY + lim.maxY) / 2)

    const caminos = escenario.elementos.filter((el) => el.tipo === 'camino')
    const pos = g.attributes.position
    const colores = new Float32Array(pos.count * 3)
    const [pasto, pastoOscuro, camino] = [COLORES_3D.pasto, COLORES_3D.pastoOscuro, COLORES_3D.camino].map((c) => new THREE.Color(c))
    const color = new THREE.Color()
    const horizonte = alturaHorizonteM(escenario, baseMm)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = -pos.getZ(i)
      // 5 mm bajo la cota real: las estacas y la mira asoman sin parpadeos. En el borde, el terreno
      // baja suavemente hasta el suelo lejano, para que no se vea cortado.
      const real = (alturaTerrenoMm(control, x, y) - baseMm) / 1000 - 0.005
      const t = Math.min(1, Math.min(x - lim.minX, lim.maxX - x, y - lim.minY, lim.maxY - y) / BORDE_M)
      const suave = t * t * (3 - 2 * t)
      pos.setY(i, horizonte + (real - horizonte) * suave)
      const enCamino = caminos.some((c) => c.puntos.slice(1).some((p, k) => distanciaSegmento(x, y, c.puntos[k], p) < c.ancho / 2))
      if (enCamino) color.copy(camino)
      else color.copy(pasto).lerp(pastoOscuro, ruido(x, y))
      color.toArray(colores, i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3))
    g.computeVertexNormals()
    return g
  }, [escenario, baseMm])

  const lim = limitesEscena(escenario)
  return (
    <>
      <mesh geometry={geometria}>
        <meshToonMaterial vertexColors gradientMap={gradienteToon()} />
      </mesh>
      {/* Suelo lejano: se pierde en la bruma del horizonte. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(lim.minX + lim.maxX) / 2, alturaHorizonteM(escenario, baseMm) - 0.01, -(lim.minY + lim.maxY) / 2]}>
        <circleGeometry args={[2000, 48]} />
        <meshToonMaterial color={COLORES_3D.pasto} gradientMap={gradienteToon()} />
      </mesh>
    </>
  )
}
