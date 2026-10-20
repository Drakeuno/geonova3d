import type { DesempenoRoster, Roster } from '@/datos/cuadrillas'
import type { Metal, MisionCatalogo } from '@/datos/misiones'
import type { Parametros } from '@/datos/parametros'
import {
  bonusAyuda,
  clasificar,
  companerosAyudados,
  cumpleInsigniaEspecial,
  penalizacionTachadura,
  precisionNielolPct,
  puntajeCuadrilla,
  recompensaPorAprobacion,
  xpIndividual,
  type FilaClasificacion,
  type MovimientoXp,
} from './puntaje'

// El curso completo (§6.2, §14, RF-06 y RF-10): XP de cada integrante, puntaje de cuadrilla,
// insignias, ayudas entre compañeros y tabla de clasificación. Puro: recibe el roster, el avance de
// quien juega y las ayudas registradas, y lo calcula todo con las reglas de `puntaje.ts`.

/** Cómo se aprobó una misión. La 3.3 guarda su cierre para el % de precisión del Ñielol. */
export type DesempenoAprobacion = Partial<DesempenoRoster> & { lecturasExactas: number }

export interface AvanceJugador {
  /** Misiones aprobadas por primera vez, con el desempeño de esa aprobación (null si no se conoce). */
  aprobadas: Record<string, DesempenoAprobacion | null>
  movimientos: MovimientoXp[]
}

/**
 * Mensaje de ayuda a un compañero. Ayuda válida = el compañero la aceptó y aprobó esa misión (§14).
 * Con un compañero simulado, la aceptación y su aprobación quedan programadas al enviarla.
 */
export interface AyudaRegistrada {
  id: string
  ayudanteId: string
  companeroId: string
  misionId: string
  mensaje: string
  enviadaEn: number
  aceptadaEn: number | null
  /** Solo compañeros simulados: cuándo aprueba la misión gracias a la ayuda. */
  apruebaEn: number | null
}

export type EstadoAyuda = 'enviada' | 'aceptada' | 'valida'

/** Dónde va cada integrante: la primera misión que le falta, o atascado en ella. */
export type Situacion = { tipo: 'en' | 'atascado'; mision: string } | { tipo: 'completo' }

export type ClaveInsignia = Metal | 'especial'

export interface IntegranteCurso {
  id: string
  nombre: string
  jugador: boolean
  /** XP individual (§6.2): lo de la misión grupal va a la cuadrilla. */
  movimientos: MovimientoXp[]
  xp: number
  /** Misiones individuales aprobadas, en el orden del viaje. */
  aprobadas: string[]
  /** Misiones cuya insignia tiene: las individuales que aprobó y las grupales de su cuadrilla. */
  insignias: string[]
  /** Compañeros distintos a los que ayudó de forma válida. */
  ayudados: number
  especial: boolean
  situacion: Situacion
  /** Pedido de ayuda, mientras esté atascado. */
  pedido: string | null
}

export interface CuadrillaCurso {
  id: string
  nombre: string
  integrantes: IntegranteCurso[]
  /** Misiones grupales aprobadas por la cuadrilla. */
  grupales: string[]
  /** XP de la cuadrilla: misiones grupales, bonus cooperativo y de precisión, ayudas entre cuadrillas. */
  movimientos: MovimientoXp[]
  promedioXp: number
  bonusXp: number
  puntos: number
  /** Misiones que completó la cuadrilla: las individuales que aprobaron todos, y las grupales. */
  completadas: string[]
  insignias: Record<ClaveInsignia, number>
  totalInsignias: number
  precisionNielolPct: number | null
}

export interface Curso {
  cuadrillas: CuadrillaCurso[]
  clasificacion: FilaClasificacion[]
  ayudas: Record<string, EstadoAyuda>
}

export interface EntradaCurso {
  roster: Roster
  misiones: MisionCatalogo[]
  xp: Parametros['xp']
  jugadores: Record<string, AvanceJugador>
  ayudas: AyudaRegistrada[]
  ahora: number
}

const aceptada = (a: AyudaRegistrada, ahora: number) => a.aceptadaEn !== null && a.aceptadaEn <= ahora
const apruebaConAyuda = (a: AyudaRegistrada, ahora: number) => aceptada(a, ahora) && a.apruebaEn !== null && a.apruebaEn <= ahora

