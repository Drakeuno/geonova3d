import { abastecimientoSuficiente, cotaOptimaTanqueMm, planoAlterado } from '@/motor/decisiones'
import { cotaVerdaderaMm } from '@/motor/escenarios'
import { aMm } from '@/motor/numeros'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import {
  bloqueosFormulario,
  cerrarEvaluacion,
  criterio,
  fueraDe,
  leerMm,
  mmConSigno,
  puntosDeLibreta,
  revisionComun,
  textoTolerancia,
} from './comunes'
import { cierreDelCircuito } from './m12'
import type { ContextoEntrega, Evaluacion } from './tipos'

// Misión 2.2 · Detective de Cotas (§5). Un proyecto anterior instaló el estanque elevado con un plano
// cuyo radier figura 3,500 m más alto que el real. Se re-nivela el sector en un circuito de
// verificación, se detecta la alteración y se calcula la cota óptima: máx(Cota Vᵢ) + 10 m.c.a.
// El estanque está sobre una torre: su cota = radier + altura de la torre (dato correcto del plano).

const t = textos.entrega.m22

export const VIVIENDAS_2_2 = ['V1', 'V2', 'V3', 'V4']
export const PUNTO_ESTANQUE = 'T'
export const MOTIVOS_M22 = ['calculos', 'distancias', 'cierre', 'planilla', 'deteccion', 'cotaOptima', 'abastecimiento'] as const

export const datosEstanque = (ctx: Pick<ContextoEntrega, 'escenario'>) => ({
  alturaTorreMm: aMm(ctx.escenario.datos.alturaTorre ?? 0),
  radierPlanoMm: aMm(ctx.escenario.datos.cotaRadierPlano ?? 0),
})

const campos = () => ({
  [`cota:${PUNTO_ESTANQUE}`]: 'mm' as const,
  dif: 'mm' as const,
  alterado: ['si', 'no'] as const,
  cotaEstanque: 'mm' as const,
  ...Object.fromEntries(VIVIENDAS_2_2.flatMap((v) => [[`cota:${v}`, 'mm' as const], [`presion:${v}`, 'mm' as const]])),
  cotaOptima: 'mm' as const,
  cotaPropuesta: 'mm' as const,
})

export const bloqueosM22 = (ctx: ContextoEntrega) => bloqueosFormulario(ctx.formulario, campos(), { clave: 'justificacion', minimo: 30 })

export function evaluarM22(ctx: ContextoEntrega): Evaluacion {
  const { pares, criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const f = ctx.formulario
  const margen = ctx.parametros.comparacion.toleranciaMm
  const presionMinima = ctx.parametros.acto2.presionMinimaMca
  const { alturaTorreMm, radierPlanoMm } = datosEstanque(ctx)

  // (0) El circuito de verificación cierra: sin eso, no hay con qué acusar al plano.
  const cierre = cierreDelCircuito(ctx.registro, ctx.lecturas, ctx.parametros.toleranciaCierre.coeficienteMm)
  const T = cierre.toleranciaMm
  criterios.push({
    id: 'cierre',
    ok: cierre.aprobado,
    texto: rellenar(cierre.aprobado ? t.cierreOk : t.cierreMal, { e: mmConSigno(cierre.errorMm), t: textoTolerancia(T) }),
  })

  // El informe copia bien la libreta y hace bien sus cuentas.
  const lib = puntosDeLibreta(pares, ctx.registro.pr)
  const radier = leerMm(f, `cota:${PUNTO_ESTANQUE}`)
  const estanque = leerMm(f, 'cotaEstanque')
  const cotasV = VIVIENDAS_2_2.map((v) => leerMm(f, `cota:${v}`))
  const mal = [
    fueraDe(radier, lib.get(PUNTO_ESTANQUE)!.cotaMm, margen) && t.campos.radier,
    ...VIVIENDAS_2_2.map((v, i) => fueraDe(cotasV[i], lib.get(v)!.cotaMm, margen) && v),
    (radier === null || fueraDe(leerMm(f, 'dif'), radierPlanoMm - radier, margen)) && t.campos.dif,
    (radier === null || fueraDe(estanque, radier + alturaTorreMm, margen)) && t.campos.estanque,
    ...VIVIENDAS_2_2.map((v, i) => {
      const c = cotasV[i]
      return (estanque === null || c === null || fueraDe(leerMm(f, `presion:${v}`), estanque - c, margen)) && rellenar(t.campos.presion, { v })
    }),
    (cotasV.some((c) => c === null) || fueraDe(leerMm(f, 'cotaOptima'), cotaOptimaTanqueMm(cotasV as number[], presionMinima), margen)) &&
      t.campos.optima,
  ].filter((x): x is string => Boolean(x))
  criterios.push(criterio('planilla', mal, t.planillaOk, t.planillaMal))

  // (a) Detección: el radier re-nivelado calza con el terreno y el jugador acusa la alteración.
  const radierReal = cotaVerdaderaMm(ctx.escenario, PUNTO_ESTANQUE)
  const detecta = f.alterado === 'si' && planoAlterado(radierPlanoMm, radierReal, T) && !fueraDe(radier, radierReal, T)
  criterios.push({ id: 'deteccion', ok: detecta, texto: detecta ? t.deteccionOk : t.deteccionMal })

  // (b) Cota óptima contra la del terreno verdadero, dentro de la tolerancia del levantamiento.
  const viviendas = VIVIENDAS_2_2.map((id) => ({ id, cotaMm: cotaVerdaderaMm(ctx.escenario, id) }))
  const optimaReal = cotaOptimaTanqueMm(
    viviendas.map((v) => v.cotaMm),
    presionMinima,
  )
  const optimaOk = !fueraDe(leerMm(f, 'cotaOptima'), optimaReal, T)
  criterios.push({ id: 'cotaOptima', ok: optimaOk, texto: rellenar(optimaOk ? t.optimaOk : t.optimaMal, { t: textoTolerancia(T) }) })

  // (c) Con la cota propuesta, todas las viviendas reciben al menos la presión mínima.
  const propuesta = leerMm(f, 'cotaPropuesta')
  const abastece = propuesta !== null && abastecimientoSuficiente(propuesta, viviendas, presionMinima)
  criterios.push({
    id: 'abastecimiento',
    ok: abastece,
    texto: rellenar(abastece ? t.abastecimientoOk : t.abastecimientoMal, { mca: presionMinima }),
  })

  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro, errorCierreMm: cierre.errorMm })
}
