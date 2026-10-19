import { uniforme, type Rng } from './azar'
import { BURBUJA_CENTRADA } from './lecturas'

// Nivel esférico con tres tornillos nivelantes (§6.3, minijuego de montaje). Girar un tornillo en
// sentido horario sube ese lado de la base y la burbuja se va hacia él. Girar los tres por igual
// no la mueve. La burbuja no sale del frasco: se queda contra el borde.

export interface Burbuja {
  /** Posición respecto del centro, en radios del frasco (|b| = 1 es el borde). */
  x: number
  y: number
}

export type Tornillo = 0 | 1 | 2

/** Tornillos a 120°: A arriba, B abajo a la izquierda, C abajo a la derecha (vista en planta). */
export const DIRECCION_TORNILLOS: readonly { x: number; y: number }[] = [90, 210, 330].map((g) => ({
  x: Math.cos((g * Math.PI) / 180),
  y: Math.sin((g * Math.PI) / 180),
}))

export const NOMBRE_TORNILLOS = ['A', 'B', 'C'] as const

/** Cuánto se mueve la burbuja por cada cuarto de vuelta, en radios del frasco. */
export const PASO_TORNILLO = 0.05

/** Al plantar el trípode la burbuja queda lejos del centro, en una dirección cualquiera. */
export function burbujaInicial(rng: Rng): Burbuja {
  const angulo = uniforme(rng, 0, 2 * Math.PI)
  const radio = uniforme(rng, 0.55, 0.95)
  return { x: radio * Math.cos(angulo), y: radio * Math.sin(angulo) }
}

/** Gira un tornillo `cuartos` cuartos de vuelta (positivo = horario, sube ese lado). */
export function girarTornillo(b: Burbuja, tornillo: Tornillo, cuartos: number, paso = PASO_TORNILLO): Burbuja {
  const d = DIRECCION_TORNILLOS[tornillo]
  const x = b.x + d.x * cuartos * paso
  const y = b.y + d.y * cuartos * paso
  const r = Math.hypot(x, y)
  return r > 1 ? { x: x / r, y: y / r } : { x, y }
}

/** Desviación de la burbuja: 0 = centrada, 1 = contra el borde. Es la que usa el error de montaje. */
export const desviacionBurbuja = (b: Burbuja) => Math.min(1, Math.hypot(b.x, b.y))

/** Burbuja calada: dentro del círculo de referencia. */
export const burbujaCalada = (b: Burbuja) => desviacionBurbuja(b) <= BURBUJA_CENTRADA
