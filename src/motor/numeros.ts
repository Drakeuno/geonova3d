// Números de la libreta (§9 y §14 de la especificación).
// Los valores verticales (lecturas, desniveles, cotas) se registran en milímetros enteros: así las
// sumas de desniveles son exactas y no arrastran error de coma flotante. Las distancias van en metros.
// La interfaz usa coma decimal (estándar Chile); internamente se usa punto.

/** Valor vertical en milímetros enteros. */
export type Mm = number

const EPS = 1e-9

/**
 * Redondeo "medio arriba" alejándose de cero: 2,5 → 3 y −2,5 → −3. El épsilon corrige artefactos
 * de coma flotante como 1,0005 × 1000 = 1000,4999999999999.
 */
export function redondearMedioArriba(x: number, decimales = 0): number {
  const f = 10 ** decimales
  const r = Math.floor(Math.abs(x) * f + 0.5 + EPS) / f
  return x < 0 && r !== 0 ? -r : r
}

/** Metros → milímetros enteros, con redondeo medio arriba. */
export const aMm = (metros: number): Mm => redondearMedioArriba(metros * 1000)

/** Milímetros → metros. */
export const aMetros = (mm: Mm): number => mm / 1000

const PATRON_METROS = /^\s*([+\-−]?)(\d+)(?:[.,](\d+))?\s*$/

/**
 * Lee un valor escrito por el jugador en metros ("1,523", "1.523", "−0,75") y lo devuelve en mm.
 * Con más de tres decimales redondea a 0,001 m, medio arriba (§14). Devuelve null si no es número.
 * Trabaja sobre el texto, no sobre un float, para que el redondeo sea exacto.
 */
export function parsearMetrosAMm(texto: string): Mm | null {
  const m = PATRON_METROS.exec(texto)
  if (!m) return null
  const [, signo, entero, decimales = ''] = m
  let mm = Number(entero) * 1000 + Number(decimales.slice(0, 3).padEnd(3, '0'))
  if (decimales.length > 3 && Number(decimales[3]) >= 5) mm += 1
  return signo === '-' || signo === '−' ? -mm : mm
}

/**
 * Milímetros → texto en metros con tres decimales y coma: 1523 → "1,523", −750 → "−0,750".
 * Con `signo`, los positivos llevan "+" (útil para desniveles).
 */
export function formatearMm(mm: Mm, { signo = false }: { signo?: boolean } = {}): string {
  const abs = Math.abs(mm)
  const prefijo = mm < 0 ? '−' : signo && mm > 0 ? '+' : ''
  return `${prefijo}${Math.floor(abs / 1000)},${String(abs % 1000).padStart(3, '0')}`
}

/** Número cualquiera con coma decimal (pendientes, distancias, porcentajes). */
export const formatearNumero = (n: number, decimales = 3) =>
  n.toLocaleString('es-CL', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })

/** Comparación numérica con tolerancia (por defecto ±1 mm, §14). */
export const dentroDeTolerancia = (aMmValor: Mm, bMmValor: Mm, toleranciaMm = 1) =>
  Math.abs(aMmValor - bMmValor) <= toleranciaMm
