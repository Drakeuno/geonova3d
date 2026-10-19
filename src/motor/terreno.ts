import type { Mm } from './numeros'

// Superficie del terreno simulado a partir de los puntos de control del escenario. Interpolación por
// distancia inversa (IDW): pasa exactamente por cada punto de control, así la mira que se planta en
// un punto queda a la misma altura que el suelo que se dibuja.

export interface PuntoControl {
  x: number
  y: number
  cotaMm: Mm
}

/** Altura del instrumento sobre el suelo que se busca al elegir la colimación (m). */
export const ALTURA_INSTRUMENTO_M = 1.45

export function alturaTerrenoMm(puntos: PuntoControl[], x: number, y: number, potencia = 2): number {
  let suma = 0
  let pesos = 0
  for (const p of puntos) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d2 < 1e-12) return p.cotaMm
    const w = 1 / d2 ** (potencia / 2)
    suma += w * p.cotaMm
    pesos += w
  }
  return pesos > 0 ? suma / pesos : 0
}

export interface Limites {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Rectángulo que contiene los puntos, con un margen alrededor (m). */
export function limites(puntos: { x: number; y: number }[], margenM = 25): Limites {
  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  return {
    minX: Math.min(...xs) - margenM,
    maxX: Math.max(...xs) + margenM,
    minY: Math.min(...ys) - margenM,
    maxY: Math.max(...ys) + margenM,
  }
}
