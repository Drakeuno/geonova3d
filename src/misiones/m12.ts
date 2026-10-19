import { cotaVerdaderaMm, longitudRecorridoM } from '@/motor/escenarios'
import { compensar, evaluarCierre, sumaDesnivelesMm, type PuntoCompensado, type PuntoRecorrido } from '@/motor/desniveles'
import { parsearMetrosAMm, parsearNumero, type Mm } from '@/motor/numeros'
import type { RegistroLibreta } from '@/motor/libreta'
import type { LecturaPlanificada } from '@/motor/escenarios'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { cerrarEvaluacion, emparejar, mmConSigno, revisionComun, textoTolerancia, type Par } from './comunes'
import type { ContextoEntrega, Criterio, Evaluacion } from './tipos'

// Misión 1.2 · Circuito Cerrado (§5): (a) e = ΣΔh con |e| ≤ T; (b) cotas compensadas propuestas
// por el jugador, cᵢ = −e·dᵢ/D dentro de ±2 mm; (c) cotas finales coherentes con el terreno.

const t = textos.entrega.m12

export const MOTIVOS_M12 = ['calculos', 'distancias', 'cierre', 'compensacion', 'coherencia'] as const

/** Puntos del circuito según la libreta del jugador: el PR de partida y cada punto visado adelante. */
export function puntosDelCircuito(pares: Par[], pr: { punto: string; cotaMm: Mm }): PuntoRecorrido[] {
  return [
    { punto: pr.punto, cotaMm: pr.cotaMm, distanciaAcumuladaM: 0 },
    ...pares
      .filter((p) => p.lectura.tipo === 'LA')
      .map((p) => ({ punto: p.lectura.punto, cotaMm: p.calculo.cotaMm, distanciaAcumuladaM: p.calculo.distanciaAcumuladaM })),
  ]
}

export interface CierreCircuito {
  errorMm: Mm
  toleranciaMm: number
  aprobado: boolean
  longitudM: number
  /** Puntos a compensar (sin el de partida), con la corrección y la cota compensada del sistema. */
  compensados: PuntoCompensado[]
}

/**
 * Cierre y compensación calculados por el sistema desde la libreta del jugador (§5, 1.2 a). La
 * tolerancia usa el largo del recorrido. Se muestra al jugador: sale de sus propios datos.
 */
export function cierreDelCircuito(registro: RegistroLibreta, lecturas: LecturaPlanificada[], coeficienteMm: number): CierreCircuito {
  const pares = emparejar(registro, lecturas)
  const errorMm = sumaDesnivelesMm(pares.map((p) => p.calculo))
  const longitudM = longitudRecorridoM(lecturas)
  const { toleranciaMm, aprobado } = evaluarCierre(errorMm, longitudM, coeficienteMm)
  return { errorMm, toleranciaMm, aprobado, longitudM, compensados: compensar(puntosDelCircuito(pares, registro.pr), errorMm).slice(1) }
}

/** Entradas de compensación que faltan o no son números. Bloquean la entrega. */
export function bloqueosCompensacion(ctx: ContextoEntrega): string[] {
  const { compensados } = cierreDelCircuito(ctx.registro, ctx.lecturas, ctx.parametros.toleranciaCierre.coeficienteMm)
  const incompletos = compensados
    .filter((p) => {
      const e = ctx.compensacion[p.punto]
      return !e || parsearNumero(e.correccion) === null || parsearMetrosAMm(e.cota) === null
    })
    .map((p) => p.punto)
  return incompletos.length ? [rellenar(t.faltaCompensacion, { puntos: incompletos.join(', ') })] : []
}

export function evaluarM12(ctx: ContextoEntrega): Evaluacion {
  const { criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const cierre = cierreDelCircuito(ctx.registro, ctx.lecturas, ctx.parametros.toleranciaCierre.coeficienteMm)
  const tol = { e: mmConSigno(cierre.errorMm), t: textoTolerancia(cierre.toleranciaMm) }
  criterios.push({ id: 'cierre', ok: cierre.aprobado, texto: rellenar(cierre.aprobado ? t.cierreOk : t.cierreMal, tol) })

  const margen = ctx.parametros.comparacion.compensacionMm
  const malCompensados = cierre.compensados
    .filter((p) => {
      const e = ctx.compensacion[p.punto]
      const correccion = parsearNumero(e?.correccion ?? '')
      const cota = parsearMetrosAMm(e?.cota ?? '')
      return correccion === null || cota === null || Math.abs(correccion - p.correccionMm) > margen || Math.abs(cota - p.cotaCompensadaMm) > margen
    })
    .map((p) => p.punto)
  const compensacion: Criterio = {
    id: 'compensacion',
    ok: malCompensados.length === 0,
    texto: malCompensados.length === 0 ? rellenar(t.compensacionOk, { mm: margen }) : rellenar(t.compensacionMal, { puntos: malCompensados.join(', '), mm: margen }),
  }
  criterios.push(compensacion)

  // Coherencia con el terreno: las lecturas intermedias no las controla el cierre (§5, 1.2 c).
  const incoherentes = cierre.compensados
    .filter((p) => Math.abs(p.cotaCompensadaMm - cotaVerdaderaMm(ctx.escenario, p.punto)) > cierre.toleranciaMm)
    .map((p) => p.punto)
  criterios.push({
    id: 'coherencia',
    ok: incoherentes.length === 0,
    texto: incoherentes.length === 0 ? t.coherenciaOk : rellenar(t.coherenciaMal, { t: tol.t }),
  })

  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro, errorCierreMm: cierre.errorMm })
}