export function calcularCurso({ roster, misiones, xp, jugadores, ayudas, ahora }: EntradaCurso): Curso {
  const orden = misiones.map((m) => m.id)
  const mision = (id: string) => misiones.find((m) => m.id === id)!
  const grupal = (id: string) => mision(id).insignia.grupal
  const enOrden = (ids: Iterable<string>) => {
    const set = new Set(ids)
    return orden.filter((id) => set.has(id))
  }
  const integrador = misiones.find((m) => m.nivelXp === 'integrador')?.id

  // 1. Qué aprobó cada uno. Un compañero que sigue al jugador aprueba lo mismo que él hasta la misión
  //    en que se atasca; la ayuda que acepta lo destraba.
  const destrabado = (id: string, misionId: string) =>
    ayudas.some((a) => a.companeroId === id && a.misionId === misionId && apruebaConAyuda(a, ahora))

  const base = roster.cuadrillas.map((c) => {
    const jugador = c.integrantes.find((i) => i.jugador)
    const avance = jugador ? (jugadores[jugador.id] ?? { aprobadas: {}, movimientos: [] }) : null
    const delJugador = avance ? enOrden(Object.keys(avance.aprobadas)) : []
    const grupales = avance ? delJugador.filter(grupal) : enOrden(Object.keys(c.grupales))
    const integrantes = c.integrantes.map((i) => {
      if (i.jugador) return { i, aprobadas: delJugador.filter((id) => !grupal(id)) }
      const libre = i.atasco ? destrabado(i.id, i.atasco.mision) : true
      const tope = i.atasco ? orden.indexOf(i.atasco.mision) : Infinity
      const propias = i.sigueAlJugador ? delJugador.filter((id) => !grupal(id) && (libre || orden.indexOf(id) < tope)) : i.aprobadas
      return { i, aprobadas: enOrden(i.atasco && libre ? [...propias, i.atasco.mision] : propias) }
    })
    return { c, avance, grupales, integrantes }
  })

  // 2. Ayudas: válidas cuando el compañero aceptó y aprobó esa misión.
  const aprobaciones = base.flatMap((b) => b.integrantes.flatMap((x) => x.aprobadas.map((misionId) => ({ usuarioId: x.i.id, misionId }))))
  const aprobo = (usuarioId: string, misionId: string) => aprobaciones.some((a) => a.usuarioId === usuarioId && a.misionId === misionId)
  const estadoAyuda = (a: AyudaRegistrada): EstadoAyuda =>
    !aceptada(a, ahora) ? 'enviada' : aprobo(a.companeroId, a.misionId) ? 'valida' : 'aceptada'
  const estados = Object.fromEntries(ayudas.map((a) => [a.id, estadoAyuda(a)]))
  const ayudasMotor = ayudas.map((a) => ({ ...a, aceptada: aceptada(a, ahora) }))
  const cuadrillaDe = (usuarioId: string) => base.find((b) => b.integrantes.some((x) => x.i.id === usuarioId))?.c.id

  const cuadrillas = base.map(({ c, avance, grupales, integrantes }): CuadrillaCurso => {
    const recompensa = (id: string, d: DesempenoAprobacion | undefined | null) =>
      recompensaPorAprobacion({ mision: mision(id), lecturasExactas: 0, ...d }, xp)

    // 3. XP individual: el del jugador sale de sus movimientos; el de los simulados, de su desempeño.
    const calculados = integrantes.map(({ i, aprobadas }): IntegranteCurso => {
      const movimientos =
        i.jugador && avance
          ? avance.movimientos.filter((m) => m.ambito === 'individual')
          : [
              ...[...aprobadas, ...grupales].flatMap((id) => recompensa(id, i.desempeno[id]).filter((m) => m.ambito === 'individual')),
              ...Array.from({ length: i.tachaduras }, () => penalizacionTachadura(xp)),
            ]
      const insignias = orden.filter((id) => (grupal(id) ? grupales.includes(id) : aprobadas.includes(id)))
      const ayudados = companerosAyudados(i.id, ayudasMotor, aprobaciones)
      const siguiente = orden.find((id) => !insignias.includes(id))
      const atascado = !i.jugador && siguiente !== undefined && i.atasco?.mision === siguiente
      return {
        id: i.id,
        nombre: i.nombre,
        jugador: i.jugador,
        movimientos,
        xp: xpIndividual(movimientos),
        aprobadas,
        insignias,
        ayudados,
        especial: cumpleInsigniaEspecial(insignias, orden, ayudados),
        situacion: siguiente === undefined ? { tipo: 'completo' } : { tipo: atascado ? 'atascado' : 'en', mision: siguiente },
        pedido: atascado ? i.atasco!.pedido : null,
      }
    })

    // 4. XP de la cuadrilla, más +50 por cada ayuda válida a alguien de otra cuadrilla (§6.2).
    const deGrupales = avance
      ? avance.movimientos.filter((m) => m.ambito === 'cuadrilla')
      : grupales.flatMap((id) => recompensa(id, c.grupales[id]).filter((m) => m.ambito === 'cuadrilla'))
    const deAyudas = ayudas
      .filter((a) => estados[a.id] === 'valida' && cuadrillaDe(a.ayudanteId) === c.id && cuadrillaDe(a.companeroId) !== c.id)
      .map((a) => bonusAyuda(xp, a.misionId))
    const movimientos = [...deGrupales, ...deAyudas]
    const puntos = puntajeCuadrilla(
      calculados.map((x) => x.xp),
      movimientos,
    )
    const bonusXp = movimientos.reduce((s, m) => s + m.xp, 0)

    // 5. Insignias: las individuales de cada integrante, las grupales una vez y las especiales.
    const insignias: Record<ClaveInsignia, number> = { bronce: 0, plata: 0, oro: 0, platino: 0, especial: 0 }
    for (const x of calculados) {
      for (const id of x.aprobadas) insignias[mision(id).insignia.metal]++
      if (x.especial) insignias.especial++
    }
    for (const id of grupales) insignias[mision(id).insignia.metal]++

    const cierre = integrador && grupales.includes(integrador) ? (avance ? avance.aprobadas[integrador] : c.grupales[integrador]) : null
    return {
      id: c.id,
      nombre: c.nombre,
      integrantes: calculados,
      grupales,
      movimientos,
      promedioXp: puntos - bonusXp,
      bonusXp,
      puntos,
      completadas: orden.filter((id) => (grupal(id) ? grupales.includes(id) : calculados.every((x) => x.aprobadas.includes(id)))),
      insignias,
      totalInsignias: Object.values(insignias).reduce((s, n) => s + n, 0),
      precisionNielolPct:
        cierre?.errorCierreMm !== undefined && cierre.toleranciaCierreMm ? precisionNielolPct(cierre.errorCierreMm, cierre.toleranciaCierreMm) : null,
    }
  })

  return {
    cuadrillas,
    clasificacion: clasificar(
      cuadrillas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        puntos: c.puntos,
        misionesCompletadas: c.completadas.length,
        insignias: c.totalInsignias,
        precisionNielolPct: c.precisionNielolPct,
      })),
    ),
    ayudas: estados,
  }
}

