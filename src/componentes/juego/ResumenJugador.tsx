import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Trophy } from 'lucide-react'
import { MISIONES } from '@/datos/misiones'
import { useCurso } from '@/estado/cuadrillas'
import { buscarIntegrante } from '@/motor/cuadrillas'
import { formatearNumero } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { VitrinaCompacta } from './VitrinaInsignias'

// Resumen del jugador en el mapa del viaje: XP, puntaje y lugar de su cuadrilla, avance e insignias.

const t = textos.viaje

export function ResumenJugador({ usuarioId, xp, aprobadas }: { usuarioId: string | null; xp: number; aprobadas: number }) {
  const { curso } = useCurso()
  const yo = curso && usuarioId ? buscarIntegrante(curso, usuarioId) : null
  const posicion = yo && curso ? curso.clasificacion.findIndex((f) => f.id === yo.cuadrilla.id) + 1 : 0
  const progreso = rellenar(t.progreso, { n: aprobadas, total: MISIONES.length })

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-buey-100 text-buey-800">
          <Sparkles size={13} aria-hidden /> {rellenar(t.misXp, { xp: formatearNumero(xp, 0) })}
        </span>
        {yo && curso && (
          <Link to="/clasificacion" className="chip bg-poncho-100 text-poncho-800 hover:bg-poncho-200">
            <Trophy size={13} aria-hidden />
            {rellenar(t.puntosCuadrilla, {
              nombre: yo.cuadrilla.nombre,
              puntos: formatearNumero(yo.cuadrilla.puntos, 0),
              posicion,
              total: curso.clasificacion.length,
            })}
          </Link>
        )}
      </div>
      <div className="max-w-md">
        <p className="text-sm font-semibold text-tierra-700">{progreso}</p>
        <div
          role="progressbar"
          aria-label={progreso}
          aria-valuemin={0}
          aria-valuemax={MISIONES.length}
          aria-valuenow={aprobadas}
          className="mt-1 h-2 overflow-hidden rounded-full bg-tierra-200"
        >
          <div className="h-full rounded-full bg-bosque-600 transition-all" style={{ width: `${(100 * aprobadas) / MISIONES.length}%` }} />
        </div>
      </div>
      {yo && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <VitrinaCompacta integrante={yo.integrante} />
          <Link to="/cuadrilla" className="inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
            {t.verCuadrilla} <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  )
}
