import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, HandHelping, Minus, Users } from 'lucide-react'
import { MISIONES } from '@/datos/misiones'
import { useAyudar, useCurso } from '@/estado/cuadrillas'
import { useParametros } from '@/estado/parametros'
import { useSesion } from '@/estado/sesion'
import { buscarIntegrante, idAyuda, puedeAyudar, type AyudaRegistrada, type CuadrillaCurso, type Curso } from '@/motor/cuadrillas'
import type { MovimientoXp } from '@/motor/puntaje'
import { formatearNumero } from '@/motor/numeros'
import { Avatar, ChipSituacion } from '@/componentes/juego/Integrante'
import { PedidoAyuda } from '@/componentes/juego/PedidoAyuda'
import { VitrinaInsignias, contarInsignias } from '@/componentes/juego/VitrinaInsignias'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Desplazable } from '@/componentes/ui/Desplazable'

// Mi cuadrilla (RF-06): puntaje promedio + bonus, integrantes, insignias, ayuda entre compañeros y
// avance de la cuadrilla misión por misión.

const t = textos.cuadrilla
const a = textos.ayuda
const xp = (n: number) => formatearNumero(n, 0)
const NOMBRE_MOVIMIENTO: Record<MovimientoXp['tipo'], string> = textos.mision.movimientos

