import { Fragment, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { MISIONES } from '@/datos/misiones'
import { useCurso } from '@/estado/cuadrillas'
import { useSesion } from '@/estado/sesion'
import { paleta } from '@/estilos/paleta'
import { buscarIntegrante, type ClaveInsignia, type CuadrillaCurso } from '@/motor/cuadrillas'
import { formatearNumero } from '@/motor/numeros'
import { Avatar, ChipSituacion } from '@/componentes/juego/Integrante'
import { contarInsignias } from '@/componentes/juego/VitrinaInsignias'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

// Tabla de clasificación colaborativa por cuadrilla (RF-10, §6.2): puntos, misiones completadas,
// insignias y % de precisión del Ñielol.

const t = textos.clasificacion
const c = t.columnas
const xp = (n: number) => formatearNumero(n, 0)
const CLAVES: ClaveInsignia[] = ['bronce', 'plata', 'oro', 'platino', 'especial']
const nombreInsignia = (k: ClaveInsignia) => (k === 'especial' ? textos.insignias.especialMetal : textos.metales[k])

export default function Clasificacion() {
  const usuarioId = useSesion((s) => s.usuarioId)
  const { curso, error } = useCurso()
  const [abierta, setAbierta] = useState<string | null>(null)

  if (error)
    return (
      <Pagina>
        <p role="alert" className="mt-4 rounded-xl bg-granate-100 p-3 text-granate-700">
          {textos.cuadrilla.error}: {error}
        </p>
      </Pagina>
    )
  if (!curso)
    return (
      <Pagina>
        <p className="mt-4 text-tierra-600">{t.cargando}</p>
      </Pagina>
    )

  const mia = usuarioId ? buscarIntegrante(curso, usuarioId)?.cuadrilla.id : undefined
  const maximo = Math.max(1, ...curso.clasificacion.map((f) => f.puntos))
  const filas = curso.clasificacion.map((f) => curso.cuadrillas.find((x) => x.id === f.id)!)

  return (
    <Pagina>
      <div className="card mt-6 overflow-hidden">
        {/* relative: los textos sr-only (absolutos) de las columnas ocultas no ensanchan la página. */}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-tierra-200 bg-tierra-100/60 text-left text-xs uppercase tracking-wide text-tierra-600">
                <th scope="col" className="px-4 py-3">
                  {c.posicion}
                </th>
                <th scope="col" className="px-2 py-3">
                  {c.cuadrilla}
                </th>
                <th scope="col" className="px-2 py-3">
                  {c.puntos}
                </th>
                <th scope="col" className="px-2 py-3 text-center">
                  {c.misiones}
                </th>
                <th scope="col" className="px-2 py-3">
                  {c.insignias}
                </th>
                <th scope="col" className="px-2 py-3">
                  {c.precision}
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t.verIntegrantes}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((q, i) => {
                const propia = q.id === mia
                const abiertaEsta = abierta === q.id
                const idDetalle = `integrantes-${q.id}`
                return (
                  <Fragment key={q.id}>
                    <tr className={`border-b border-tierra-100 ${propia ? 'bg-buey-50' : ''}`}>
                      <td className="px-4 py-3">
                        <Posicion n={i + 1} />
                      </td>
                      <th scope="row" className="px-2 py-3 text-left">
                        <span className="font-display text-base font-bold text-tierra-900">{q.nombre}</span>
                        {propia && <span className="chip ml-2 bg-buey-100 text-buey-800">{t.tuya}</span>}
                        <span className="block text-xs font-normal text-tierra-600">{rellenar(t.integrantes, { n: q.integrantes.length })}</span>
                      </th>
                      <td className="px-2 py-3">
                        <span className="font-mono text-base font-semibold text-tierra-900">{xp(q.puntos)}</span>
                        <span className="mt-1 block h-1.5 w-32 overflow-hidden rounded-full bg-tierra-100" aria-hidden>
                          <span className="block h-full rounded-full bg-bosque-500" style={{ width: `${(100 * q.puntos) / maximo}%` }} />
                        </span>
                        <span className="mt-0.5 block text-xs text-tierra-600">
                          {rellenar(t.promedioMasBonus, { promedio: xp(q.promedioXp), bonus: xp(q.bonusXp) })}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center font-mono font-semibold">
                        {q.completadas.length}/{MISIONES.length}
                      </td>
                      <td className="px-2 py-3">
                        <Insignias cuadrilla={q} />
                      </td>
                      <td className="px-2 py-3">
                        {q.precisionNielolPct === null ? (
                          <span className="text-xs text-tierra-600">{t.sinPrecision}</span>
                        ) : (
                          <span className="font-mono font-semibold">{formatearNumero(q.precisionNielolPct, 0)} %</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="btn-neutro px-2.5 py-1.5"
                          aria-expanded={abiertaEsta}
                          aria-controls={idDetalle}
                          onClick={() => setAbierta(abiertaEsta ? null : q.id)}
                        >
                          {abiertaEsta ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                          <span className="sr-only">
                            {abiertaEsta ? t.ocultarIntegrantes : t.verIntegrantes}: {q.nombre}
                          </span>
                        </button>
                      </td>
                    </tr>
                    <tr id={idDetalle} hidden={!abiertaEsta} className={propia ? 'bg-buey-50' : 'bg-tierra-50'}>
                      <td colSpan={7} className="px-4 pb-3">
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {q.integrantes.map((p) => (
                            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white p-2">
                              <Avatar nombre={p.nombre} destacado={p.jugador} />
                              <span className="min-w-0 flex-1 leading-tight">
                                <span className="block font-semibold text-tierra-900">{p.nombre}</span>
                                <span className="block text-xs text-tierra-600">
                                  {rellenar(textos.cuadrilla.xp, { xp: xp(p.xp) })} · {rellenar(textos.insignias.resumen, contarInsignias(p))}
                                </span>
                              </span>
                              <ChipSituacion situacion={p.situacion} />
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ul className="mt-4 space-y-1 text-xs text-tierra-600">
        <li>{t.orden}</li>
        <li>{t.precisionNota}</li>
        <li>{t.simulado}</li>
      </ul>
    </Pagina>
  )
}

function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-tierra-900">
        <Trophy size={28} className="text-buey-600" aria-hidden /> {t.titulo}
      </h1>
      <p className="mt-2 max-w-3xl text-tierra-600">{t.bajada}</p>
      {children}
    </div>
  )
}

function Posicion({ n }: { n: number }) {
  const podio = ['oro', 'plata', 'bronce'] as const
  const metal = podio[n - 1]
  return (
    <span
      className={`grid h-8 w-8 place-items-center rounded-full font-display font-bold text-tierra-900 ${metal ? 'border-[3px] bg-white' : 'bg-tierra-100'}`}
      style={metal ? { borderColor: paleta.insignia[metal] } : undefined}
    >
      {n}
    </span>
  )
}

function Insignias({ cuadrilla }: { cuadrilla: CuadrillaCurso }) {
  const presentes = CLAVES.filter((k) => cuadrilla.insignias[k] > 0)
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-mono font-semibold">{cuadrilla.totalInsignias}</span>
      {presentes.map((k) => (
        <span key={k} className="inline-flex items-center gap-0.5 text-xs text-tierra-700" title={nombreInsignia(k)}>
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: paleta.insignia[k] }} />
          {cuadrilla.insignias[k]}
          <span className="sr-only"> {nombreInsignia(k)}</span>
        </span>
      ))}
    </span>
  )
}
