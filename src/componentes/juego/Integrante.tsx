import { AlertCircle, CheckCircle2, Footprints } from 'lucide-react'
import { iniciales } from '@/datos/usuariosDemo'
import type { Situacion } from '@/motor/cuadrillas'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

// Piezas para mostrar a un integrante del curso: su avatar y dónde va en el viaje.

export function Avatar({ nombre, destacado = false }: { nombre: string; destacado?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${destacado ? 'bg-poncho-700 text-white' : 'bg-costa-100 text-costa-800'}`}
    >
      {iniciales(nombre)}
    </span>
  )
}

const ESTILO: Record<Situacion['tipo'], string> = {
  en: 'bg-poncho-100 text-poncho-800',
  atascado: 'bg-granate-100 text-granate-700',
  completo: 'bg-bosque-100 text-bosque-800',
}

export function ChipSituacion({ situacion }: { situacion: Situacion }) {
  const s = textos.cuadrilla.situacion
  const Icono = situacion.tipo === 'completo' ? CheckCircle2 : situacion.tipo === 'atascado' ? AlertCircle : Footprints
  return (
    <span className={`chip ${ESTILO[situacion.tipo]}`}>
      <Icono size={13} aria-hidden />
      {situacion.tipo === 'completo' ? s.completo : rellenar(s[situacion.tipo], { mision: situacion.mision })}
    </span>
  )
}
