import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { ANCHO_MIRA_M, LARGO_MIRA_M } from './geometriaMira'
import { COLORES_3D, gradienteToon } from './materiales'
import { crearTexturaMira } from './texturaMira'

// Mira de 3 m plantada sobre el punto, con la cara graduada hacia el instrumento, y el portamira
// que la sostiene.

interface Props {
  posicion: [number, number, number]
  /** Giro para que el frente local (−z) apunte al instrumento. */
  rumbo: number
}

export function Mira3D({ posicion, rumbo }: Props) {
  const gl = useThree((s) => s.gl)
  const textura = useMemo(() => crearTexturaMira(gl), [gl])
  useEffect(() => () => textura.dispose(), [textura])
  const gradiente = gradienteToon()

  return (
    <group position={posicion} rotation={[0, rumbo, 0]}>
      {/* Cuerpo de aluminio y cara graduada, que mira hacia −z (al instrumento). */}
      <mesh position={[0, LARGO_MIRA_M / 2, 0.012]}>
        <boxGeometry args={[ANCHO_MIRA_M + 0.006, LARGO_MIRA_M, 0.022]} />
        <meshToonMaterial color={COLORES_3D.metal} gradientMap={gradiente} />
        <Outlines thickness={1.2} color={COLORES_3D.contorno} />
      </mesh>
      <mesh position={[0, LARGO_MIRA_M / 2, -0.0005]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ANCHO_MIRA_M, LARGO_MIRA_M]} />
        <meshBasicMaterial map={textura} toneMapped={false} />
      </mesh>
      {/* Portamira con poncho, detrás de la mira. */}
      <group position={[0.32, 0, 0.35]}>
        <mesh position={[0, 0.8, 0]}>
          <capsuleGeometry args={[0.2, 0.75, 4, 10]} />
          <meshToonMaterial color={COLORES_3D.ponchoPortamira} gradientMap={gradiente} />
          <Outlines thickness={1.2} color={COLORES_3D.contorno} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshToonMaterial color={COLORES_3D.piel} gradientMap={gradiente} />
          <Outlines thickness={1.2} color={COLORES_3D.contorno} />
        </mesh>
        <mesh position={[0, 1.66, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.025, 14]} />
          <meshToonMaterial color={COLORES_3D.tronco} gradientMap={gradiente} />
        </mesh>
      </group>
    </group>
  )
}
