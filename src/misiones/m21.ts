import { decidirAgua, evaluarTransitable, viviendasBajoLinea } from '@/motor/decisiones'
import { pendientePct } from '@/motor/desniveles'
import { cotaVerdaderaMm, distanciaEntre } from '@/motor/escenarios'
import { aMm, formatearNumero, type Mm } from '@/motor/numeros'
import textos from '@/textos/es-CL.json'
import {
  bloqueosFormulario,
  cerrarEvaluacion,
  claveTramo,
  criterio,
  fueraDe,
  leerMm,
  leerNumero,
  puntosDeLibreta,
  revisionComun,
  TOLERANCIA_DISTANCIA_M,
  textoTolerancia,
  toleranciaRecorrido,
} from './comunes'
import type { ContextoEntrega, Evaluacion } from './tipos'

// Misión 2.1 · La gran decisión técnica (§5), con sus tres pieles intercambiables (RF-12). Misma
// mecánica: nivelar el trazado por tramos y decidir con los desniveles de la libreta. Cambia la
// pregunta: ¿gravedad o bombeo?, ¿el camino es transitable?, ¿qué casas quedan bajo la línea?

const t = textos.entrega.m21

/** Tolerancia con que se compara una pendiente con la que sale de los propios datos (puntos %). */
export const TOLERANCIA_PENDIENTE = 0.01

const tramosDe = (ids: string[]) => ids.slice(1).map((b, i) => [ids[i], b] as const)

// ── Piel La Red del Agua ─────────────────────────────────────────────────────────────────────

export const PUNTOS_AGUA = ['F', 'V1', 'V2', 'V3', 'V4']
export const MOTIVOS_AGUA = ['calculos', 'distancias', 'planilla', 'desniveles', 'justificacion', 'decision'] as const

const camposAgua = () => ({
  ...Object.fromEntries(tramosDe(PUNTOS_AGUA).map(([a, b]) => [claveTramo('dh', a, b), 'mm' as const])),
  'cota:F': 'mm' as const,
  'cota:V4': 'mm' as const,
  dist: 'numero' as const,
  pendiente: 'numero' as const,
  decision: ['gravedad', 'bombeo'] as const,
})

export const bloqueosAgua = (ctx: ContextoEntrega) =>
  bloqueosFormulario(ctx.formulario, camposAgua(), { clave: 'justificacion', minimo: 30 })

export function evaluarAgua(ctx: ContextoEntrega): Evaluacion {
  const { pares, criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const f = ctx.formulario
  const lib = puntosDeLibreta(pares, ctx.registro.pr)
  const T = toleranciaRecorrido(ctx)
  const margen = ctx.parametros.comparacion.toleranciaMm
  const tramos = tramosDe(PUNTOS_AGUA)
  const verdadera = (id: string) => cotaVerdaderaMm(ctx.escenario, id)

  // La planilla copia bien la libreta…
  criterios.push(
    criterio(
      'planilla',
      tramos.filter(([a, b]) => fueraDe(leerMm(f, claveTramo('dh', a, b)), lib.get(b)!.cotaMm - lib.get(a)!.cotaMm, margen)).map(([a, b]) => `${a}–${b}`),
      t.planillaOk,
      t.planillaMal,
    ),
  )
  // …y sus desniveles calzan con el terreno, tramo a tramo y en total.
  const lejos = tramos
    .filter(([a, b]) => fueraDe(leerMm(f, claveTramo('dh', a, b)), verdadera(b) - verdadera(a), T))
    .map(([a, b]) => `${a}–${b}`)
  if (Math.abs(lib.get('V4')!.cotaMm - lib.get('F')!.cotaMm - (verdadera('V4') - verdadera('F'))) > T) lejos.push('F–V4')
  criterios.push(criterio('desniveles', lejos, t.desnivelesOk, t.desnivelesMal, { t: textoTolerancia(T) }))

  // La justificación cita los números de la libreta (§5, 2.1 c), y la pendiente sale de ellos.
  const cotaF = leerMm(f, 'cota:F')
  const cotaV4 = leerMm(f, 'cota:V4')
  const dist = leerNumero(f, 'dist')
  const distLibreta = lib.get('V4')!.distanciaAcumuladaM - lib.get('F')!.distanciaAcumuladaM
  const malCitadas = [
    fueraDe(cotaF, lib.get('F')!.cotaMm, margen) && t.citas.cotaF,
    fueraDe(cotaV4, lib.get('V4')!.cotaMm, margen) && t.citas.cotaV4,
    fueraDe(dist, distLibreta, TOLERANCIA_DISTANCIA_M) && t.citas.distancia,
    (cotaF === null || cotaV4 === null || !dist || fueraDe(leerNumero(f, 'pendiente'), pendientePct(cotaF - cotaV4, dist), TOLERANCIA_PENDIENTE)) &&
      t.citas.pendiente,
  ].filter((x): x is string => Boolean(x))
  criterios.push(criterio('justificacion', malCitadas, t.justificacionOk, t.justificacionMal))

  // La decisión correcta es la del terreno verdadero.
  const trazado = tramos.reduce((s, [a, b]) => s + distanciaEntre(ctx.escenario, a, b), 0)
  const correcta = decidirAgua(verdadera('F'), verdadera('V4'), trazado, ctx.parametros.acto2.pendienteMinimaGravedadPct).decision
  const ok = f.decision === correcta
  criterios.push({ id: 'decision', ok, texto: ok ? t.agua.decisionOk.replace('{d}', t.agua.opciones[correcta]) : t.agua.decisionMal })

  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro })
}

