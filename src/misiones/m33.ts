import { pendientePct, toleranciaCierreMm } from '@/motor/desniveles'
import { estacionesDelEje, longitudRecorridoM } from '@/motor/escenarios'
import { construirPerfil, tramosQueExceden } from '@/motor/perfil'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'
import { bloqueosFormulario, cerrarEvaluacion, claveTramo, fueraDe, leerNumero, mmConSigno, revisionComun, textoTolerancia } from './comunes'
import { bloqueosCompensacion, cierreDelCircuito, criteriosCompensacion } from './m12'
import { bloqueosPerfil, criteriosPerfil, perfilDesdeLibreta, planillaEsperada } from './m13'
import { TOLERANCIA_PENDIENTE } from './m21'
import type { ContextoEntrega, Criterio, Evaluacion } from './tipos'

// Misión 3.3 · La Cota del Ñielol (§5), integrador grupal. Dos partes de terreno: el circuito de
// 5 puntos (E, B, L, M, R) desde el PR de la entrada y el perfil del sendero principal de E a M
// (240 m, 13 estaciones). El perfil se cierra en M contra la cota compensada del circuito. Luego el
// análisis de pendientes (tramo sobre 8 %), el informe técnico y la defensa ante la comisión.

const t = textos.entrega.m33

export const PARTE_CIRCUITO = 'circuito'
export const PARTE_PERFIL = 'perfil'
/** Punto donde el perfil se apoya en el circuito: el mirador. */
export const PUNTO_CIERRE_PERFIL = 'M'

export const MOTIVOS_M33 = [
  'calculos',
  'distancias',
  'cierre',
  'compensacion',
  'coherencia',
  'cierrePerfil',
  'planilla',
  'desniveles',
  'dibujo',
  'pendientes',
  'tramoCritico',
  'comision',
] as const

const deParte = (ctx: ContextoEntrega, parte: string): ContextoEntrega => ({ ...ctx, ...ctx.partes[parte] })

/** Tramos del eje del sendero (S07–S08…), en orden. */
export const tramosDelEje = (ctx: Pick<ContextoEntrega, 'escenario'>) => {
  const ids = estacionesDelEje(ctx.escenario).map((e) => e.id)
  return ids.slice(1).map((b, i) => [ids[i], b] as const)
}

export function bloqueosM33(ctx: ContextoEntrega): string[] {
  const tramos = tramosDelEje(ctx)
  return [
    ...bloqueosCompensacion(deParte(ctx, PARTE_CIRCUITO)),
    ...bloqueosPerfil(deParte(ctx, PARTE_PERFIL)),
    ...bloqueosFormulario(
      ctx.formulario,
      {
        ...Object.fromEntries(tramos.map(([a, b]) => [claveTramo('p', a, b), 'numero' as const])),
        tramoCritico: [...tramos.map(([a, b]) => `${a}|${b}`), 'ninguno'],
        tituloInforme: 'texto',
      },
      { clave: 'conclusiones', minimo: 120 },
    ),
  ]
}

/** Cierre del perfil: la cota de M que da el perfil, contra la cota compensada de M en el circuito. */
export function cierreDelPerfil(ctx: ContextoEntrega) {
  const circuito = ctx.partes[PARTE_CIRCUITO]
  const perfil = ctx.partes[PARTE_PERFIL]
  const coeficiente = ctx.parametros.toleranciaCierre.coeficienteMm
  const compensadoM = cierreDelCircuito(circuito.registro, circuito.lecturas, coeficiente).compensados.find((p) => p.punto === PUNTO_CIERRE_PERFIL)
  const estaciones = perfilDesdeLibreta(perfil.registro, perfil.lecturas, estacionesDelEje(ctx.escenario).map((e) => e.id))
  const llegada = estaciones.find((e) => e.id === PUNTO_CIERRE_PERFIL)
  const toleranciaMm = toleranciaCierreMm(longitudRecorridoM(perfil.lecturas), coeficiente)
  const errorMm = llegada && compensadoM ? llegada.cotaMm - compensadoM.cotaCompensadaMm : null
  return { errorMm, toleranciaMm, aprobado: errorMm !== null && Math.abs(errorMm) <= toleranciaMm }
}

