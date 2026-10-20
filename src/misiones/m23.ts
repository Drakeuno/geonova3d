import { crearRng, derivarSemilla } from '@/motor/azar'
import { CAUSAS, sembrarEvento, validarResolucion, type CausaRaiz, type EventoSembrado, type Tramo, type TipoEvento } from '@/motor/cooperativa'
import { cotaVerdaderaMm, planificarRecorrido, type Escenario, type LecturaPlanificada } from '@/motor/escenarios'
import type { RangoLectura } from '@/motor/lecturas'
import { calcularRegistro, registrarFila, registroVacio, type RegistroLibreta } from '@/motor/libreta'
import type { Mm } from '@/motor/numeros'
import textos from '@/textos/es-CL.json'
import { bloqueosFormulario, cerrarEvaluacion, leerMm, revisionComun, textoTolerancia, toleranciaRecorrido } from './comunes'
import { cierreDelCircuito } from './m12'
import type { ContextoEntrega, Evaluacion, SesionCooperativa } from './tipos'

// Misión 2.3 · Punto de Encuentro (§5 y protocolo de la §14). Dos cuadrillas nivelan tramos opuestos
// de la línea C → M ← R, de ida y vuelta. Al iniciar se siembra un evento que mete un error grosero en
// la ida de un tramo: la confrontación en M siempre discrepa y hay que diagnosticar en conjunto.

const t = textos.entrega.m23

export const TRAMOS: readonly Tramo[] = ['A', 'B']
export const PUNTO_ENCUENTRO = 'M'
export const recorridoDeTramo = (tramo: Tramo) => `2.3-${tramo}`
export const otroTramo = (tramo: Tramo): Tramo => (tramo === 'A' ? 'B' : 'A')
export const MOTIVOS_M23 = ['calculos', 'distancias', 'tramo', 'estacion', 'causa', 'cota', 'acuerdo'] as const

/** La ida: de la cota conocida hasta la lectura adelante sobre M, inclusive. */
export const idaDe = (lecturas: LecturaPlanificada[]) =>
  lecturas.slice(0, lecturas.findIndex((l) => l.tipo === 'LA' && l.punto === PUNTO_ENCUENTRO) + 1)

export interface PreparacionSesion {
  lecturas: Record<Tramo, LecturaPlanificada[]>
  evento: EventoSembrado
  estacionDelEvento: string
}

/**
 * Lecturas de ambos tramos y evento de la sesión. Todo sale de la semilla: dos ventanas con el mismo
 * código de sesión ven exactamente lo mismo.
 */
export function prepararSesion(
  escenario: Escenario,
  rango: RangoLectura,
  semilla: number,
  jugadosPorPersonas: Tramo[],
  umbralMm: number,
): PreparacionSesion {
  const lecturas = Object.fromEntries(
    TRAMOS.map((tr) => [tr, planificarRecorrido(escenario, recorridoDeTramo(tr), rango, crearRng(derivarSemilla(semilla, tr)))]),
  ) as Record<Tramo, LecturaPlanificada[]>
  const ida = Object.fromEntries(TRAMOS.map((tr) => [tr, idaDe(lecturas[tr]).map((l) => l.tipo)])) as Record<Tramo, ('LT' | 'LA')[]>
  const evento = sembrarEvento(crearRng(derivarSemilla(semilla, 'evento')), ida, jugadosPorPersonas, umbralMm)
  return { lecturas, evento, estacionDelEvento: lecturas[evento.tramo][evento.indiceLectura].estacion }
}

/** Desplazamiento que el evento le mete a una visada de quien juega (0 si no le toca). */
export function desplazamientoDelEvento(p: PreparacionSesion, tramo: Tramo, l: Pick<LecturaPlanificada, 'estacion' | 'tipo' | 'punto'>): Mm {
  if (p.evento.tramo !== tramo || p.evento.tipo === 'libreta-mojada') return 0
  const afectada = p.lecturas[tramo][p.evento.indiceLectura]
  return afectada.estacion === l.estacion && afectada.tipo === l.tipo && afectada.punto === l.punto ? p.evento.desplazamientoMm : 0
}

/**
 * Libreta de la cuadrilla simulada: lee bien (con ±1 mm de vez en cuando) y calcula bien; si el
 * evento cae en su tramo, la lectura afectada (o su anotación, si se mojó la libreta) queda mal.
 */
export function libretaSimulada(lecturas: LecturaPlanificada[], pr: RegistroLibreta['pr'], evento: EventoSembrado, tramo: Tramo, semilla: number): RegistroLibreta {
  const rng = crearRng(derivarSemilla(semilla, `ruido:${tramo}`))
  let registro = registroVacio(pr)
  let anterior = 0
  let cota = pr.cotaMm
  lecturas.forEach((l, i) => {
    const ruido = rng() < 0.7 ? 0 : rng() < 0.5 ? 1 : -1
    const lecturaMm = l.verdaderaMm + ruido + (evento.tramo === tramo && evento.indiceLectura === i ? evento.desplazamientoMm : 0)
    const base = { estacion: l.estacion, punto: l.punto, tipo: l.tipo, lecturaMm, observaciones: '' }
    if (l.tipo === 'LT') {
      registro = registrarFila(registro, { ...base, distanciaM: null, desnivelMm: null, cotaMm: null }, i)
    } else {
      const dh = anterior - lecturaMm
      cota += dh
      registro = registrarFila(registro, { ...base, distanciaM: l.distanciaM ?? null, desnivelMm: dh, cotaMm: cota }, i)
    }
    anterior = lecturaMm
  })
  return registro
}

