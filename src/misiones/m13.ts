import { estacionesDelEje, type Escenario } from '@/motor/escenarios'
import type { EstacionPerfil } from '@/motor/perfil'
import type { RegistroLibreta } from '@/motor/libreta'
import type { LecturaPlanificada } from '@/motor/escenarios'
import { parsearMetrosAMm, parsearNumero, type Mm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { mismoNombre } from '@/motor/desniveles'
import { cerrarEvaluacion, emparejar, mmConSigno, revisionComun, textoTolerancia, TOLERANCIA_DISTANCIA_M } from './comunes'
import { cierreDelCircuito } from './m12'
import type { ContextoEntrega, Criterio, EntradasPerfil, Evaluacion } from './tipos'

// Misión 1.3 · El Perfil del Sendero (§5): (a) Δh parciales y acumulados correctos; (b) dibujo con
// las escalas pedidas, plano de comparación y ejes rotulados, y libreta completa; (c) cierre del
// perfil, que vuelve al PR (decisión del 19-oct-2026).

const t = textos.entrega.m13

export const MOTIVOS_M13 = ['calculos', 'distancias', 'cierre', 'planilla', 'desniveles', 'dibujo'] as const

/**
 * Perfil generado desde la libreta (RF-09): cada estación del eje con su cota calculada desde las
 * lecturas del jugador y su progresiva desde la primera estación según las distancias anotadas. Si el
 * eje parte en el PR de la libreta (Ñielol: E), esa es la primera estación. Toma la libreta tal como
 * esté: si aún faltan estaciones, entrega las que hay.
 */
export function perfilDesdeLibreta(registro: RegistroLibreta, lecturas: LecturaPlanificada[], eje: string[]): EstacionPerfil[] {
  const pares = emparejar(registro, lecturas).filter((p) => p.fila && p.calculo && p.lectura.tipo === 'LA')
  const estaciones: EstacionPerfil[] = []
  for (const id of eje) {
    if (estaciones.length === 0 && mismoNombre(registro.pr.punto, id)) {
      estaciones.push({ id, cotaMm: registro.pr.cotaMm, progresivaM: 0 })
      continue
    }
    const par = pares.find((p) => p.lectura.punto === id && mismoNombre(p.fila.punto, id))
    if (!par) break
    estaciones.push({ id, cotaMm: par.calculo.cotaMm, progresivaM: par.calculo.distanciaAcumuladaM })
  }
  const origen = estaciones[0]?.progresivaM ?? 0
  return estaciones.map((e) => ({ ...e, progresivaM: Math.round((e.progresivaM - origen) * 1000) / 1000 }))
}

export interface EsperadoPlanilla {
  id: string
  progresivaM: number
  cotaMm: Mm
  /** Desde la estación anterior (null en E0). */
  parcialMm: Mm | null
  acumuladoMm: Mm
}

/** Lo que la planilla debe llevar según un perfil (el de la libreta o el verdadero). */
export function planillaEsperada(estaciones: EstacionPerfil[]): EsperadoPlanilla[] {
  return estaciones.map((e, i) => ({
    id: e.id,
    progresivaM: e.progresivaM,
    cotaMm: e.cotaMm,
    parcialMm: i === 0 ? null : e.cotaMm - estaciones[i - 1].cotaMm,
    acumuladoMm: e.cotaMm - estaciones[0].cotaMm,
  }))
}

interface FilaLeida {
  progresivaM: number | null
  cotaMm: Mm | null
  parcialMm: Mm | null
  acumuladoMm: Mm | null
}

function leerFila(entradas: EntradasPerfil, id: string): FilaLeida {
  const f = entradas.filas[id]
  return {
    progresivaM: parsearNumero(f?.progresiva ?? ''),
    cotaMm: parsearMetrosAMm(f?.cota ?? ''),
    parcialMm: parsearMetrosAMm(f?.parcial ?? ''),
    acumuladoMm: parsearMetrosAMm(f?.acumulado ?? ''),
  }
}

/** Planilla o dibujo incompletos: bloquean la entrega. */
export function bloqueosPerfil(ctx: ContextoEntrega): string[] {
  const eje = estacionesDelEje(ctx.escenario)
  const motivos: string[] = []
  const incompletas = eje
    .filter((e, i) => {
      const f = leerFila(ctx.perfil, e.id)
      return f.progresivaM === null || f.cotaMm === null || f.acumuladoMm === null || (i > 0 && f.parcialMm === null)
    })
    .map((e) => e.id)
  if (incompletas.length) motivos.push(rellenar(t.faltaPlanilla, { estaciones: incompletas.join(', ') }))
  const p = ctx.perfil
  const faltan = [
    parsearNumero(p.escalaH) === null && t.campos.escalaH,
    parsearNumero(p.escalaV) === null && t.campos.escalaV,
    parsearMetrosAMm(p.planoComparacion) === null && t.campos.plano,
    !p.ejeX && t.campos.ejeX,
    !p.ejeY && t.campos.ejeY,
    !p.titulo.trim() && t.campos.titulo,
  ].filter(Boolean)
  if (faltan.length) motivos.push(rellenar(t.faltaDibujo, { campos: faltan.join(', ') }))
  return motivos
}

/** Plano de comparación válido: un metro entero bajo la cota más baja, a no más de 2 m de ella. */
export function planoComparacionValido(planoMm: Mm, cotaMinimaMm: Mm) {
  return planoMm % 1000 === 0 && planoMm <= cotaMinimaMm && cotaMinimaMm - planoMm <= 2000
}

export function evaluarM13(ctx: ContextoEntrega): Evaluacion {
  const { criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const cierre = cierreDelCircuito(ctx.registro, ctx.lecturas, ctx.parametros.toleranciaCierre.coeficienteMm)
  const tol = { e: mmConSigno(cierre.errorMm), t: textoTolerancia(cierre.toleranciaMm) }
  criterios.push({ id: 'cierre', ok: cierre.aprobado, texto: rellenar(cierre.aprobado ? t.cierreOk : t.cierreMal, tol) })
  criterios.push(...criteriosPerfil(ctx, ctx.registro, ctx.lecturas, cierre.toleranciaMm))
  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro, errorCierreMm: cierre.errorMm })
}

