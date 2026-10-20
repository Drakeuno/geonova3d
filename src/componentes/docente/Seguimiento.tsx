import { AlertCircle, Check, Circle, CircleDot, Download, Hourglass, ListChecks, Minus, RotateCcw, type LucideIcon } from 'lucide-react'
import { MISIONES } from '@/datos/misiones'
import { useCurso } from '@/estado/cuadrillas'
import { useViaje } from '@/estado/viaje'
import type { CuadrillaCurso, Curso } from '@/motor/cuadrillas'
import { alertas, celda, type EstadoCelda } from '@/motor/seguimiento'
import type { Viaje } from '@/motor/progreso'
import { formatearNumero } from '@/motor/numeros'
import { Avatar } from '@/componentes/juego/Integrante'
import { contarInsignias } from '@/componentes/juego/VitrinaInsignias'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { aCsv, descargarCsv } from './csv'

// Seguimiento por cuadrilla (RF-08): en qué misión va cada integrante, sus fallas y lo que requiere
// atención del docente. Se puede descargar en CSV.

const t = textos.seguimiento
const xp = (n: number) => formatearNumero(n, 0)

const ICONO: Record<EstadoCelda, [LucideIcon, string]> = {
  aprobada: [Check, 'text-bosque-700'],
  en_evaluacion: [Hourglass, 'text-buey-700'],
  a_reintentar: [RotateCcw, 'text-granate-600'],
  atascado: [AlertCircle, 'text-granate-600'],
  en_curso: [CircleDot, 'text-poncho-700'],
  disponible: [Circle, 'text-tierra-600'],
  pendiente: [Minus, 'text-tierra-400'],
}

