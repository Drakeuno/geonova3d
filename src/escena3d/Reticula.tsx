import { useId } from 'react'
import { semiIntervaloEstadimetricoM } from './optica'

// Retícula del anteojo: hilo horizontal, vertical y estadimétricos (si caen dentro del campo).
// Cada hilo lleva un halo claro para verse sobre las barras negras y rojas de la mira.

export function Reticula({ tamano, ventanaM, distanciaM }: { tamano: number; ventanaM: number; distanciaM: number }) {
  const id = `vineta-${useId().replace(/:/g, '')}`
  const c = tamano / 2
  const estadimetrico = (semiIntervaloEstadimetricoM(distanciaM) / ventanaM) * tamano
  const hilo = (props: { x1: number; y1: number; x2: number; y2: number }) => (
    <>
      <line {...props} stroke="rgba(255,255,255,0.75)" strokeWidth={2.6} />
      <line {...props} stroke="#141414" strokeWidth={1.1} />
    </>
  )
  return (
    <svg viewBox={`0 0 ${tamano} ${tamano}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="75%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
      </defs>
      {hilo({ x1: 0, y1: c, x2: tamano, y2: c })}
      {hilo({ x1: c, y1: 0, x2: c, y2: tamano })}
      {estadimetrico < c - 12 &&
        [-1, 1].map((s) => <g key={s}>{hilo({ x1: c - 40, y1: c + s * estadimetrico, x2: c + 40, y2: c + s * estadimetrico })}</g>)}
      <rect width={tamano} height={tamano} fill={`url(#${id})`} />
    </svg>
  )
}
