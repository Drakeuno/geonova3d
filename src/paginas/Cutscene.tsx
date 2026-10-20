import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, HeartHandshake } from 'lucide-react'
import { useCurso } from '@/estado/cuadrillas'
import { useDialogos } from '@/estado/dialogos'
import { useXpIndividual } from '@/estado/juego'
import { useSesion } from '@/estado/sesion'
import { useViajeDe } from '@/estado/viaje'
import { MISIONES } from '@/datos/misiones'
import { buscarIntegrante } from '@/motor/cuadrillas'
import { formatearNumero } from '@/motor/numeros'
import { ChipMetal } from '@/componentes/ui/ChipMetal'
import { RetratoCochayuyero } from '@/componentes/dialogo/DialogoCochayuyero'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

// Tramos narrativos (§4): Puerto Saavedra (Acto 1), la llegada al Ñielol (Acto 3) y el cierre del viaje.
// Sin jugabilidad propia. Las imágenes son arte provisorio hasta el definitivo (§13).

const t = textos.cutscene
const arte = (archivo: string) => `${import.meta.env.BASE_URL}arte/${archivo}`

const ESCENAS: Record<string, { imagen: string; alt: string; siguiente: { a: string; texto: string } }> = {
  '1': { imagen: 'cochayuyero-puerto-saavedra.jpeg', alt: t.alt1, siguiente: { a: '/mision/2.1', texto: t.seguir1 } },
  '3': { imagen: 'cochayuyero-nielol.jpeg', alt: t.alt3, siguiente: { a: '/mision/3.1', texto: t.seguir3 } },
  fin: { imagen: 'cochayuyero-nielol.jpeg', alt: t.alt3, siguiente: { a: '/viaje', texto: t.seguirFin } },
}

export default function Cutscene() {
  const { acto = '' } = useParams()
  const { dialogos, error } = useDialogos()
  const usuarioId = useSesion((s) => s.usuarioId)
  const viaje = useViajeDe(usuarioId)
  const xp = useXpIndividual(usuarioId)
  const { curso } = useCurso()
  const yo = curso && usuarioId ? buscarIntegrante(curso, usuarioId) : null
  const [i, setI] = useState(0)
  const escena = ESCENAS[acto]
  if (!escena) return <Navigate to="/viaje" replace />
  const guion = dialogos?.actos[acto]
  const lineas = guion?.lineas ?? []
  const ultima = i >= lineas.length - 1

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/viaje" className="inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
        <ArrowLeft size={16} aria-hidden /> {t.volver}
      </Link>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-bosque-700">{rellenar(t.acto, { n: acto })}</p>
      <h1 className="text-3xl font-bold text-tierra-900">{guion?.titulo ?? ''}</h1>

      <figure className="card mt-4 overflow-hidden">
        <img src={arte(escena.imagen)} alt={escena.alt} className="max-h-[56vh] w-full object-cover object-[50%_35%]" />
        <figcaption className="flex gap-4 border-t border-tierra-200 p-4">
          <RetratoCochayuyero tamano="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-buey-700">{textos.dialogo.nombre}</p>
            {error ? (
              <p role="alert" className="text-granate-700">
                {error}
              </p>
            ) : (
              <p aria-live="polite" className="mt-1 text-lg text-tierra-900">
                {lineas[i] ?? t.cargando}
              </p>
            )}
            {lineas.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn-neutro px-3 py-1.5" disabled={i === 0} onClick={() => setI(i - 1)} aria-label={textos.dialogo.anterior}>
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <span className="text-xs text-tierra-600">{rellenar(textos.dialogo.paso, { n: i + 1, total: lineas.length })}</span>
                {ultima ? (
                  <Link to={escena.siguiente.a} className="btn-primario">
                    {escena.siguiente.texto} <ArrowRight size={16} aria-hidden />
                  </Link>
                ) : (
                  <button type="button" className="btn-neutro px-3 py-1.5" onClick={() => setI(i + 1)}>
                    {textos.dialogo.siguiente} <ChevronRight size={16} aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>
        </figcaption>
      </figure>

      {acto === 'fin' && (
        <section className="card mt-4 p-5" aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen" className="text-xl font-bold text-tierra-900">
            {t.resumen}
          </h2>
          <p className="mt-1 font-mono text-lg font-semibold text-buey-800">{rellenar(t.xp, { xp: formatearNumero(xp, 0) })}</p>
          {yo && curso && (
            <p className="text-sm font-semibold text-poncho-800">
              {rellenar(t.cuadrilla, {
                nombre: yo.cuadrilla.nombre,
                puntos: formatearNumero(yo.cuadrilla.puntos, 0),
                posicion: curso.clasificacion.findIndex((f) => f.id === yo.cuadrilla.id) + 1,
                total: curso.clasificacion.length,
              })}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MISIONES.filter((m) => viaje?.[m.id]?.aprobadaEn != null).map((m) => (
              <ChipMetal key={m.id} metal={m.insignia.metal} nombre={m.insignia.nombre} grupal={m.insignia.grupal} />
            ))}
            {yo?.integrante.especial && (
              <span className="chip border border-granate-200 bg-granate-50 text-granate-700">
                <HeartHandshake size={14} aria-hidden /> {textos.insignias.especial}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
