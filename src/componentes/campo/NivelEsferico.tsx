import { useId } from 'react'
import { RotateCcw, RotateCw } from 'lucide-react'
import {
  DIRECCION_TORNILLOS,
  NOMBRE_TORNILLOS,
  burbujaCalada,
  desviacionBurbuja,
  girarTornillo,
  type Burbuja,
  type Tornillo,
} from '@/motor/burbuja'
import { BURBUJA_CENTRADA } from '@/motor/lecturas'
import { paleta } from '@/estilos/paleta'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const t = textos.campo.burbuja

// Minijuego de montaje (§6.3): calar la burbuja del nivel esférico con los tres tornillos.
// Teclado: Q/A tornillo A, W/S tornillo B, E/D tornillo C (subir/bajar).

const TECLAS: Record<string, [Tornillo, 1 | -1]> = {
  q: [0, 1],
  a: [0, -1],
  w: [1, 1],
  s: [1, -1],
  e: [2, 1],
  d: [2, -1],
}

export function NivelEsferico({ burbuja, onCambio }: { burbuja: Burbuja; onCambio: (b: Burbuja) => void }) {
  const idAyuda = useId()
  const R = 96
  const rBurbuja = 17
  const c = 150
  const recorrido = R - rBurbuja
  const bx = c + burbuja.x * recorrido
  const by = c - burbuja.y * recorrido
  const calada = burbujaCalada(burbuja)
  const girar = (tornillo: Tornillo, sentido: 1 | -1) => onCambio(girarTornillo(burbuja, tornillo, sentido))

  return (
    <div
      tabIndex={0}
      aria-describedby={idAyuda}
      onKeyDown={(e) => {
        const accion = TECLAS[e.key.toLowerCase()]
        if (accion) {
          e.preventDefault()
          girar(...accion)
        }
      }}
      className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500"
    >
      <div className="relative mx-auto" style={{ width: 300, height: 300 }}>
        <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label={calada ? t.calada : rellenar(t.desviacion, { pct: Math.round(desviacionBurbuja(burbuja) * 100) })}>
          <circle cx={c} cy={c} r={R + 10} fill={paleta.tierra[200]} stroke={paleta.tierra[900]} strokeWidth={2} />
          <circle cx={c} cy={c} r={R} fill="#DCEBC4" stroke={paleta.tierra[700]} strokeWidth={1.5} />
          <circle cx={c} cy={c} r={rBurbuja + BURBUJA_CENTRADA * recorrido} fill="none" stroke={paleta.tierra[900]} strokeWidth={1.5} />
          <circle cx={bx} cy={by} r={rBurbuja} fill={calada ? paleta.bosque[300] : '#F4FAE8'} stroke={paleta.bosque[700]} strokeWidth={2} />
          <circle cx={bx - 5} cy={by - 6} r={4} fill="white" opacity={0.8} />
        </svg>
        {DIRECCION_TORNILLOS.map((d, i) => {
          const x = c + d.x * (R + 34)
          const y = c - d.y * (R + 34)
          const nombre = NOMBRE_TORNILLOS[i]
          return (
            <div key={nombre} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-white/95 p-1 shadow" style={{ left: x, top: y }}>
              <button type="button" onClick={() => girar(i as Tornillo, -1)} className="grid h-8 w-8 place-items-center rounded-full text-tierra-800 hover:bg-tierra-100" aria-label={rellenar(t.bajar, { t: nombre })}>
                <RotateCcw size={16} aria-hidden />
              </button>
              <span className="w-4 text-center font-display font-bold text-tierra-900">{nombre}</span>
              <button type="button" onClick={() => girar(i as Tornillo, 1)} className="grid h-8 w-8 place-items-center rounded-full text-tierra-800 hover:bg-tierra-100" aria-label={rellenar(t.subir, { t: nombre })}>
                <RotateCw size={16} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
      <p className={`mt-1 text-center font-semibold ${calada ? 'text-bosque-700' : 'text-granate-700'}`} aria-live="polite">
        {calada ? t.calada : rellenar(t.desviacion, { pct: Math.round(desviacionBurbuja(burbuja) * 100) })}
      </p>
      <p id={idAyuda} className="mt-1 text-center text-xs text-tierra-600">
        {t.ayuda}
      </p>
    </div>
  )
}
