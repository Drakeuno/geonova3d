import { Suspense, lazy, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Binoculars, CheckCircle2, Eye, Map as MapaIcono, Ruler, RotateCcw } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import { useEscenario } from '@/estado/escenarios'
import { crearRng } from '@/motor/azar'
import { burbujaCalada, burbujaInicial, desviacionBurbuja, type Burbuja } from '@/motor/burbuja'
import { cotaVerdaderaMm, planificarRecorrido, puntoPorId, type Escenario, type LecturaPlanificada } from '@/motor/escenarios'
import { errorMontajeMm, erroresDeLectura, esLecturaExacta, rangoDesdeParametros, type ErroresLectura } from '@/motor/lecturas'
import { formatearMm, formatearNumero, parsearMetrosAMm } from '@/motor/numeros'
import { NivelEsferico } from '@/componentes/campo/NivelEsferico'
import { Anteojo } from '@/escena3d/Anteojo'
import type { Vista } from '@/escena3d/ControlCamara'
import { soportaWebGL } from '@/escena3d/webgl'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const EscenaCampo = lazy(() => import('@/escena3d/EscenaCampo'))
const t = textos.campo

/** Semilla determinista por lectura: el mismo intento muestra siempre la misma cruz. */
const semillaDe = (base: number, clave: string) => [...clave].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, base >>> 0)

const claveLectura = (l: LecturaPlanificada) => `${l.estacion}:${l.tipo}:${l.punto}`

export default function CampoPractica() {
  const { escenario, parametros, error } = useEscenario('campus-uct')
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to="/viaje" className="inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
        <ArrowLeft size={16} aria-hidden /> {t.volver}
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-tierra-900">{t.titulo}</h1>
      <p className="mt-1 max-w-3xl text-tierra-700">{t.bajada}</p>
      {escenario && parametros ? (
        <Practica escenario={escenario} parametros={parametros} />
      ) : (
        <p className="card mt-6 p-5 text-tierra-600">{error ? `${t.error}: ${error}` : t.cargando}</p>
      )}
    </div>
  )
}

interface ResultadoLectura extends ErroresLectura {
  ingresadaMm: number
  mostradaMm: number
}

const semillaNueva = () => Math.floor(Math.random() * 1e9)

