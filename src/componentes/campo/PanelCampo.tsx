import { Suspense, lazy, useState, type ReactNode } from 'react'
import { Binoculars, Check, CheckCircle2, Eye, Grid2x2, Map as MapaIcono, RotateCcw, Ruler } from 'lucide-react'
import type { Parametros } from '@/datos/parametros'
import { crearRng } from '@/motor/azar'
import { burbujaCalada, burbujaInicial, desviacionBurbuja, type Burbuja } from '@/motor/burbuja'
import { cotaVerdaderaMm, puntoPorId, type Escenario, type LecturaPlanificada, type Recorrido } from '@/motor/escenarios'
import { errorMontajeMm } from '@/motor/lecturas'
import { formatearNumero } from '@/motor/numeros'
import { NivelEsferico } from '@/componentes/campo/NivelEsferico'
import { Anteojo } from '@/escena3d/Anteojo'
import type { Vista } from '@/escena3d/ControlCamara'
import { soportaWebGL } from '@/escena3d/webgl'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const EscenaCampo = lazy(() => import('@/escena3d/EscenaCampo'))
const t = textos.campo

// Trabajo en terreno: elegir la postura del nivel, calar la burbuja, visar la mira, leerla por el
// anteojo y medir con cinta. Lo comparten la práctica (/campo) y las misiones.

/** Semilla determinista por lectura: el mismo intento muestra siempre la misma cruz. */
export const semillaDe = (base: number, clave: string) => [...clave].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, base >>> 0)

export const claveLectura = (l: Pick<LecturaPlanificada, 'estacion' | 'tipo' | 'punto'>) => `${l.estacion}:${l.tipo}:${l.punto}`

export interface PropsPanelCampo {
  escenario: Escenario
  parametros: Parametros
  recorrido: Recorrido
  lecturas: LecturaPlanificada[]
  semilla: number
  burbujas: Record<string, Burbuja>
  /** Desviación con que se dejó nivelada cada estación (0 = calada). */
  niveladas: Record<string, number>
  onBurbuja: (estacion: string, b: Burbuja) => void
  /** Null: volver a nivelar la estación. */
  onNivelar: (estacion: string, desviacion: number | null) => void
  /** Visadas ya anotadas en la libreta (se marcan con un visto). */
  anotada?: (l: LecturaPlanificada) => boolean
  /** Contenido bajo el anteojo para la visada activa (la práctica comprueba ahí la lectura). */
  bajoAnteojo?: (visada: LecturaPlanificada, desplazamientoMm: number) => ReactNode
  /** Contenido bajo la escena, a lo ancho (la misión pone ahí la libreta). */
  children?: ReactNode
  /** Encabezado del panel lateral (la práctica elige ahí el recorrido). */
  encabezado?: ReactNode
}

