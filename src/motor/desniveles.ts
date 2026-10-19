import { redondearMedioArriba, type Mm } from './numeros'

// Método de los desniveles (§3 de la especificación). Es el único método de cálculo del juego:
// la cota de cada punto se obtiene sumando desniveles desde un punto de cota conocida.

export type TipoVisada = 'LT' | 'LA'

/** Una fila de la libreta = una visada (§14). */
export interface Visada {
  estacion: string
  punto: string
  tipo: TipoVisada
  lecturaMm: Mm
  /** Distancia horizontal (m) desde el punto visado anterior de la misma estación. Obligatoria en LA. */
  distanciaM?: number
}

export interface FilaCalculada extends Visada {
  /** Desnivel respecto del punto visado anterior de la misma estación (solo en filas LA). */
  desnivelMm?: Mm
  cotaMm: Mm
  distanciaAcumuladaM: number
}

export interface ResultadoLibreta {
  filas: FilaCalculada[]
  problemas: string[]
}

/** Δh = LT − LA: lectura atrás menos lectura adelante, desde una misma estación. */
export const desnivelMm = (lecturaAtrasMm: Mm, lecturaAdelanteMm: Mm): Mm => lecturaAtrasMm - lecturaAdelanteMm

/**
 * Calcula desniveles y cotas de una libreta, por suma acumulada desde `cotaInicialMm`.
 *
 * Cada estación empieza con una LT sobre el último punto con cota (el PR o el punto de cambio) y
 * sigue con una o más LA. Con varias LA en la misma estación (lecturas intermedias de un perfil),
 * el desnivel de cada punto se toma respecto del punto visado justo antes: lectura anterior menos
 * lectura actual. Es el mismo Δh = LT − LA, encadenado.
 */
export function calcularLibreta(visadas: Visada[], cotaInicialMm: Mm): ResultadoLibreta {
  const filas: FilaCalculada[] = []
  const problemas: string[] = []
  let cota = cotaInicialMm
  let acumulada = 0
  let estacion: string | null = null
  let lecturaAnterior: Mm | null = null
  let puntoActual: string | null = null

  for (const [i, v] of visadas.entries()) {
    const n = i + 1
    if (v.tipo === 'LT') {
      if (v.estacion === estacion) problemas.push(`Fila ${n}: la estación ${v.estacion} ya tiene su lectura atrás`)
      if (puntoActual !== null && v.punto !== puntoActual) {
        problemas.push(`Fila ${n}: la lectura atrás va sobre ${puntoActual}, el último punto con cota`)
      }
      estacion = v.estacion
      lecturaAnterior = v.lecturaMm
      puntoActual = v.punto
      filas.push({ ...v, cotaMm: cota, distanciaAcumuladaM: acumulada })
      continue
    }

    if (v.estacion !== estacion || lecturaAnterior === null) {
      problemas.push(`Fila ${n}: lectura adelante sin lectura atrás en la estación ${v.estacion}`)
      filas.push({ ...v, cotaMm: cota, distanciaAcumuladaM: acumulada })
      continue
    }
    if (v.distanciaM === undefined) problemas.push(`Fila ${n}: falta la distancia desde el punto anterior`)
    const dh = desnivelMm(lecturaAnterior, v.lecturaMm)
    cota += dh
    acumulada = redondearMedioArriba(acumulada + (v.distanciaM ?? 0), 3)
    lecturaAnterior = v.lecturaMm
    puntoActual = v.punto
    filas.push({ ...v, desnivelMm: dh, cotaMm: cota, distanciaAcumuladaM: acumulada })
  }
  return { filas, problemas }
}

/** Σ Δh de la libreta. */
export const sumaDesnivelesMm = (filas: FilaCalculada[]): Mm => filas.reduce((s, f) => s + (f.desnivelMm ?? 0), 0)

/**
 * Comprobación aritmética ΣLT − ΣLA (§3.3), equivalente a ΣΔh. Las lecturas intermedias no entran:
 * de cada estación se toma solo la última LA, la que cierra la estación.
 */
