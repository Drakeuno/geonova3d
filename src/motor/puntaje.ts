import type { MisionCatalogo } from '@/datos/misiones'
import type { Parametros } from '@/datos/parametros'
import { redondearMedioArriba, type Mm } from './numeros'

// Puntaje e insignias (§6.2 y §14). El XP se registra como movimientos: así se puede auditar de
// dónde salió cada punto y aplicar penalizaciones en el momento en que ocurren.

type TablaXp = Parametros['xp']

/** Las misiones grupales (2.3 y 3.3) y los bonus grupales suman a la cuadrilla, no a cada persona. */
export type Ambito = 'individual' | 'cuadrilla'

export type TipoMovimiento =
  | 'mision'
  | 'lecturas-exactas'
  | 'bonus-precision'
  | 'bonus-primera-sin-errores'
  | 'bonus-cooperativa'
  | 'bonus-ayuda'
  | 'penalizacion-tachadura'

export interface MovimientoXp {
  tipo: TipoMovimiento
  xp: number
  ambito: Ambito
  misionId?: string
}

export interface DesempenoMision {
  mision: MisionCatalogo
  /** Lecturas dentro de ±1 mm de la verdadera. */
  lecturasExactas: number
  /** Error de cierre del circuito, en las misiones con bonus de precisión (1.2 y 3.3). */
  errorCierreMm?: Mm
  /** Libreta sin correcciones ni tachaduras (bonus de la 1.1). */
  sinErroresRegistro?: boolean
}

/** Bonus por precisión del cierre: |e| < 5 mm o < 10 mm (§6.2). */
export function bonusPrecisionXp(errorMm: Mm, xp: TablaXp): number {
  const e = Math.abs(errorMm)
  if (e < 5) return xp.bonusPrecision.bajo5mm
  if (e < 10) return xp.bonusPrecision.bajo10mm
  return 0
}

/**
 * XP de una misión aprobada. Solo se llama en la primera aprobación: los reintentos aprobados no
 * repiten recompensas (§14).
 */
export function recompensaPorAprobacion(d: DesempenoMision, xp: TablaXp): MovimientoXp[] {
  const m = d.mision
  const ambito: Ambito = m.insignia.grupal ? 'cuadrilla' : 'individual'
  const movimientos: MovimientoXp[] = [{ tipo: 'mision', xp: xp.porInsignia[m.nivelXp], ambito, misionId: m.id }]
  if (m.cooperativa) movimientos.push({ tipo: 'bonus-cooperativa', xp: xp.bonusCooperativa, ambito: 'cuadrilla', misionId: m.id })
  if (d.lecturasExactas > 0) {
    movimientos.push({ tipo: 'lecturas-exactas', xp: d.lecturasExactas * xp.lecturaExacta, ambito: 'individual', misionId: m.id })
  }
  if (m.bonusPrecision && d.errorCierreMm !== undefined) {
    const bonus = bonusPrecisionXp(d.errorCierreMm, xp)
    if (bonus > 0) movimientos.push({ tipo: 'bonus-precision', xp: bonus, ambito, misionId: m.id })
  }
  if (m.id === '1.1' && d.sinErroresRegistro) {
    movimientos.push({ tipo: 'bonus-primera-sin-errores', xp: xp.bonusPrimeraSinErrores, ambito: 'individual', misionId: m.id })
  }
  return movimientos
}

/** Tachar una celda en vez de corregir en línea nueva: −20 XP, en el momento (CP-03). */
export const penalizacionTachadura = (xp: TablaXp, misionId?: string): MovimientoXp => ({
  tipo: 'penalizacion-tachadura',
  xp: -xp.penalizacionTachadura,
  ambito: 'individual',
  misionId,
})

/** Ayuda documentada entre cuadrillas: +50 XP a la cuadrilla (§6.2). */
export const bonusAyuda = (xp: TablaXp, misionId?: string): MovimientoXp => ({
  tipo: 'bonus-ayuda',
  xp: xp.bonusAyuda,
  ambito: 'cuadrilla',
  misionId,
})

const suma = (movimientos: MovimientoXp[], ambito: Ambito) =>
  movimientos.filter((m) => m.ambito === ambito).reduce((s, m) => s + m.xp, 0)

/** XP de una persona. Las penalizaciones no la dejan bajo cero. */
export const xpIndividual = (movimientos: MovimientoXp[]) => Math.max(0, suma(movimientos, 'individual'))

/** Puntaje de cuadrilla = promedio de XP individuales de los 3–4 miembros + bonus grupales (§6.2). */
export function puntajeCuadrilla(xpIndividuales: number[], movimientosCuadrilla: MovimientoXp[]): number {
  if (xpIndividuales.length < 3 || xpIndividuales.length > 4) {
    throw new RangeError(`Una cuadrilla tiene 3 o 4 integrantes, no ${xpIndividuales.length}`)
  }
  const promedio = xpIndividuales.reduce((s, x) => s + x, 0) / xpIndividuales.length
  return redondearMedioArriba(promedio) + suma(movimientosCuadrilla, 'cuadrilla')
}

/** % precisión del Ñielol = máx(0, 100 · (1 − |e| / T)), con el cierre del circuito de la 3.3 (§14). */
export const precisionNielolPct = (errorMm: Mm, toleranciaMm: number) => Math.max(0, 100 * (1 - Math.abs(errorMm) / toleranciaMm))

export interface Ayuda {
  ayudanteId: string
  companeroId: string
  misionId: string
  /** El compañero aceptó el mensaje de ayuda. */
  aceptada: boolean
}

/**
 * Compañeros distintos ayudados de forma válida: mensaje aceptado y el compañero aprobó esa misión
 * (§14). El conteo es automático.
 */
export function companerosAyudados(ayudanteId: string, ayudas: Ayuda[], aprobaciones: { usuarioId: string; misionId: string }[]): number {
  const validos = ayudas.filter(
    (a) =>
      a.ayudanteId === ayudanteId &&
      a.aceptada &&
      aprobaciones.some((ap) => ap.usuarioId === a.companeroId && ap.misionId === a.misionId),
  )
  return new Set(validos.map((a) => a.companeroId)).size
}

/** Insignia especial: todas las insignias de misión + ayudar a 3 compañeros (§6.2). */
export const cumpleInsigniaEspecial = (misionesConInsignia: string[], todasLasMisiones: string[], ayudados: number) =>
  todasLasMisiones.every((id) => misionesConInsignia.includes(id)) && ayudados >= 3

export interface FilaClasificacion {
  id: string
  nombre: string
  puntos: number
  misionesCompletadas: number
  insignias: number
  /** Null mientras la cuadrilla no cierre el circuito de la 3.3. */
  precisionNielolPct: number | null
}

/** Tabla de clasificación por cuadrilla: puntos, luego misiones, insignias y precisión (§6.2). */
export function clasificar(filas: FilaClasificacion[]): FilaClasificacion[] {
  return [...filas].sort(
    (a, b) =>
      b.puntos - a.puntos ||
      b.misionesCompletadas - a.misionesCompletadas ||
      b.insignias - a.insignias ||
      (b.precisionNielolPct ?? -1) - (a.precisionNielolPct ?? -1),
  )
}
