import { Html, Outlines } from '@react-three/drei'
import type { Escenario } from '@/motor/escenarios'
import { aMm } from '@/motor/numeros'
import { aMundo } from './coordenadas'
import { COLORES_3D, gradienteToon } from './materiales'

// Puntos del escenario: los PR son monolitos de hormigón; el resto, estacas. La etiqueta solo dice
// el nombre del punto: la cota verdadera es un dato interno y nunca se muestra.

export function Hitos({ escenario, baseMm, resaltado }: { escenario: Escenario; baseMm: number; resaltado: string | null }) {
  const gradiente = gradienteToon()
  return (
    <>
      {escenario.puntos.map((p) => {
        const posicion = aMundo(p.x, p.y, aMm(p.cota), baseMm)
        const activo = p.id === resaltado
        return (
          <group key={p.id} position={posicion}>
            {p.pr ? (
              <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[0.35, 0.18, 0.35]} />
                <meshToonMaterial color={COLORES_3D.hito} gradientMap={gradiente} />
                <Outlines thickness={1.5} color={COLORES_3D.contorno} />
              </mesh>
            ) : (
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.03, 0.025, 0.25, 8]} />
                <meshToonMaterial color={COLORES_3D.estaca} gradientMap={gradiente} />
                <Outlines thickness={1.2} color={COLORES_3D.contorno} />
              </mesh>
            )}
            <Html
              position={[0, activo ? 3.4 : 0.9, 0]}
              center
              className={`pointer-events-none whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold shadow ${
                activo ? 'bg-buey-600 text-white' : p.pr ? 'bg-poncho-700 text-white' : 'bg-white/90 text-tierra-900'
              }`}
            >
              {p.nombre ?? p.id}
            </Html>
          </group>
        )
      })}
    </>
  )
}