// ── Piel Camino del Pehuén ───────────────────────────────────────────────────────────────────

export const PUNTOS_PEHUEN = ['K0', 'K1', 'K2', 'K3', 'K4']
export const MOTIVOS_PEHUEN = ['calculos', 'distancias', 'planilla', 'desniveles', 'decision'] as const

const camposPehuen = () => ({
  ...Object.fromEntries(
    tramosDe(PUNTOS_PEHUEN).flatMap(([a, b]) => [
      [claveTramo('dh', a, b), 'mm' as const],
      [claveTramo('p', a, b), 'numero' as const],
      [claveTramo('excede', a, b), ['si', 'no'] as const],
    ]),
  ),
  decision: ['transitable', 'no-transitable'] as const,
})

export const bloqueosPehuen = (ctx: ContextoEntrega) =>
  bloqueosFormulario(ctx.formulario, camposPehuen(), { clave: 'justificacion', minimo: 30 })

export function evaluarPehuen(ctx: ContextoEntrega): Evaluacion {
  const { pares, criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const f = ctx.formulario
  const lib = puntosDeLibreta(pares, ctx.registro.pr)
  const T = toleranciaRecorrido(ctx)
  const margen = ctx.parametros.comparacion.toleranciaMm
  const maximo = ctx.parametros.acto2.pendienteMaximaTransitablePct
  const tramos = tramosDe(PUNTOS_PEHUEN)
  const verdadera = (id: string) => cotaVerdaderaMm(ctx.escenario, id)
  const nombre = ([a, b]: readonly [string, string]) => `${a}–${b}`

  // Planilla: Δh de la libreta y pendiente con la distancia anotada.
  criterios.push(
    criterio(
      'planilla',
      tramos
        .filter(([a, b]) => {
          const dh = lib.get(b)!.cotaMm - lib.get(a)!.cotaMm
          const d = lib.get(b)!.distanciaAcumuladaM - lib.get(a)!.distanciaAcumuladaM
          return fueraDe(leerMm(f, claveTramo('dh', a, b)), dh, margen) || fueraDe(leerNumero(f, claveTramo('p', a, b)), pendientePct(dh, d), TOLERANCIA_PENDIENTE)
        })
        .map(nombre),
      t.planillaOk,
      t.planillaMal,
    ),
  )
  criterios.push(
    criterio(
      'desniveles',
      tramos.filter(([a, b]) => fueraDe(leerMm(f, claveTramo('dh', a, b)), verdadera(b) - verdadera(a), T)).map(nombre),
      t.desnivelesOk,
      t.desnivelesMal,
      { t: textoTolerancia(T) },
    ),
  )

  // Decisión: qué tramos superan la pendiente máxima en el terreno verdadero, y si se puede transitar.
  const reales = tramos.map(([a, b]) => ({ pendientePct: pendientePct(verdadera(b) - verdadera(a), distanciaEntre(ctx.escenario, a, b)) }))
  const { transitable, excedidos } = evaluarTransitable(reales, maximo)
  const malMarcados = tramos.filter((tr, i) => (f[claveTramo('excede', ...tr)] === 'si') !== excedidos.includes(i)).map(nombre)
  const decisionOk = f.decision === (transitable ? 'transitable' : 'no-transitable')
  criterios.push({
    id: 'decision',
    ok: malMarcados.length === 0 && decisionOk,
    texto:
      malMarcados.length === 0 && decisionOk
        ? t.pehuen.decisionOk.replace('{max}', formatearNumero(maximo, 0))
        : malMarcados.length
          ? t.pehuen.tramosMal.replace('{lista}', malMarcados.join(', ')).replace('{max}', formatearNumero(maximo, 0))
          : t.pehuen.decisionMal,
  })
  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro })
}

