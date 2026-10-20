import { useState } from 'react'
import { CheckCircle2, Download, Gavel, Upload, XCircle } from 'lucide-react'
import { MISIONES } from '@/datos/misiones'
import type { Parametros } from '@/datos/parametros'
import { USUARIOS_DEMO, type UsuarioDemo } from '@/datos/usuariosDemo'
import { claveEvidencia, descargarEvidencia, guardarEvidencia } from '@/estado/evidencias'
import { claveMision, useViaje, type EvaluacionGuardada } from '@/estado/viaje'
import { CRITERIOS, porcentajeEvaluador, veredictoComision, type Criterio } from '@/motor/evaluacionOral'
import { formatearNumero } from '@/motor/numeros'
import { recompensaPorAprobacion } from '@/motor/puntaje'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { Desplazable } from '@/componentes/ui/Desplazable'

// Panel docente: defensas orales de la 3.2 y la 3.3 ante la Comisión de Parques (§5, §14 y CP-07).
// El docente carga la evidencia y la rúbrica de cada evaluador (4 criterios, 1 a 4); el veredicto
// sale por mayoría y, si aprueba, otorga la insignia y el XP de la misión.

const t = textos.comision
const DEFENSAS = ['3.2', '3.3'] as const

export function Comision({ parametros }: { parametros: Parametros }) {
  const { viajes, evaluaciones, intentos } = useViaje()
  const estudiantes = USUARIOS_DEMO.filter((u) => u.rol === 'estudiante')
  const pendientes = estudiantes.flatMap((u) => DEFENSAS.filter((m) => viajes[u.id]?.[m]?.estado === 'en_evaluacion').map((m) => ({ u, m })))
  const resueltas = estudiantes.flatMap((u) =>
    DEFENSAS.flatMap((m) => {
      const e = evaluaciones[claveMision(u.id, m)]
      return e?.veredicto ? [{ u, m, e }] : []
    }),
  )

  return (
    <section className="card mt-6 overflow-hidden" aria-labelledby="titulo-comision">
      <header className="flex items-center gap-3 border-b border-tierra-200 bg-tierra-100/60 px-5 py-3">
        <Gavel size={22} className="text-poncho-700" aria-hidden />
        <div>
          <h2 id="titulo-comision" className="text-lg font-bold text-tierra-900">
            {t.titulo}
          </h2>
          <p className="text-xs text-tierra-600">{rellenar(t.bajada, { pct: parametros.evaluacionOral.aprobacionMinimaPct })}</p>
        </div>
      </header>
      <div className="space-y-5 p-5">
        {pendientes.length === 0 ? (
          <p className="text-tierra-600">{t.sinPendientes}</p>
        ) : (
          pendientes.map(({ u, m }) => (
            <FichaDefensa
              key={`${u.id}:${m}`}
              usuario={u}
              misionId={m}
              evaluacion={evaluaciones[claveMision(u.id, m)]}
              intento={intentos[claveMision(u.id, m)]?.numero ?? 1}
              parametros={parametros}
            />
          ))
        )}

        {resueltas.length > 0 && (
          <div>
            <h3 className="font-display font-bold text-tierra-900">{t.historial}</h3>
            <ul className="mt-2 divide-y divide-tierra-100 text-sm">
              {resueltas.map(({ u, m, e }) => (
                <li key={`${u.id}:${m}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  {e.veredicto!.aprobada ? <CheckCircle2 size={16} className="text-bosque-700" aria-hidden /> : <XCircle size={16} className="text-granate-600" aria-hidden />}
                  <span className="font-semibold">{u.nombre}</span>
                  <span>
                    {m} · {MISIONES.find((x) => x.id === m)?.titulo}
                  </span>
                  <span className="text-tierra-600">
                    {rellenar(t.votos, { favor: e.veredicto!.votosFavor, total: e.veredicto!.votosFavor + e.veredicto!.votosContra })}
                  </span>
                  {e.veredicto!.evidencia && (
                    <button type="button" className="btn-neutro px-2 py-1 text-xs" onClick={() => void descargarEvidencia(claveEvidencia(u.id, m, e.intento))}>
                      <Download size={14} aria-hidden /> {e.veredicto!.evidencia.nombre}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

interface Evaluador {
  nombre: string
  esDocente: boolean
  puntajes: Partial<Record<Criterio, number>>
}

function FichaDefensa({
  usuario,
  misionId,
  evaluacion,
  intento,
  parametros,
}: {
  usuario: UsuarioDemo
  misionId: string
  evaluacion: EvaluacionGuardada | undefined
  intento: number
  parametros: Parametros
}) {
  const registrarVeredicto = useViaje((s) => s.registrarVeredicto)
  const mision = MISIONES.find((m) => m.id === misionId)!
  const docente = USUARIOS_DEMO.find((u) => u.rol === 'docente')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>(() =>
    Array.from({ length: parametros.evaluacionOral.evaluadores }, (_, i) => ({
      nombre: i === 0 ? rellenar(t.docente, { nombre: docente?.nombre ?? '' }) : rellenar(t.par, { n: i }),
      esDocente: i === 0,
      puntajes: {},
    })),
  )
  const completos = evaluadores.every((e) => CRITERIOS.every((c) => e.puntajes[c] !== undefined))
  const conPuntajes = evaluadores.map((e) => ({ evaluadorId: e.nombre, esDocente: e.esDocente, puntajes: e.puntajes as Record<Criterio, number> }))
  const veredicto = completos ? veredictoComision(conPuntajes, parametros.evaluacionOral.aprobacionMinimaPct) : null
  const puntuar = (i: number, c: Criterio, v: string) =>
    setEvaluadores(evaluadores.map((e, j) => (j === i ? { ...e, puntajes: { ...e.puntajes, [c]: v ? Number(v) : undefined } } : e)))

  const registrar = async () => {
    if (!veredicto || !archivo || !evaluacion) return
    setGuardando(true)
    await guardarEvidencia(claveEvidencia(usuario.id, misionId, intento), archivo)
    const total = veredicto.votosFavor + veredicto.votosContra
    const valores = { favor: veredicto.votosFavor, total, desempate: veredicto.desempateDocente ? textos.entrega.comision.desempate : '' }
    registrarVeredicto(
      usuario.id,
      misionId,
      {
        ...veredicto,
        evaluadores: conPuntajes.map((e) => ({ nombre: e.evaluadorId, esDocente: e.esDocente, puntajes: e.puntajes, porcentaje: porcentajeEvaluador(e) })),
        evidencia: { nombre: archivo.name, tamano: archivo.size, tipo: archivo.type },
        en: Date.now(),
      },
      {
        id: 'comision',
        ok: veredicto.aprobada,
        texto: rellenar(veredicto.aprobada ? textos.entrega.comision.aprobada : textos.entrega.comision.rechazada, valores),
      },
      recompensaPorAprobacion({ mision, ...evaluacion.desempeno }, parametros.xp),
    )
  }

  return (
    <article className="rounded-2xl border border-tierra-200 p-4" aria-label={rellenar(t.defensaDe, { nombre: usuario.nombre, mision: misionId })}>
      <h3 className="font-display text-lg font-bold text-tierra-900">
        {usuario.nombre} · {misionId} {mision.titulo}
      </h3>
      <p className="text-sm text-tierra-600">
        {rellenar(t.solicitud, { cuadrilla: usuario.cuadrilla ?? '', fecha: evaluacion ? new Date(evaluacion.en).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '' })}
      </p>
      {evaluacion && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold text-tierra-800">{t.parteAutomatica}</summary>
          <ul className="mt-1 space-y-0.5">
            {evaluacion.criterios.map((c) => (
              <li key={c.id} className="flex items-start gap-1.5">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-bosque-700" aria-hidden /> {c.texto}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-3">
        <label className="block text-xs font-semibold text-tierra-700">
          {t.evidencia}
          <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </label>
        <p className="mt-1 flex items-center gap-1 text-xs text-tierra-600">
          <Upload size={12} aria-hidden /> {archivo ? rellenar(t.archivo, { nombre: archivo.name, kb: formatearNumero(archivo.size / 1024, 0) }) : t.evidenciaAyuda}
        </p>
      </div>

      <Desplazable etiqueta={textos.zonas.rubrica} className="mt-3">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b-2 border-tierra-300 text-left text-xs font-semibold text-tierra-700">
              <th scope="col" className="px-2 py-2">{t.criterio}</th>
              {evaluadores.map((e, i) => (
                <th key={i} scope="col" className="px-2 py-2">
                  <input
                    aria-label={rellenar(t.nombreEvaluador, { n: i + 1 })}
                    value={e.nombre}
                    onChange={(ev) => setEvaluadores(evaluadores.map((x, j) => (j === i ? { ...x, nombre: ev.target.value } : x)))}
                    className="w-full rounded border border-tierra-300 px-1.5 py-1 text-xs font-semibold"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-tierra-100">
            {CRITERIOS.map((c) => (
              <tr key={c}>
                <th scope="row" className="px-2 py-1.5 text-left font-semibold">
                  {textos.asamblea.criterios[c].nombre}
                </th>
                {evaluadores.map((e, i) => (
                  <td key={i} className="px-2 py-1.5">
                    <select
                      aria-label={rellenar(t.puntaje, { criterio: textos.asamblea.criterios[c].nombre, evaluador: e.nombre })}
                      value={e.puntajes[c] ?? ''}
                      onChange={(ev) => puntuar(i, c, ev.target.value)}
                      className="w-full rounded border border-tierra-300 bg-white px-1.5 py-1"
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-tierra-50 text-xs">
              <th scope="row" className="px-2 py-1.5 text-left">
                {t.promedio}
              </th>
              {evaluadores.map((e, i) => {
                const listo = CRITERIOS.every((c) => e.puntajes[c] !== undefined)
                const pct = listo ? porcentajeEvaluador(conPuntajes[i]) : null
                return (
                  <td key={i} className="px-2 py-1.5 font-mono">
                    {pct === null ? '·' : `${formatearNumero(pct, 0)} % · ${pct >= parametros.evaluacionOral.aprobacionMinimaPct ? t.aprueba : t.noAprueba}`}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </Desplazable>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p role="status" className={`text-sm font-semibold ${veredicto ? (veredicto.aprobada ? 'text-bosque-700' : 'text-granate-700') : 'text-tierra-600'}`}>
          {veredicto
            ? rellenar(veredicto.aprobada ? t.veredictoAprobada : t.veredictoRechazada, {
                favor: veredicto.votosFavor,
                total: veredicto.votosFavor + veredicto.votosContra,
                desempate: veredicto.desempateDocente ? textos.entrega.comision.desempate : '',
              })
            : t.faltanPuntajes}
        </p>
        <button type="button" className="btn-primario" disabled={!veredicto || !archivo || guardando} onClick={() => void registrar()}>
          <Gavel size={16} aria-hidden /> {t.registrar}
        </button>
      </div>
    </article>
  )
}