export const buscarIntegrante = (curso: Curso, id: string) => {
  for (const cuadrilla of curso.cuadrillas) {
    const integrante = cuadrilla.integrantes.find((i) => i.id === id)
    if (integrante) return { cuadrilla, integrante }
  }
  return null
}

export const idAyuda = (ayudanteId: string, companeroId: string, misionId: string) => `${ayudanteId}>${companeroId}@${misionId}`

/** Largo mínimo del mensaje de ayuda, como el de las justificaciones de la 2.1 y la 2.2. */
export const MINIMO_MENSAJE_AYUDA = 30

export type MotivoSinAyuda = 'no-atascado' | 'sin-aprobar' | 'ya-enviada'

/**
 * ¿Puede ayudar a este compañero? Debe estar atascado, y quien ayuda debe haber aprobado esa misión
 * (no se puede explicar lo que uno no ha resuelto). Una ayuda por compañero y misión.
 */
export function puedeAyudar(curso: Curso, ayudas: AyudaRegistrada[], ayudanteId: string, companeroId: string): { ok: true; mision: string } | { ok: false; motivo: MotivoSinAyuda; mision?: string } {
  const companero = buscarIntegrante(curso, companeroId)?.integrante
  const ayudante = buscarIntegrante(curso, ayudanteId)?.integrante
  if (!companero || !ayudante || companero.situacion.tipo !== 'atascado') return { ok: false, motivo: 'no-atascado' }
  const misionId = companero.situacion.mision
  if (ayudas.some((a) => a.id === idAyuda(ayudanteId, companeroId, misionId))) return { ok: false, motivo: 'ya-enviada', mision: misionId }
  if (!ayudante.aprobadas.includes(misionId)) return { ok: false, motivo: 'sin-aprobar', mision: misionId }
  return { ok: true, mision: misionId }
}

/** Ayuda a un compañero simulado: acepta y aprueba solo, a los segundos que fija el roster. */
export function ayudaSimulada(
  ayudanteId: string,
  companeroId: string,
  misionId: string,
  mensaje: string,
  ahora: number,
  simulacion: Roster['simulacion'],
): AyudaRegistrada {
  return {
    id: idAyuda(ayudanteId, companeroId, misionId),
    ayudanteId,
    companeroId,
    misionId,
    mensaje,
    enviadaEn: ahora,
    aceptadaEn: ahora + simulacion.aceptaTrasSegundos * 1000,
    apruebaEn: ahora + simulacion.apruebaTrasSegundos * 1000,
  }
}

/** Próximo instante en que cambia el estado de alguna ayuda (para volver a calcular). */
export const proximoCambio = (ayudas: AyudaRegistrada[], ahora: number) =>
  ayudas
    .flatMap((a) => [a.aceptadaEn, a.apruebaEn])
    .filter((t): t is number => t !== null && t > ahora)
    .reduce<number | null>((min, t) => (min === null || t < min ? t : min), null)