export function Seguimiento({ fallasAntesDePista, onIrComision }: { fallasAntesDePista: number; onIrComision: () => void }) {
  const { curso, error } = useCurso()
  const viajes = useViaje((s) => s.viajes)
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-granate-100 p-3 text-granate-700">
        {textos.cuadrilla.error}: {error}
      </p>
    )
  if (!curso) return <p className="text-tierra-600">{t.cargando}</p>

  const avisos = alertas(curso, MISIONES, viajes, fallasAntesDePista)
  const cuenta = (m: string) => avisos.filter((a) => a.motivo === m).length
  const estudiantes = curso.cuadrillas.reduce((s, c) => s + c.integrantes.length, 0)

  return (
    <section aria-labelledby="titulo-seguimiento">
      <div className="flex flex-wrap items-start gap-3">
        <ListChecks size={22} className="mt-1 text-poncho-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="titulo-seguimiento" className="text-xl font-bold text-tierra-900">
            {t.titulo}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-tierra-600">{t.bajada}</p>
        </div>
        <button type="button" className="btn-neutro" onClick={() => exportar(curso, viajes)}>
          <Download size={15} aria-hidden /> {t.descargar}
        </button>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        <li className="chip bg-tierra-100 text-tierra-800">{rellenar(t.resumen.cuadrillas, { n: curso.cuadrillas.length })}</li>
        <li className="chip bg-tierra-100 text-tierra-800">{rellenar(t.resumen.estudiantes, { n: estudiantes })}</li>
        <li className="chip bg-buey-100 text-buey-800">{rellenar(t.resumen.defensas, { n: cuenta('defensa') })}</li>
        <li className="chip bg-granate-100 text-granate-700">{rellenar(t.resumen.pistas, { n: cuenta('pista') })}</li>
        <li className="chip bg-granate-100 text-granate-700">{rellenar(t.resumen.atascados, { n: cuenta('atascado') })}</li>
      </ul>

      <div className="card mt-4 p-4">
        <h3 className="font-bold text-tierra-900">{t.atencion}</h3>
        {avisos.length === 0 ? (
          <p className="mt-1 text-sm text-tierra-600">{t.sinAlertas}</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {avisos.map((a) => {
              const [Icono, color] = ICONO[a.motivo === 'defensa' ? 'en_evaluacion' : a.motivo === 'pista' ? 'a_reintentar' : 'atascado']
              return (
                <li key={`${a.integrante.id}:${a.misionId}:${a.motivo}`} className="flex flex-wrap items-start gap-2 text-tierra-800">
                  <Icono size={16} className={`mt-0.5 shrink-0 ${color}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    {rellenar(t.alertas[a.motivo], { nombre: a.integrante.nombre, cuadrilla: a.cuadrilla, mision: a.misionId, fallas: a.fallas })}
                  </span>
                  {a.motivo === 'defensa' && (
                    <button type="button" className="text-sm font-semibold text-bosque-700 hover:underline" onClick={onIrComision}>
                      {t.irComision}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {curso.clasificacion.map((f, i) => (
          <TablaCuadrilla key={f.id} cuadrilla={curso.cuadrillas.find((c) => c.id === f.id)!} posicion={i + 1} total={curso.clasificacion.length} viajes={viajes} />
        ))}
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-tierra-600">{t.leyenda}</p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tierra-700">
          {(Object.keys(ICONO) as EstadoCelda[]).map((e) => {
            const [Icono, color] = ICONO[e]
            return (
              <li key={e} className="flex items-center gap-1">
                <Icono size={14} className={color} aria-hidden /> {t.estados[e]}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function TablaCuadrilla({ cuadrilla: c, posicion, total, viajes }: { cuadrilla: CuadrillaCurso; posicion: number; total: number; viajes: Record<string, Viaje> }) {
  return (
    <div className="card overflow-hidden">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-tierra-200 bg-tierra-100/60 px-4 py-2.5">
        <h3 className="text-lg font-bold text-tierra-900">{c.nombre}</h3>
        <span className="text-sm text-tierra-700">{rellenar(t.puntos, { puntos: xp(c.puntos), posicion, total })}</span>
        <span className="text-sm text-tierra-700">{rellenar(t.completadas, { n: c.completadas.length, total: MISIONES.length })}</span>
        {c.precisionNielolPct !== null && <span className="text-sm text-tierra-700">{rellenar(t.precision, { pct: formatearNumero(c.precisionNielolPct, 0) })}</span>}
      </header>
      <div className="relative overflow-x-auto">
        {/* Anchos fijos: las columnas quedan alineadas de una cuadrilla a otra. */}
        <table className="w-full min-w-[55rem] table-fixed text-sm">
          <colgroup>
            <col className="w-60" />
            {MISIONES.map((m) => (
              <col key={m.id} className="w-11" />
            ))}
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-tierra-200 text-xs uppercase tracking-wide text-tierra-600">
              <th scope="col" className="px-4 py-2 text-left">
                {t.integrante}
              </th>
              {MISIONES.map((m) => (
                <th key={m.id} scope="col" className="px-1 py-2 text-center font-mono" title={m.titulo}>
                  {m.id}
                </th>
              ))}
              <th scope="col" className="px-2 py-2 text-right">
                {t.xp}
              </th>
              <th scope="col" className="px-2 py-2 text-center">
                {t.insignias}
              </th>
              <th scope="col" className="px-4 py-2 text-center">
                {t.ayudo}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tierra-100">
            {c.integrantes.map((i) => (
              <tr key={i.id}>
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <Avatar nombre={i.nombre} destacado={i.jugador} />
                    <span className="leading-tight">
                      <span className="block font-semibold text-tierra-900">{i.nombre}</span>
                      {!i.jugador && <span className="block text-xs text-tierra-600">{t.simulado}</span>}
                    </span>
                  </span>
                </th>
                {MISIONES.map((m) => {
                  const { estado, fallas } = celda(i, c, m, viajes[i.id])
                  const [Icono, color] = ICONO[estado]
                  const etiqueta = `${m.id}: ${t.estados[estado]}${fallas ? ` · ${rellenar(t.fallas, { n: fallas })}` : ''}`
                  return (
                    <td key={m.id} className="px-1 py-2 text-center" title={etiqueta}>
                      <span className="inline-flex items-center">
                        <Icono size={16} className={color} aria-hidden />
                        {fallas > 0 && estado !== 'aprobada' && <span className="ml-0.5 text-xs font-semibold text-granate-700" aria-hidden>{fallas}</span>}
                      </span>
                      <span className="sr-only">{etiqueta}</span>
                    </td>
                  )
                })}
                <td className="px-2 py-2 text-right font-mono font-semibold">{xp(i.xp)}</td>
                <td className="px-2 py-2 text-center font-mono">{contarInsignias(i).n}</td>
                <td className="px-4 py-2 text-center font-mono">{i.ayudados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function exportar(curso: Curso, viajes: Record<string, Viaje>) {
  const c = t.csv
  const cabecera = [c.cuadrilla, c.integrante, c.simulado, c.xp, c.insignias, c.aprobadas, c.ayudados, c.puntosCuadrilla, ...MISIONES.map((m) => rellenar(c.mision, { id: m.id }))]
  const filas = curso.cuadrillas.flatMap((q) =>
    q.integrantes.map((i) => [
      q.nombre,
      i.nombre,
      i.jugador ? c.no : c.si,
      i.xp,
      contarInsignias(i).n,
      i.insignias.length,
      i.ayudados,
      q.puntos,
      ...MISIONES.map((m) => {
        const { estado, fallas } = celda(i, q, m, viajes[i.id])
        return fallas ? `${t.estados[estado]} (${rellenar(t.fallas, { n: fallas })})` : t.estados[estado]
      }),
    ]),
  )
  descargarCsv(rellenar(c.archivo, { fecha: new Date().toISOString().slice(0, 10) }), aCsv(cabecera, filas))
}