function Practica({ escenario, parametros }: { escenario: Escenario; parametros: Parametros }) {
  // ?semilla=… en la dirección repite exactamente el mismo intento (revisión docente y pruebas).
  const [busqueda] = useSearchParams()
  const [recorridoId, setRecorridoId] = useState(busqueda.get('recorrido') ?? escenario.recorridos[0].id)
  const [semilla, setSemilla] = useState(() => Number(busqueda.get('semilla')) || semillaNueva())
  const [iEstacion, setIEstacion] = useState(0)
  const [burbujas, setBurbujas] = useState<Record<string, Burbuja>>({})
  const [niveladas, setNiveladas] = useState<Record<string, number>>({})
  const [visada, setVisada] = useState<LecturaPlanificada | null>(null)
  const [vista, setVista] = useState<Vista>('general')
  const [cinta, setCinta] = useState<{ desde: string; hasta: string; distanciaM: number } | null>(null)
  const [entradas, setEntradas] = useState<Record<string, string>>({})
  const [resultados, setResultados] = useState<Record<string, ResultadoLectura | 'invalida'>>({})

  const recorrido = escenario.recorridos.find((r) => r.id === recorridoId)!
  const lecturas = useMemo(
    () => planificarRecorrido(escenario, recorridoId, rangoDesdeParametros(parametros.lectura), crearRng(semilla)),
    [escenario, recorridoId, semilla, parametros.lectura],
  )
  const estacion = recorrido.estaciones[iEstacion]
  const distanciaA = (punto: string) => {
    const p = puntoPorId(escenario, punto)
    return Math.hypot(estacion.x - p.x, estacion.y - p.y)
  }
  const delaEstacion = lecturas.filter((l) => l.estacion === estacion.id)
  const lt = delaEstacion[0]
  // Dato interno: ubica el anteojo a la altura de la visual. No se muestra.
  const colimacionMm = cotaVerdaderaMm(escenario, lt.punto) + lt.verdaderaMm
  const burbuja = burbujas[estacion.id] ?? burbujaInicial(crearRng(semillaDe(semilla, `burbuja:${estacion.id}`)))
  const desviacion = niveladas[estacion.id]
  const nivelada = desviacion !== undefined

  const desplazamientoMm = (l: LecturaPlanificada) =>
    errorMontajeMm(desviacion ?? 0, parametros.montaje.errorMaximoMm, crearRng(semillaDe(semilla, claveLectura(l))))

  const empezarDeNuevo = (id = recorridoId) => {
    setRecorridoId(id)
    setSemilla(semillaNueva())
    setIEstacion(0)
    setBurbujas({})
    setNiveladas({})
    setVisada(null)
    setCinta(null)
    setEntradas({})
    setResultados({})
    setVista('general')
  }

  const comprobar = (l: LecturaPlanificada) => {
    const ingresadaMm = parsearMetrosAMm(entradas[claveLectura(l)] ?? '')
    if (ingresadaMm === null) return setResultados({ ...resultados, [claveLectura(l)]: 'invalida' })
    const mostradaMm = l.verdaderaMm + desplazamientoMm(l)
    setResultados({ ...resultados, [claveLectura(l)]: { ...erroresDeLectura(ingresadaMm, { verdaderaMm: l.verdaderaMm, mostradaMm }), ingresadaMm, mostradaMm } })
  }

  const ultima = iEstacion === recorrido.estaciones.length - 1
  const resultadoVisada = visada ? resultados[claveLectura(visada)] : undefined

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="card flex flex-col self-start overflow-hidden lg:sticky lg:top-24">
        <div className="h-[62vh] min-h-[360px] bg-costa-50">
          {soportaWebGL() ? (
            <Suspense fallback={<p className="p-5 text-tierra-600">{t.cargando}</p>}>
              <EscenaCampo
                escenario={escenario}
                estacion={estacion}
                colimacionMm={colimacionMm}
                puntoVisado={visada?.punto ?? null}
                cinta={cinta}
                vista={vista}
                descripcion={t.descripcion3d}
              />
            </Suspense>
          ) : (
            <p className="p-5 text-tierra-700">{t.sin3d}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-tierra-200 p-3">
          <button type="button" aria-pressed={vista === 'general'} onClick={() => setVista('general')} className={vista === 'general' ? 'btn-primario' : 'btn-neutro'}>
            <MapaIcono size={16} aria-hidden /> {t.vistaGeneral}
          </button>
          <button type="button" aria-pressed={vista === 'instrumento'} onClick={() => setVista('instrumento')} className={vista === 'instrumento' ? 'btn-primario' : 'btn-neutro'}>
            <Eye size={16} aria-hidden /> {t.vistaInstrumento}
          </button>
        </div>
      </div>

      <aside className="space-y-4">
        <section className="card p-4">
          <label className="block text-sm font-semibold text-tierra-800">
            {t.recorrido}
            <select
              value={recorridoId}
              onChange={(e) => empezarDeNuevo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-tierra-300 bg-white px-2.5 py-2 font-normal"
            >
              {escenario.recorridos.map((r) => (
                <option key={r.id} value={r.id}>
                  {t.recorridos[r.id as keyof typeof t.recorridos] ?? r.id}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 font-display font-bold text-tierra-900">
            {rellenar(t.estacion, { e: estacion.id, n: iEstacion + 1, total: recorrido.estaciones.length })}
          </p>
        </section>

        <section className="card p-4">
          <h2 className="font-display font-bold text-tierra-900">{t.pasoNivelar}</h2>
          {nivelada ? (
            <div className="mt-2 space-y-2">
              <p className={`text-sm font-semibold ${desviacion! <= 0.1 ? 'text-bosque-700' : 'text-granate-700'}`}>
                {burbujaCalada(burbuja) ? t.nivelada : rellenar(t.descentrada, { pct: Math.round(desviacion! * 100) })}
              </p>
              <button
                type="button"
                className="btn-neutro"
                onClick={() => {
                  const resto = { ...niveladas }
                  delete resto[estacion.id]
                  setNiveladas(resto)
                  setVisada(null)
                }}
              >
                <RotateCcw size={16} aria-hidden /> {t.renivelar}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <NivelEsferico burbuja={burbuja} onCambio={(b) => setBurbujas({ ...burbujas, [estacion.id]: b })} />
              {!burbujaCalada(burbuja) && <p className="mt-2 text-sm text-granate-700">{t.avisoDescentrada}</p>}
              <button type="button" className="btn-primario mt-3 w-full" onClick={() => setNiveladas({ ...niveladas, [estacion.id]: desviacionBurbuja(burbuja) })}>
                <CheckCircle2 size={16} aria-hidden /> {t.listo}
              </button>
            </div>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-display font-bold text-tierra-900">{t.pasoVisar}</h2>
          {!nivelada ? (
            <p className="mt-2 text-sm text-tierra-600">{t.primeroNivelar}</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-2">
                {delaEstacion.map((l) => (
                  <button
                    key={claveLectura(l)}
                    type="button"
                    aria-pressed={visada === l}
                    onClick={() => {
                      setVisada(l)
                      setCinta(null)
                      setVista('instrumento')
                    }}
                    className={visada === l ? 'btn-primario' : 'btn-neutro'}
                  >
                    <Binoculars size={16} aria-hidden /> {rellenar(t.visar, { tipo: l.tipo, punto: l.punto })}
                  </button>
                ))}
              </div>

              {visada && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-tierra-800">{rellenar(t.visando, { tipo: visada.tipo, punto: visada.punto })}</p>
                  <div className="flex justify-center">
                    <Anteojo
                      tamano={320}
                      distanciaM={distanciaA(visada.punto)}
                      cotaPuntoMm={cotaVerdaderaMm(escenario, visada.punto)}
                      colimacionMm={colimacionMm}
                      desplazamientoMm={desplazamientoMm(visada)}
                    />
                  </div>
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      comprobar(visada)
                    }}
                  >
                    <label className="flex-1 text-sm font-semibold text-tierra-800">
                      {t.tuLectura}
                      <input
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="1,523"
                        value={entradas[claveLectura(visada)] ?? ''}
                        onChange={(e) => setEntradas({ ...entradas, [claveLectura(visada)]: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-tierra-300 bg-white px-2.5 py-2 font-mono font-normal focus:outline-none focus:ring-2 focus:ring-bosque-500"
                      />
                    </label>
                    <button type="submit" className="btn-primario">
                      {t.comprobar}
                    </button>
                  </form>
                  {resultadoVisada && <Resultado resultado={resultadoVisada} />}
                  {visada.tipo === 'LA' && visada.distanciaM !== undefined && (
                    <button
                      type="button"
                      className="btn-neutro w-full"
                      onClick={() => {
                        const anterior = delaEstacion[delaEstacion.indexOf(visada) - 1]
                        setCinta({ desde: anterior.punto, hasta: visada.punto, distanciaM: visada.distanciaM! })
                        setVista('general')
                      }}
                    >
                      <Ruler size={16} aria-hidden /> {rellenar(t.medir, { a: delaEstacion[delaEstacion.indexOf(visada) - 1].punto, b: visada.punto })}
                    </button>
                  )}
                  {cinta && (
                    <p className="text-center font-mono font-semibold text-tierra-900">
                      {rellenar(t.distancia, { a: cinta.desde, b: cinta.hasta, d: formatearNumero(cinta.distanciaM, 2) })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section className="card p-4">
          {ultima ? (
            <>
              <p className="text-sm text-tierra-700">{t.fin}</p>
              <button type="button" className="btn-neutro mt-2 w-full" onClick={() => empezarDeNuevo()}>
                <RotateCcw size={16} aria-hidden /> {t.reiniciar}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-primario w-full"
              onClick={() => {
                setIEstacion(iEstacion + 1)
                setVisada(null)
                setCinta(null)
                setVista('general')
              }}
            >
              {t.siguiente}
            </button>
          )}
        </section>
      </aside>
    </div>
  )
}

function Resultado({ resultado }: { resultado: ResultadoLectura | 'invalida' }) {
  const r = t.resultado
  if (resultado === 'invalida') return <p className="text-sm text-granate-700">{r.invalida}</p>
  const fila = (etiqueta: string, mm: number) => (
    <div className="flex justify-between">
      <dt>{etiqueta}</dt>
      <dd className="font-mono font-semibold">{mm > 0 ? `+${mm}` : mm} mm</dd>
    </div>
  )
  const exacta = esLecturaExacta(resultado.totalMm)
  return (
    <div role="status" className={`rounded-xl p-3 text-sm ${exacta ? 'bg-bosque-100 text-bosque-800' : 'bg-tierra-100 text-tierra-900'}`}>
      <p>
        {rellenar(r.lectura, { l: formatearMm(resultado.ingresadaMm) })}; {rellenar(r.cruz, { c: formatearMm(resultado.mostradaMm) })}.
      </p>
      <dl className="mt-2 space-y-0.5">
        {fila(r.errorLectura, resultado.lecturaMm)}
        {fila(r.errorMontaje, resultado.montajeMm)}
        {fila(r.errorTotal, resultado.totalMm)}
      </dl>
      {exacta && <p className="mt-2 font-semibold">{r.exacta}</p>}
    </div>
  )
}
