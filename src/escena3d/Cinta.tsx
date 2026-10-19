import { useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import { alturaTerrenoMm, type PuntoControl } from '@/motor/terreno'
import { formatearNumero } from '@/motor/numeros'
import { COLORES_3D } from './materiales'

// Cinta métrica tendida entre dos puntos, siguiendo el suelo, con la distancia medida.

interface Props {
  desde: { x: number; y: number }
  hasta: { x: number; y: number }
  distanciaM: number
  control: PuntoControl[]
  baseMm: number
}

export function Cinta({ desde, hasta, distanciaM, control, baseMm }: Props) {
  const puntos = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const t = i / 24
        const x = desde.x + (hasta.x - desde.x) * t
        const y = desde.y + (hasta.y - desde.y) * t
        return [x, (alturaTerrenoMm(control, x, y) - baseMm) / 1000 + 0.06, -y] as [number, number, number]
      }),
    [desde, hasta, control, baseMm],
  )
  const medio = puntos[12]
  return (
    <>
      <Line points={puntos} color={COLORES_3D.cinta} lineWidth={4} />
      <Html position={[medio[0], medio[1] + 0.8, medio[2]]} center className="pointer-events-none whitespace-nowrap rounded-full bg-[#E8C33A] px-2 py-0.5 font-mono text-xs font-bold text-tierra-900 shadow">
        {formatearNumero(distanciaM, 2)} m
      </Html>
    </>
  )
}
