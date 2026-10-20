import { HeartHandshake, Medal } from 'lucide-react'
import { paleta } from '@/estilos/paleta'
import type { ClaveInsignia } from '@/motor/cuadrillas'

const TAMANOS = {
  sm: { caja: 'h-7 w-7 border', icono: 14 },
  md: { caja: 'h-11 w-11 border-2', icono: 20 },
} as const

/** Disco de una insignia: con el color de su metal si se obtuvo, en gris si falta. Decorativo. */
export function Medalla({ clave, obtenida, tamano = 'md' }: { clave: ClaveInsignia; obtenida: boolean; tamano?: keyof typeof TAMANOS }) {
  const Icono = clave === 'especial' ? HeartHandshake : Medal
  const color = paleta.insignia[clave]
  const t = TAMANOS[tamano]
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${t.caja} ${obtenida ? '' : 'border-dashed border-tierra-300 bg-tierra-50'}`}
      style={obtenida ? { borderColor: color, backgroundColor: `${color}1F` } : undefined}
    >
      <Icono size={t.icono} className={obtenida ? undefined : 'text-tierra-400'} style={obtenida ? { color } : undefined} />
    </span>
  )
}
