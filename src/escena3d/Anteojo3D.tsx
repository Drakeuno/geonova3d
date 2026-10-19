import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { campoVisualGrados } from './optica'
import { ANCHO_MIRA_M, LARGO_MIRA_M } from './geometriaMira'
import { crearTexturaMira } from './texturaMira'

// Vista por el anteojo en 3D: una cámara de campo estrecho en la línea de colimación, apuntando a
// la mira. La cámara se inclina según el error del montaje, así la cruz (fija al centro) cae donde
// corresponde: lectura verdadera + desplazamiento.

export interface PropsAnteojo {
  distanciaM: number
  cotaPuntoMm: number
  colimacionMm: number
  desplazamientoMm: number
  ventanaM: number
}

function CamaraAnteojo({ distanciaM, inclinacionM, ventanaM }: { distanciaM: number; inclinacionM: number; ventanaM: number }) {
  const { camera, invalidate } = useThree()
  useLayoutEffect(() => {
    const c = camera as THREE.PerspectiveCamera
    c.fov = campoVisualGrados(distanciaM, ventanaM)
    c.near = Math.max(0.05, distanciaM - 5)
    c.far = distanciaM + 50
    c.position.set(0, 0, 0)
    c.lookAt(0, inclinacionM, -distanciaM)
    c.updateProjectionMatrix()
    invalidate()
  }, [camera, distanciaM, inclinacionM, ventanaM, invalidate])
  return null
}

function MiraLejana({ distanciaM, pieM }: { distanciaM: number; pieM: number }) {
  const gl = useThree((s) => s.gl)
  const textura = useMemo(() => crearTexturaMira(gl), [gl])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh position={[0, pieM + LARGO_MIRA_M / 2, -distanciaM]}>
      <planeGeometry args={[ANCHO_MIRA_M, LARGO_MIRA_M]} />
      <meshBasicMaterial map={textura} toneMapped={false} />
    </mesh>
  )
}

export default function Anteojo3D({ distanciaM, cotaPuntoMm, colimacionMm, desplazamientoMm, ventanaM }: PropsAnteojo) {
  return (
    <Canvas frameloop="demand" flat dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: [0, 0, 0] }}>
      {/* Fondo desenfocado: pasto y árboles lejanos. */}
      <color attach="background" args={['#A3B38C']} />
      <CamaraAnteojo distanciaM={distanciaM} inclinacionM={desplazamientoMm / 1000} ventanaM={ventanaM} />
      <MiraLejana distanciaM={distanciaM} pieM={(cotaPuntoMm - colimacionMm) / 1000} />
    </Canvas>
  )
}