// ── Piel Operación Cero Cota ─────────────────────────────────────────────────────────────────

export const CASAS_CERO_COTA = ['C1', 'C2', 'C3', 'C4']
export const MOTIVOS_CERO_COTA = ['calculos', 'distancias', 'planilla', 'cotas', 'decision'] as const

export const lineaSeguridadMm = (ctx: Pick<ContextoEntrega, 'escenario'>): Mm => aMm(ctx.escenario.datos.lineaSeguridad ?? 0)

const camposCeroCota = () =>
  Object.fromEntries(
    CASAS_CERO_COTA.flatMap((c) => [
      [`cota:${c}`, 'mm' as const],
      [`margen:${c}`, 'mm' as const],
      [`bajo:${c}`, ['si', 'no'] as const],
    ]),
  )

export const bloqueosCeroCota = (ctx: ContextoEntrega) =>
  bloqueosFormulario(ctx.formulario, camposCeroCota(), { clave: 'justificacion', minimo: 30 })

export function evaluarCeroCota(ctx: ContextoEntrega): Evaluacion {
  const { pares, criterios, lecturasExactas, sinErroresRegistro } = revisionComun(ctx)
  const f = ctx.formulario
  const lib = puntosDeLibreta(pares, ctx.registro.pr)
  const T = toleranciaRecorrido(ctx)
  const margen = ctx.parametros.comparacion.toleranciaMm
  const linea = lineaSeguridadMm(ctx)

  criterios.push(
    criterio(
      'planilla',
      CASAS_CERO_COTA.filter((c) => {
        const cota = leerMm(f, `cota:${c}`)
        return fueraDe(cota, lib.get(c)!.cotaMm, margen) || cota === null || fueraDe(leerMm(f, `margen:${c}`), cota - linea, margen)
      }),
      t.planillaOk,
      t.ceroCota.planillaMal,
    ),
  )
  criterios.push(
    criterio(
      'cotas',
      CASAS_CERO_COTA.filter((c) => fueraDe(leerMm(f, `cota:${c}`), cotaVerdaderaMm(ctx.escenario, c), T)),
      t.ceroCota.cotasOk,
      t.ceroCota.cotasMal,
      { t: textoTolerancia(T) },
    ),
  )
  const bajo = viviendasBajoLinea(
    CASAS_CERO_COTA.map((id) => ({ id, cotaMm: cotaVerdaderaMm(ctx.escenario, id) })),
    linea,
  )
  criterios.push(
    criterio(
      'decision',
      CASAS_CERO_COTA.filter((c) => (f[`bajo:${c}`] === 'si') !== bajo.includes(c)),
      t.ceroCota.decisionOk,
      t.ceroCota.decisionMal,
    ),
  )
  return cerrarEvaluacion(criterios, { lecturasExactas, sinErroresRegistro })
}