/** Cota de M que da una libreta (la que escribió la cuadrilla), o null si aún no llega a M. */
export function cotaDeM(registro: RegistroLibreta, lecturas: LecturaPlanificada[]): Mm | null {
  const n = idaDe(lecturas).length
  const { vigentes, calculo } = calcularRegistro(registro)
  if (vigentes.length < n) return null
  return vigentes[n - 1].cotaMm ?? calculo.filas[n - 1].cotaMm
}

/** La libreta tiene todas las visadas del recorrido (ida y vuelta). */
export const tramoTerminado = (registro: RegistroLibreta | null, lecturas: LecturaPlanificada[]) =>
  registro !== null && calcularRegistro(registro).vigentes.length >= lecturas.length

/** Cierre de ida y vuelta de un tramo contra su cota conocida, o null si falta la vuelta. */
export const cierreDeTramo = (registro: RegistroLibreta | null, lecturas: LecturaPlanificada[], coeficienteMm: number) =>
  registro && tramoTerminado(registro, lecturas) ? cierreDelCircuito(registro, lecturas, coeficienteMm) : null

export interface NotaBitacora {
  estacion: string
  /** Una nota de rutina o el evento sembrado (que la cuadrilla anota sin saber qué causó). */
  tipo: 'rutina' | TipoEvento
}

/** Bitácora de un tramo: una nota por postura; en la del evento, lo que pasó. */
export function bitacora(lecturas: LecturaPlanificada[], tramo: Tramo, evento: EventoSembrado, estacionDelEvento: string): NotaBitacora[] {
  const estaciones = [...new Set(lecturas.map((l) => l.estacion))]
  return estaciones.map((estacion) => ({ estacion, tipo: evento.tramo === tramo && estacion === estacionDelEvento ? evento.tipo : 'rutina' }))
}

const camposDiagnostico = () => ({
  tramo: TRAMOS,
  estacion: ['S1', 'S2'] as const,
  causa: CAUSAS,
  cotaComun: 'mm' as const,
})

export function bloqueosM23(ctx: ContextoEntrega): string[] {
  const s = ctx.cooperativa
  if (!s) return [t.sinSesion]
  if (!tramoTerminado(s.companero.registro, s.companero.lecturas)) return [t.companeroSinTerminar.replace('{tramo}', otroTramo(s.tramo))]
  return bloqueosFormulario(ctx.formulario, camposDiagnostico(), { clave: 'procedimiento', minimo: 40 })
}

export function evaluarM23(ctx: ContextoEntrega): Evaluacion {
  const s = ctx.cooperativa as SesionCooperativa
  const { pares, criterios, sinErroresRegistro } = revisionComun(ctx)
  // Quien leyó bien la mira dañada (o con el trípode golpeado) leyó "exacto" lo que se veía.
  const desvio = (i: number) => (s.evento.tramo === s.tramo && s.evento.tipo !== 'libreta-mojada' && i === s.evento.indiceLectura ? s.evento.desplazamientoMm : 0)
  const lecturasExactas = pares.filter(
    (p, i) => Math.abs(p.fila.lecturaMm - p.lectura.verdaderaMm - desvio(i)) <= ctx.parametros.lectura.toleranciaExactaMm,
  ).length
  const f = ctx.formulario
  const T = toleranciaRecorrido(ctx)
  const cotaComunMm = leerMm(f, 'cotaComun') ?? 0
  const v = validarResolucion(
    { tramo: f.tramo as Tramo, estacion: f.estacion, causa: f.causa as CausaRaiz, cotaComunMm, procedimiento: f.procedimiento ?? '' },
    s.evento,
    s.estacionDelEvento,
    cotaVerdaderaMm(ctx.escenario, PUNTO_ENCUENTRO),
    T,
  )
  criterios.push({ id: 'tramo', ok: v.tramoOk, texto: v.tramoOk ? t.tramoOk : t.tramoMal })
  criterios.push({ id: 'estacion', ok: v.estacionOk, texto: v.estacionOk ? t.estacionOk : t.estacionMal })
  criterios.push({ id: 'causa', ok: v.causaOk, texto: v.causaOk ? t.causaOk : t.causaMal })
  criterios.push({ id: 'cota', ok: v.cotaOk, texto: (v.cotaOk ? t.cotaOk : t.cotaMal).replace('{t}', textoTolerancia(T)) })

  // Las dos cuadrillas deben coincidir en la cota y documentar (§14). La simulada adopta el diagnóstico.
  const otra = s.companero.resolucion
  const acuerdo = s.companero.simulado || (otra !== null && otra.documentada && Math.abs(otra.cotaComunMm - cotaComunMm) <= T)
  criterios.push({ id: 'acuerdo', ok: acuerdo, texto: acuerdo ? t.acuerdoOk : t.acuerdoMal.replace('{t}', textoTolerancia(T)) })

  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro })
}
