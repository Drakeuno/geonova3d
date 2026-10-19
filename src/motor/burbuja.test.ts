import { describe, expect, it } from 'vitest'
import { crearRng } from './azar'
import { burbujaCalada, burbujaInicial, desviacionBurbuja, girarTornillo, type Burbuja, type Tornillo } from './burbuja'

const cerca = (b: Burbuja, x: number, y: number) => {
  expect(b.x).toBeCloseTo(x, 9)
  expect(b.y).toBeCloseTo(y, 9)
}

describe('nivel esférico con tres tornillos', () => {
  it('al plantar el trípode la burbuja queda descentrada', () => {
    const rng = crearRng(4)
    for (let i = 0; i < 200; i++) {
      const b = burbujaInicial(rng)
      expect(desviacionBurbuja(b)).toBeGreaterThanOrEqual(0.55)
      expect(burbujaCalada(b)).toBe(false)
    }
  })

  it('subir el tornillo A (arriba) mueve la burbuja hacia A', () => {
    cerca(girarTornillo({ x: 0, y: 0 }, 0, 2), 0, 0.1)
  })

  it('girar los tres tornillos por igual no mueve la burbuja', () => {
    let b: Burbuja = { x: 0.3, y: -0.2 }
    for (const t of [0, 1, 2] as Tornillo[]) b = girarTornillo(b, t, 3)
    cerca(b, 0.3, -0.2)
  })

  it('A y B en sentidos opuestos mueven la burbuja sobre la línea AB (método clásico)', () => {
    const b = girarTornillo(girarTornillo({ x: 0, y: 0 }, 0, 1), 1, -1)
    // Dirección A − B: perpendicular a C.
    expect(b.x * Math.cos((330 * Math.PI) / 180) + b.y * Math.sin((330 * Math.PI) / 180)).toBeCloseTo(0, 9)
  })

  it('la burbuja no sale del frasco', () => {
    const b = girarTornillo({ x: 0, y: 0.9 }, 0, 10)
    expect(desviacionBurbuja(b)).toBeCloseTo(1, 9)
  })

  it('se puede calar desde cualquier posición inicial', () => {
    const rng = crearRng(8)
    for (let i = 0; i < 100; i++) {
      let b = burbujaInicial(rng)
      // Estrategia del estudiante: girar el tornillo que más acerca la burbuja al centro.
      for (let paso = 0; paso < 80 && !burbujaCalada(b); paso++) {
        const opciones = ([0, 1, 2] as Tornillo[]).flatMap((t) => [girarTornillo(b, t, 1), girarTornillo(b, t, -1)])
        b = opciones.reduce((mejor, o) => (desviacionBurbuja(o) < desviacionBurbuja(mejor) ? o : mejor))
      }
      expect(burbujaCalada(b)).toBe(true)
    }
  })
})