export function evaluarM33(ctx: ContextoEntrega): Evaluacion {
  const circuito = deParte(ctx, PARTE_CIRCUITO)
  const perfil = deParte(ctx, PARTE_PERFIL)
  const rc = revisionComun(circuito)
  const rp = revisionComun(perfil)

  // Cuentas y distancias de las dos libretas, en un solo criterio cada una.
  const unir = (id: string): Criterio => {
    const [a, b] = [rc.criterios.find((c) => c.id === id), rp.criterios.find((c) => c.id === id)]
    const malas = [
      a && !a.ok && rellenar(t.enParte, { parte: t.partes.circuito, texto: a.texto }),
      b && !b.ok && rellenar(t.enParte, { parte: t.partes.perfil, texto: b.texto }),
    ].filter((x): x is string => Boolean(x))
    return { id, ok: malas.length === 0, texto: malas.length ? malas.join(' ') : (a ?? b)!.texto }
  }
  const criterios: Criterio[] = [unir('calculos'), unir('distancias')].filter((c) => c.texto)

  // (a) Circuito: cierre, compensación proporcional y cotas coherentes con el terreno.
  const cierre = cierreDelCircuito(circuito.registro, circuito.lecturas, ctx.parametros.toleranciaCierre.coeficienteMm)
  const tol = { e: mmConSigno(cierre.errorMm), t: textoTolerancia(cierre.toleranciaMm) }
  criterios.push({ id: 'cierre', ok: cierre.aprobado, texto: rellenar(cierre.aprobado ? t.cierreOk : t.cierreMal, tol) })
  criterios.push(...criteriosCompensacion(circuito, cierre))

  // (b) Perfil: cierra en M contra el circuito, planilla coherente y dibujo según la plantilla.
  const cp = cierreDelPerfil(ctx)
  criterios.push({
    id: 'cierrePerfil',
    ok: cp.aprobado,
    texto: rellenar(cp.aprobado ? t.cierrePerfilOk : t.cierrePerfilMal, { e: cp.errorMm === null ? '·' : mmConSigno(cp.errorMm), t: textoTolerancia(cp.toleranciaMm) }),
  })
  criterios.push(...criteriosPerfil(perfil, perfil.registro, perfil.lecturas, cp.toleranciaMm))

  // (c) Pendientes por tramo (con los desniveles de la libreta) y el tramo que pasa el máximo.
  const tramos = tramosDelEje(ctx)
  const deLibreta = planillaEsperada(perfilDesdeLibreta(perfil.registro, perfil.lecturas, estacionesDelEje(ctx.escenario).map((e) => e.id)))
  const malas = tramos
    .filter(([a, b], i) => {
      const [ea, eb] = [deLibreta[i], deLibreta[i + 1]]
      if (!ea || !eb) return true
      return fueraDe(leerNumero(ctx.formulario, claveTramo('p', a, b)), pendientePct(eb.cotaMm - ea.cotaMm, eb.progresivaM - ea.progresivaM), TOLERANCIA_PENDIENTE)
    })
    .map(([a, b]) => `${a}–${b}`)
  criterios.push({
    id: 'pendientes',
    ok: malas.length === 0,
    texto: malas.length === 0 ? t.pendientesOk : rellenar(t.pendientesMal, { lista: malas.join(', ') }),
  })
  const maximo = ctx.parametros.acto2.pendienteMaximaTransitablePct
  const criticos = tramosQueExceden(construirPerfil(estacionesDelEje(ctx.escenario)), maximo).map((tr) => `${tr.desde}|${tr.hasta}`)
  const esperado = criticos[0] ?? 'ninguno'
  const criticoOk = ctx.formulario.tramoCritico === esperado
  criterios.push({ id: 'tramoCritico', ok: criticoOk, texto: rellenar(criticoOk ? t.tramoCriticoOk : t.tramoCriticoMal, { max: maximo }) })

  return cerrarEvaluacion(criterios, {
    lecturasExactas: rc.lecturasExactas + rp.lecturasExactas,
    sinErroresRegistro: rc.sinErroresRegistro && rp.sinErroresRegistro,
    errorCierreMm: cierre.errorMm,
    toleranciaCierreMm: cierre.toleranciaMm,
  })
}