export default function Cuadrilla() {
  const usuarioId = useSesion((s) => s.usuarioId)
  const { curso, ayudas, error } = useCurso()
  const { parametros } = useParametros()
  const ayudar = useAyudar(usuarioId)

  if (error)
    return (
      <Pagina>
        <p role="alert" className="rounded-xl bg-granate-100 p-3 text-granate-700">
          {t.error}: {error}
        </p>
      </Pagina>
    )
  if (!curso || !parametros || !usuarioId)
    return (
      <Pagina>
        <p className="text-tierra-600">{t.cargando}</p>
      </Pagina>
    )
  const yo = buscarIntegrante(curso, usuarioId)
  if (!yo)
    return (
      <Pagina>
        <p className="text-tierra-600">{t.sinCuadrilla}</p>
      </Pagina>
    )

  const { cuadrilla, integrante } = yo
  const posicion = curso.clasificacion.findIndex((f) => f.id === cuadrilla.id) + 1
  const pedidos = curso.cuadrillas.flatMap((c) =>
    c.integrantes.filter((i) => i.situacion.tipo === 'atascado' && i.id !== usuarioId).map((i) => ({ i, c })),
  )
  const misAyudas = ayudas.filter((x) => x.ayudanteId === usuarioId)
  const validas = misAyudas.filter((x) => curso.ayudas[x.id] === 'valida')

  const listaPedidos = (lista: typeof pedidos) =>
    lista.length === 0 ? (
      <p className="text-sm text-tierra-600">{a.sinPedidos}</p>
    ) : (
      <ul className="grid gap-3 lg:grid-cols-2">
        {lista.map(({ i, c }) => {
          const mision = i.situacion.tipo === 'atascado' ? i.situacion.mision : ''
          const ayuda = misAyudas.find((x) => x.id === idAyuda(usuarioId, i.id, mision))
          return (
            <PedidoAyuda
              key={i.id}
              companero={i}
              cuadrilla={c.id === cuadrilla.id ? null : c.nombre}
              mision={mision}
              permiso={puedeAyudar(curso, ayudas, usuarioId, i.id)}
              ayuda={ayuda}
              estado={ayuda && curso.ayudas[ayuda.id]}
              onEnviar={(mensaje) => ayudar(i.id, mision, mensaje)}
            />
          )
        })}
      </ul>
    )

  return (
    <Pagina>
      <p className="mt-1 max-w-3xl text-tierra-600">{t.bajada}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <section className="card p-5" aria-labelledby="titulo-puntaje">
          <h2 id="titulo-puntaje" className="text-sm font-semibold uppercase tracking-wide text-bosque-700">
            {t.puntos} · {cuadrilla.nombre}
          </h2>
          <p className="mt-1 font-mono text-4xl font-semibold text-tierra-900">{xp(cuadrilla.puntos)}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-tierra-700">{t.promedio}</dt>
              <dd className="font-mono font-semibold">{xp(cuadrilla.promedioXp)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-tierra-700">{t.bonus}</dt>
              <dd className="font-mono font-semibold">+{xp(cuadrilla.bonusXp)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm font-semibold text-tierra-800">{rellenar(t.posicion, { posicion, total: curso.clasificacion.length })}</p>
          <Link to="/clasificacion" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
            {t.verClasificacion} <ArrowRight size={15} aria-hidden />
          </Link>
        </section>

        <section className="card overflow-hidden" aria-labelledby="titulo-integrantes">
          <h2 id="titulo-integrantes" className="flex items-center gap-2 border-b border-tierra-200 bg-tierra-100/60 px-5 py-3 text-lg font-bold text-tierra-900">
            <Users size={19} aria-hidden /> {t.integrantes}
          </h2>
          <ul className="divide-y divide-tierra-100">
            {cuadrilla.integrantes.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar nombre={i.nombre} destacado={i.jugador} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tierra-900">
                    {i.nombre}{' '}
                    <span className="text-xs font-normal text-tierra-600">({i.jugador ? t.tu : t.simulado})</span>
                  </p>
                  <div className="mt-1">
                    <ChipSituacion situacion={i.situacion} />
                  </div>
                </div>
                <div className="text-right text-sm leading-tight">
                  <p className="font-mono font-semibold text-buey-800">{rellenar(t.xp, { xp: xp(i.xp) })}</p>
                  <p className="text-xs text-tierra-600">{rellenar(textos.insignias.resumen, contarInsignias(i))}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-6 p-5" aria-labelledby="titulo-insignias">
        <h2 id="titulo-insignias" className="text-xl font-bold text-tierra-900">
          {textos.insignias.titulo}
        </h2>
        <p className="mb-3 text-sm text-tierra-600">{textos.insignias.bajada}</p>
        <VitrinaInsignias integrante={integrante} />
      </section>

      <section className="mt-6" aria-labelledby="titulo-ayuda">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="titulo-ayuda" className="flex items-center gap-2 text-xl font-bold text-tierra-900">
            <HandHelping size={22} className="text-bosque-700" aria-hidden /> {a.titulo}
          </h2>
          <span className="chip bg-bosque-100 text-bosque-800">{rellenar(a.contador, { n: Math.min(integrante.ayudados, 3) })}</span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-tierra-600">{a.bajada}</p>

        <h3 className="mt-4 font-bold text-tierra-900">{a.enTuCuadrilla}</h3>
        <div className="mt-2">{listaPedidos(pedidos.filter((p) => p.c.id === cuadrilla.id))}</div>
        <h3 className="mt-5 font-bold text-tierra-900">{a.otrasCuadrillas}</h3>
        <p className="text-sm text-tierra-600">{rellenar(a.bonusOtras, { xp: parametros.xp.bonusAyuda })}</p>
        <div className="mt-2">{listaPedidos(pedidos.filter((p) => p.c.id !== cuadrilla.id))}</div>

        {validas.length > 0 && <AyudasDadas ayudas={validas} curso={curso} />}
      </section>

      <MatrizMisiones cuadrilla={cuadrilla} />

      <section className="card mt-6 p-5" aria-labelledby="titulo-bonus">
        <h2 id="titulo-bonus" className="text-xl font-bold text-tierra-900">
          {t.bonusTitulo}
        </h2>
        {cuadrilla.movimientos.length === 0 ? (
          <p className="mt-1 text-sm text-tierra-600">{t.sinBonus}</p>
        ) : (
          <dl className="mt-2 max-w-md space-y-0.5 text-sm">
            {cuadrilla.movimientos.map((m, i) => (
              <div key={i} className="flex justify-between gap-4">
                <dt>
                  {NOMBRE_MOVIMIENTO[m.tipo]}
                  {m.misionId && <span className="text-tierra-600"> · {m.misionId}</span>}
                </dt>
                <dd className="font-mono font-semibold">+{xp(m.xp)} XP</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-tierra-200 pt-1 font-semibold">
              <dt>{t.total}</dt>
              <dd className="font-mono">+{xp(cuadrilla.bonusXp)} XP</dd>
            </div>
          </dl>
        )}
      </section>
    </Pagina>
  )
}

function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-tierra-900">{t.titulo}</h1>
      {children}
    </div>
  )
}

function AyudasDadas({ ayudas, curso }: { ayudas: AyudaRegistrada[]; curso: Curso }) {
  return (
    <div className="mt-5">
      <h3 className="font-bold text-tierra-900">{a.ayudadas}</h3>
      <ul className="mt-2 space-y-1.5">
        {ayudas.map((x) => {
          const companero = buscarIntegrante(curso, x.companeroId)?.integrante
          return (
            <li key={x.id} className="flex items-start gap-2 text-sm text-tierra-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-bosque-700" aria-hidden />
              {rellenar(a.estados.valida, { nombre: companero?.nombre ?? x.companeroId, mision: x.misionId })}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MatrizMisiones({ cuadrilla }: { cuadrilla: CuadrillaCurso }) {
  const m = t.matriz
  const marca = (ok: boolean) =>
    ok ? (
      <>
        <Check size={16} className="mx-auto text-bosque-700" aria-hidden />
        <span className="sr-only">{m.aprobada}</span>
      </>
    ) : (
      <>
        <Minus size={16} className="mx-auto text-tierra-400" aria-hidden />
        <span className="sr-only">{m.pendiente}</span>
      </>
    )
  return (
    <section className="card mt-6 overflow-hidden" aria-labelledby="titulo-matriz">
      <header className="border-b border-tierra-200 bg-tierra-100/60 px-5 py-3">
        <h2 id="titulo-matriz" className="text-lg font-bold text-tierra-900">
          {m.titulo}
        </h2>
        <p className="text-sm text-tierra-600">{m.bajada}</p>
      </header>
      <Desplazable etiqueta={textos.zonas.misionesCuadrilla}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tierra-200 text-left text-xs uppercase tracking-wide text-tierra-600">
              <th scope="col" className="px-4 py-2">
                {m.mision}
              </th>
              {cuadrilla.integrantes.map((i) => (
                <th key={i.id} scope="col" className="px-2 py-2 text-center" title={i.nombre}>
                  {i.jugador ? t.tu : i.nombre.split(' ')[0]}
                </th>
              ))}
              <th scope="col" className="px-4 py-2 text-center">
                {cuadrilla.nombre}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tierra-100">
            {MISIONES.map((mision) => (
              <tr key={mision.id}>
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <span className="font-mono font-semibold">{mision.id}</span>
                  <span className="hidden text-tierra-700 sm:inline"> · {mision.titulo}</span>
                </th>
                {mision.insignia.grupal ? (
                  <td colSpan={cuadrilla.integrantes.length} className="px-2 py-2 text-center text-xs font-semibold text-tierra-600">
                    {m.grupal}
                  </td>
                ) : (
                  cuadrilla.integrantes.map((i) => (
                    <td key={i.id} className="px-2 py-2 text-center">
                      {marca(i.aprobadas.includes(mision.id))}
                    </td>
                  ))
                )}
                <td className="px-4 py-2 text-center">{marca(cuadrilla.completadas.includes(mision.id))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Desplazable>
      <p className="border-t border-tierra-200 px-5 py-3 text-sm font-semibold text-tierra-800">
        {rellenar(m.completadas, { n: cuadrilla.completadas.length, total: MISIONES.length })}
      </p>
    </section>
  )
}
