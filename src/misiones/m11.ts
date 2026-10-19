import { cotaVerdaderaMm, longitudRecorridoM } from '@/motor/escenarios'
import { toleranciaCierreMm } from '@/motor/desniveles'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { cerrarEvaluacion, mmConSigno, revisionComun, textoTolerancia } from './comunes'
import type { ContextoEntrega, Evaluacion } from './tipos'

// Misión 1.1 · El Primer Coteo (§5): una estación entre el PR y P1. Aprueba si la cota de P1 que
// sale de la libreta queda a no más de T = 12√K mm de la verdadera.

const t = textos.entrega.m11

export const MOTIVOS_M11 = ['calculos', 'distancias', 'cota'] as const

export function evaluarM11(ctx: ContextoEntrega): Evaluacion {
  const { pares, criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const ultimo = pares[pares.length - 1]
  const errorMm = ultimo.calculo.cotaMm - cotaVerdaderaMm(ctx.escenario, ultimo.lectura.punto)
  const toleranciaMm = toleranciaCierreMm(longitudRecorridoM(ctx.lecturas), ctx.parametros.toleranciaCierre.coeficienteMm)
  const ok = Math.abs(errorMm) <= toleranciaMm
  const valores = { punto: ultimo.lectura.punto, e: mmConSigno(errorMm), t: textoTolerancia(toleranciaMm) }
  // Al fallar no se dice cuánto se erró: con ese dato se podría despejar la cota verdadera.
  criterios.push({ id: 'cota', ok, texto: rellenar(ok ? t.cotaOk : t.cotaMal, valores) })
  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro })
}
