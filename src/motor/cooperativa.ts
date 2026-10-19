import { elegir, enteroEntre, signoAlAzar, type Rng } from './azar'
import { errorCierreMm } from './desniveles'
import type { Mm } from './numeros'

// Misión 2.3 · Punto de Encuentro (§5 y protocolo cooperativo de la §14).
// Dos cuadrillas nivelan tramos opuestos de una línea de conducción C → M ← R. Cada una va y vuelve
// por su tramo, para cerrarlo contra su cota conocida (C para A, R para B).

export type Tramo = 'A' | 'B'

/** Causas que las cuadrillas pueden diagnosticar (§5, 2.3). */
export const CAUSAS = ['lectura', 'anotacion', 'instrumento-desnivelado', 'cinta-mal-tensada'] as const
export type CausaRaiz = (typeof CAUSAS)[number]

/**
 * Eventos narrativos que siembran el error grosero. Cada uno corresponde a una causa raíz: la cinta
 * mal tensada no se siembra porque altera distancias, no cotas, y no produciría la discrepancia en M.
 */
export const EVENTOS = {
  'mira-danada': { causa: 'lectura', descripcion: 'El viento golpeó la mira y su graduación quedó corrida.' },
  'tripode-golpeado': { causa: 'instrumento-desnivelado', descripcion: 'Alguien pasó a llevar el trípode entre una lectura y otra.' },
  'libreta-mojada': { causa: 'anotacion', descripcion: 'La lluvia mojó la libreta y un dato quedó mal copiado.' },
} as const satisfies Record<string, { causa: CausaRaiz; descripcion: string }>
export type TipoEvento = keyof typeof EVENTOS

export interface EventoSembrado {
  tramo: Tramo
  tipo: TipoEvento
  causa: CausaRaiz
  /** Índice de la lectura alterada dentro de la ida del tramo (antes de llegar a M). */
  indiceLectura: number
  /** Desplazamiento introducido (mm), mayor que el umbral de error grosero. */
  desplazamientoMm: Mm
}

/**
 * Siembra el evento al iniciar la misión: así la fase de diagnóstico ocurre siempre (§14).
 * El error va en la ida del tramo sorteado, para que la cota de M de esa cuadrilla quede mal.
 */
export function sembrarEvento(rng: Rng, lecturasIda: Record<Tramo, number>, umbralMm = 30): EventoSembrado {
  const tramo = elegir(rng, ['A', 'B'] as const)
  const tipo = elegir(rng, Object.keys(EVENTOS) as TipoEvento[])
  return {
    tramo,
    tipo,
    causa: EVENTOS[tipo].causa,
    indiceLectura: enteroEntre(rng, 0, lecturasIda[tramo] - 1),
    desplazamientoMm: signoAlAzar(rng) * enteroEntre(rng, umbralMm + 5, umbralMm + 60),
  }
}

export interface CierreTramo {
  tramo: Tramo
  /** Cota de M calculada en la ida. */
  cotaMMm: Mm
  /** Error de cierre de ida y vuelta contra la cota conocida del extremo. */
  errorMm: Mm
  toleranciaMm: number
  cierra: boolean
}

export function cierreTramo(
  tramo: Tramo,
  cotaConocidaMm: Mm,
  desnivelesIdaMm: Mm[],
  desnivelesVueltaMm: Mm[],
  toleranciaMm: number,
): CierreTramo {
  const ida = desnivelesIdaMm.reduce((s, d) => s + d, 0)
  const vuelta = desnivelesVueltaMm.reduce((s, d) => s + d, 0)
  const errorMm = errorCierreMm(cotaConocidaMm, ida + vuelta, cotaConocidaMm)
  return { tramo, cotaMMm: cotaConocidaMm + ida, errorMm, toleranciaMm, cierra: Math.abs(errorMm) <= toleranciaMm }
}

/** Las cotas de M de ambas cuadrillas difieren más que la tolerancia: se activa el diagnóstico. */
export const hayDiscrepancia = (a: CierreTramo, b: CierreTramo, toleranciaMm: number) =>
  Math.abs(a.cotaMMm - b.cotaMMm) > toleranciaMm

/** El tramo que no cierra contra su cota conocida es el que contiene el error (§14). */
export function tramoConError(a: CierreTramo, b: CierreTramo): Tramo | 'ambos' | null {
  if (!a.cierra && !b.cierra) return 'ambos'
  if (!a.cierra) return 'A'
  if (!b.cierra) return 'B'
  return null
}

export interface Resolucion {
  tramo: Tramo
  indiceLectura: number
  causa: CausaRaiz
  cotaComunMm: Mm
  /** Procedimiento de corrección acordado y documentado por ambas cuadrillas. */
  procedimiento: string
}

export interface ValidacionResolucion {
  tramoOk: boolean
  lecturaOk: boolean
  causaOk: boolean
  cotaOk: boolean
  documentada: boolean
  aprobada: boolean
}

/** Logro = cota común dentro de tolerancia + causa raíz bien identificada y documentada (§14). */
export function validarResolucion(
  r: Resolucion,
  evento: EventoSembrado,
  cotaVerdaderaMMm: Mm,
  toleranciaMm: number,
  minimoCaracteres = 40,
): ValidacionResolucion {
  const tramoOk = r.tramo === evento.tramo
  const lecturaOk = tramoOk && r.indiceLectura === evento.indiceLectura
  const causaOk = r.causa === evento.causa
  const cotaOk = Math.abs(r.cotaComunMm - cotaVerdaderaMMm) <= toleranciaMm
  const documentada = r.procedimiento.trim().length >= minimoCaracteres
  return { tramoOk, lecturaOk, causaOk, cotaOk, documentada, aprobada: tramoOk && lecturaOk && causaOk && cotaOk && documentada }
}
