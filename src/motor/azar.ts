// Azar con semilla (mulberry32). La misma semilla repite el mismo intento: sirve para las pruebas
// y para que el docente pueda revisar exactamente lo que vio un estudiante.

export type Rng = () => number

export function crearRng(semilla: number): Rng {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entero uniforme en [min, max], ambos incluidos. */
export const enteroEntre = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

export const uniforme = (rng: Rng, a: number, b: number) => a + (b - a) * rng()

export const elegir = <T>(rng: Rng, lista: readonly T[]): T => {
  if (lista.length === 0) throw new Error('No hay opciones para elegir')
  return lista[Math.floor(rng() * lista.length)]
}

export const signoAlAzar = (rng: Rng) => (rng() < 0.5 ? -1 : 1)
