import { Medal } from 'lucide-react'
import { paleta } from '@/estilos/paleta'
import type { Metal } from '@/datos/misiones'
import textos from '@/textos/es-CL.json'

export function ChipMetal({ metal, nombre, grupal }: { metal: Metal; nombre: string; grupal?: boolean }) {
  return (
    <span className="chip border border-tierra-200 bg-white text-tierra-800">
      <Medal size={14} style={{ color: paleta.insignia[metal] }} aria-hidden />
      {nombre}
      <span className="font-normal text-tierra-600">
        · {textos.metales[metal]}
        {grupal ? `, ${textos.viaje.grupal}` : ''}
      </span>
    </span>
  )
}
