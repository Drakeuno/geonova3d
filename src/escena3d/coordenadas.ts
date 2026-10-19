import type { Mm } from '@/motor/numeros'

// Del plano del escenario (x al este, y al norte, cota) al mundo 3D (x al este, y arriba, z al sur).
// Las alturas se miden desde una cota base para trabajar con números pequeños.

export type Vec3 = [number, number, number]

export const aMundo = (x: number, y: number, cotaMm: Mm, baseMm: Mm): Vec3 => [x, (cotaMm - baseMm) / 1000, -y]

/**
 * Giro alrededor del eje vertical para que el frente local (−z, como el anteojo) de un objeto en
 * `desde` apunte hacia `hacia`. Para que la cara +z apunte (la cara graduada de la mira), sumar π.
 */
export const rumboHacia = (desde: { x: number; y: number }, hacia: { x: number; y: number }) =>
  Math.atan2(-(hacia.x - desde.x), hacia.y - desde.y)
