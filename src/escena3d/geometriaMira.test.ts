import { describe, expect, it } from 'vitest'
import { COLORES_MIRA, geometriaMira } from './geometriaMira'

describe('graduación tipo E de la mira', () => {
  const { rects, numeros } = geometriaMira(1.44, 1.6)

  it('las barras de la E miden 1 cm y empiezan en centímetros exactos', () => {
    const barras = rects.filter((r) => r.v1 - r.v0 < 0.02)
    expect(barras.every((r) => Math.abs(r.v1 - r.v0 - 0.01) < 1e-9)).toBe(true)
    expect(barras.every((r) => Math.abs(r.v0 * 100 - Math.round(r.v0 * 100)) < 1e-9)).toBe(true)
  })

  it('una lectura de 1,523 cae sobre la segunda barra de la E del 15', () => {
    const barra = rects.find((r) => r.v1 - r.v0 < 0.02 && r.v0 <= 1.523 && 1.523 < r.v1)
    expect(barra).toMatchObject({ v0: 1.52, v1: 1.53, u0: 0.06 })
  })

  it('los números marcan decímetros y alternan color por metro', () => {
    expect(numeros.map((n) => n.texto)).toEqual(['14', '15', '16'])
    expect(numeros.every((n) => n.color === COLORES_MIRA.rojo)).toBe(true)
    expect(geometriaMira(2.0, 2.1).numeros.find((n) => n.texto === '20')?.color).toBe(COLORES_MIRA.negro)
  })

  it('las E alternan de lado cada 5 cm', () => {
    const lomos = rects.filter((r) => Math.abs(r.v1 - r.v0 - 0.05) < 1e-9)
    const lado = (v0: number) => lomos.find((r) => Math.abs(r.v0 - v0) < 1e-9)!.u0
    expect(lado(1.5)).toBe(0.06)
    expect(lado(1.55)).toBe(0.83)
  })

  it('no dibuja fuera de los 3 m de la mira', () => {
    const { rects: todo } = geometriaMira(0, 3)
    expect(Math.min(...todo.map((r) => r.v0))).toBe(0)
    expect(Math.max(...todo.map((r) => r.v1))).toBe(3)
  })
})
