import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Binoculars, CheckCircle2, Clapperboard, Lock, NotebookPen, Play, RotateCcw, Sparkles } from 'lucide-react'
import { ACTOS, misionesDelActo, type ActoViaje, type MisionCatalogo } from '@/datos/misiones'
import { useParametros } from '@/estado/parametros'
import { useSesion } from '@/estado/sesion'
import { useXpIndividual } from '@/estado/juego'
import { estadoVisible, useViaje, useViajeDe } from '@/estado/viaje'
import type { EstadoMision } from '@/motor/progreso'
import { esJugable } from '@/misiones/definiciones'
import { ChipMetal } from '@/componentes/ui/ChipMetal'
import { RetratoCochayuyero } from '@/componentes/dialogo/DialogoCochayuyero'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const arte = (archivo: string) => `${import.meta.env.BASE_URL}arte/${archivo}`

export default function MapaViaje() {
  const { parametros } = useParametros()
  const usuarioId = useSesion((s) => s.usuarioId)
  const viaje = useViajeDe(usuarioId)
  const todasAbiertas = useViaje((s) => s.todasAbiertas)
  const xp = useXpIndividual(usuarioId)
  // El tramo de Puerto Saavedra se abre al terminar el campamento (al aprobar la última misión del Acto 0).
  const actoAbierto = (acto: number) => {
    const ultimaAnterior = misionesDelActo((acto - 1) as 0).slice(-1)[0]
    return todasAbiertas || (ultimaAnterior ? viaje?.[ultimaAnterior.id]?.aprobadaEn != null : false)
  }
  // XP base de la misión (§6.2): la cooperativa suma su bonus (2.3 = Oro 150 + 100).
  const xpDe = (m: MisionCatalogo) =>
    parametros
      ? parametros.xp.porInsignia[m.nivelXp] + (m.cooperativa ? parametros.xp.bonusCooperativa : 0)
      : undefined

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-bosque-700">{textos.app.parte}</p>
          <h1 className="mt-1 text-3xl font-bold text-tierra-900 sm:text-4xl">{textos.viaje.titulo}</h1>
          <p className="mt-2 text-tierra-600">{textos.viaje.ruta}</p>
          <p className="mt-3">
            <span className="chip bg-buey-100 text-buey-800">
              <Sparkles size={13} aria-hidden /> {rellenar(textos.viaje.misXp, { xp })}
            </span>
          </p>
        </div>
        <figure className="card flex items-center gap-4 p-4">
          <RetratoCochayuyero />
          <blockquote>
            <p className="font-display text-sm font-bold text-buey-700">Cochayuyero</p>
            <p className="mt-0.5 text-tierra-800">{textos.viaje.saludo}</p>
          </blockquote>
        </figure>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <TarjetaPractica a="/campo" icono={<Binoculars size={22} aria-hidden />} titulo={textos.campo.enlace} bajada={textos.campo.enlaceBajada} />
        <TarjetaPractica a="/practica" icono={<NotebookPen size={22} aria-hidden />} titulo={textos.practica.enlace} bajada={textos.practica.enlaceBajada} />
      </div>

      <RutaActos />

      <div className="mt-8 space-y-6">
        {ACTOS.map((acto) => (
          <section key={acto.id} className="card overflow-hidden">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-tierra-200 bg-tierra-100/60 px-5 py-3">
              <h2 className="text-xl font-bold text-tierra-900">
                {textos.viaje.actoPrefijo} {acto.id} · {acto.nombre}
              </h2>
              <span className="text-sm text-tierra-600">{acto.escenario}</span>
            </header>
            {acto.cutscene ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <img
                  src={arte('cochayuyero-puerto-saavedra.jpeg')}
                  alt=""
                  className="h-32 w-full rounded-xl object-cover object-[50%_30%] sm:w-56"
                />
                <div className="flex-1">
                  <p className="flex items-start gap-2 text-tierra-800">
                    <Clapperboard size={20} className="mt-0.5 shrink-0 text-poncho-500" aria-hidden />
                    {textos.viaje.cutscene}
                  </p>
                  <div className="mt-3">
                    {actoAbierto(acto.id) ? (
                      <Link to={`/acto/${acto.id}`} className="btn-primario">
                        <Play size={15} aria-hidden /> {textos.viaje.verTramo}
                      </Link>
                    ) : (
                      <span className="chip bg-tierra-100 text-tierra-700">
                        <Lock size={13} aria-hidden /> {textos.viaje.tramoBloqueado}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-tierra-100">
                {misionesDelActo(acto.id).map((m) => (
                  <FilaMision key={m.id} mision={m} xp={xpDe(m)} estado={estadoVisible(viaje?.[m.id], todasAbiertas)} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function TarjetaPractica({ a, icono, titulo, bajada }: { a: string; icono: ReactNode; titulo: string; bajada: string }) {
  return (
    <Link
      to={a}
      className="card flex items-center gap-4 p-4 transition hover:border-bosque-300 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-bosque-700 text-white">{icono}</span>
      <span className="flex-1">
        <span className="block font-display text-lg font-bold text-tierra-900">{titulo}</span>
        <span className="block text-sm text-tierra-600">{bajada}</span>
      </span>
      <ArrowRight className="shrink-0 text-tierra-400" aria-hidden />
    </Link>
  )
}

function RutaActos() {
  return (
    <ol className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {ACTOS.map((a: ActoViaje, i) => (
        <li key={a.id} className="relative flex items-start">
          {i < ACTOS.length - 1 && (
            <span aria-hidden className="absolute left-5 top-5 hidden h-0.5 w-full bg-tierra-300 sm:block" />
          )}
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bosque-700 font-display font-bold text-white ring-4 ring-tierra-50">
            {a.id}
          </span>
          <span className="relative bg-tierra-50 pl-3 pr-2 text-sm leading-tight">
            <span className="block font-semibold text-tierra-900">{a.nombre}</span>
            <span className="block text-tierra-600">{a.lugar}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

const ACCION: Partial<Record<EstadoMision, [string, ReactNode]>> = {
  disponible: [textos.viaje.jugar, <Play key="j" size={15} aria-hidden />],
  en_curso: [textos.viaje.continuar, <ArrowRight key="c" size={15} aria-hidden />],
  en_evaluacion: [textos.viaje.continuar, <ArrowRight key="e" size={15} aria-hidden />],
  a_reintentar: [textos.viaje.reintentar, <RotateCcw key="r" size={15} aria-hidden />],
  aprobada: [textos.viaje.ver, <CheckCircle2 key="v" size={15} aria-hidden />],
}

const COLOR_ESTADO: Record<EstadoMision, string> = {
  bloqueada: 'bg-tierra-100 text-tierra-700',
  disponible: 'bg-poncho-100 text-poncho-800',
  en_curso: 'bg-buey-100 text-buey-800',
  en_evaluacion: 'bg-buey-100 text-buey-800',
  a_reintentar: 'bg-granate-100 text-granate-700',
  aprobada: 'bg-bosque-100 text-bosque-800',
}

function FilaMision({ mision: m, xp, estado }: { mision: MisionCatalogo; xp?: number; estado: EstadoMision }) {
  const jugable = esJugable(m.id)
  const accion = ACCION[estado]
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-poncho-700 font-mono text-lg font-semibold text-white">
        {m.id}
      </span>
      <div className="flex-1">
        <p className="font-display text-lg font-bold text-tierra-900">{m.titulo}</p>
        <p className="text-sm text-tierra-600">{m.competencia}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.ra.map((ra) => (
            <span key={ra} className="chip bg-poncho-100 text-poncho-800">
              {ra}
            </span>
          ))}
          <ChipMetal metal={m.insignia.metal} nombre={m.insignia.nombre} grupal={m.insignia.grupal} />
          {xp !== undefined && (
            <span className="chip bg-buey-100 text-buey-800">
              +{xp} {textos.viaje.xp}
            </span>
          )}
        </div>
      </div>
      {!jugable ? (
        <span className="chip w-fit bg-tierra-100 text-tierra-700">
          <Lock size={13} aria-hidden /> {textos.viaje.enConstruccion}
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <span className={`chip ${COLOR_ESTADO[estado]}`}>
            {estado === 'bloqueada' && <Lock size={13} aria-hidden />} {textos.estados[estado]}
          </span>
          {accion && (
            <Link to={`/mision/${m.id}`} className={estado === 'aprobada' ? 'btn-neutro' : 'btn-primario'}>
              {accion[1]} {accion[0]}
            </Link>
          )}
        </div>
      )}
    </li>
  )
}
