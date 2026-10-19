import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Binoculars, Clapperboard, Lock, NotebookPen } from 'lucide-react'
import { ACTOS, misionesDelActo, type ActoViaje, type MisionCatalogo } from '@/datos/misiones'
import { useParametros } from '@/estado/parametros'
import { ChipMetal } from '@/componentes/ui/ChipMetal'
import textos from '@/textos/es-CL.json'

const arte = (archivo: string) => `${import.meta.env.BASE_URL}arte/${archivo}`

export default function MapaViaje() {
  const { parametros } = useParametros()
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
                <p className="flex items-start gap-2 text-tierra-800">
                  <Clapperboard size={20} className="mt-0.5 shrink-0 text-poncho-500" aria-hidden />
                  {textos.viaje.cutscene}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-tierra-100">
                {misionesDelActo(acto.id).map((m) => (
                  <FilaMision key={m.id} mision={m} xp={xpDe(m)} />
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

/** Recorte de la cara del Cochayuyero en la imagen del Ñielol (activo provisorio). */
function RetratoCochayuyero() {
  return (
    <span className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-4 ring-buey-100">
      <img
        src={arte('cochayuyero-nielol.jpeg')}
        alt=""
        className="h-full w-full object-cover"
        style={{ transform: 'scale(3.2)', transformOrigin: '48% 38%' }}
      />
    </span>
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

function FilaMision({ mision: m, xp }: { mision: MisionCatalogo; xp?: number }) {
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
      <span className="chip w-fit bg-tierra-100 text-tierra-700">
        <Lock size={13} aria-hidden /> {textos.viaje.enConstruccion}
      </span>
    </li>
  )
}