export function comprobacionLecturasMm(visadas: Visada[]): Mm {
  let sumaLt = 0
  const ultimaLa = new Map<string, Mm>()
  for (const v of visadas) {
    if (v.tipo === 'LT') sumaLt += v.lecturaMm
    else ultimaLa.set(v.estacion, v.lecturaMm)
  }
  let sumaLa = 0
  for (const la of ultimaLa.values()) sumaLa += la
  return sumaLt - sumaLa
}

export interface PuntoRecorrido {
  punto: string
  cotaMm: Mm
  distanciaAcumuladaM: number
}

/** Secuencia de puntos del recorrido: el de partida y cada punto visado adelante (sin repetir los PC). */
export function puntosDelRecorrido(filas: FilaCalculada[]): PuntoRecorrido[] {
  return filas
    .filter((f, i) => i === 0 || f.tipo === 'LA')
    .map(({ punto, cotaMm, distanciaAcumuladaM }) => ({ punto, cotaMm, distanciaAcumuladaM }))
}

/**
 * Error de cierre: cota calculada al final menos cota conocida del punto final.
 * En un circuito cerrado el punto final es el de partida y queda e = ΣΔh (§3.3).
 */
export const errorCierreMm = (cotaInicialMm: Mm, sumaDesniveles: Mm, cotaFinalConocidaMm: Mm): Mm =>
  cotaInicialMm + sumaDesniveles - cotaFinalConocidaMm

/** T = coeficiente · √K mm, con K = longitud del recorrido en km (§3.4). */
export const toleranciaCierreMm = (longitudM: number, coeficienteMm = 12) => coeficienteMm * Math.sqrt(longitudM / 1000)

export interface EvaluacionCierre {
  errorMm: Mm
  toleranciaMm: number
  aprobado: boolean
}

/** Circuito aprobado si |e| ≤ T. */
export function evaluarCierre(errorMm: Mm, longitudM: number, coeficienteMm = 12): EvaluacionCierre {
  const toleranciaMm = toleranciaCierreMm(longitudM, coeficienteMm)
  return { errorMm, toleranciaMm, aprobado: Math.abs(errorMm) <= toleranciaMm }
}

export interface PuntoCompensado extends PuntoRecorrido {
  correccionMm: Mm
  cotaCompensadaMm: Mm
}

/**
 * Compensación proporcional a la distancia acumulada: cᵢ = −e · dᵢ / D (§3.5).
 * Cada corrección se redondea al milímetro, medio arriba. El último punto recibe −e completo.
 */
export function compensar(puntos: PuntoRecorrido[], errorMm: Mm): PuntoCompensado[] {
  const total = puntos[puntos.length - 1]?.distanciaAcumuladaM ?? 0
  return puntos.map((p) => {
    const correccionMm = total > 0 ? redondearMedioArriba((-errorMm * p.distanciaAcumuladaM) / total) : 0
    return { ...p, correccionMm, cotaCompensadaMm: p.cotaMm + correccionMm }
  })
}

/** Pendiente de un tramo: P% = Δh / distancia × 100 (§3.6). */
export const pendientePct = (desnivel: Mm, distanciaM: number) => desnivel / 10 / distanciaM

export interface DiferenciaCota {
  punto: string
  esperadaMm: Mm
  propuestaMm: Mm | null
}

/**
 * Compara cotas propuestas por el jugador con las de referencia. Devuelve las que faltan o se
 * alejan más que la tolerancia (por defecto ±1 mm; la compensación de 1.2 usa ±2 mm).
 */
export function diferenciasDeCota(
  propuestas: Record<string, Mm>,
  referencia: { punto: string; cotaMm: Mm }[],
  toleranciaMm = 1,
): DiferenciaCota[] {
  return referencia
    .map(({ punto, cotaMm }) => ({ punto, esperadaMm: cotaMm, propuestaMm: propuestas[punto] ?? null }))
    .filter((d) => d.propuestaMm === null || Math.abs(d.propuestaMm - d.esperadaMm) > toleranciaMm)
}
