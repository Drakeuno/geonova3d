import { pendientePct } from './desniveles'
import type { Mm } from './numeros'

// Perfil longitudinal (§3.6): estaciones cada 20 m por defecto, desnivel parcial entre estaciones
// consecutivas, desnivel acumulado desde el origen y pendiente por tramo.

export interface EstacionPerfil {
  id: string
  progresivaM: number
  cotaMm: Mm
}

export interface TramoPerfil {
  desde: string
  hasta: string
  distanciaM: number
  desnivelMm: Mm
  desnivelAcumuladoMm: Mm
  pendientePct: number
}

/** Progresivas 0, 20, 40… para `n` estaciones. */
export const progresivas = (n: number, estacionamientoM: number) => Array.from({ length: n }, (_, i) => i * estacionamientoM)

export function construirPerfil(estaciones: EstacionPerfil[]): TramoPerfil[] {
  const origen = estaciones[0]
  return estaciones.slice(1).map((e, i) => {
    const anterior = estaciones[i]
    const distanciaM = e.progresivaM - anterior.progresivaM
    const desnivelMm = e.cotaMm - anterior.cotaMm
    return {
      desde: anterior.id,
      hasta: e.id,
      distanciaM,
      desnivelMm,
      desnivelAcumuladoMm: e.cotaMm - origen.cotaMm,
      pendientePct: pendientePct(desnivelMm, distanciaM),
    }
  })
}

/** Tramos cuya pendiente, en valor absoluto, supera el máximo (3.3: accesibilidad > 8 %). */
export const tramosQueExceden = (tramos: TramoPerfil[], maximoPct: number) =>
  tramos.filter((t) => Math.abs(t.pendientePct) > maximoPct)

export interface EscalasPerfil {
  /** Denominador de la escala horizontal: 100 ⇒ 1:100. */
  horizontal: number
  vertical: number
}

export interface PuntoPapel {
  id: string
  /** Milímetros sobre el papel, desde el origen del dibujo. */
  xMm: number
  yMm: number
}

/** Exageración vertical del dibujo: con 1:100 H y 1:20 V, ×5. */
export const exageracionVertical = (escalas: EscalasPerfil) => escalas.horizontal / escalas.vertical

/**
 * Posición de cada estación en el papel, a escala. La cota de referencia (la línea base del dibujo)
 * va en y = 0. Lo usa el dibujo del perfil (F4) y la verificación de escalas.
 */
export function aPapel(estaciones: EstacionPerfil[], escalas: EscalasPerfil, cotaReferenciaMm: Mm): PuntoPapel[] {
  return estaciones.map((e) => ({
    id: e.id,
    xMm: (e.progresivaM * 1000) / escalas.horizontal,
    yMm: (e.cotaMm - cotaReferenciaMm) / escalas.vertical,
  }))
}