export function PanelCampo({
  escenario,
  parametros,
  recorrido,
  lecturas,
  semilla,
  burbujas,
  niveladas,
  onBurbuja,
  onNivelar,
  anotada,
  bajoAnteojo,
  children,
  encabezado,
}: PropsPanelCampo) {
  const [iEstacion, setIEstacion] = useState(0)
  const [visada, setVisada] = useState<LecturaPlanificada | null>(null)
  const [vista, setVista] = useState<Vista>('general')
  const [cinta, setCinta] = useState<{ desde: string; hasta: string; distanciaM: number } | null>(null)

  const estacion = recorrido.estaciones[Math.min(iEstacion, recorrido.estaciones.length - 1)]
  const delaEstacion = lecturas.filter((l) => l.estacion === estacion.id)
  const lt = delaEstacion[0]
  // Dato interno: ubica el anteojo a la altura de la visual. No se muestra.
  const colimacionMm = cotaVerdaderaMm(escenario, lt.punto) + lt.verdaderaMm
  const burbuja = burbujas[estacion.id] ?? burbujaInicial(crearRng(semillaDe(semilla, `burbuja:${estacion.id}`)))
  const desviacion = niveladas[estacion.id]
  const nivelada = desviacion !== undefined
  const visadaVigente = visada && visada.estacion === estacion.id ? visada : null

  const distanciaA = (punto: string) => {
    const p = puntoPorId(escenario, punto)
    return Math.hypot(estacion.x - p.x, estacion.y - p.y)
  }
  const desplazamientoMm = (l: LecturaPlanificada) =>
    errorMontajeMm(desviacion ?? 0, parametros.montaje.errorMaximoMm, crearRng(semillaDe(semilla, claveLectura(l))))

  const irAEstacion = (i: number) => {
    setIEstacion(i)
    setVisada(null)
    setCinta(null)
    setVista('general')
  }

  const vistas: [Vista, ReactNode, string][] = [
    ['general', <MapaIcono key="g" size={16} aria-hidden />, t.vistaGeneral],
    ['planta', <Grid2x2 key="p" size={16} aria-hidden />, t.vistaPlanta],
    ['instrumento', <Eye key="i" size={16} aria-hidden />, t.vistaInstrumento],
  ]
  const anterior = visadaVigente ? delaEstacion[delaEstacion.indexOf(visadaVigente) - 1] : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="card flex flex-col overflow-hidden lg:col-start-1 lg:row-start-1">
        <div className="h-[48vh] min-h-[320px] bg-costa-50">
          {soportaWebGL() ? (
            <Suspense fallback={<p className="p-5 text-tierra-600">{t.cargando}</p>}>
              <EscenaCampo
                escenario={escenario}
                estacion={estacion}
                colimacionMm={colimacionMm}
                puntoVisado={visadaVigente?.punto ?? null}
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
          {vistas.map(([v, icono, nombre]) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)} className={vista === v ? 'btn-primario' : 'btn-neutro'}>
              {icono} {nombre}
            </button>
          ))}
        </div>
      </div>

      <aside className="space-y-4 self-start lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        {encabezado}
        <section className="card p-4">
          <h2 className="font-display font-bold text-tierra-900">{t.posturas}</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t.posturas}>
            {recorrido.estaciones.map((e, i) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={e.id === estacion.id}
                onClick={() => irAEstacion(i)}
                className={e.id === estacion.id ? 'btn-primario' : 'btn-neutro'}
              >
                {e.id}
                {niveladas[e.id] !== undefined && <Check size={14} aria-label={t.estacionNivelada} />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-tierra-700">
            {rellenar(t.estacion, { e: estacion.id, n: recorrido.estaciones.indexOf(estacion) + 1, total: recorrido.estaciones.length })} ·{' '}
            {rellenar(t.visaA, { puntos: delaEstacion.map((l) => l.punto).join(', ') })}
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
                  onNivelar(estacion.id, null)
                  setVisada(null)
                }}
              >
                <RotateCcw size={16} aria-hidden /> {t.renivelar}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <NivelEsferico burbuja={burbuja} onCambio={(b) => onBurbuja(estacion.id, b)} />
              {!burbujaCalada(burbuja) && <p className="mt-2 text-sm text-granate-700">{t.avisoDescentrada}</p>}
              <button type="button" className="btn-primario mt-3 w-full" onClick={() => onNivelar(estacion.id, desviacionBurbuja(burbuja))}>
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
                    aria-pressed={visadaVigente === l}
                    onClick={() => {
                      setVisada(l)
                      setCinta(null)
                      setVista('instrumento')
                    }}
                    className={visadaVigente === l ? 'btn-primario' : 'btn-neutro'}
                  >
                    <Binoculars size={16} aria-hidden /> {rellenar(t.visar, { tipo: l.tipo, punto: l.punto })}
                    {anotada?.(l) && <Check size={14} aria-label={t.yaAnotada} />}
                  </button>
                ))}
              </div>

              {visadaVigente && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-tierra-800">{rellenar(t.visando, { tipo: visadaVigente.tipo, punto: visadaVigente.punto })}</p>
                  <div className="flex justify-center">
                    <Anteojo
                      tamano={280}
                      distanciaM={distanciaA(visadaVigente.punto)}
                      cotaPuntoMm={cotaVerdaderaMm(escenario, visadaVigente.punto)}
                      colimacionMm={colimacionMm}
                      desplazamientoMm={desplazamientoMm(visadaVigente)}
                    />
                  </div>
                  {bajoAnteojo?.(visadaVigente, desplazamientoMm(visadaVigente))}
                  {visadaVigente.tipo === 'LA' && visadaVigente.distanciaM !== undefined && anterior && (
                    <button
                      type="button"
                      className="btn-neutro w-full"
                      onClick={() => {
                        setCinta({ desde: anterior.punto, hasta: visadaVigente.punto, distanciaM: visadaVigente.distanciaM! })
                        setVista('general')
                      }}
                    >
                      <Ruler size={16} aria-hidden /> {rellenar(t.medir, { a: anterior.punto, b: visadaVigente.punto })}
                    </button>
                  )}
                  {cinta && (
                    <p className="text-center font-mono font-semibold text-tierra-900" role="status">
                      {rellenar(t.distancia, { a: cinta.desde, b: cinta.hasta, d: formatearNumero(cinta.distanciaM, 2) })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </aside>

      {children && <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">{children}</div>}
    </div>
  )
}
