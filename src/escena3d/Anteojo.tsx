import { Suspense, lazy } from 'react'
import { VENTANA_ANTEOJO_M } from './optica'
import { AnteojoPlano } from './AnteojoPlano'
import { Reticula } from './Reticula'
import { soportaWebGL } from './webgl'
import type { PropsAnteojo } from './Anteojo3D'

const Anteojo3D = lazy(() => import('./Anteojo3D'))

/**
 * Lo que ve el estudiante por el anteojo: la mira ampliada y la retícula. No muestra el valor de la
 * lectura: hay que leerlo en la graduación (decímetro, centímetro y estimar el milímetro).
 */
export function Anteojo({ tamano = 340, ventanaM = VENTANA_ANTEOJO_M, ...props }: Omit<PropsAnteojo, 'ventanaM'> & { tamano?: number; ventanaM?: number }) {
  const conWebGL = soportaWebGL()
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-[#A3B38C] shadow-inner ring-8 ring-tierra-900"
      style={{ width: tamano, height: tamano }}
      role="img"
      aria-label="Vista por el anteojo del nivel: la mira graduada con la cruz de la retícula"
    >
      {conWebGL ? (
        <Suspense fallback={null}>
          <Anteojo3D {...props} ventanaM={ventanaM} />
        </Suspense>
      ) : (
        <AnteojoPlano {...props} ventanaM={ventanaM} tamano={tamano} />
      )}
      <Reticula tamano={tamano} ventanaM={ventanaM} distanciaM={props.distanciaM} />
    </div>
  )
}
