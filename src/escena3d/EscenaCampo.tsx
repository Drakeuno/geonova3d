import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { cotaVerdaderaMm, puntoPorId, puntosControl, type Escenario } from '@/motor/escenarios'
import { ALTURA_INSTRUMENTO_M, alturaTerrenoMm } from '@/motor/terreno'
import { aMundo, rumboHacia, type Vec3 } from './coordenadas'
import { Cinta } from './Cinta'
import { ControlCamara, type Vista } from './ControlCamara'
import { Elementos } from './Elementos'
import { Hitos } from './Hitos'
import { COLORES_3D } from './materiales'
import { Mira3D } from './Mira3D'
import { Nivel } from './Nivel'
import { limitesEscena, Terreno } from './Terreno'

export interface PropsEscenaCampo {
  escenario: Escenario
  /** Dónde está plantado el nivel. */
  estacion: { x: number; y: number } | null
  /** Altura de la línea de colimación (dato interno: solo ubica el anteojo en el dibujo). */
  colimacionMm: number | null
  /** Punto donde está la mira. */
  puntoVisado: string | null
  cinta: { desde: string; hasta: string; distanciaM: number } | null
  vista: Vista
  descripcion: string
}

export default function EscenaCampo({ escenario, estacion, colimacionMm, puntoVisado, cinta, vista, descripcion }: PropsEscenaCampo) {
  const control = useMemo(() => puntosControl(escenario), [escenario])
  const baseMm = useMemo(() => Math.floor(Math.min(...control.map((p) => p.cotaMm)) / 1000) * 1000, [control])
  const { centro, radio } = useMemo(() => {
    const l = limitesEscena(escenario)
    const cx = (l.minX + l.maxX) / 2
    const cy = (l.minY + l.maxY) / 2
    return { centro: aMundo(cx, cy, baseMm, baseMm), radio: Math.max(l.maxX - l.minX, l.maxY - l.minY) * 0.6 }
  }, [escenario, baseMm])

  const instrumento = useMemo(() => {
    if (!estacion) return null
    const sueloMm = alturaTerrenoMm(control, estacion.x, estacion.y)
    const alturaM = colimacionMm === null ? ALTURA_INSTRUMENTO_M : (colimacionMm - sueloMm) / 1000
    const visado = puntoVisado ? puntoPorId(escenario, puntoVisado) : null
    const rumbo = visado ? rumboHacia(estacion, visado) : 0
    const posicion = aMundo(estacion.x, estacion.y, sueloMm, baseMm)
    const ojoY = posicion[1] + alturaM + 0.25
    // Ojo un par de metros detrás del instrumento, en la dirección contraria a la mira.
    const ojo: Vec3 = [posicion[0] + 2.4 * Math.sin(rumbo), ojoY, posicion[2] + 2.4 * Math.cos(rumbo)]
    const objetivo: Vec3 = visado
      ? aMundo(visado.x, visado.y, cotaVerdaderaMm(escenario, visado.id) + 1300, baseMm)
      : [posicion[0], posicion[1] + alturaM, posicion[2] - 5]
    return { posicion, alturaM, rumbo, ojo, objetivo, visado }
  }, [estacion, colimacionMm, puntoVisado, escenario, control, baseMm])

  const mira = useMemo(() => {
    if (!puntoVisado) return null
    const p = puntoPorId(escenario, puntoVisado)
    return {
      posicion: aMundo(p.x, p.y, cotaVerdaderaMm(escenario, p.id), baseMm),
      rumbo: estacion ? rumboHacia(p, estacion) : 0,
    }
  }, [puntoVisado, escenario, estacion, baseMm])

  const tramoCinta = cinta ? { desde: puntoPorId(escenario, cinta.desde), hasta: puntoPorId(escenario, cinta.hasta) } : null

  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={[1, 1.5]}
      camera={{ fov: 45, near: 0.1, far: 2000, position: [centro[0] + radio * 0.55, radio * 0.6, centro[2] + radio * 0.8] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label={descripcion}
      role="img"
    >
      <color attach="background" args={[COLORES_3D.cielo]} />
      <fog attach="fog" args={[COLORES_3D.cielo, radio * 1.6, radio * 4.5]} />
      <hemisphereLight args={[COLORES_3D.cielo, COLORES_3D.pastoOscuro, 1.1]} />
      <directionalLight position={[60, 90, 40]} intensity={1.8} />

      <Terreno escenario={escenario} baseMm={baseMm} />
      <Elementos escenario={escenario} control={control} baseMm={baseMm} />
      <Hitos escenario={escenario} baseMm={baseMm} resaltado={puntoVisado} />

      {instrumento && <Nivel posicion={instrumento.posicion} alturaM={instrumento.alturaM} rumbo={instrumento.rumbo} />}
      {mira && <Mira3D posicion={mira.posicion} rumbo={mira.rumbo} />}
      {instrumento?.visado && mira && (
        // Visual: línea horizontal punteada del anteojo a la mira.
        <Line
          points={[
            [instrumento.posicion[0], instrumento.posicion[1] + instrumento.alturaM, instrumento.posicion[2]],
            [mira.posicion[0], instrumento.posicion[1] + instrumento.alturaM, mira.posicion[2]],
          ]}
          color={COLORES_3D.visual}
          lineWidth={1.5}
          dashed
          dashSize={0.4}
          gapSize={0.3}
        />
      )}
      {tramoCinta && cinta && (
        <Cinta desde={tramoCinta.desde} hasta={tramoCinta.hasta} distanciaM={cinta.distanciaM} control={control} baseMm={baseMm} />
      )}

      <ControlCamara vista={vista} centro={centro} radio={radio} instrumento={instrumento && { ojo: instrumento.ojo, objetivo: instrumento.objetivo }} />
    </Canvas>
  )
}
