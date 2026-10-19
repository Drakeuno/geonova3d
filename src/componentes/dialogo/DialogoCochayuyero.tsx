import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const t = textos.dialogo
const arte = (archivo: string) => `${import.meta.env.BASE_URL}arte/${archivo}`

/** Recorte de la cara del Cochayuyero en la imagen del Ñielol (activo provisorio, §13). */
export function RetratoCochayuyero({ tamano = 'h-20 w-20' }: { tamano?: string }) {
  return (
    <span className={`${tamano} shrink-0 overflow-hidden rounded-full ring-4 ring-buey-100`}>
      <img
        src={arte('cochayuyero-nielol.jpeg')}
        alt=""
        className="h-full w-full object-cover"
        style={{ transform: 'scale(3.2)', transformOrigin: '48% 38%' }}
      />
    </span>
  )
}

export type TonoDialogo = 'encargo' | 'pista' | 'logro' | 'rechazo'

const ESTILO: Record<TonoDialogo, string> = {
  encargo: 'border-tierra-200 bg-white',
  pista: 'border-buey-300 bg-buey-50',
  logro: 'border-bosque-300 bg-bosque-50',
  rechazo: 'border-granate-300 bg-granate-100/50',
}

interface Props {
  lineas: string[]
  tono?: TonoDialogo
  /** Marcas {pr}, {cotaPr}… que se rellenan en cada línea. */
  valores?: Record<string, string | number>
  /** Etiqueta sobre el texto (p. ej. "Encargo"). */
  etiqueta?: string
}

/**
 * Lo que dice el Cochayuyero, en texto: hasta que lleguen la voz y el arte finales, el texto es el
 * subtítulo (§9, accesibilidad). Con varias líneas se avanza de a una.
 */
export function DialogoCochayuyero({ lineas, tono = 'encargo', valores = {}, etiqueta }: Props) {
  const [i, setI] = useState(0)
  const actual = Math.min(i, lineas.length - 1)
  const varias = lineas.length > 1
  return (
    <figure className={`flex gap-4 rounded-2xl border p-4 shadow-card ${ESTILO[tono]}`}>
      <RetratoCochayuyero tamano="h-16 w-16 sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1">
        <figcaption className="flex flex-wrap items-baseline gap-x-2 font-display text-sm font-bold text-buey-700">
          {t.nombre}
          {etiqueta && <span className="font-sans text-xs font-semibold uppercase tracking-wide text-tierra-600">{etiqueta}</span>}
        </figcaption>
        <blockquote aria-live="polite" className="mt-1 text-tierra-900 sm:text-lg">
          {rellenar(lineas[actual], valores)}
        </blockquote>
        {varias && (
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="btn-neutro px-3 py-1.5" disabled={actual === 0} onClick={() => setI(actual - 1)} aria-label={t.anterior}>
              <ChevronLeft size={16} aria-hidden />
            </button>
            <span className="text-xs text-tierra-600">{rellenar(t.paso, { n: actual + 1, total: lineas.length })}</span>
            <button
              type="button"
              className="btn-neutro px-3 py-1.5"
              disabled={actual === lineas.length - 1}
              onClick={() => setI(actual + 1)}
            >
              {t.siguiente} <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </figure>
  )
}
