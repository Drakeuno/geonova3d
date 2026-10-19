import { pendientePct } from './desniveles'
import { aMm, type Mm } from './numeros'

// Decisiones técnicas del Acto 2 con los desniveles de la libreta (Misiones 2.1 y 2.2).

// ── 2.1 · La gran decisión técnica, con sus tres pieles intercambiables (RF-12) ──────────────

export type DecisionAgua = 'gravedad' | 'bombeo'

/**
 * Piel "La Red del Agua": gravedad si Cota(F) > Cota(V4) y la pendiente hidráulica
 * P = (Cota(F) − Cota(V4)) / dist(F,V4) × 100 ≥ mínima; si no, bombeo (§5, corrección v1.1).
 * La distancia es la del trazado (suma de los tramos F–V1–…–V4).
 */
export function decidirAgua(cotaFuenteMm: Mm, cotaUltimaViviendaMm: Mm, distanciaTrazadoM: number, pendienteMinimaPct: number) {
  const pendiente = pendientePct(cotaFuenteMm - cotaUltimaViviendaMm, distanciaTrazadoM)
  const decision: DecisionAgua = cotaFuenteMm > cotaUltimaViviendaMm && pendiente >= pendienteMinimaPct ? 'gravedad' : 'bombeo'
  return { decision, pendientePct: pendiente }
}

/** Piel "Camino del Pehuén": el camino es transitable si ningún tramo supera la pendiente máxima. */
export function evaluarTransitable(tramos: { pendientePct: number }[], maximoPct: number) {
  const excedidos = tramos.flatMap((t, i) => (Math.abs(t.pendientePct) > maximoPct ? [i] : []))
  return { transitable: excedidos.length === 0, excedidos }
}

/** Piel "Operación Cero Cota": viviendas bajo la línea de seguridad (cota menor que la línea). */
export const viviendasBajoLinea = (viviendas: { id: string; cotaMm: Mm }[], cotaSeguridadMm: Mm) =>
  viviendas.filter((v) => v.cotaMm < cotaSeguridadMm).map((v) => v.id)

/**
 * La justificación debe citar los números de la libreta, no valores genéricos (§5, 2.1 c).
 * Compara cada valor citado con el de la libreta, con tolerancia de ±1 mm.
 */
export function citasCoinciden(citas: Record<string, Mm | null>, libreta: Record<string, Mm>, toleranciaMm = 1) {
  const faltantes = Object.keys(libreta).filter((k) => citas[k] === undefined || citas[k] === null)
  const distintas = Object.keys(libreta).filter((k) => {
    const c = citas[k]
    return c !== undefined && c !== null && Math.abs(c - libreta[k]) > toleranciaMm
  })
  return { ok: faltantes.length === 0 && distintas.length === 0, faltantes, distintas }
}

// ── 2.2 · Detective de Cotas ─────────────────────────────────────────────────────────────────

/** El plano está alterado si su cota del tanque difiere de la re-nivelada más que la tolerancia. */
export const planoAlterado = (cotaPlanoMm: Mm, cotaMedidaMm: Mm, toleranciaMm: number) =>
  Math.abs(cotaPlanoMm - cotaMedidaMm) > toleranciaMm

/** Cota óptima del tanque = máx(Cota(Vᵢ)) + presión mínima (m.c.a. = metros de columna de agua). */
export const cotaOptimaTanqueMm = (cotasViviendasMm: Mm[], presionMinimaMca: number): Mm =>
  Math.max(...cotasViviendasMm) + aMm(presionMinimaMca)

/** Presión disponible en cada vivienda: Cota(T) − Cota(Vᵢ), en m.c.a. */
export const presionesMca = (cotaTanqueMm: Mm, viviendas: { id: string; cotaMm: Mm }[]) =>
  viviendas.map((v) => ({ id: v.id, presionMca: (cotaTanqueMm - v.cotaMm) / 1000 }))

/** Todas las viviendas reciben al menos la presión mínima (comparación exacta en mm). */
export const abastecimientoSuficiente = (cotaTanqueMm: Mm, viviendas: { cotaMm: Mm }[], presionMinimaMca: number) =>
  viviendas.every((v) => cotaTanqueMm - v.cotaMm >= aMm(presionMinimaMca))