/**
 * Planilla, desniveles y dibujo del perfil (1.3 y 3.3): (a) la planilla copia bien la libreta y hace
 * bien las cuentas, y sus desniveles calzan con el terreno dentro de la tolerancia; (b) el dibujo
 * cumple la plantilla.
 */
export function criteriosPerfil(ctx: ContextoEntrega, registro: RegistroLibreta, lecturas: LecturaPlanificada[], toleranciaMm: number): Criterio[] {
  const eje = estacionesDelEje(ctx.escenario)
  const deLibreta = planillaEsperada(perfilDesdeLibreta(registro, lecturas, eje.map((e) => e.id)))
  const verdadera = planillaEsperada(eje)
  const margen = ctx.parametros.comparacion.toleranciaMm
  const fuera = (v: number | null, ref: number | null, m: number) => ref !== null && (v === null || Math.abs(v - ref) > m)

  const inconsistentes = deLibreta
    .filter((esp) => {
      const f = leerFila(ctx.perfil, esp.id)
      return (
        fuera(f.progresivaM, esp.progresivaM, TOLERANCIA_DISTANCIA_M) ||
        fuera(f.cotaMm, esp.cotaMm, margen) ||
        fuera(f.parcialMm, esp.parcialMm, margen) ||
        fuera(f.acumuladoMm, esp.acumuladoMm, margen)
      )
    })
    .map((e) => e.id)
  const lejanos = verdadera
    .filter((esp, i) => {
      const f = leerFila(ctx.perfil, esp.id)
      return fuera(f.acumuladoMm, esp.acumuladoMm, toleranciaMm) || (i > 0 && fuera(f.parcialMm, esp.parcialMm, toleranciaMm))
    })
    .map((e) => e.id)
  const t2 = textoTolerancia(toleranciaMm)
  return [
    {
      id: 'planilla',
      ok: inconsistentes.length === 0,
      texto: inconsistentes.length === 0 ? t.planillaOk : rellenar(t.planillaMal, { estaciones: inconsistentes.join(', ') }),
    },
    {
      id: 'desniveles',
      ok: lejanos.length === 0,
      texto: lejanos.length === 0 ? rellenar(t.desnivelesOk, { t: t2 }) : rellenar(t.desnivelesMal, { t: t2 }),
    },
    criterioDibujo(ctx, deLibreta),
  ]
}

/** (b) Escalas pedidas por el docente, plano de comparación bajo el terreno y ejes bien rotulados. */
function criterioDibujo(ctx: ContextoEntrega, deLibreta: EsperadoPlanilla[]): Criterio {
  const p = ctx.perfil
  const { escalaHorizontal, escalaVertical } = ctx.parametros.perfil
  const plano = parsearMetrosAMm(p.planoComparacion)
  const minima = Math.min(...deLibreta.map((e) => e.cotaMm))
  const problemas = [
    (parsearNumero(p.escalaH) !== escalaHorizontal || parsearNumero(p.escalaV) !== escalaVertical) &&
      rellenar(t.dibujo.escalas, { h: escalaHorizontal, v: escalaVertical }),
    (plano === null || !planoComparacionValido(plano, minima)) && t.dibujo.plano,
    (p.ejeX !== 'progresiva' || p.ejeY !== 'cota') && t.dibujo.ejes,
    p.titulo.trim().length < 3 && t.dibujo.titulo,
  ].filter((x): x is string => Boolean(x))
  return {
    id: 'dibujo',
    ok: problemas.length === 0,
    texto: problemas.length === 0 ? t.dibujoOk : rellenar(t.dibujoMal, { problemas: problemas.join('; ') }),
  }
}

export const ejeDelEscenario = (e: Escenario) => estacionesDelEje(e).map((x) => x.id)
